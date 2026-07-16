import { RETRIEVAL_LIMIT, retrieveLocalCandidates } from "./local-retrieval.js";
import { rankLocalCandidates } from "./local-ranking.js";

export const CANDIDATE_PIPELINE_VERSION = "phase4a-v1";

export async function buildLocalCandidatePipeline(input, options = {}) {
  const retrieve = options.retrieveCandidates || retrieveLocalCandidates;
  const rank = options.rankCandidates || rankLocalCandidates;
  const intent = resolveStructuredIntent(input);
  const primaryResult = await retrieve(input, options.primaryRetrievalOptions);
  const primaryRanked = rank(intent, primaryResult);
  const targets = fallbackTargets(intent, primaryRanked);

  let finalRanked = primaryRanked;
  let fallbackResult = null;
  if (targets.length > 0) {
    const fallbackIntent = buildSedsFallbackIntent(intent, targets);
    fallbackResult = await retrieve(fallbackIntent, options.fallbackRetrievalOptions);
    const merged = mergeSedsFallbacks(primaryResult, primaryRanked, fallbackResult, targets);
    finalRanked = rank(intent, merged);
  }

  const retrievals = finalRanked.retrievals.map(retrieval => addPresentationStatus(retrieval));
  const fallbackCandidateCount = retrievals.reduce(
    (sum, retrieval) => sum + retrieval.displayCandidates.filter(candidate => candidate.route_family === "seds").length,
    0
  );

  return {
    ...finalRanked,
    retrievals,
    diagnostics: {
      ...finalRanked.diagnostics,
      candidatePipelineVersion: CANDIDATE_PIPELINE_VERSION,
      candidatePipelineConnectedToPublicSearch: false,
      crossRouteFallback: {
        attempted: targets.length > 0,
        fromRoute: intent?.route?.family || null,
        toRoute: targets.length > 0 ? "seds" : null,
        targetCount: targets.length,
        displayedCandidateCount: fallbackCandidateCount,
        fallbackIndex: fallbackResult?.diagnostics?.index || null
      }
    }
  };
}

function fallbackTargets(intent, rankedResult) {
  if (intent?.route?.family !== "domestic") return [];
  const requestedFrequency = explicitRequestedFrequency(intent);
  if (!new Set(["monthly", "quarterly"]).has(requestedFrequency)) return [];

  return (rankedResult.retrievals || []).filter(retrieval =>
    retrieval?.geography?.type === "state" &&
    (retrieval.displayCandidates || []).length === 0
  ).map(retrieval => ({
    key: retrievalKey(retrieval),
    geography: retrieval.geography,
    concept: retrieval.concept,
    requestedFrequency
  }));
}

function buildSedsFallbackIntent(intent, targets) {
  const targetCodes = new Set(targets.map(target => target.geography.code));
  const geographies = (intent.geographies?.length ? intent.geographies : [intent.geography])
    .filter(geography => geography?.type === "state" && targetCodes.has(geography.code));
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
      reasons: [...new Set([...(intent.fallback?.reasons || []), "approved_seds_annual_fallback_retrieval"])]
    },
    route: {
      family: "seds",
      label: "SEDS",
      reason: "Annual SEDS candidates are retrieved separately because the requested nonannual Domestic state series was unavailable.",
      deterministic: true
    }
  };
}

function mergeSedsFallbacks(primaryResult, primaryRanked, fallbackResult, targets) {
  const targetKeys = new Set(targets.map(target => target.key));
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
      const sedsCandidates = [
        ...(fallback?.primaryCandidates || []),
        ...(fallback?.fallbackCandidates || [])
      ].map(markSedsFallback);
      const availableSlots = Math.max(0, RETRIEVAL_LIMIT - acceptedPrimary.length - acceptedFallback.length);

      return {
        ...retrieval,
        primaryCandidates: acceptedPrimary,
        fallbackCandidates: [...acceptedFallback, ...sedsCandidates.slice(0, availableSlots)],
        diagnostics: {
          ...retrieval.diagnostics,
          crossRouteFallbackAttempted: true,
          crossRouteFallbackCandidatesAdded: Math.min(availableSlots, sedsCandidates.length),
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

function markSedsFallback(candidate) {
  return {
    ...stripRanking(candidate),
    retrieval: {
      ...(candidate.retrieval || {}),
      pool: "fallback",
      reasonCodes: [...new Set([...(candidate.retrieval?.reasonCodes || []), "cross_route_seds_annual_fallback"])]
    }
  };
}

function stripRanking(candidate) {
  const { ranking: _ranking, ...rest } = candidate;
  return rest;
}

function addPresentationStatus(retrieval) {
  const sedsFallbacks = (retrieval.displayCandidates || []).filter(candidate => candidate.route_family === "seds");
  const frequency = retrieval?.frequency?.requested || retrieval?.frequency?.value || "requested";
  const concept = [retrieval?.concept?.product, retrieval?.concept?.activity].filter(Boolean).join(" ") || "series";
  const geography = retrieval?.geography?.name || retrieval?.geography?.code || "the requested geography";
  const warnings = [];

  if (sedsFallbacks.length > 0) {
    warnings.push({
      code: "requested_frequency_unavailable_seds_annual_fallback",
      message: `No valid ${frequency} ${concept} series was found for ${geography}. Annual SEDS alternatives are shown as clearly labeled fallbacks.`
    });
  } else if ((retrieval.displayCandidates || []).length === 0) {
    warnings.push({
      code: "no_displayable_candidate",
      message: `No validated ${frequency} ${concept} candidate was found for ${geography}. No substitute was selected.`
    });
  }

  return {
    ...retrieval,
    userWarnings: warnings,
    emptyResult: (retrieval.displayCandidates || []).length === 0
  };
}

function explicitRequestedFrequency(intent) {
  const mentions = Array.isArray(intent?.mentions?.frequencies) ? intent.mentions.frequencies : [];
  return mentions[0]?.value || null;
}

function retrievalKey(retrieval) {
  return [
    retrieval?.geography?.code || "",
    retrieval?.concept?.product || "",
    retrieval?.concept?.activity || ""
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
