import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildCapabilityReport, loadPhase1aFixtures } from "./discover-routes.js";
import {
  buildCandidateId,
  normalizeRouteFixture,
  sha256,
  stableStringify
} from "./normalize.js";

const ROUTE_FAMILIES = new Set(["domestic", "international", "seds"]);
const SELECTOR_SOURCES = new Set([
  "official_series_metadata",
  "official_combination_metadata",
  "recorded_observation_fixture"
]);

export function validateRouteRecord(record) {
  const errors = [];
  requireEqual(errors, record?.schema_version, "1.0.0", "schema_version");
  requireEqual(errors, record?.source, "EIA", "source");
  requirePattern(errors, record?.route, /^\/[a-z0-9][a-z0-9/-]*$/, "route");
  if (!ROUTE_FAMILIES.has(record?.route_family)) errors.push("route_family is invalid");
  requireText(errors, record?.route_id, "route_id");
  requireText(errors, record?.name, "name");
  requireArray(errors, record?.frequencies, "frequencies", true);
  requireArray(errors, record?.facets, "facets", false);
  requireArray(errors, record?.measures, "measures", true);
  requireText(errors, record?.api_version, "api_version");
  requireText(errors, record?.captured_at, "captured_at");
  requireSafeReference(errors, record?.raw_metadata_reference);
  requireHash(errors, record?.metadata_hash, "metadata_hash");
  validateUniqueIds(errors, record?.frequencies, "frequencies");
  validateUniqueIds(errors, record?.facets, "facets");
  validateUniqueIds(errors, record?.measures, "measures");
  validateRecordHash(errors, record);
  return errors;
}

export function validateSeriesRecord(record) {
  const errors = [];
  requireEqual(errors, record?.schema_version, "1.0.0", "schema_version");
  requireEqual(errors, record?.source, "EIA", "source");
  if (!ROUTE_FAMILIES.has(record?.route_family)) errors.push("route_family is invalid");
  if (!SELECTOR_SOURCES.has(record?.selector_source)) errors.push("selector_source is not trusted");
  requirePattern(errors, record?.candidate_id, /^eia:1:[a-f0-9]{64}$/, "candidate_id");
  requireText(errors, record?.title, "title");
  requireText(errors, record?.frequency, "frequency");
  requireSafeReference(errors, record?.raw_metadata_reference);
  requireHash(errors, record?.metadata_hash, "metadata_hash");

  try {
    if (record?.candidate_id !== buildCandidateId(record?.selector)) {
      errors.push("candidate_id does not match the canonical selector");
    }
  } catch (error) {
    errors.push(error.message);
  }

  validateRecordHash(errors, record);
  return errors;
}

export function validatePlantDirectoryRecord(record) {
  const errors = [];
  requireEqual(errors, record?.schema_version, "1.0.0", "schema_version");
  requireEqual(errors, record?.source, "EIA", "source");
  requirePattern(errors, record?.plant_id, /^[0-9]+$/, "plant_id");
  requireText(errors, record?.name, "name");
  requireArray(errors, record?.aliases, "aliases", false);
  if (Array.isArray(record?.aliases) && new Set(record.aliases).size !== record.aliases.length) {
    errors.push("aliases contains duplicates");
  }
  if (record?.state_code !== undefined) requirePattern(errors, record.state_code, /^[A-Z]{2}$/, "state_code");
  requireCoordinate(errors, record?.latitude, -90, 90, "latitude");
  requireCoordinate(errors, record?.longitude, -180, 180, "longitude");
  if (!Number.isInteger(record?.series_count) || record.series_count < 1) {
    errors.push("series_count must be a positive integer");
  }
  requireEqual(
    errors,
    record?.lookup_mode,
    "official_eia_api_v2_on_demand",
    "lookup_mode"
  );
  requireSafeReference(errors, record?.raw_metadata_reference);
  requireHash(errors, record?.metadata_hash, "metadata_hash");
  validateRecordHash(errors, record);
  return errors;
}

export function validateManifest(manifest) {
  const errors = [];
  requireEqual(errors, manifest?.schema_version, "1.0.0", "schema_version");
  requireEqual(errors, manifest?.source, "EIA", "source");
  requireText(errors, manifest?.api_version, "api_version");
  requireDateTime(errors, manifest?.checked_at, "checked_at");
  if (manifest?.content_updated_at !== null) {
    requireDateTime(errors, manifest?.content_updated_at, "content_updated_at");
  }
  if (manifest?.content_hash !== null) requireHash(errors, manifest?.content_hash, "content_hash");
  requireArray(errors, manifest?.routes_checked, "routes_checked", false);
  requireArray(errors, manifest?.routes_succeeded, "routes_succeeded", false);
  requireArray(errors, manifest?.routes_failed, "routes_failed", false);
  if (!manifest?.record_counts || typeof manifest.record_counts !== "object") {
    errors.push("record_counts must be an object");
  } else {
    const expectedTotal = ["domestic", "international", "seds"]
      .reduce((sum, family) => sum + Number(manifest.record_counts[family] || 0), 0);
    for (const field of ["domestic", "international", "seds", "total"]) {
      requireNonnegativeInteger(errors, manifest.record_counts[field], `record_counts.${field}`);
    }
    if (expectedTotal !== manifest.record_counts.total) errors.push("record_counts.total is inconsistent");
  }
  requireNumericObject(errors, manifest?.directory_counts, "directory_counts", ["plants"]);
  requireNumericObject(errors, manifest?.change_counts, "change_counts", ["added", "removed", "changed"]);
  requireNumericObject(errors, manifest?.diff_summary, "diff_summary", [
    "routes",
    "facets",
    "measures",
    "frequencies",
    "units",
    "geographies",
    "coverage"
  ]);
  if (manifest?.rollback_snapshot_reference !== null && typeof manifest?.rollback_snapshot_reference !== "string") {
    errors.push("rollback_snapshot_reference must be a string or null");
  }
  requireText(errors, manifest?.update_schedule_state, "update_schedule_state");
  requireArray(errors, manifest?.warnings, "warnings", false);
  requireArray(errors, manifest?.errors, "errors", false);
  requireText(errors, manifest?.build_version, "build_version");
  if (!["complete", "unchanged", "failed", "partial"].includes(manifest?.refresh_status)) {
    errors.push("refresh_status is invalid");
  }
  if (manifest?.refresh_status === "complete" && manifest.routes_failed?.length) {
    errors.push("complete manifests cannot contain failed routes");
  }
  return errors;
}

export async function validatePhase1aFixtures() {
  const entries = await loadPhase1aFixtures();
  const routeRecords = entries.map(entry => normalizeRouteFixture(entry.fixture));
  const errors = [];

  for (const [index, record] of routeRecords.entries()) {
    for (const error of validateRouteRecord(record)) {
      errors.push(`${entries[index].fixturePath}: ${error}`);
    }
    const serializedFixture = JSON.stringify(entries[index].fixture);
    if (/api_key/i.test(serializedFixture)) errors.push(`${entries[index].fixturePath}: fixture exposes an API key field`);
  }

  const families = [...new Set(routeRecords.map(record => record.route_family))].sort();
  if (families.join(",") !== "domestic,international,seds") {
    errors.push("Phase 1A fixtures must cover domestic, international, and seds exactly once.");
  }

  const hashes = routeRecords.map(record => record.metadata_hash);
  if (new Set(hashes).size !== hashes.length) errors.push("Route metadata hashes must be unique.");

  return {
    valid: errors.length === 0,
    errors,
    route_records: routeRecords,
    capability_report: buildCapabilityReport(entries)
  };
}

function validateRecordHash(errors, record) {
  if (!record || typeof record !== "object") return;
  const { metadata_hash: ignored, ...withoutHash } = record;
  const expected = sha256(stableStringify(withoutHash));
  if (ignored !== expected) errors.push("metadata_hash is not reproducible");
}

function requireText(errors, value, label) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${label} must be a non-empty string`);
}

function requireEqual(errors, value, expected, label) {
  if (value !== expected) errors.push(`${label} must equal ${expected}`);
}

function requirePattern(errors, value, pattern, label) {
  if (typeof value !== "string" || !pattern.test(value)) errors.push(`${label} has an invalid format`);
}

function requireHash(errors, value, label) {
  requirePattern(errors, value, /^[a-f0-9]{64}$/, label);
}

function requireDateTime(errors, value, label) {
  requireText(errors, value, label);
  if (typeof value === "string" && Number.isNaN(Date.parse(value))) errors.push(`${label} must be a valid date-time`);
}

function requireNonnegativeInteger(errors, value, label) {
  if (!Number.isInteger(value) || value < 0) errors.push(`${label} must be a nonnegative integer`);
}

function requireCoordinate(errors, value, minimum, maximum, label) {
  if (value === undefined) return;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > maximum) {
    errors.push(`${label} is invalid`);
  }
}

function requireNumericObject(errors, value, label, fields) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  for (const field of fields) requireNonnegativeInteger(errors, value[field], `${label}.${field}`);
}

function requireArray(errors, value, label, requireItems) {
  if (!Array.isArray(value)) errors.push(`${label} must be an array`);
  else if (requireItems && value.length === 0) errors.push(`${label} must not be empty`);
}

function requireSafeReference(errors, value) {
  try {
    const url = new URL(value);
    if (url.searchParams.has("api_key")) errors.push("raw_metadata_reference contains an API key");
  } catch {
    errors.push("raw_metadata_reference must be a valid URL");
  }
}

function validateUniqueIds(errors, values, label) {
  if (!Array.isArray(values)) return;
  const ids = values.map(item => item?.id);
  if (new Set(ids).size !== ids.length) errors.push(`${label} contains duplicate ids`);
}

if (isMainModule()) {
  const result = await validatePhase1aFixtures();
  process.stdout.write(`${JSON.stringify({
    valid: result.valid,
    errors: result.errors,
    routes: result.route_records.map(record => ({
      route_family: record.route_family,
      route: record.route,
      metadata_hash: record.metadata_hash
    })),
    findings: result.capability_report.findings
  }, null, 2)}\n`);
  if (!result.valid) process.exitCode = 1;
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}
