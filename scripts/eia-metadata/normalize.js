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
const BULK_FREQUENCIES = Object.freeze({
  A: "annual",
  Q: "quarterly",
  M: "monthly",
  W: "weekly",
  D: "daily"
});

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

export function shouldIncludeBulkSeries(record, routeFamily) {
  const seriesId = String(record?.series_id || "");
  if (!seriesId) return false;
  if (routeFamily === "domestic") return seriesId.startsWith("ELEC.") && !seriesId.startsWith("ELEC.PLANT.");
  if (routeFamily === "international") return seriesId.startsWith("INTL.");
  if (routeFamily === "seds") return seriesId.startsWith("SEDS.");
  return false;
}

export function isElectricityPlantSeries(record) {
  return String(record?.series_id || "").startsWith("ELEC.PLANT.");
}

export function parseElectricityPlantDirectorySource(record) {
  const seriesId = requiredText(record?.series_id, "plant series id");
  const match = /^ELEC\.PLANT\.[^.]+\.([0-9]+)-/.exec(seriesId);
  if (!match) throw new Error(`Plant series ID has an unsupported shape: ${seriesId}`);

  const plantId = match[1];
  const nameParts = requiredText(record?.name, "plant series name")
    .split(" : ")
    .map(part => part.trim());
  const plantLabel = nameParts[1];
  if (!plantLabel) throw new Error(`Plant series ${seriesId} has no plant name segment.`);
  const name = plantLabel.replace(new RegExp(`\\s*\\(${plantId}\\)\\s*$`), "").trim();
  if (!name) throw new Error(`Plant series ${seriesId} has an empty plant name.`);

  const geography = nullableText(record.geography || record.iso3166);
  const stateMatch = /^USA-([A-Z]{2})$/.exec(geography || "");
  const latitude = finiteCoordinate(record.lat, -90, 90);
  const longitude = finiteCoordinate(record.lon, -180, 180);

  return {
    plant_id: plantId,
    name,
    state_code: stateMatch?.[1] || null,
    latitude,
    longitude
  };
}

export function normalizePlantDirectoryEntry(input) {
  const normalized = {
    schema_version: SCHEMA_VERSION,
    source: "EIA",
    plant_id: requiredText(input?.plant_id, "plant id"),
    name: requiredText(input?.name, "plant name"),
    aliases: [...new Set((input?.aliases || []).map(String).map(value => value.trim()).filter(Boolean))]
      .filter(value => value !== input.name)
      .sort((left, right) => left.localeCompare(right)),
    state_code: nullableText(input?.state_code),
    latitude: input?.latitude == null ? null : Number(input.latitude),
    longitude: input?.longitude == null ? null : Number(input.longitude),
    series_count: Number(input?.series_count),
    lookup_mode: "official_eia_api_v2_on_demand",
    raw_metadata_reference: "https://api.eia.gov/v2/electricity/"
  };

  const compacted = Object.fromEntries(Object.entries(normalized).filter(([, value]) => value != null));
  return { ...compacted, metadata_hash: sha256(stableStringify(compacted)) };
}

export function normalizeBulkSeries(record, { routeFamily } = {}) {
  const seriesId = requiredText(record?.series_id, "bulk series id");
  if (!shouldIncludeBulkSeries(record, routeFamily)) {
    throw new Error(`Bulk series ${seriesId} is outside the ${routeFamily || "unknown"} build scope.`);
  }

  const frequency = BULK_FREQUENCIES[requiredText(record.f, "bulk frequency").toUpperCase()];
  if (!frequency) throw new Error(`Bulk series ${seriesId} has unsupported frequency ${record.f}.`);

  const selector = buildBulkSelector(seriesId, routeFamily, frequency);
  const normalized = normalizeSeriesCandidate({
    route_family: routeFamily,
    selector_source: "official_series_metadata",
    selector,
    series_id: seriesId,
    title: requiredText(record.name, "bulk series name"),
    description: String(record.description || "").trim(),
    geography: buildBulkGeography(record, routeFamily),
    concept_type: inferConceptType(record.name),
    unit: nullableText(record.units),
    date_start: nullableText(record.start),
    date_end: nullableText(record.end),
    is_active: true,
    raw_metadata_reference: `https://api.eia.gov/v2/seriesid/${encodeURIComponent(seriesId)}`
  });

  return compactSeriesRecord(normalized);
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

function buildBulkSelector(seriesId, routeFamily, frequency) {
  if (routeFamily === "domestic") {
    const parts = seriesId.split(".");
    return {
      route: "/seriesid",
      measure: requiredText(parts[1], "domestic series measure").toLowerCase(),
      frequency,
      facets: { series_id: seriesId }
    };
  }

  if (routeFamily === "international") {
    const match = /^INTL\.([^-]+)-([^-]+)-(.+)-([^-]+)\.([AMQWD])$/.exec(seriesId);
    if (!match) throw new Error(`International series ID has an unsupported shape: ${seriesId}`);
    return {
      route: "/international",
      measure: "value",
      frequency,
      facets: {
        productId: match[1],
        activityId: match[2],
        countryRegionId: match[3],
        unit: match[4]
      }
    };
  }

  if (routeFamily === "seds") {
    const match = /^SEDS\.([^.]+)\.([^.]+)\.([AMQWD])$/.exec(seriesId);
    if (!match) throw new Error(`SEDS series ID has an unsupported shape: ${seriesId}`);
    return {
      route: "/seds",
      measure: "value",
      frequency,
      facets: { seriesId: match[1], stateId: match[2] }
    };
  }

  throw new Error(`Unsupported bulk route family: ${routeFamily || "missing"}`);
}

function buildBulkGeography(record, routeFamily) {
  const sourceCode = nullableText(
    record.geography ||
    record.iso3166 ||
    (routeFamily === "seds" ? /^SEDS\.[^.]+\.([^.]+)\./.exec(String(record.series_id || ""))?.[1] : null)
  );
  if (!sourceCode) return null;

  if (routeFamily === "domestic") {
    const code = sourceCode === "USA" ? "US" : sourceCode.replace(/^USA-/, "");
    return {
      name: sourceCode === "USA" ? "United States" : extractDomesticGeographyName(record.name, code),
      code,
      type: sourceCode === "USA" ? "national" : /^[A-Z]{2}$/.test(code) ? "state" : "region"
    };
  }

  const code = routeFamily === "seds" ? sourceCode.replace(/^USA-/, "") : sourceCode;
  const name = extractTrailingGeographyName(record.name) || code;
  return {
    name,
    code,
    type: routeFamily === "seds" ? "state" : "other"
  };
}

function extractDomesticGeographyName(name, fallback) {
  const parts = String(name || "").split(" : ").map(part => part.trim()).filter(Boolean);
  const ignored = /^(annual|quarterly|monthly|weekly|daily|all sectors|commercial|industrial|residential|transportation|electric power)$/i;
  for (let index = parts.length - 1; index >= 1; index -= 1) {
    if (!ignored.test(parts[index])) return parts[index];
  }
  return fallback;
}

function extractTrailingGeographyName(name) {
  const parts = String(name || "").split(",").map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return /^(annual|quarterly|monthly|weekly|daily)$/i.test(parts.at(-1))
    ? parts.at(-2)
    : parts.at(-1);
}

function inferConceptType(name) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("price") || normalized.includes("cost")) return "price";
  if (normalized.includes("stock") || normalized.includes("inventory")) return "stock";
  if (normalized.includes("share") || normalized.includes("percent")) return "share";
  if (normalized.includes("rate")) return "rate";
  return "other";
}

function compactSeriesRecord(record) {
  const { metadata_hash: ignoredHash, ...withoutHash } = record;
  const compacted = Object.fromEntries(Object.entries(withoutHash).filter(([, value]) => {
    if (value == null || value === "") return false;
    return !Array.isArray(value) || value.length > 0;
  }));
  return { ...compacted, metadata_hash: sha256(stableStringify(compacted)) };
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

function finiteCoordinate(value, minimum, maximum) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
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
