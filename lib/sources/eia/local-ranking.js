import { readFileSync } from "node:fs";

const RANKING_CONFIG = readJson("../../../data/eia/phase4-ranking-config.json");
const ROUTING_CONFIG = readJson("../../../data/eia/phase4-routing-config.json");
const TAXONOMY = readJson("../../../data/eia/phase4-concept-taxonomy.json");

if (RANKING_CONFIG.taxonomyVersion !== TAXONOMY.version) {
  throw new Error(`Phase 4 ranking taxonomy mismatch: expected ${RANKING_CONFIG.taxonomyVersion}, found ${TAXONOMY.version}.`);
}

const WEIGHTS = RANKING_CONFIG.weights;
const KEYWORDS = RANKING_CONFIG.keywords;
const PRODUCT_VOCABULARY = buildVocabularyIndex(
  { ...ROUTING_CONFIG.vocabulary?.products, ...ROUTING_CONFIG.vocabulary?.scopes },
  TAXONOMY.candidateDetectionExcludedTerms?.productOrScope
);
const ACTIVITY_VOCABULARY = buildVocabularyIndex(
  { ...ROUTING_CONFIG.vocabulary?.activities, sales: ROUTING_CONFIG.vocabulary?.scopes?.sales },
  TAXONOMY.candidateDetectionExcludedTerms?.activity
);
const SECTOR_VOCABULARY = buildVocabularyIndex(ROUTING_CONFIG.vocabulary?.sectors);
const UNIT_VOCABULARY = buildVocabularyIndex(ROUTING_CONFIG.vocabulary?.units);
const UNIT_REMOVAL_TOKENS = new Set(
  [...UNIT_VOCABULARY.values()].flatMap(terms => terms.flatMap(tokenize))
);
const TIER_INDEX = new Map(RANKING_CONFIG.tierOrder.map((tier, index) => [tier, index]));

export const RANKING_CONFIG_VERSION = RANKING_CONFIG.version;
export const RANKING_TAXONOMY_VERSION = TAXONOMY.version;

export function rankLocalCandidates(intent, retrievalResult) {
  validateInputs(intent, retrievalResult);
  const resolvedIntent = resolveStructuredIntent(intent);
  const rankedRetrievals = (retrievalResult.retrievals || []).map(retrieval =>
    rankRetrieval(resolvedIntent, retrieval, retrievalResult.routeFamily)
  );

  return {
    ...retrievalResult,
    retrievals: rankedRetrievals,
    diagnostics: {
      ...retrievalResult.diagnostics,
      rankingApplied: true,
      semanticRerankingApplied: false,
      rankingStrategy: "deterministic_tiers_fielded_idf",
      rankingConfigVersion: RANKING_CONFIG_VERSION,
      rankingTaxonomyVersion: RANKING_TAXONOMY_VERSION,
      rankingWarnings: dedupePreserveOrder(rankedRetrievals.flatMap(item => item.diagnostics.rankingWarnings || []))
    }
  };
}

export function rankRetrieval(intent, retrieval, routeFamilyOverride = null) {
  intent = resolveStructuredIntent(intent);
  const enrichedRetrieval = {
    ...retrieval,
    routeFamily: retrieval?.routeFamily || routeFamilyOverride || null
  };
  const partition = prepareCandidates(enrichedRetrieval);
  const context = buildScoringContext(intent, enrichedRetrieval, partition.eligible);
  const scored = partition.eligible.map(item => scoreCandidate(intent, enrichedRetrieval, item, context));
  const accepted = [];
  const semanticRejected = [];

  for (const candidate of scored) {
    if (candidate.ranking.signals.semanticFloorPassed) accepted.push(candidate);
    else semanticRejected.push(candidate);
  }
  accepted.sort(compareRankedCandidates);

  const primaryCandidates = accepted.filter(candidate => candidate.ranking.tier === "A");
  const fallbackCandidates = accepted.filter(candidate => candidate.ranking.tier !== "A");
  const families = groupCandidateFamilies(accepted);
  const displayCandidates = families
    .map(family => family.representative)
    .filter(candidate => candidate.ranking.score >= RANKING_CONFIG.scoreScale.displayThreshold)
    .slice(0, RANKING_CONFIG.scoreScale.displayLimit);
  const rankingWarnings = dedupePreserveOrder([
    ...partition.warnings,
    ...accepted.flatMap(candidate => candidate.ranking.warnings),
    ...semanticRejected.flatMap(candidate => candidate.ranking.warnings)
  ]);

  return {
    ...enrichedRetrieval,
    primaryCandidates,
    fallbackCandidates,
    rankedCandidates: accepted,
    displayCandidates,
    candidateFamilies: families.map(family => ({
      familyId: family.familyId,
      representativeCandidateId: family.representative.candidate_id,
      candidateIds: family.candidates.map(candidate => candidate.candidate_id),
      variantCount: family.candidates.length
    })),
    excludedCandidates: [
      ...partition.excluded,
      ...semanticRejected.map(candidate => ({
        candidateId: candidate.candidate_id,
        reasonCodes: candidate.ranking.signals.semanticFloorFailures
      }))
    ],
    diagnostics: {
      ...enrichedRetrieval.diagnostics,
      rankingApplied: true,
      semanticRerankingApplied: false,
      rankingStrategy: "deterministic_tiers_fielded_idf",
      rankingConfigVersion: RANKING_CONFIG_VERSION,
      rankingTaxonomyVersion: RANKING_TAXONOMY_VERSION,
      rankingWarnings,
      scoreScale: RANKING_CONFIG.scoreScale,
      topScore: accepted[0]?.ranking.score ?? null,
      topReasonCodes: accepted[0]?.ranking.reasonCodes || [],
      displayCount: displayCandidates.length,
      familyCount: families.length,
      excludedBeforeScoring: partition.excluded.length,
      excludedBySemanticFloor: semanticRejected.length,
      belowDisplayThreshold: accepted.filter(candidate => candidate.ranking.score < RANKING_CONFIG.scoreScale.displayThreshold).length
    }
  };
}

function prepareCandidates(retrieval) {
  const eligible = [];
  const excluded = [];
  const warnings = [];
  const seenSelectors = new Set();

  for (const [sourcePool, candidates] of [
    ["primary", retrieval.primaryCandidates || []],
    ["fallback", retrieval.fallbackCandidates || []]
  ]) {
    for (const [originalIndex, candidate] of candidates.entries()) {
      const eligibility = assessEligibility(retrieval, candidate);
      const candidateId = candidate?.candidate_id || `candidate_${originalIndex}`;
      if (!eligibility.eligible) {
        excluded.push({ candidateId, reasonCodes: eligibility.reasonCodes });
        warnings.push(...eligibility.reasonCodes.map(code => formatWarning(candidate, code, sourcePool, originalIndex)));
        continue;
      }

      const selectorKey = canonicalSelectorKey(candidate.selector);
      if (seenSelectors.has(selectorKey)) {
        excluded.push({ candidateId, reasonCodes: ["duplicate_canonical_selector"] });
        warnings.push(formatWarning(candidate, "duplicate_canonical_selector", sourcePool, originalIndex));
        continue;
      }
      seenSelectors.add(selectorKey);
      eligible.push({ candidate, sourcePool, originalIndex, eligibility });
      warnings.push(...eligibility.warnings.map(code => formatWarning(candidate, code, sourcePool, originalIndex)));
    }
  }

  return { eligible, excluded, warnings };
}

function assessEligibility(retrieval, candidate) {
  const reasonCodes = [];
  const warnings = [];
  const routeFamily = normalizeText(retrieval?.routeFamily);
  const candidateFamily = normalizeText(candidate?.route_family);
  const targetGeography = normalizeText(retrieval?.geography?.code);
  const candidateGeography = normalizeText(candidate?.geography?.code);
  const selectorGeography = normalizeText(selectorGeographyCode(candidate));
  const expectedFrequency = normalizeText(retrieval?.frequency?.value || retrieval?.frequency);
  const actualFrequency = normalizeText(candidate?.frequency);
  const approvedFallback = findApprovedFallback(retrieval, candidate);

  if (!routeFamily || !candidateFamily || (candidateFamily !== routeFamily && !approvedFallback)) {
    return { eligible: false, effectivePool: null, reasonCodes: ["route_family_mismatch"], warnings };
  }
  reasonCodes.push(approvedFallback?.reasonCode || "route_family_validated");
  if (approvedFallback) warnings.push(approvedFallback.reasonCode);

  if (!targetGeography || !candidateGeography || candidateGeography !== targetGeography) {
    return { eligible: false, effectivePool: null, reasonCodes: ["geography_mismatch"], warnings };
  }
  reasonCodes.push("geography_validated");

  if (selectorGeography && selectorGeography !== targetGeography) {
    return { eligible: false, effectivePool: null, reasonCodes: ["selector_geography_mismatch"], warnings };
  }
  if (selectorGeography) reasonCodes.push("selector_geography_validated");

  if (expectedFrequency && actualFrequency && actualFrequency !== expectedFrequency) {
    warnings.push("wrong_frequency_fallback");
    reasonCodes.push("wrong_frequency_fallback");
    return { eligible: true, effectivePool: "fallback", tierHint: "B", reasonCodes, warnings, approvedFallback };
  }
  if (expectedFrequency && !actualFrequency) {
    warnings.push("missing_frequency_fallback");
    reasonCodes.push("missing_frequency_fallback");
    return { eligible: true, effectivePool: "fallback", tierHint: "B", reasonCodes, warnings, approvedFallback };
  }

  reasonCodes.push("frequency_validated");
  return { eligible: true, effectivePool: null, tierHint: null, reasonCodes, warnings, approvedFallback };
}

function findApprovedFallback(retrieval, candidate) {
  const requestedFrequency = normalizeText(retrieval?.frequency?.value || retrieval?.frequency);
  return (TAXONOMY.approvedFallbacks || []).find(fallback =>
    normalizeText(fallback.fromRoute) === normalizeText(retrieval?.routeFamily) &&
    normalizeText(fallback.toRoute) === normalizeText(candidate?.route_family) &&
    normalizeText(fallback.geographyType) === normalizeText(retrieval?.geography?.type) &&
    fallback.requestedFrequencies.map(normalizeText).includes(requestedFrequency) &&
    normalizeText(fallback.candidateFrequency) === normalizeText(candidate?.frequency)
  ) || null;
}

function buildScoringContext(intent, retrieval, preparedCandidates) {
  const queryTokens = lexicalQueryTokens(intent, retrieval);
  const documents = preparedCandidates.map(item => candidateAreas(item.candidate));
  const idf = new Map();
  for (const token of queryTokens) {
    const documentFrequency = documents.filter(areas => Object.values(areas).some(value => tokenSet(value).has(token))).length;
    idf.set(token, Math.log((documents.length + 1) / (documentFrequency + 1)) + 1);
  }
  return { queryTokens, idf };
}

function scoreCandidate(intent, retrieval, prepared, context) {
  const candidate = prepared.candidate;
  const areas = candidateAreas(candidate);
  const detectedActivities = detectVocabulary(areas, ACTIVITY_VOCABULARY, ["title", "measure", "activity"]);
  const detectedProducts = detectVocabulary(areas, PRODUCT_VOCABULARY, ["title", "measure", "productOrScope", "facets"]);
  for (const activity of detectedActivities.keys()) {
    for (const product of TAXONOMY.activityImpliedProducts?.[activity] || []) {
      if (!detectedProducts.has(product)) detectedProducts.set(product, `implied_by_${activity}`);
    }
  }

  const requestedProduct = normalizeText(intent?.product || intent?.scope);
  const requestedActivity = normalizeText(effectiveActivity(intent, retrieval));
  const explicitActivity = Boolean(normalizeText(intent?.activity));
  const weakActivity = !explicitActivity && retrieval?.concept?.activitySource === "weak_inference";
  const productMatch = conceptCompatibility({
    requested: requestedProduct,
    detected: detectedProducts,
    relationships: TAXONOMY.productRelationships,
    alternatives: intent?.productAlternatives,
    dimension: "product"
  });
  const activityMatch = conceptCompatibility({
    requested: requestedActivity,
    detected: detectedActivities,
    relationships: TAXONOMY.activityRelationships,
    dimension: "activity"
  });

  const components = {};
  components.productOrScope = component(
    requestedProduct ? WEIGHTS.productOrScope : 0,
    productMatch.compatibility,
    productMatch.reasonCodes
  );
  const activityMaximum = requestedActivity
    ? WEIGHTS.activity * (weakActivity ? RANKING_CONFIG.weakInferenceWeightFactor : 1)
    : 0;
  components.activity = component(activityMaximum, activityMatch.compatibility, activityMatch.reasonCodes);

  const aggregation = aggregationCompatibility(intent, candidate, productMatch, activityMatch);
  components.measureOrAggregation = component(WEIGHTS.measureOrAggregation, aggregation.compatibility, aggregation.reasonCodes);

  const lexical = fieldedLexicalCompatibility(areas, context);
  components.fieldedLexical = component(context.queryTokens.length ? WEIGHTS.fieldedLexical : 0, lexical.compatibility, lexical.reasonCodes);

  const sector = vocabularyCompatibility(intent?.sector, areas, SECTOR_VOCABULARY, ["title", "sector", "facets"]);
  components.sector = component(intent?.sector ? WEIGHTS.sector : 0, sector.compatibility, sector.reasonCodes);

  const frequency = frequencyCompatibility(retrieval, candidate);
  components.frequency = component(hasExplicitFrequency(intent) ? WEIGHTS.frequency : 0, frequency.compatibility, frequency.reasonCodes);

  const unit = vocabularyCompatibility(intent?.unit, areas, UNIT_VOCABULARY, ["title", "unit", "facets"]);
  components.unit = component(intent?.unit ? WEIGHTS.unit : 0, unit.compatibility, unit.reasonCodes);

  const coverage = coverageCompatibility(intent, candidate);
  components.requestedDateCoverage = component(coverage.active ? WEIGHTS.requestedDateCoverage : 0, coverage.compatibility, coverage.reasonCodes);

  const currentness = currentnessCompatibility(candidate);
  components.currentness = component(WEIGHTS.currentness, currentness.compatibility, currentness.reasonCodes);

  const availability = availabilityCompatibility(candidate);
  components.availability = component(WEIGHTS.availability, availability.compatibility, availability.reasonCodes);

  const totalPoints = Object.values(components).reduce((sum, value) => sum + value.points, 0);
  const totalMaximum = Object.values(components).reduce((sum, value) => sum + value.maximum, 0);
  const score = clamp(totalMaximum ? (totalPoints / totalMaximum) * 100 : 0, 0, 100);
  const semanticFloorFailures = [];
  if (requestedProduct && productMatch.compatibility < RANKING_CONFIG.semanticFloors.productOrScope) {
    semanticFloorFailures.push("product_or_scope_semantic_floor_failed");
  }
  if (explicitActivity && activityMatch.compatibility < RANKING_CONFIG.semanticFloors.activity) {
    semanticFloorFailures.push("activity_semantic_floor_failed");
  }

  const tier = assignTier(prepared, productMatch, activityMatch, explicitActivity);
  const familyId = candidateFamilyId(candidate, retrieval, detectedProducts, detectedActivities);
  const warnings = dedupePreserveOrder([
    ...prepared.eligibility.warnings,
    ...productMatch.warnings,
    ...activityMatch.warnings,
    ...aggregation.warnings,
    ...coverage.warnings,
    ...currentness.warnings,
    ...availability.warnings,
    ...(weakActivity ? [retrieval.concept?.activityInference?.warning || intent?.activityInference?.warning || "No explicit activity was found; a weak activity hint was used for ranking."] : []),
    ...semanticFloorFailures
  ]);
  const reasonCodes = dedupePreserveOrder([
    `tier_${tier}`,
    `source_pool_${prepared.sourcePool}`,
    ...prepared.eligibility.reasonCodes,
    ...Object.values(components).flatMap(value => value.reasonCodes),
    ...(weakActivity ? [retrieval.concept?.activityInference?.reasonCode || "activity_inferred_from_weak_hint"] : []),
    ...semanticFloorFailures
  ]);

  return {
    ...candidate,
    ranking: {
      score: round(score),
      tier,
      tierLabel: RANKING_CONFIG.tiers[tier],
      reasonCodes,
      warnings,
      components,
      signals: {
        sourcePool: prepared.sourcePool,
        familyId,
        productCompatibility: round(productMatch.compatibility),
        activityCompatibility: round(activityMatch.compatibility),
        detectedProducts: [...detectedProducts.keys()].sort(),
        detectedActivities: [...detectedActivities.keys()].sort(),
        semanticFloorPassed: semanticFloorFailures.length === 0,
        semanticFloorFailures,
        approvedFallback: prepared.eligibility.approvedFallback?.reasonCode || null,
        matchedCoverage: coverage.matched || null
      }
    }
  };
}

function conceptCompatibility({ requested, detected, relationships = {}, alternatives = [], dimension }) {
  if (!requested) return { compatibility: 0, reasonCodes: [], warnings: [] };
  let compatibility = detected.has(requested) ? 1 : 0;
  let matched = detected.has(requested) ? requested : null;
  let kind = detected.has(requested) ? "exact" : "missing";

  for (const candidateConcept of detected.keys()) {
    const related = Number(relationships?.[requested]?.[candidateConcept] || 0);
    const alternative = (alternatives || []).map(normalizeText).includes(candidateConcept) ? 0.85 : 0;
    const candidateCompatibility = Math.max(related, alternative);
    if (candidateCompatibility > compatibility) {
      compatibility = candidateCompatibility;
      matched = candidateConcept;
      kind = related >= alternative ? "related" : "approved_alternative";
    }
  }

  const warnings = [];
  const reasonCodes = matched ? [`${dimension}_${kind}_${matched.replaceAll(" ", "_")}`] : [`${dimension}_not_matched`];
  for (const cap of TAXONOMY.compatibilityCaps || []) {
    if (normalizeText(cap.dimension) !== dimension || normalizeText(cap.requested) !== requested) continue;
    if (!cap.candidateContainsAll.map(normalizeText).every(value => detected.has(value))) continue;
    if (compatibility > cap.maximum) compatibility = cap.maximum;
    reasonCodes.push(cap.reasonCode);
    warnings.push(cap.reasonCode);
  }

  const relatedConcepts = new Set([requested, ...Object.keys(relationships?.[requested] || {}).map(normalizeText)]);
  const unrelatedExtras = [...detected.keys()].filter(value => !relatedConcepts.has(value));
  if (compatibility > 0 && unrelatedExtras.length > 0) {
    compatibility = Math.max(0, compatibility - Math.min(0.3, unrelatedExtras.length * 0.1));
    reasonCodes.push(`${dimension}_extra_concept_penalty`);
    warnings.push(`${dimension}_contains_unrequested_concepts`);
  }

  return { compatibility: clamp(compatibility, 0, 1), reasonCodes, warnings };
}

function aggregationCompatibility(intent, candidate, productMatch, activityMatch) {
  const text = candidateText(candidate, ["title", "measure", "description", "conceptType"]);
  const query = normalizeText(intent?.correctedQuery || intent?.normalizedQuery || intent?.originalQuery);
  const derived = (KEYWORDS.derivedMetric || []).find(keyword => phraseIncludes(text, keyword));
  const derivedRequested = derived && phraseIncludes(query, derived);
  const aggregate = (KEYWORDS.aggregation || []).some(keyword => phraseIncludes(text, keyword));
  const allSectors = (KEYWORDS.allSectorsAggregate || []).some(keyword => phraseIncludes(text, keyword));
  const areas = candidateAreas(candidate);
  const detectedSectors = detectVocabulary(areas, SECTOR_VOCABULARY, ["title", "sector", "facets"]);
  const sectorSpecific = !intent?.sector && (
    detectedSectors.size > 0 ||
    (KEYWORDS.sectorSpecific || []).some(keyword => phraseIncludes(text, keyword))
  );
  const verified = candidate?.selector_source === "official_series_metadata";
  const exactConcepts = productMatch.compatibility >= 0.99 && (!intent?.activity || activityMatch.compatibility >= 0.99);

  if (derived && !derivedRequested) {
    return { compatibility: RANKING_CONFIG.aggregation.derivedUnrequested, reasonCodes: ["derived_metric_not_requested"], warnings: ["derived_metric_not_requested"] };
  }
  if (sectorSpecific) {
    return { compatibility: 0.35, reasonCodes: ["unrequested_sector_specific"], warnings: ["sector_specific_not_requested"] };
  }
  if (!intent?.sector && allSectors) {
    return { compatibility: 1, reasonCodes: ["all_sectors_aggregate_priority"], warnings: [] };
  }
  if (verified && aggregate && exactConcepts) {
    return { compatibility: RANKING_CONFIG.aggregation.exactVerified, reasonCodes: ["exact_verified_aggregate"], warnings: [] };
  }
  if (verified && aggregate) {
    return { compatibility: RANKING_CONFIG.aggregation.verifiedAggregate, reasonCodes: ["verified_aggregate"], warnings: [] };
  }
  if (aggregate) {
    return { compatibility: RANKING_CONFIG.aggregation.aggregate, reasonCodes: ["aggregate_metadata_match"], warnings: [] };
  }
  return { compatibility: RANKING_CONFIG.aggregation.ordinarySeries, reasonCodes: ["ordinary_series"], warnings: [] };
}

function fieldedLexicalCompatibility(areas, context) {
  if (context.queryTokens.length === 0) return { compatibility: 0, reasonCodes: [] };
  const maximumFieldWeight = Math.max(...Object.values(RANKING_CONFIG.fieldWeights));
  let earned = 0;
  let possible = 0;
  const reasonCodes = [];

  for (const token of context.queryTokens) {
    const idf = context.idf.get(token) || 1;
    possible += idf * maximumFieldWeight;
    let bestField = null;
    let bestWeight = 0;
    for (const [field, weight] of Object.entries(RANKING_CONFIG.fieldWeights)) {
      if (weight <= bestWeight || !tokenSet(areas[field]).has(token)) continue;
      bestField = field;
      bestWeight = weight;
    }
    if (bestField) {
      earned += idf * bestWeight;
      reasonCodes.push(`lexical_${bestField}_${token}`);
    }
  }
  return { compatibility: possible ? earned / possible : 0, reasonCodes };
}

function vocabularyCompatibility(requestedValue, areas, vocabulary, fields) {
  const requested = normalizeText(requestedValue);
  if (!requested) return { compatibility: 0, reasonCodes: [] };
  const terms = vocabulary.get(requested) || [requested];
  const matched = fields.some(field => terms.some(term => phraseIncludes(areas[field], term)));
  return {
    compatibility: matched ? 1 : 0,
    reasonCodes: [matched ? `${requested.replaceAll(" ", "_")}_exact` : `${requested.replaceAll(" ", "_")}_not_matched`]
  };
}

function frequencyCompatibility(retrieval, candidate) {
  const expected = normalizeText(retrieval?.frequency?.value || retrieval?.frequency);
  const actual = normalizeText(candidate?.frequency);
  if (expected && actual === expected) return { compatibility: 1, reasonCodes: ["frequency_exact"] };
  if (!actual) return { compatibility: 0, reasonCodes: ["frequency_missing"] };
  return { compatibility: 0, reasonCodes: ["frequency_fallback", "frequency_mismatch_fallback"] };
}

function coverageCompatibility(intent, candidate) {
  const requested = resolveRequestedPeriod(intent);
  if (!requested) return { active: false, compatibility: 0, reasonCodes: [], warnings: [], matched: null };
  const start = parsePeriod(candidate?.date_start);
  const end = parsePeriod(candidate?.date_end);
  const target = parsePeriod(requested);
  if (start == null || end == null || target == null) {
    return { active: true, compatibility: 0, reasonCodes: ["coverage_unchecked"], warnings: ["coverage_unchecked"], matched: null };
  }
  if (start <= target && target <= end) {
    return { active: true, compatibility: 1, reasonCodes: ["requested_date_covered"], warnings: [], matched: requested };
  }
  return { active: true, compatibility: 0, reasonCodes: ["requested_date_not_covered"], warnings: ["requested_date_not_covered"], matched: null };
}

function currentnessCompatibility(candidate) {
  if (candidate?.is_active === true) return { compatibility: 1, reasonCodes: ["current_active"], warnings: [] };
  if (candidate?.is_active === false) return { compatibility: RANKING_CONFIG.quality.inactiveCurrentness, reasonCodes: ["candidate_inactive"], warnings: ["candidate_inactive"] };
  return { compatibility: RANKING_CONFIG.quality.unknownCurrentness, reasonCodes: ["currentness_unknown"], warnings: ["currentness_unknown"] };
}

function availabilityCompatibility(candidate) {
  if (parsePeriod(candidate?.date_end) != null) return { compatibility: 1, reasonCodes: ["availability_present"], warnings: [] };
  return { compatibility: RANKING_CONFIG.quality.missingAvailability, reasonCodes: ["date_end_missing"], warnings: ["date_end_missing"] };
}

function assignTier(prepared, productMatch, activityMatch, explicitActivity) {
  if (prepared.eligibility.tierHint === "B") return "B";
  if (
    prepared.sourcePool === "fallback" ||
    productMatch.compatibility < 0.99 ||
    (explicitActivity && activityMatch.compatibility < 0.99) ||
    !explicitActivity
  ) return "C";
  return "A";
}

function groupCandidateFamilies(candidates) {
  const groups = new Map();
  for (const candidate of candidates) {
    const familyId = candidate.ranking.signals.familyId;
    if (!groups.has(familyId)) groups.set(familyId, []);
    groups.get(familyId).push(candidate);
  }
  return [...groups.entries()].map(([familyId, familyCandidates]) => ({
    familyId,
    representative: familyCandidates[0],
    candidates: familyCandidates
  }));
}

function candidateFamilyId(candidate, retrieval, products, activities) {
  const geographyTokens = new Set(tokenize(`${retrieval?.geography?.name || ""} ${retrieval?.geography?.code || ""}`));
  const removable = new Set([
    ...geographyTokens,
    ...UNIT_REMOVAL_TOKENS,
    "annual", "annually", "monthly", "quarterly", "yearly", "month", "quarter", "year"
  ]);
  const core = tokenize(candidate?.title)
    .filter(token => !removable.has(token) && !/^\d{4,6}$/.test(token))
    .join(" ");
  return normalizeText([
    candidate?.route_family,
    [...products.keys()].sort().join("+"),
    [...activities.keys()].sort().join("+"),
    candidate?.concept_type,
    core
  ].join("|"));
}

function detectVocabulary(areas, vocabulary, fields) {
  const detected = new Map();
  for (const [concept, terms] of vocabulary.entries()) {
    const match = terms.find(term => fields.some(field => phraseIncludes(areas[field], term)));
    if (match) detected.set(concept, match);
  }
  return detected;
}

function buildVocabularyIndex(items = {}, excludedTerms = []) {
  const excluded = new Set((excludedTerms || []).map(normalizeText));
  return new Map(Object.entries(items || {}).filter(([, config]) => config).map(([value, config]) => [
    normalizeText(value),
    dedupePreserveOrder([value, ...(config.terms || [])].map(normalizeText).filter(term => term && !excluded.has(term)))
  ]));
}

function lexicalQueryTokens(intent, retrieval) {
  const query = intent?.correctedQuery || intent?.normalizedQuery || intent?.originalQuery || "";
  const excluded = new Set([
    ...DEFAULT_STOP_WORDS,
    ...tokenize(`${retrieval?.geography?.name || ""} ${retrieval?.geography?.code || ""}`),
    "annual", "annually", "monthly", "quarterly", "yearly", "month", "months", "quarter", "quarters", "year", "years"
  ]);
  return dedupePreserveOrder(tokenize(query).filter(token => token.length > 2 && !excluded.has(token) && !/^\d{4}$/.test(token)));
}

function component(maximum, compatibility, reasonCodes) {
  const safeMaximum = Number(maximum) || 0;
  const safeCompatibility = clamp(Number(compatibility) || 0, 0, 1);
  return {
    active: safeMaximum > 0,
    points: round(safeMaximum * safeCompatibility),
    maximum: round(safeMaximum),
    compatibility: round(safeCompatibility),
    reasonCodes: dedupePreserveOrder(reasonCodes || [])
  };
}

function compareRankedCandidates(left, right) {
  const tierDifference = (TIER_INDEX.get(left.ranking.tier) ?? 99) - (TIER_INDEX.get(right.ranking.tier) ?? 99);
  if (tierDifference !== 0) return tierDifference;
  if (right.ranking.score !== left.ranking.score) return right.ranking.score - left.ranking.score;
  const selectorDifference = canonicalSelectorKey(left.selector).localeCompare(canonicalSelectorKey(right.selector));
  if (selectorDifference !== 0) return selectorDifference;
  return String(left.candidate_id || "").localeCompare(String(right.candidate_id || ""));
}

function candidateAreas(candidate) {
  return {
    title: normalizeText(candidate?.title),
    description: normalizeText(candidate?.description),
    measure: normalizeText(`${candidate?.activity || ""} ${candidate?.selector?.measure || ""}`),
    productOrScope: normalizeText(candidate?.product_or_scope),
    activity: normalizeText(candidate?.activity),
    facets: normalizeText(Object.values(candidate?.selector?.facets || {}).join(" ")),
    conceptType: normalizeText(candidate?.concept_type),
    unit: normalizeText(candidate?.unit),
    sector: normalizeText(candidate?.sector)
  };
}

function candidateText(candidate, fields) {
  const areas = candidateAreas(candidate);
  return fields.map(field => areas[field] || "").join(" ");
}

function hasExplicitFrequency(intent) {
  return Array.isArray(intent?.mentions?.frequencies) && intent.mentions.frequencies.length > 0;
}

function effectiveActivity(intent, retrieval) {
  return intent?.activity || retrieval?.concept?.activity || null;
}

function resolveRequestedPeriod(intent) {
  if (!intent || typeof intent !== "object") return "";
  if (typeof intent.requestedPeriod === "string") return intent.requestedPeriod;
  if (typeof intent.requestedDate === "string") return intent.requestedDate;
  if (typeof intent.date === "string") return intent.date;
  const range = intent.requestedDateRange || intent.dateRange;
  return range && typeof range.start === "string" ? range.start : "";
}

function parsePeriod(value) {
  const text = String(value || "").trim();
  const compact = text.match(/^(\d{4})(\d{2})$/);
  if (compact) return Number(compact[1]) * 12 + Number(compact[2]);
  const yearMonth = text.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (yearMonth) return Number(yearMonth[1]) * 12 + Number(yearMonth[2]);
  const year = text.match(/^(\d{4})$/);
  return year ? Number(year[1]) * 12 : null;
}

function selectorGeographyCode(candidate) {
  const facets = candidate?.selector?.facets || {};
  return facets.countryRegionId || facets.stateId || facets.stateid || null;
}

function canonicalSelectorKey(selector) {
  const facets = Object.entries(selector?.facets || {}).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([selector?.route, selector?.measure, selector?.frequency, facets]);
}

function validateInputs(intent, retrievalResult) {
  if (!intent || typeof intent !== "object") throw new TypeError("Phase 4 ranking requires a structured intent.");
  if (!retrievalResult || typeof retrievalResult !== "object" || !Array.isArray(retrievalResult.retrievals)) {
    throw new TypeError("Phase 4 ranking requires a Phase 3 retrieval result.");
  }
}

function resolveStructuredIntent(intent) {
  if (!intent?.structuredIntent || typeof intent.structuredIntent !== "object") return intent;
  return {
    ...intent,
    ...intent.structuredIntent,
    requestedPeriod: intent.requestedPeriod ?? intent.structuredIntent.requestedPeriod,
    requestedDate: intent.requestedDate ?? intent.structuredIntent.requestedDate,
    requestedDateRange: intent.requestedDateRange ?? intent.structuredIntent.requestedDateRange
  };
}

function formatWarning(candidate, code, sourcePool, index) {
  return `${candidate?.candidate_id || `candidate_${index}`}:${sourcePool}:${code}`;
}

function tokenSet(value) {
  return new Set(tokenize(value));
}

function tokenize(value) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function phraseIncludes(text, phrase) {
  const cleanText = ` ${normalizeText(text)} `;
  const cleanPhrase = ` ${normalizeText(phrase)} `;
  return cleanPhrase.trim() !== "" && cleanText.includes(cleanPhrase);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dedupePreserveOrder(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value) {
  return Math.round((Number(value) || 0) * 10) / 10;
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "of", "on", "or", "over", "the", "to", "with",
  "please", "show", "tell", "data", "series", "chart", "table", "report", "latest", "current"
]);
