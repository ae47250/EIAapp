import { createHash } from "node:crypto";

const GEOGRAPHY_FACETS = Object.freeze({
  domestic: new Set(["area", "location", "state", "statecode", "stateid"]),
  international: new Set(["country", "countryid", "countryregionid", "region", "regionid"]),
  seds: new Set(["location", "state", "statecode", "stateid"])
});

export function isMultiCountryComparison(intent) {
  const structured = intent?.structuredIntent || intent;
  return structured?.multiCountryComparison?.active === true;
}

export function buildDefinitionSignature(candidate, context = {}) {
  const routeFamily = normalizeText(candidate?.route_family || context.routeFamily);
  const selector = candidate?.selector || {};
  return {
    version: 1,
    routeFamily,
    route: normalizeText(selector.route),
    measure: normalizeText(selector.measure),
    frequency: normalizeText(candidate?.frequency || selector.frequency || context.frequency),
    unit: canonicalUnitDefinition(candidate),
    product: normalizeText(context.product || candidate?.product_or_scope),
    activity: normalizeText(context.activity || candidate?.activity),
    sector: normalizeText(context.sector || candidate?.sector),
    scope: normalizeText(candidate?.scope || candidate?.product_or_scope),
    grossNetTreatment: detectGrossNetTreatment(candidate),
    source: normalizeText(candidate?.source || candidate?.source_name || "eia"),
    methodology: normalizeText(candidate?.methodology),
    selectorFacets: canonicalFacets(selector.facets, routeFamily)
  };
}

export function buildComparisonDefinitions(intent, rankedResult, { limit = 5 } = {}) {
  const structured = intent?.structuredIntent || intent;
  if (!isMultiCountryComparison(structured)) return [];
  const geographies = structured.geographies || [];
  const groups = new Map();

  for (const retrieval of rankedResult?.retrievals || []) {
    const context = {
      routeFamily: retrieval?.routeFamily || rankedResult?.routeFamily || structured?.route?.family,
      product: retrieval?.concept?.product,
      activity: retrieval?.concept?.activity,
      sector: retrieval?.concept?.sector,
      frequency: retrieval?.frequency?.value || retrieval?.frequency
    };
    const candidates = retrieval?.displayCandidates?.length
      ? retrieval.displayCandidates
      : retrieval?.rankedCandidates || [];
    for (const candidate of candidates) {
      if (candidate?.ranking?.signals?.semanticFloorPassed === false) continue;
      const definitionId = buildDefinitionId(candidate, context);
      if (!groups.has(definitionId)) {
        groups.set(definitionId, {
          definitionId,
          signature: buildDefinitionSignature(candidate, context),
          candidatesByCountry: new Map()
        });
      }
      const group = groups.get(definitionId);
      const geographyCode = retrieval?.geography?.code || candidate?.geography?.code;
      const current = group.candidatesByCountry.get(geographyCode);
      if (!current || compareCandidateQuality(candidate, current.candidate) < 0) {
        group.candidatesByCountry.set(geographyCode, { candidate, geography: retrieval?.geography || candidate?.geography });
      }
    }
  }

  return [...groups.values()]
    .map(group => finalizeDefinition(group, geographies))
    .sort(compareDefinitions)
    .slice(0, limit)
    .map((definition, index) => ({ ...definition, rank: index + 1 }));
}

export function validateComparisonCandidate(candidate, reference) {
  if (!candidate) return status("variable_unavailable", "No matching variable exists for this country.");
  if (!reference) return status("comparable", null);
  if (definitionCoreKey(candidate) !== definitionCoreKey(reference)) {
    return status("definition_mismatch", "The retrieved series does not use the same product and activity definition.");
  }
  if (normalizeText(candidate.frequency) !== normalizeText(reference.frequency)) {
    return status("frequency_mismatch", "The retrieved series uses a different frequency.");
  }
  const unit = compareUnits(candidate, reference);
  if (!unit.compatible) return status("unit_mismatch", "The retrieved series uses units that cannot be safely converted.");
  if (scopeMethodologyKey(candidate) !== scopeMethodologyKey(reference)) {
    return status("scope_or_methodology_mismatch", "The retrieved series uses a different scope, source, or methodology.");
  }
  const coverage = compareCoverage(candidate, reference);
  if (coverage.partial) return status("partial_coverage", coverage.warning, unit);
  if (unit.conversionRequired) return status("comparable_after_safe_unit_conversion", unit.warning, unit);
  return status("comparable", null, unit);
}

export function getSafeUnitConversion(fromUnit, toUnit) {
  const from = resolveUnit({ unit: fromUnit });
  const to = resolveUnit({ unit: toUnit });
  if (!from.family || from.family !== to.family) return null;
  return {
    required: from.scale !== to.scale,
    factor: from.scale / to.scale,
    originalUnit: fromUnit || null,
    convertedUnit: toUnit || null
  };
}

export function buildDefinitionId(candidate, context = {}) {
  const signature = buildDefinitionSignature(candidate, context);
  const digest = createHash("sha256").update(stableStringify(signature)).digest("hex");
  return `eia-definition:1:${digest}`;
}

export function definitionSignatureKey(candidate, context = {}) {
  return stableStringify(buildDefinitionSignature(candidate, context));
}

export function detectGrossNetTreatment(candidate) {
  const text = normalizeText([candidate?.title, candidate?.description, candidate?.selector?.measure].filter(Boolean).join(" "));
  if (containsWord(text, "net")) return "net";
  if (containsWord(text, "gross")) return "gross";
  return "unspecified";
}

function canonicalFacets(facets, routeFamily) {
  const excluded = GEOGRAPHY_FACETS[routeFamily] || new Set();
  return Object.fromEntries(Object.entries(facets || {})
    .filter(([name]) => !excluded.has(normalizeFacetName(name)))
    .map(([name, value]) => [name, normalizeFacetValue(value)])
    .sort(([left], [right]) => left.localeCompare(right)));
}

function normalizeFacetName(value) {
  return normalizeText(value).replaceAll(/[^a-z0-9]/g, "");
}

function normalizeFacetValue(value) {
  if (Array.isArray(value)) return value.map(normalizeFacetValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value)
      .map(([name, item]) => [name, normalizeFacetValue(item)])
      .sort(([left], [right]) => left.localeCompare(right)));
  }
  return normalizeText(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function finalizeDefinition(group, geographies) {
  const available = [...group.candidatesByCountry.values()].sort((left, right) =>
    String(left.geography?.code || "").localeCompare(String(right.geography?.code || ""))
  );
  const representative = available[0]?.candidate;
  const countries = geographies.map(geography => {
    const match = group.candidatesByCountry.get(geography.code);
    const validation = validateComparisonCandidate(match?.candidate, representative);
    return {
      geography,
      candidateId: match?.candidate?.candidate_id || null,
      seriesId: match?.candidate?.series_id || null,
      candidate: match?.candidate || null,
      status: validation.status,
      warning: validation.warning,
      unitConversion: validation.unitConversion,
      coverage: match?.candidate ? { start: match.candidate.date_start || null, end: match.candidate.date_end || null } : null
    };
  });
  const rankingCandidate = [...available]
    .map(item => item.candidate)
    .sort(compareCandidateQuality)[0];
  const warnings = countries.filter(country => country.warning).map(country => ({
    code: country.status,
    geographyCode: country.geography.code,
    message: country.warning
  }));
  return {
    definitionId: group.definitionId,
    signature: group.signature,
    title: definitionTitle(representative, available.map(item => item.geography)),
    semanticScore: semanticScore(rankingCandidate),
    rankingTier: rankingCandidate?.ranking?.tier || null,
    rankingReasonCodes: rankingCandidate?.ranking?.reasonCodes || [],
    representativeCandidateId: rankingCandidate?.candidate_id || null,
    availableCountryCount: available.length,
    requestedCountryCount: geographies.length,
    countries,
    warnings
  };
}

function compareDefinitions(left, right) {
  return tierIndex(left.rankingTier) - tierIndex(right.rankingTier) ||
    right.semanticScore - left.semanticScore ||
    left.definitionId.localeCompare(right.definitionId);
}

function compareCandidateQuality(left, right) {
  return tierIndex(left?.ranking?.tier) - tierIndex(right?.ranking?.tier) ||
    semanticScore(right) - semanticScore(left) ||
    String(left?.candidate_id || "").localeCompare(String(right?.candidate_id || ""));
}

function tierIndex(tier) {
  const index = ["A", "B", "C", "D"].indexOf(tier);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function semanticScore(candidate) {
  const components = candidate?.ranking?.components || {};
  return Number(Object.entries(components)
    .filter(([name]) => !["availability", "currentness", "requestedDateCoverage"].includes(name))
    .reduce((sum, [, component]) => sum + (Number(component?.points) || 0), 0)
    .toFixed(4));
}

function definitionTitle(candidate, geographies) {
  let title = String(candidate?.title || "EIA variable");
  for (const geography of geographies) {
    title = title.replace(new RegExp(`,?\\s*${escapeRegExp(geography?.name)}(?=,|$)`, "ig"), "");
  }
  title = title.replace(/,?\s*(annual|quarterly|monthly|weekly|daily)\s*$/i, "");
  return title.replace(/\s*,\s*,/g, ",").replace(/^\s*,|,\s*$/g, "").trim();
}

function definitionCoreKey(candidate) {
  const facets = candidate?.selector?.facets || {};
  return [
    normalizeText(candidate?.product_or_scope),
    normalizeText(candidate?.activity),
    normalizeText(facets.productId),
    normalizeText(facets.activityId),
    detectGrossNetTreatment(candidate)
  ].join("|");
}

function scopeMethodologyKey(candidate) {
  return [
    normalizeText(candidate?.sector),
    normalizeText(candidate?.scope || candidate?.product_or_scope),
    normalizeText(candidate?.source || candidate?.source_name || "eia"),
    normalizeText(candidate?.methodology)
  ].join("|");
}

function compareUnits(candidate, reference) {
  const left = resolveUnit(candidate);
  const right = resolveUnit(reference);
  if (left.family !== right.family || !left.family) return { compatible: false, conversionRequired: false };
  const conversionRequired = left.scale !== right.scale;
  return {
    compatible: true,
    conversionRequired,
    originalUnit: candidate?.unit || null,
    comparisonUnit: reference?.unit || null,
    factor: conversionRequired ? left.scale / right.scale : 1,
    warning: conversionRequired ? `Values require deterministic conversion from ${candidate?.unit} to ${reference?.unit}.` : null
  };
}

function compareCoverage(candidate, reference) {
  const leftStart = normalizeText(candidate?.date_start);
  const leftEnd = normalizeText(candidate?.date_end);
  const rightStart = normalizeText(reference?.date_start);
  const rightEnd = normalizeText(reference?.date_end);
  const partial = Boolean(leftStart && rightStart && leftStart !== rightStart || leftEnd && rightEnd && leftEnd !== rightEnd);
  return {
    partial,
    warning: partial
      ? `Coverage is ${candidate?.date_start || "unknown"}-${candidate?.date_end || "unknown"}; the comparison reference is ${reference?.date_start || "unknown"}-${reference?.date_end || "unknown"}.`
      : null
  };
}

function canonicalUnitDefinition(candidate) {
  const unit = resolveUnit(candidate);
  return { family: unit.family, baseUnit: unit.baseUnit };
}

function resolveUnit(candidate) {
  const explicitFamily = normalizeText(candidate?.unit_family);
  const explicitScale = Number(candidate?.unit_scale);
  if (explicitFamily && Number.isFinite(explicitScale) && explicitScale > 0) {
    return { family: explicitFamily, baseUnit: explicitFamily, scale: explicitScale };
  }
  const normalized = normalizeText(candidate?.unit);
  const known = new Map([
    ["kilowatthours", ["electricity_energy", "kilowatthours", 1]],
    ["megawatthours", ["electricity_energy", "kilowatthours", 1e3]],
    ["million kilowatthours", ["electricity_energy", "kilowatthours", 1e6]],
    ["gigawatthours", ["electricity_energy", "kilowatthours", 1e6]],
    ["billion kilowatthours", ["electricity_energy", "kilowatthours", 1e9]],
    ["terawatthours", ["electricity_energy", "kilowatthours", 1e9]]
  ]).get(normalized);
  return known
    ? { family: known[0], baseUnit: known[1], scale: known[2] }
    : { family: normalized, baseUnit: normalized, scale: 1 };
}

function status(value, warning, unit = {}) {
  return {
    status: value,
    warning,
    unitConversion: unit.compatible ? {
      required: Boolean(unit.conversionRequired),
      originalUnit: unit.originalUnit || null,
      comparisonUnit: unit.comparisonUnit || null,
      factor: unit.factor ?? null
    } : null
  };
}

function escapeRegExp(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsWord(text, word) {
  return ` ${text} `.includes(` ${word} `);
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
