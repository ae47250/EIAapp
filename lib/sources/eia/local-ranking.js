import { readFileSync } from "node:fs";

const RANKING_CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase4-ranking-config.json", import.meta.url), "utf8"));
const WEIGHTS = RANKING_CONFIG.weights;
const KEYWORDS = RANKING_CONFIG.keywords;

const PRODUCT_ALIASES = new Map([
  ["electricity", ["electricity", "electric power", "power"]],
  ["petroleum", ["petroleum", "oil", "crude oil", "liquid fuels", "gasoline", "diesel"]],
  ["natural gas", ["natural gas", "dry natural gas", "marketed natural gas", "gas"]],
  ["renewable", ["renewable", "renewables", "renewable energy"]],
  ["hydro", ["hydro", "hydroelectric", "hydropower"]],
  ["solar", ["solar"]],
  ["wind", ["wind"]],
  ["biofuels", ["biofuel", "biofuels", "biomass"]],
  ["total energy", ["total energy", "primary energy", "energy"]]
]);

const ACTIVITY_ALIASES = new Map([
  ["consumption", ["consumption", "consumed", "use", "used", "demand"]],
  ["production", ["production", "produced", "supply", "output"]],
  ["generation", ["generation", "generated", "net generation", "electricity generation", "power generation"]],
  ["imports", ["imports", "imported", "import"]],
  ["exports", ["exports", "exported", "export"]],
  ["reserves", ["reserves", "reserve"]],
  ["capacity", ["capacity"]],
  ["prices", ["price", "prices", "cost"]]
]);

const SECTOR_ALIASES = new Map([
  ["residential", ["residential"]],
  ["commercial", ["commercial"]],
  ["industrial", ["industrial"]],
  ["transportation", ["transportation"]],
  ["electric power", ["electric power", "utility"]],
  ["utility", ["utility"]]
]);

const UNIT_ALIASES = new Map([
  ["btu", ["btu", "quadrillion btu", "million btu"]],
  ["kwh", ["kwh", "kilowatthours", "kilowatt hours"]],
  ["barrels", ["barrels", "barrels per day"]],
  ["cubic feet", ["cubic feet", "cf", "bcf"]],
  ["dollars", ["dollars", "price", "cost"]],
  ["megawatts", ["megawatts", "mw"]]
]);

const STABLE_BASE_YEAR = 1900;

export const RANKING_CONFIG_VERSION = RANKING_CONFIG.version;

export function rankLocalCandidates(intent, retrievalResult) {
  validateInputs(intent, retrievalResult);

  const rankedRetrievals = (retrievalResult.retrievals || []).map(retrieval => rankRetrieval(intent, retrieval, retrievalResult.routeFamily));
  return {
    ...retrievalResult,
    retrievals: rankedRetrievals,
    diagnostics: {
      ...retrievalResult.diagnostics,
      rankingApplied: true,
      semanticRerankingApplied: false,
      rankingStrategy: "deterministic_field_weights",
      rankingConfigVersion: RANKING_CONFIG_VERSION,
      rankingWarnings: rankedRetrievals.flatMap(item => item.diagnostics?.rankingWarnings || [])
    }
  };
}

export function rankRetrieval(intent, retrieval, routeFamilyOverride = null) {
  const enrichedRetrieval = {
    ...retrieval,
    routeFamily: retrieval?.routeFamily || routeFamilyOverride || null
  };
  const partition = partitionCandidates(intent, enrichedRetrieval);
  const primaryCandidates = scorePool(intent, enrichedRetrieval, partition.primary, "primary");
  const fallbackCandidates = scorePool(intent, enrichedRetrieval, partition.fallback, "fallback");
  const rankedCandidates = [...primaryCandidates, ...fallbackCandidates];
  const rankingWarnings = [
    ...partition.warnings,
    ...primaryCandidates.flatMap(candidate => candidate.ranking.warnings),
    ...fallbackCandidates.flatMap(candidate => candidate.ranking.warnings)
  ];

  return {
    ...enrichedRetrieval,
    primaryCandidates,
    fallbackCandidates,
    rankedCandidates,
    diagnostics: {
      ...enrichedRetrieval.diagnostics,
      rankingApplied: true,
      semanticRerankingApplied: false,
      rankingStrategy: "deterministic_field_weights",
      rankingConfigVersion: RANKING_CONFIG_VERSION,
      rankingWarnings,
      topScore: rankedCandidates[0]?.ranking?.score ?? null,
      topReasonCodes: rankedCandidates[0]?.ranking?.reasonCodes || []
    }
  };
}

function partitionCandidates(intent, retrieval) {
  const buckets = { primary: [], fallback: [], warnings: [] };
  for (const [sourcePool, candidates] of [
    ["primary", retrieval.primaryCandidates || []],
    ["fallback", retrieval.fallbackCandidates || []]
  ]) {
    for (const [index, candidate] of candidates.entries()) {
      const eligibility = assessEligibility(retrieval, candidate);
      if (eligibility.warnings.length > 0) {
        buckets.warnings.push(...eligibility.warnings.map(code => formatWarning(candidate, code, sourcePool, index)));
      }
      if (!eligibility.eligible) continue;
      const effectivePool = eligibility.effectivePool || sourcePool;
      buckets[effectivePool].push({
        candidate,
        sourcePool,
        originalIndex: index,
        eligibilityWarnings: eligibility.warnings
      });
    }
  }
  return buckets;
}

function assessEligibility(retrieval, candidate) {
  const warnings = [];
  const routeFamily = String(retrieval?.routeFamily || "");
  const candidateFamily = String(candidate?.route_family || "");
  const targetGeography = normalizeText(retrieval?.geography?.code || "");
  const candidateGeography = normalizeText(candidate?.geography?.code || "");
  const expectedFrequency = normalizeText(retrieval?.frequency?.value || retrieval?.frequency || "");
  const actualFrequency = normalizeText(candidate?.frequency || "");

  if (!routeFamily || !candidateFamily || candidateFamily !== routeFamily) {
    warnings.push("route_family_mismatch");
    return { eligible: false, effectivePool: null, warnings };
  }

  if (!targetGeography || !candidateGeography || candidateGeography !== targetGeography) {
    warnings.push("geography_mismatch");
    return { eligible: false, effectivePool: null, warnings };
  }

  if (expectedFrequency && actualFrequency && actualFrequency !== expectedFrequency) {
    warnings.push("wrong_frequency_fallback");
    return { eligible: true, effectivePool: "fallback", warnings };
  }

  if (expectedFrequency && !actualFrequency) {
    warnings.push("missing_frequency_fallback");
    return { eligible: true, effectivePool: "fallback", warnings };
  }

  return { eligible: true, effectivePool: null, warnings };
}

function scorePool(intent, retrieval, preparedCandidates, pool) {
  const scored = preparedCandidates.map(item => scoreCandidate(intent, retrieval, item.candidate, pool, item));
  scored.sort(compareRankedCandidates);
  return isBroadIntent(intent) ? diversifyBroadCandidates(scored) : scored;
}

function scoreCandidate(intent, retrieval, candidate, pool, prepared) {
  const reasons = [];
  const warnings = [...(prepared?.eligibilityWarnings || [])];
  let score = WEIGHTS.pool[pool] || 0;
  reasons.push(`pool_${pool}`);

  const tier = candidate?.retrieval?.tier || "partial_tokens";
  score += WEIGHTS.tier[tier] || 0;
  reasons.push(`tier_${tier}`);

  if (candidate?.route_family === retrieval?.routeFamily) {
    score += WEIGHTS.routeAppropriateness || 0;
    reasons.push("route_appropriate");
  }

  const geographySignal = scoreGeography(candidate, retrieval);
  score += geographySignal.score;
  reasons.push(...geographySignal.reasons);
  warnings.push(...geographySignal.warnings);

  const frequencySignal = scoreFrequency(candidate, retrieval);
  score += frequencySignal.score;
  reasons.push(...frequencySignal.reasons);
  warnings.push(...frequencySignal.warnings);

  const productSignal = scoreProductOrScope(intent, candidate);
  score += productSignal.score;
  reasons.push(...productSignal.reasons);
  warnings.push(...productSignal.warnings);

  const activitySignal = scoreActivity(intent, candidate);
  score += activitySignal.score;
  reasons.push(...activitySignal.reasons);
  warnings.push(...activitySignal.warnings);

  const sectorSignal = scoreSector(intent, candidate);
  score += sectorSignal.score;
  reasons.push(...sectorSignal.reasons);
  warnings.push(...sectorSignal.warnings);

  const unitSignal = scoreUnit(intent, candidate);
  score += unitSignal.score;
  reasons.push(...unitSignal.reasons);
  warnings.push(...unitSignal.warnings);

  const lexicalSignal = scoreLexicalMetadata(intent, candidate);
  score += lexicalSignal.score;
  reasons.push(...lexicalSignal.reasons);
  warnings.push(...lexicalSignal.warnings);

  const coverageSignal = scoreRequestedCoverage(intent, candidate);
  score += coverageSignal.score;
  reasons.push(...coverageSignal.reasons);
  warnings.push(...coverageSignal.warnings);

  const aggregationSignal = scoreAggregationRole(intent, candidate, productSignal, activitySignal);
  score += aggregationSignal.score;
  reasons.push(...aggregationSignal.reasons);
  warnings.push(...aggregationSignal.warnings);

  const currentnessSignal = scoreCurrentnessAndAvailability(candidate);
  score += currentnessSignal.score;
  reasons.push(...currentnessSignal.reasons);
  warnings.push(...currentnessSignal.warnings);

  if (isBroadIntent(intent) && productSignal.kind === "alternative") {
    score += WEIGHTS.broadProductAlternative || 0;
    reasons.push("broad_product_alternative");
  }

  if (intent?.activity === "generation" && candidateText(candidate, ["title", "measure"]).includes("generation") === false && candidateText(candidate, ["description"]).includes("generation")) {
    score += WEIGHTS.misleadingDescriptionPenalty || 0;
    reasons.push("generation_only_in_description_penalty");
  }

  return {
    ...candidate,
    ranking: {
      score,
      reasonCodes: dedupePreserveOrder(reasons),
      warnings: dedupePreserveOrder(warnings),
      signals: {
        pool,
        tier,
        familyKey: productSignal.familyKey || activitySignal.familyKey || sectorSignal.familyKey || unitSignal.familyKey || lexicalSignal.familyKey,
        productKind: productSignal.kind,
        matchedCoverage: coverageSignal.matched,
        currentness: currentnessSignal.signal
      }
    }
  };
}

function scoreGeography(candidate, retrieval) {
  const reasons = [];
  const warnings = [];
  const targetCode = normalizeText(retrieval?.geography?.code || "");
  const candidateCode = normalizeText(candidate?.geography?.code || "");
  if (!targetCode || !candidateCode) {
    warnings.push("geography_missing_from_candidate");
    return { score: 0, reasons, warnings };
  }
  if (targetCode === candidateCode) {
    return { score: WEIGHTS.geography.exact || 0, reasons: ["geography_exact"], warnings };
  }
  warnings.push("geography_mismatch");
  return { score: 0, reasons, warnings };
}

function scoreFrequency(candidate, retrieval) {
  const reasons = [];
  const warnings = [];
  const expected = normalizeText(retrieval?.frequency?.value || retrieval?.frequency || "");
  const actual = normalizeText(candidate?.frequency || "");
  if (!expected || !actual) {
    warnings.push("frequency_missing_from_candidate");
    return { score: 0, reasons, warnings };
  }
  if (expected === actual) {
    return { score: WEIGHTS.frequency.exact || 0, reasons: ["frequency_exact"], warnings };
  }
  warnings.push("frequency_mismatch");
  return { score: WEIGHTS.wrongFrequencyFallbackPenalty || 0, reasons: ["frequency_mismatch_fallback"], warnings };
}

function scoreProductOrScope(intent, candidate) {
  const areas = candidateAreas(candidate);
  const terms = buildTermEntries([
    intent?.product,
    ...(intent?.productAlternatives || [])
  ], PRODUCT_ALIASES);
  return scoreTermFamily(areas, terms, WEIGHTS.productOrScope, "product");
}

function scoreActivity(intent, candidate) {
  const areas = candidateAreas(candidate);
  const terms = buildTermEntries([intent?.activity], ACTIVITY_ALIASES);
  return scoreTermFamily(areas, terms, WEIGHTS.activity, "activity");
}

function scoreSector(intent, candidate) {
  const areas = candidateAreas(candidate);
  const terms = buildTermEntries([intent?.sector], SECTOR_ALIASES);
  return scoreTermFamily(areas, terms, WEIGHTS.sector, "sector");
}

function scoreUnit(intent, candidate) {
  const areas = candidateAreas(candidate);
  const terms = buildTermEntries([intent?.unit], UNIT_ALIASES);
  return scoreTermFamily(areas, terms, WEIGHTS.unit, "unit");
}

function scoreLexicalMetadata(intent, candidate) {
  const reasons = [];
  const warnings = [];
  const areas = candidateAreas(candidate);
  const queryText = normalizeText(intent?.correctedQuery || intent?.normalizedQuery || intent?.originalQuery || "");
  const queryTokens = tokenize(queryText).filter(token => token.length > 3 && !DEFAULT_STOP_WORDS.has(token));
  let score = 0;

  if (!queryText) {
    warnings.push("lexical_query_missing");
    return { score, reasons, warnings, familyKey: null };
  }

  if (queryText && phraseIncludes(areas.title, queryText)) {
    score += WEIGHTS.lexical.fullQuery || 0;
    reasons.push("lexical_full_query_title");
  } else if (queryText && phraseIncludes(areas.description, queryText)) {
    score += Math.floor((WEIGHTS.lexical.fullQuery || 0) / 2);
    reasons.push("lexical_full_query_description");
  }

  for (const token of queryTokens) {
    const inTitle = areas.title.includes(token);
    const inDescription = areas.description.includes(token);
    const inMeasure = areas.measure.includes(token);
    const inFacets = areas.facets.includes(token);
    if (!inTitle && !inDescription && !inMeasure && !inFacets) continue;
    if (inTitle) {
      score += WEIGHTS.lexical.title || 0;
      reasons.push(`lexical_token_title_${token}`);
    } else if (inMeasure) {
      score += WEIGHTS.lexical.measure || 0;
      reasons.push(`lexical_token_measure_${token}`);
    } else if (inFacets) {
      score += WEIGHTS.lexical.facets || 0;
      reasons.push(`lexical_token_facets_${token}`);
    } else if (inDescription) {
      score += WEIGHTS.lexical.description || 0;
      reasons.push(`lexical_token_description_${token}`);
    }
  }

  return {
    score,
    reasons,
    warnings,
    familyKey: queryTokens[0] || null
  };
}

function scoreRequestedCoverage(intent, candidate) {
  const reasons = [];
  const warnings = [];
  const requested = resolveRequestedPeriod(intent);
  if (!requested) return { score: 0, reasons, warnings, matched: null };

  const start = parsePeriod(candidate?.date_start);
  const end = parsePeriod(candidate?.date_end);
  const target = parsePeriod(requested);
  if (start == null || end == null || target == null) {
    warnings.push("coverage_unchecked");
    return { score: 0, reasons, warnings, matched: null };
  }

  if (start <= target && target <= end) {
    return { score: WEIGHTS.requestedDateCoverage.covered || 0, reasons: ["requested_date_covered"], warnings, matched: requested };
  }

  warnings.push("requested_date_not_covered");
  return { score: WEIGHTS.requestedDateCoverage.partial || 0, reasons: ["requested_date_partial"], warnings, matched: null };
}

function scoreAggregationRole(intent, candidate, productSignal, activitySignal) {
  const reasons = [];
  const warnings = [];
  const combinedText = candidateText(candidate, ["title", "measure", "description", "facets", "conceptType"]);
  const aggregateMatch = KEYWORDS.aggregation.some(keyword => phraseIncludes(combinedText, keyword));
  const verified = String(candidate?.selector_source || "") === "official_series_metadata";
  const exactProduct = normalizeText(intent?.product || "");
  const exactActivity = normalizeText(intent?.activity || "");
  const exactAggregateMatch = exactProduct && exactActivity
    ? phraseIncludes(candidateText(candidate, ["title", "measure"]), `${exactProduct} ${exactActivity}`) || (phraseIncludes(candidateText(candidate, ["title"]), exactProduct) && phraseIncludes(candidateText(candidate, ["title"]), exactActivity))
    : false;

  let score = 0;
  if (verified && aggregateMatch) {
    score += WEIGHTS.aggregationRole.verified || 0;
    reasons.push("aggregation_verified");
  }
  if (verified && exactAggregateMatch) {
    score += WEIGHTS.aggregationRole.exact || 0;
    reasons.push("aggregation_exact_verified");
  }
  if (productSignal.kind === "primary" && activitySignal.reasons.length > 0 && aggregateMatch) {
    score += Math.floor((WEIGHTS.aggregationRole.verified || 0) / 2);
    reasons.push("aggregation_role_supported");
  }

  return { score, reasons, warnings };
}

function scoreCurrentnessAndAvailability(candidate) {
  const reasons = [];
  const warnings = [];
  let score = 0;

  if (candidate?.is_active === true) {
    score += WEIGHTS.currentness.active || 0;
    reasons.push("current_active");
  } else if (candidate?.is_active === false) {
    warnings.push("candidate_inactive");
  } else {
    warnings.push("availability_unknown");
    score += WEIGHTS.availability.missing || 0;
  }

  const end = parsePeriod(candidate?.date_end);
  if (end == null) {
    warnings.push("date_end_missing");
    score += WEIGHTS.availability.missing || 0;
  } else {
    const recency = Math.max(0, Math.floor(((end - STABLE_BASE_YEAR * 12) / 36) * (WEIGHTS.currentness.recencyScale || 1)));
    score += recency;
    reasons.push("date_end_recency");
    score += WEIGHTS.availability.present || 0;
    reasons.push("availability_present");
  }

  return {
    score,
    reasons,
    warnings,
    signal: {
      active: candidate?.is_active === true,
      dateEnd: candidate?.date_end || null
    }
  };
}

function scoreTermFamily(areas, terms, weights, prefix) {
  const reasons = [];
  const warnings = [];
  let score = 0;
  let matchedKind = null;
  let familyKey = null;

  for (const [areaName, areaText] of Object.entries(areas)) {
    const match = bestTermMatch(areaText, terms, weights[areaName] || 0);
    if (!match) continue;
    score += match.score;
    reasons.push(`${prefix}_${areaName}_${match.kind}`);
    if (!matchedKind || match.score > matchedKind.score) {
      matchedKind = match;
      familyKey = match.term;
    }
  }

  return {
    score,
    reasons,
    warnings,
    kind: matchedKind?.kind || null,
    familyKey
  };
}

function bestTermMatch(text, terms, baseWeight) {
  if (!text || !terms.length) return null;
  let best = null;
  for (const term of terms) {
    if (!phraseIncludes(text, term.term)) continue;
    const score = baseWeight + (term.kind === "primary" ? 20 : 8);
    if (!best || score > best.score || (score === best.score && term.term < best.term)) {
      best = { score, term: term.term, kind: term.kind };
    }
  }
  return best;
}

function buildTermEntries(values, aliasMap) {
  const terms = [];
  for (const value of values || []) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    terms.push({ term: normalized, kind: "primary" });
    for (const alias of aliasMap.get(normalized) || []) {
      terms.push({ term: normalizeText(alias), kind: "primary" });
    }
  }
  return dedupeTerms(terms);
}

function diversifyBroadCandidates(candidates) {
  const groups = new Map();
  const order = [];
  for (const candidate of candidates) {
    const key = candidate.ranking?.signals?.familyKey || canonicalSelectorKey(candidate.selector);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key).push(candidate);
  }

  const output = [];
  while (output.length < candidates.length) {
    let advanced = false;
    for (const key of order) {
      const bucket = groups.get(key);
      if (!bucket || bucket.length === 0) continue;
      output.push(bucket.shift());
      advanced = true;
    }
    if (!advanced) break;
  }
  return output;
}

function compareRankedCandidates(left, right) {
  if (right.ranking.score !== left.ranking.score) return right.ranking.score - left.ranking.score;
  const leftPool = left.ranking.signals.pool === right.ranking.signals.pool ? 0 : left.ranking.signals.pool === "primary" ? -1 : 1;
  if (leftPool !== 0) return leftPool;
  const leftKey = canonicalSelectorKey(left.selector);
  const rightKey = canonicalSelectorKey(right.selector);
  if (leftKey !== rightKey) return leftKey.localeCompare(rightKey);
  return String(left.candidate_id || "").localeCompare(String(right.candidate_id || ""));
}

function canonicalSelectorKey(selector) {
  const facets = Object.entries(selector?.facets || {}).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([selector?.route, selector?.measure, selector?.frequency, facets]);
}

function candidateAreas(candidate) {
  return {
    title: normalizeText(candidate?.title || ""),
    description: normalizeText(candidate?.description || ""),
    measure: normalizeText(candidate?.selector?.measure || ""),
    facets: normalizeText(Object.values(candidate?.selector?.facets || {}).join(" ")),
    conceptType: normalizeText(candidate?.concept_type || ""),
    unit: normalizeText(candidate?.unit || ""),
    sector: normalizeText(candidate?.sector || "")
  };
}

function candidateText(candidate, fields) {
  const areas = candidateAreas(candidate);
  return fields.map(field => areas[field] || "").join(" ");
}

function resolveRequestedPeriod(intent) {
  if (!intent || typeof intent !== "object") return "";
  if (typeof intent.requestedPeriod === "string") return intent.requestedPeriod;
  if (typeof intent.requestedDate === "string") return intent.requestedDate;
  if (typeof intent.date === "string") return intent.date;
  const range = intent.requestedDateRange || intent.dateRange || null;
  if (range && typeof range === "object" && typeof range.start === "string") return range.start;
  return "";
}

function parsePeriod(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const yearMonth = text.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
  if (yearMonth) return Number(yearMonth[1]) * 12 + Number(yearMonth[2]);
  const year = text.match(/^(\d{4})$/);
  if (year) return Number(year[1]) * 12;
  return null;
}

function isBroadIntent(intent) {
  return intent?.productBreadth === "broad" || intent?.productBreadth === "ambiguous" || (intent?.productAlternatives || []).length > 0;
}

function validateInputs(intent, retrievalResult) {
  if (!intent || typeof intent !== "object") {
    throw new TypeError("Phase 4 ranking requires a structured intent.");
  }
  if (!retrievalResult || typeof retrievalResult !== "object" || !Array.isArray(retrievalResult.retrievals)) {
    throw new TypeError("Phase 4 ranking requires a Phase 3 retrieval result.");
  }
}

function formatWarning(candidate, code, sourcePool, index) {
  return `${candidate?.candidate_id || `candidate_${index}`}:${sourcePool}:${code}`;
}

function dedupeTerms(terms) {
  const seen = new Set();
  const output = [];
  for (const term of terms) {
    const key = `${term.kind}:${normalizeText(term.term)}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push({ term: normalizeText(term.term), kind: term.kind });
  }
  return output;
}

function dedupePreserveOrder(values) {
  const seen = new Set();
  const output = [];
  for (const value of values) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  return output;
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

function phraseIncludes(text, phrase) {
  const cleanText = ` ${normalizeText(text)} `;
  const cleanPhrase = ` ${normalizeText(phrase)} `;
  return cleanPhrase.trim() !== "" && cleanText.includes(cleanPhrase);
}

function tokenize(text) {
  return normalizeText(text).split(" ").filter(Boolean);
}

const DEFAULT_STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "into", "of", "on", "or", "over", "the", "to", "with",
  "please", "show", "tell", "data", "series", "chart", "table", "report", "latest", "current"
]);
