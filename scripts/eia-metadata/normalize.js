import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { loadPhase1aFixtures } from "./discover-routes.js";

const SCHEMA_VERSION = "1.0.0";
const TRUSTED_SELECTOR_SOURCES = new Set([
  "official_series_metadata",
  "official_combination_metadata",
  "recorded_observation_fixture"
]);

export function normalizeRouteFixture(fixture) {
  const response = fixture?.response;
  if (!response || typeof response !== "object") throw new Error("Route fixture is missing an EIA response object.");
  if (!fixture.route || !fixture.route_family || !fixture.api_version || !fixture.source_url) {
    throw new Error("Route fixture is missing route identity or provenance.");
  }

  const normalized = {
    schema_version: SCHEMA_VERSION,
    source: "EIA",
    route: normalizeRoute(fixture.route),
    route_family: String(fixture.route_family),
    route_id: requiredText(response.id, "route id"),
    name: requiredText(response.name, "route name"),
    description: String(response.description || "").trim(),
    frequencies: normalizeFrequencies(response.frequency),
    facets: normalizeFacets(response.facets),
    measures: normalizeMeasures(response.data),
    date_start: nullableText(response.startPeriod),
    date_end: nullableText(response.endPeriod),
    default_date_format: nullableText(response.defaultDateFormat),
    default_frequency: nullableText(response.defaultFrequency),
    api_version: String(fixture.api_version),
    captured_at: requiredText(fixture.captured_at, "capture timestamp"),
    raw_metadata_reference: sanitizeReference(fixture.source_url)
  };

  return { ...normalized, metadata_hash: sha256(stableStringify(normalized)) };
}

export function normalizeSeriesCandidate(input) {
  if (!TRUSTED_SELECTOR_SOURCES.has(input?.selector_source)) {
    throw new Error("Series candidates require an explicitly trusted selector source; route facet definitions are not sufficient.");
  }

  const selector = normalizeSelector(input.selector);
  const normalized = {
    schema_version: SCHEMA_VERSION,
    candidate_id: buildCandidateId(selector),
    series_id: nullableText(input.series_id),
    source: "EIA",
    route_family: requiredText(input.route_family, "route family"),
    selector,
    selector_source: input.selector_source,
    title: requiredText(input.title, "candidate title"),
    description: String(input.description || "").trim(),
    geography: normalizeGeography(input.geography),
    activity: nullableText(input.activity),
    product_or_scope: nullableText(input.product_or_scope),
    sector: nullableText(input.sector),
    concept_type: input.concept_type ?? null,
    frequency: selector.frequency,
    unit: nullableText(input.unit),
    unit_family: nullableText(input.unit_family),
    unit_scale: input.unit_scale == null ? null : Number(input.unit_scale),
    date_start: nullableText(input.date_start),
    date_end: nullableText(input.date_end),
    is_active: input.is_active !== false,
    raw_metadata_reference: sanitizeReference(input.raw_metadata_reference),
    normalization_warnings: Array.isArray(input.normalization_warnings)
      ? input.normalization_warnings.map(String).filter(Boolean)
      : []
  };

  return { ...normalized, metadata_hash: sha256(stableStringify(normalized)) };
}

export function buildCandidateId(selector) {
  return `eia:1:${sha256(stableStringify(normalizeSelector(selector)))}`;
}

export function stableStringify(value) {
  return JSON.stringify(canonicalize(value));
}

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.keys(value).sort().reduce((output, key) => {
    if (value[key] !== undefined) output[key] = canonicalize(value[key]);
    return output;
  }, {});
}

export function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function normalizeSelector(selector) {
  if (!selector || typeof selector !== "object" || Array.isArray(selector)) {
    throw new Error("Candidate selector must be an object.");
  }

  const facets = selector.facets;
  if (!facets || typeof facets !== "object" || Array.isArray(facets)) {
    throw new Error("Candidate selector facets must be an explicit object.");
  }

  const normalizedFacets = Object.keys(facets).sort().reduce((output, key) => {
    const facetKey = requiredText(key, "facet id");
    output[facetKey] = requiredText(facets[key], `facet value for ${facetKey}`);
    return output;
  }, {});

  return {
    route: normalizeRoute(selector.route),
    measure: requiredText(selector.measure, "selector measure"),
    frequency: requiredText(selector.frequency, "selector frequency").toLowerCase(),
    facets: normalizedFacets
  };
}

function normalizeFrequencies(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error("Route metadata has no frequencies.");
  return value.map(item => ({
    id: requiredText(item?.id, "frequency id"),
    description: String(item?.description || "").trim(),
    query: nullableText(item?.query),
    date_format: nullableText(item?.format)
  })).sort(compareById);
}

function normalizeFacets(value) {
  if (!Array.isArray(value)) throw new Error("Route metadata facets must be an array.");
  return value.map(item => ({
    id: requiredText(item?.id, "facet id"),
    description: String(item?.description || "").trim()
  })).sort(compareById);
}

function normalizeMeasures(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Route metadata measures must be an object.");
  }

  const measures = Object.entries(value).map(([id, metadata]) => {
    const detail = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
    return {
      id: requiredText(id, "measure id"),
      alias: String(detail.alias || id).trim(),
      unit: nullableText(detail.units)
    };
  }).sort(compareById);

  if (measures.length === 0) throw new Error("Route metadata has no measures.");
  return measures;
}

function normalizeGeography(value) {
  if (value == null) return null;
  return {
    name: requiredText(value.name, "geography name"),
    code: requiredText(value.code, "geography code"),
    type: requiredText(value.type, "geography type")
  };
}

function sanitizeReference(value) {
  const reference = requiredText(value, "raw metadata reference");
  const url = new URL(reference);
  if (url.searchParams.has("api_key")) throw new Error("Raw metadata references must not contain an API key.");
  return url.toString();
}

function normalizeRoute(value) {
  const route = requiredText(value, "route").replace(/^\/+|\/+$/g, "");
  if (!route) throw new Error("Route cannot be empty.");
  return `/${route}`;
}

function nullableText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function requiredText(value, label) {
  const text = nullableText(value);
  if (!text) throw new Error(`Missing ${label}.`);
  return text;
}

function compareById(left, right) {
  return String(left.id).localeCompare(String(right.id));
}

if (isMainModule()) {
  const entries = await loadPhase1aFixtures();
  const records = entries.map(entry => normalizeRouteFixture(entry.fixture));
  process.stdout.write(`${records.map(record => JSON.stringify(record)).join("\n")}\n`);
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}
