import { readFileSync } from "node:fs";

const CONFIG = readJson("../../../data/eia/hierarchy-ranking-config.json");
const ARTIFACT = readJson("../../../data/eia/builds/phase1b/aggregation-hierarchy.generated.json");
const OBSERVATION_REPORT = readJson("../../../data/eia/reports/aggregation-hierarchy-shadow.json");
const RANKING_SHADOW_REPORT = readJson("../../../data/eia/reports/aggregation-hierarchy-ranking-shadow.json");
const RANKING_CONFIG = readJson("../../../data/eia/phase4-ranking-config.json");

export const HIERARCHY_RANKING_CONFIG_VERSION = CONFIG.version;

const RELATIONSHIPS_BY_GEOGRAPHY = new Map(
  ARTIFACT.relationships.map(relationship => [relationship.compatibility.geographyCode, relationship])
);

export function applyHierarchyRanking(intent, rankedResult, options = {}) {
  const mode = normalizeMode(options.mode ?? process.env.EIA_HIERARCHY_RANKING ?? CONFIG.defaultMode);
  if (mode === "off") return rankedResult;
  const gate = validateEvidenceGate(mode);
  if (!gate.ready) return addBlockedDiagnostics(rankedResult, mode, gate.reason);

  let eligibleRetrievals = 0;
  let changedRetrievals = 0;
  const retrievals = (rankedResult.retrievals || []).map(retrieval => {
    const evaluated = evaluateRetrieval(intent, retrieval);
    if (!evaluated.eligible) {
      return {
        ...retrieval,
        hierarchyRanking: {
          mode,
          eligible: false,
          applied: false,
          reason: evaluated.reason,
          deterministicDisplayCandidateIds: candidateIds(retrieval.displayCandidates),
          shadowDisplayCandidateIds: candidateIds(retrieval.displayCandidates)
        }
      };
    }
    eligibleRetrievals += 1;
    if (evaluated.changed) changedRetrievals += 1;
    const hierarchyRanking = {
      mode,
      eligible: true,
      applied: mode === "on" && evaluated.changed,
      reason: evaluated.reason,
      relationshipId: evaluated.relationship.relationshipId,
      verifiedAggregateCandidateId: evaluated.relationship.aggregate.candidateId,
      deterministicDisplayCandidateIds: candidateIds(retrieval.displayCandidates),
      shadowDisplayCandidateIds: candidateIds(evaluated.reordered.displayCandidates),
      changed: evaluated.changed
    };
    if (mode === "shadow") return { ...retrieval, hierarchyRanking };
    return { ...evaluated.reordered, hierarchyRanking };
  });

  return {
    ...rankedResult,
    retrievals,
    diagnostics: {
      ...rankedResult.diagnostics,
      hierarchyRankingConfigVersion: HIERARCHY_RANKING_CONFIG_VERSION,
      hierarchyRankingMode: mode,
      hierarchyRankingEligibleRetrievals: eligibleRetrievals,
      hierarchyRankingChangedRetrievals: changedRetrievals,
      hierarchyEvidenceStatus: "observation_validated",
      verifiedHierarchyRelationshipCount: ARTIFACT.relationships.length,
      hierarchyPreferenceApplied: mode === "on" && changedRetrievals > 0
    }
  };
}

export function evaluateHierarchyRankingGate(mode = "shadow") {
  return validateEvidenceGate(normalizeMode(mode));
}

function evaluateRetrieval(intent, retrieval) {
  const product = normalizeText(retrieval?.concept?.product || intent?.product);
  const activity = normalizeText(retrieval?.concept?.activity || intent?.activity);
  if (product !== CONFIG.eligibility.product || activity !== CONFIG.eligibility.activity) return { eligible: false, reason: "intent_not_eligible" };
  const relationship = RELATIONSHIPS_BY_GEOGRAPHY.get(retrieval?.geography?.code);
  if (!relationship) return { eligible: false, reason: "verified_relationship_not_found" };
  const candidates = retrieval.rankedCandidates || [];
  const aggregateIndex = candidates.findIndex(candidate => candidate.candidate_id === relationship.aggregate.candidateId);
  if (aggregateIndex < 0) return { eligible: false, reason: "verified_aggregate_not_retrieved" };
  const aggregate = candidates[aggregateIndex];
  if (normalizeText(aggregate.route_family) !== CONFIG.eligibility.routeFamily) return { eligible: false, reason: "route_not_eligible" };
  const firstTiedIndex = candidates.findIndex(candidate => sameTierAndScore(candidate, aggregate));
  if (firstTiedIndex < 0 || firstTiedIndex === aggregateIndex) {
    return { eligible: true, changed: false, reason: "verified_aggregate_already_first_in_tie", relationship, reordered: retrieval };
  }
  const reorderedCandidates = [...candidates];
  reorderedCandidates.splice(aggregateIndex, 1);
  reorderedCandidates.splice(firstTiedIndex, 0, markVerifiedAggregate(aggregate, relationship));
  const reordered = rebuildRetrievalLists(retrieval, reorderedCandidates);
  return { eligible: true, changed: true, reason: "verified_aggregate_promoted_within_exact_tie", relationship, reordered };
}

function rebuildRetrievalLists(retrieval, rankedCandidates) {
  const rankByCandidateId = new Map(rankedCandidates.map((candidate, index) => [candidate.candidate_id, index]));
  const byCandidateId = new Map(rankedCandidates.map(candidate => [candidate.candidate_id, candidate]));
  const candidateFamilies = (retrieval.candidateFamilies || [])
    .map(family => {
      const representativeId = family.candidateIds
        .toSorted((left, right) => (rankByCandidateId.get(left) ?? Infinity) - (rankByCandidateId.get(right) ?? Infinity))[0];
      return { ...family, representativeCandidateId: representativeId };
    })
    .toSorted((left, right) =>
      (rankByCandidateId.get(left.representativeCandidateId) ?? Infinity) -
      (rankByCandidateId.get(right.representativeCandidateId) ?? Infinity)
    );
  const displayCandidates = candidateFamilies
    .map(family => byCandidateId.get(family.representativeCandidateId))
    .filter(candidate => candidate && candidate.ranking.score >= RANKING_CONFIG.scoreScale.displayThreshold)
    .slice(0, RANKING_CONFIG.scoreScale.displayLimit);

  return {
    ...retrieval,
    rankedCandidates,
    primaryCandidates: rankedCandidates.filter(candidate => candidate.ranking.tier === "A"),
    fallbackCandidates: rankedCandidates.filter(candidate => candidate.ranking.tier !== "A"),
    candidateFamilies,
    displayCandidates,
    diagnostics: {
      ...retrieval.diagnostics,
      hierarchyEvidenceStatus: "observation_validated",
      verifiedHierarchyRelationshipCount: ARTIFACT.relationships.length,
      hierarchyPreferenceApplied: true,
      displayCount: displayCandidates.length,
      topScore: rankedCandidates[0]?.ranking?.score ?? null,
      topReasonCodes: rankedCandidates[0]?.ranking?.reasonCodes || []
    }
  };
}

function markVerifiedAggregate(candidate, relationship) {
  return {
    ...candidate,
    ranking: {
      ...candidate.ranking,
      reasonCodes: replaceUnknownHierarchyReason(candidate.ranking?.reasonCodes || []),
      warnings: (candidate.ranking?.warnings || []).filter(warning => warning !== "aggregation_relationship_not_verified"),
      signals: {
        ...candidate.ranking?.signals,
        hierarchyRelationshipId: relationship.relationshipId,
        hierarchyRole: "verified_aggregate",
        hierarchyObservationEvidenceHash: OBSERVATION_REPORT.evidenceHash
      }
    }
  };
}

function replaceUnknownHierarchyReason(reasonCodes) {
  return [...new Set([
    ...reasonCodes.filter(reason => reason !== "aggregation_relation_unknown_no_verified_hierarchy"),
    "aggregation_verified_aggregate_for_requested_total"
  ])];
}

function validateEvidenceGate(mode) {
  if (mode === "off") return { ready: true, reason: "disabled" };
  if (ARTIFACT.artifactHash !== CONFIG.generatedArtifactHash) return { ready: false, reason: "generated_artifact_hash_mismatch" };
  if (OBSERVATION_REPORT.generatedArtifactHash !== ARTIFACT.artifactHash) return { ready: false, reason: "observation_artifact_hash_mismatch" };
  if (OBSERVATION_REPORT.evidenceHash !== CONFIG.observationEvidenceHash) return { ready: false, reason: "observation_evidence_hash_mismatch" };
  if (OBSERVATION_REPORT.summary?.activationRecommended !== true) return { ready: false, reason: "observation_shadow_not_approved" };
  if (RANKING_SHADOW_REPORT.evidenceHash !== CONFIG.rankingShadowEvidenceHash) return { ready: false, reason: "ranking_shadow_evidence_hash_mismatch" };
  if (RANKING_SHADOW_REPORT.summary?.activationRecommended !== true) return { ready: false, reason: "ranking_shadow_not_approved" };
  if (mode === "on" && !new Set(["approved_preview_only", "approved"]).has(CONFIG.activationGate?.publicActivationApproval)) {
    return { ready: false, reason: "preview_activation_not_approved" };
  }
  if (
    mode === "on" &&
    process.env.VERCEL_ENV === "production" &&
    CONFIG.activationGate?.productionActivationApproval !== "approved"
  ) {
    return { ready: false, reason: "production_activation_not_approved" };
  }
  return { ready: true, reason: "evidence_validated" };
}

function addBlockedDiagnostics(rankedResult, mode, reason) {
  return {
    ...rankedResult,
    diagnostics: {
      ...rankedResult.diagnostics,
      hierarchyRankingConfigVersion: HIERARCHY_RANKING_CONFIG_VERSION,
      hierarchyRankingMode: mode,
      hierarchyRankingBlocked: true,
      hierarchyRankingBlockedReason: reason,
      hierarchyPreferenceApplied: false
    }
  };
}

function sameTierAndScore(left, right) {
  return left?.ranking?.tier === right?.ranking?.tier && left?.ranking?.score === right?.ranking?.score;
}

function candidateIds(candidates) {
  return (candidates || []).map(candidate => candidate.candidate_id);
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return CONFIG.allowedModes.includes(mode) ? mode : "off";
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function readJson(relativeUrl) {
  return JSON.parse(readFileSync(new URL(relativeUrl, import.meta.url), "utf8"));
}
