export const RESULT_CERTAINTY_VERSION = "1.0.0";

export function buildRankedResultCertainty(intent, candidate) {
  const ranking = candidate?.ranking || {};
  const reasons = new Set(ranking.reasonCodes || []);
  const components = ranking.components || {};
  const verifiedAggregate = reasons.has("aggregation_verified_aggregate_for_requested_total") &&
    ranking.signals?.hierarchyRole === "verified_aggregate";
  return certainty({
    intent,
    semanticCompatibility: ranking.signals?.semanticFloorPassed === false ? "incompatible" : "compatible",
    frequencyRelation: !intent?.frequencyExplicit ? "defaulted" : reasons.has("frequency_exact") ? "exact" : ranking.tier === "B" ? "approved_fallback" : "unknown",
    unitRelation: componentRelation(components.unit),
    coverageRelation: coverageRelation(components.requestedDateCoverage, reasons),
    presentationClass: ranking.tier === "B" ? "compatible_fallback" : "compatible_candidate",
    aggregationRelation: verifiedAggregate ? "verified_aggregate" : "unknown",
    hierarchyEvidenceStatus: verifiedAggregate ? "observation_validated" : "none",
    warnings: ranking.warnings || []
  });
}

function certainty({ intent, semanticCompatibility, frequencyRelation, unitRelation, coverageRelation, presentationClass, aggregationRelation, hierarchyEvidenceStatus, warnings }) {
  return {
    schemaVersion: RESULT_CERTAINTY_VERSION,
    intentStatus: intent?.needsClarification || intent?.blockingClarification ? "clarification_required" : "resolved",
    semanticCompatibility,
    conceptPairStatus: intent?.structuredIntent?.conceptPairStatus || intent?.conceptPairStatus || "unknown",
    frequencyRelation,
    unitRelation,
    coverageRelation,
    aggregationRelation,
    hierarchyEvidenceStatus,
    presentationClass,
    warnings: aggregationRelation === "verified_aggregate"
      ? [...new Set(warnings || [])]
      : [...new Set([...(warnings || []), "aggregation_relationship_not_verified"])]
  };
}

function componentRelation(component) {
  if (!component || Number(component.maximum) === 0) return "not_requested";
  return Number(component.compatibility) >= 1 ? "exact" : "not_matched";
}

function coverageRelation(component, reasons) {
  if (!component || Number(component.maximum) === 0) return "not_requested";
  if (reasons.has("requested_date_covered")) return "covered";
  if (reasons.has("requested_date_not_covered")) return "not_covered";
  return "unknown";
}
