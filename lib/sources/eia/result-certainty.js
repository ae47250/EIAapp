export const RESULT_CERTAINTY_VERSION = "1.0.0";

export function buildRankedResultCertainty(intent, candidate) {
  const ranking = candidate?.ranking || {};
  const reasons = new Set(ranking.reasonCodes || []);
  const components = ranking.components || {};
  return certainty({
    intent,
    semanticCompatibility: ranking.signals?.semanticFloorPassed === false ? "incompatible" : "compatible",
    frequencyRelation: !intent?.frequencyExplicit ? "defaulted" : reasons.has("frequency_exact") ? "exact" : ranking.tier === "B" ? "approved_fallback" : "unknown",
    unitRelation: componentRelation(components.unit),
    coverageRelation: coverageRelation(components.requestedDateCoverage, reasons),
    presentationClass: ranking.tier === "B" ? "compatible_fallback" : "compatible_candidate",
    warnings: ranking.warnings || []
  });
}

export function buildLegacyResultCertainty(intent, warnings = []) {
  return certainty({
    intent,
    semanticCompatibility: "compatible",
    frequencyRelation: intent?.frequencyExplicit ? "exact" : "defaulted",
    unitRelation: "not_requested",
    coverageRelation: requestedCoverage(intent) ? "unknown" : "not_requested",
    presentationClass: "compatible_candidate",
    warnings
  });
}

function certainty({ intent, semanticCompatibility, frequencyRelation, unitRelation, coverageRelation, presentationClass, warnings }) {
  return {
    schemaVersion: RESULT_CERTAINTY_VERSION,
    intentStatus: intent?.needsClarification || intent?.blockingClarification ? "clarification_required" : "resolved",
    semanticCompatibility,
    conceptPairStatus: intent?.structuredIntent?.conceptPairStatus || intent?.conceptPairStatus || "unknown",
    frequencyRelation,
    unitRelation,
    coverageRelation,
    aggregationRelation: "unknown",
    hierarchyEvidenceStatus: "none",
    presentationClass,
    warnings: [...new Set([...(warnings || []), "aggregation_relationship_not_verified"])]
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

function requestedCoverage(intent) {
  return Boolean(intent?.requestedPeriod || intent?.requestedDate || intent?.requestedDateRange || intent?.dateRange);
}
