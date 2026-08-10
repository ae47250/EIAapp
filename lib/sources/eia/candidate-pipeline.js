import { readFileSync } from "node:fs";

import { RETRIEVAL_LIMIT, retrieveLocalCandidates } from "./local-retrieval.js";
import { applyHierarchyRanking } from "./hierarchy-ranking.js";
import { buildComparisonDefinitions, isMultiCountryComparison } from "./multi-country-comparison.js";
import {
  HIERARCHY_EVIDENCE_STATUS,
  RANKING_CONFIG_VERSION,
  RANKING_TAXONOMY_VERSION,
  rankLocalCandidates
} from "./local-ranking.js";

const ROUTING_CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase4-routing-config.json", import.meta.url), "utf8"));
const PRESENTATION_CONFIG = ROUTING_CONFIG.candidatePresentation || {};

export const CANDIDATE_PIPELINE_VERSION = "phase4a-v7";

export async function buildLocalCandidatePipeline(input, options = {}) {
  const retrieve = options.retrieveCandidates || retrieveLocalCandidates;
  const rank = options.rankCandidates || rankLocalCandidates;
  const intent = resolveStructuredIntent(input);
  if (requiresClarification(input, intent)) return clarificationBlockedResult(intent);
  const primaryResult = await retrieve(input, options.primaryRetrievalOptions);
  const primaryRanked = rank(intent, primaryResult);
  const targets = fallbackTargets(intent, primaryRanked);

  let finalRanked = primaryRanked;
  let fallbackResult = null;
  if (targets.length > 0) {
    const fallbackIntent = buildFallbackIntent(intent, targets);
    fallbackResult = await retrieve(fallbackIntent, options.fallbackRetrievalOptions);
    const merged = mergeFallbacks(primaryResult, primaryRanked, fallbackResult, targets);
    finalRanked = rank(intent, merged);
  }

  const hierarchyRanked = applyHierarchyRanking(intent, finalRanked, { mode: options.hierarchyMode });
  const retrievals = hierarchyRanked.retrievals.map(retrieval => addPresentationStatus(retrieval, intent));
  const comparisonMode = isMultiCountryComparison(intent);
  const comparisonDefinitions = comparisonMode
    ? buildComparisonDefinitions(intent, { ...hierarchyRanked, retrievals })
    : [];
  const requestedGeographyCodes = (intent.geographies || []).map(geography => geography.code);
  const retrievedGeographyCodes = [...new Set(retrievals.map(retrieval => retrieval?.geography?.code).filter(Boolean))];
  const fallbackCandidateCount = retrievals.reduce(
    (sum, retrieval) => sum + retrieval.displayCandidates.filter(isApprovedFrequencyFallback).length,
    0
  );

  return {
    ...hierarchyRanked,
    retrievals,
    comparisonMode,
    comparisonDefinitions,
    diagnostics: {
      ...hierarchyRanked.diagnostics,
      candidatePipelineVersion: CANDIDATE_PIPELINE_VERSION,
      candidatePipelineConnectedToPublicSearch: false,
      multiCountryComparison: {
        active: comparisonMode,
        requestedGeographyCodes,
        retrievedGeographyCodes,
        missingRetrievalGeographyCodes: requestedGeographyCodes.filter(code => !retrievedGeographyCodes.includes(code)),
        rankedDefinitionCount: comparisonDefinitions.length,
        rankingUnit: comparisonMode ? "variable_definition" : "country_series"
      },
      crossRouteFallback: {
        attempted: targets.length > 0,
        fromRoute: intent?.route?.family || null,
        toRoute: targets[0]?.toRoute || null,
        targetCount: targets.length,
        displayedCandidateCount: fallbackCandidateCount,
        fallbackIndex: fallbackResult?.diagnostics?.index || null
      }
    }
  };
}

function requiresClarification(input, intent) {
  return Boolean(
    input?.needsClarification ||
    input?.blockingClarification ||
    intent?.needsClarification ||
    intent?.blockingClarification
  );
}

function clarificationBlockedResult(intent) {
  return {
    schemaVersion: "1.0.0",
    routeFamily: intent?.route?.family || null,
    retrievals: [],
    diagnostics: {
      candidatePipelineVersion: CANDIDATE_PIPELINE_VERSION,
      candidatePipelineConnectedToPublicSearch: false,
      rankingApplied: false,
      semanticRerankingApplied: false,
      rankingConfigVersion: RANKING_CONFIG_VERSION,
      rankingTaxonomyVersion: RANKING_TAXONOMY_VERSION,
      hierarchyEvidenceStatus: HIERARCHY_EVIDENCE_STATUS,
      verifiedHierarchyRelationshipCount: 0,
      hierarchyPreferenceApplied: false,
      clarificationBlocked: true,
      clarificationReasons: [
        ...(intent?.missingFields || []).map(field => `missing_${field}`),
        ...(intent?.ambiguity?.reasons || [])
      ],
      crossRouteFallback: {
        attempted: false,
        fromRoute: intent?.route?.family || null,
        toRoute: null,
        targetCount: 0,
        displayedCandidateCount: 0,
        fallbackIndex: null
      }
    }
  };
}

function fallbackTargets(intent, rankedResult) {
  const requestedFrequency = explicitRequestedFrequency(intent);
  if (!new Set(["monthly", "quarterly"]).has(requestedFrequency)) return [];

  return (rankedResult.retrievals || []).flatMap(retrieval => {
    if ((retrieval.displayCandidates || []).length > 0) return [];
    if (intent?.route?.family === "domestic" && retrieval?.geography?.type === "state") {
      return [{ key: retrievalKey(retrieval), geography: retrieval.geography, concept: retrieval.concept, requestedFrequency, toRoute: "seds", reasonCode: "cross_route_seds_annual_fallback" }];
    }
    if (intent?.route?.family === "international" && retrieval?.geography?.type === "country") {
      return [{ key: retrievalKey(retrieval), geography: retrieval.geography, concept: retrieval.concept, requestedFrequency, toRoute: "international", reasonCode: "international_annual_frequency_fallback" }];
    }
    return [];
  });
}

function buildFallbackIntent(intent, targets) {
  const toRoute = targets[0].toRoute;
  const targetCodes = new Set(targets.map(target => target.geography.code));
  const geographies = (intent.geographies?.length ? intent.geographies : [intent.geography])
    .filter(geography => targetCodes.has(geography?.code));
  const frequencyMention = {
    index: Number.MAX_SAFE_INTEGER,
    text: "annual",
    type: "frequency",
    value: "annual",
    source: "approved_seds_fallback"
  };

  return {
    ...intent,
    geography: geographies[0] || targets[0].geography,
    geographies,
    frequency: "annual",
    mentions: {
      ...(intent.mentions || {}),
      frequencies: [frequencyMention]
    },
    validation: {
      ...(intent.validation || {}),
      frequency: "valid"
    },
    fallback: {
      used: true,
      reasons: [...new Set([...(intent.fallback?.reasons || []), `approved_${toRoute}_annual_fallback_retrieval`])]
    },
    route: {
      family: toRoute,
      label: toRoute === "seds" ? "SEDS" : "International",
      reason: toRoute === "seds"
        ? "Annual SEDS candidates are retrieved separately because the requested nonannual Domestic state series was unavailable."
        : "Annual International candidates are retrieved separately because the requested nonannual International series was unavailable.",
      deterministic: true
    }
  };
}

function mergeFallbacks(primaryResult, primaryRanked, fallbackResult, targets) {
  const targetKeys = new Set(targets.map(target => target.key));
  const targetByKey = new Map(targets.map(target => [target.key, target]));
  const rankedByKey = new Map(primaryRanked.retrievals.map(retrieval => [retrievalKey(retrieval), retrieval]));
  const fallbackByKey = new Map((fallbackResult.retrievals || []).map(retrieval => [retrievalKey(retrieval), retrieval]));

  return {
    ...primaryResult,
    retrievals: primaryResult.retrievals.map(retrieval => {
      const key = retrievalKey(retrieval);
      if (!targetKeys.has(key)) return retrieval;

      const ranked = rankedByKey.get(key);
      const fallback = fallbackByKey.get(key);
      const acceptedPrimary = (ranked?.primaryCandidates || []).map(stripRanking);
      const acceptedFallback = (ranked?.fallbackCandidates || []).map(stripRanking);
      const approvedCandidates = [
        ...(fallback?.primaryCandidates || []),
        ...(fallback?.fallbackCandidates || [])
      ].map(candidate => markApprovedFallback(candidate, targetByKey.get(key)));
      const availableSlots = Math.max(0, RETRIEVAL_LIMIT - acceptedPrimary.length - acceptedFallback.length);

      return {
        ...retrieval,
        primaryCandidates: acceptedPrimary,
        fallbackCandidates: [...acceptedFallback, ...approvedCandidates.slice(0, availableSlots)],
        diagnostics: {
          ...retrieval.diagnostics,
          crossRouteFallbackAttempted: true,
          crossRouteFallbackCandidatesAdded: Math.min(availableSlots, approvedCandidates.length),
          rejectedPrimaryCandidatesRemovedBeforeFallback: Math.max(
            0,
            (retrieval.primaryCandidates?.length || 0) + (retrieval.fallbackCandidates?.length || 0) - acceptedPrimary.length - acceptedFallback.length
          )
        }
      };
    }),
    diagnostics: {
      ...primaryResult.diagnostics,
      crossRouteFallbackRetrievalApplied: true
    }
  };
}

function markApprovedFallback(candidate, target) {
  return {
    ...stripRanking(candidate),
    retrieval: {
      ...(candidate.retrieval || {}),
      pool: "fallback",
      reasonCodes: [...new Set([...(candidate.retrieval?.reasonCodes || []), target?.reasonCode || "approved_annual_fallback"])]
    }
  };
}

function stripRanking(candidate) {
  const { ranking: _ranking, ...rest } = candidate;
  return rest;
}

function addPresentationStatus(retrieval, intent) {
  const approvedFallbacks = (retrieval.displayCandidates || []).filter(isApprovedFrequencyFallback);
  const sedsFallbacks = approvedFallbacks.filter(candidate => candidate.route_family === "seds");
  const internationalFallbacks = approvedFallbacks.filter(candidate => candidate.route_family === "international");
  const frequency = retrieval?.frequency?.requested || retrieval?.frequency?.value || "requested";
  const concept = [retrieval?.concept?.product, retrieval?.concept?.activity].filter(Boolean).join(" ") || "series";
  const geography = retrieval?.geography?.name || retrieval?.geography?.code || "the requested geography";
  const warnings = [];
  const interpretationGroups = buildInterpretationGroups(retrieval, intent);
  const coverageScopes = dedupePreserveOrder(
    (retrieval.displayCandidates || [])
      .map(candidate => candidate?.geography)
      .filter(candidateGeography =>
        retrieval?.geography?.type === "national" &&
        candidateGeography?.type === "national" &&
        candidateGeography?.code === retrieval?.geography?.code &&
        normalizeText(candidateGeography?.name) !== normalizeText(retrieval?.geography?.name)
      )
      .map(candidateGeography => candidateGeography.name)
  );

  if (coverageScopes.length > 0) {
    warnings.push({
      code: "coverage_geography_scope_note",
      message: `Coverage geography: ${coverageScopes.join(", ")}.`
    });
  }

  if (sedsFallbacks.length > 0) {
    warnings.push({
      code: "requested_frequency_unavailable_seds_annual_fallback",
      message: `No valid ${frequency} ${concept} series was found for ${geography}. Annual SEDS alternatives are shown as clearly labeled fallbacks.`
    });
  } else if (internationalFallbacks.length > 0) {
    warnings.push({
      code: "requested_frequency_unavailable_international_annual_fallback",
      message: `No valid ${frequency} ${concept} series was found for ${geography}. Annual International alternatives are shown separately and are not substitutes for the requested frequency.`
    });
  }
  if (retrieval?.concept?.ambiguitySource) {
    warnings.push({
      code: "ambiguous_product_interpretation",
      message: `The broad product wording was interpreted as ${retrieval.concept.product}. Other approved interpretations are shown separately.`
    });
  }
  if (!retrieval?.concept?.activity) {
    warnings.push({
      code: "activity_missing_hierarchy_unknown",
      message: "No activity was requested. Results are grouped by activity and measure type. No total, component, or aggregate preference is applied because no verified hierarchy is available."
    });
  }
  if (retrieval?.diagnostics?.blockedByUnresolvedQualifiers?.length > 0) {
    warnings.push({
      code: "unresolved_qualifier_requires_clarification",
      message: `Clarify or remove ${retrieval.diagnostics.blockedByUnresolvedQualifiers.join(", ")} before candidates can be shown.`
    });
  } else if ((retrieval.displayCandidates || []).length === 0) {
    warnings.push({
      code: "no_displayable_candidate",
      message: `No validated ${frequency} ${concept} candidate was found for ${geography}. No substitute was selected.`
    });
  }

  return {
    ...retrieval,
    interpretationGroups,
    selectionPolicy: {
      requiresExplicitSelection: (retrieval.displayCandidates || []).length > 0,
      autoSelectionAllowed: false,
      reasonCodes: dedupePreserveOrder([
        !retrieval?.concept?.activity ? "activity_not_explicit" : null,
        retrieval?.concept?.ambiguitySource ? "product_interpretation_ambiguous" : null,
        approvedFallbacks.length > 0 ? "frequency_fallback_requires_confirmation" : null,
        "verified_selector_click_required"
      ])
    },
    userWarnings: warnings,
    emptyResult: (retrieval.displayCandidates || []).length === 0,
    diagnostics: {
      ...retrieval.diagnostics,
      interpretationGroupCount: interpretationGroups.length,
      hiddenTechnicalGroupCount: interpretationGroups.filter(group => group.technical && !group.defaultVisible).length
    }
  };
}

function buildInterpretationGroups(retrieval, intent) {
  const groups = new Map();
  const query = normalizeText(intent?.originalQuery || intent?.correctedQuery || intent?.normalizedQuery);
  const technicalTerms = PRESENTATION_CONFIG.measureTypes?.technical?.terms || [];
  const technicalRequested = technicalTerms.some(term => phraseIncludes(query, term));

  for (const candidate of retrieval.displayCandidates || []) {
    const classification = classifyCandidate(candidate);
    const activity = resolveCandidateActivity(candidate, classification);
    const key = `${activity}:${classification.id}`;
    if (!groups.has(key)) {
      const activityLabel = PRESENTATION_CONFIG.activityLabels?.[activity] || titleCase(activity);
      groups.set(key, {
        id: key,
        label: activity === classification.defaultActivity || activity === "other"
          ? classification.label
          : `${activityLabel}: ${classification.label}`,
        activity,
        measureType: classification.id,
        technical: classification.technical,
        defaultVisible: !classification.technical || technicalRequested,
        unitFamilies: [],
        candidates: []
      });
    }
    const group = groups.get(key);
    group.candidates.push(candidate);
    group.unitFamilies = dedupePreserveOrder([...group.unitFamilies, resolveUnitFamily(candidate.unit)]);
  }

  return [...groups.values()].sort((left, right) => {
    if (left.technical !== right.technical) return left.technical ? 1 : -1;
    const activityDifference = activityIndex(left.activity) - activityIndex(right.activity);
    if (activityDifference !== 0) return activityDifference;
    return measureTypeIndex(left.measureType) - measureTypeIndex(right.measureType) || left.id.localeCompare(right.id);
  });
}

function classifyCandidate(candidate) {
  const detectedActivities = candidate?.ranking?.signals?.detectedActivities || [];
  const text = normalizeText([
    candidate?.title,
    candidate?.description,
    candidate?.activity,
    candidate?.concept_type,
    candidate?.selector?.measure,
    candidate?.unit
  ].filter(Boolean).join(" "));

  for (const [id, rule] of Object.entries(PRESENTATION_CONFIG.measureTypes || {})) {
    if (id === "other") continue;
    const activityMatch = (rule.activityValues || []).some(activity => detectedActivities.includes(activity) || normalizeText(candidate?.activity) === activity);
    const conceptTypeMatch = (rule.conceptTypes || []).includes(normalizeText(candidate?.concept_type));
    const termMatch = (rule.terms || []).some(term => phraseIncludes(text, term));
    if (activityMatch || conceptTypeMatch || termMatch) {
      return { id, label: rule.label || titleCase(id), technical: rule.technical === true, defaultActivity: rule.defaultActivity || null };
    }
  }

  const fallback = PRESENTATION_CONFIG.measureTypes?.other || {};
  return { id: "other", label: fallback.label || "Other measure", technical: false, defaultActivity: null };
}

function resolveCandidateActivity(candidate, classification) {
  const detected = candidate?.ranking?.signals?.detectedActivities || [];
  const explicit = normalizeText(candidate?.activity);
  const values = dedupePreserveOrder([explicit, ...detected, classification.defaultActivity]);
  return values.sort((left, right) => activityIndex(left) - activityIndex(right))[0] || "other";
}

function resolveUnitFamily(unit) {
  const normalized = normalizeText(unit);
  for (const [family, definition] of Object.entries(ROUTING_CONFIG.vocabulary?.units || {})) {
    if ((definition.terms || []).some(term => phraseIncludes(normalized, term))) return family;
  }
  return normalized || "unknown";
}

function activityIndex(activity) {
  const index = (PRESENTATION_CONFIG.activityOrder || []).indexOf(activity);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function measureTypeIndex(measureType) {
  const index = Object.keys(PRESENTATION_CONFIG.measureTypes || {}).indexOf(measureType);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function phraseIncludes(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase && ` ${normalizeText(text)} `.includes(` ${normalizedPhrase} `);
}

function titleCase(value) {
  return String(value || "").replace(/\b\w/g, character => character.toUpperCase());
}

function isApprovedFrequencyFallback(candidate) {
  const reasons = candidate?.retrieval?.reasonCodes || [];
  return reasons.includes("cross_route_seds_annual_fallback") || reasons.includes("international_annual_frequency_fallback");
}

function explicitRequestedFrequency(intent) {
  const mentions = Array.isArray(intent?.mentions?.frequencies) ? intent.mentions.frequencies : [];
  return mentions[0]?.value || null;
}

function retrievalKey(retrieval) {
  return [
    retrieval?.geography?.code || "",
    retrieval?.concept?.product || "",
    retrieval?.concept?.activity || "",
    retrieval?.concept?.sector || ""
  ].join("|");
}

function resolveStructuredIntent(input) {
  if (!input?.structuredIntent || typeof input.structuredIntent !== "object") return input;
  const { structuredIntent, ...wrapper } = input;
  return {
    ...wrapper,
    ...structuredIntent
  };
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function dedupePreserveOrder(values) {
  return [...new Set(values.filter(Boolean))];
}
