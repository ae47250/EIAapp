import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_BUILD_DIR = join(ROOT_DIR, "data", "eia", "builds", "phase1b");
const DEFAULT_SCHEMA_DIR = join(ROOT_DIR, "data", "eia", "schema");
const FAMILY_FILES = Object.freeze({
  domestic: "domestic.jsonl.gz",
  international: "international.jsonl.gz",
  seds: "seds.jsonl.gz"
});
const RELATIONSHIP_FIELD_PATTERN = /(^|_)(parent|parents|child|children|component|components|relationship|relationships|hierarchy|hierarchies|aggregate|aggregates)(_|$)/i;
const CANDIDATE_ID_PATTERN = /^eia:1:[a-f0-9]{64}$/;
const TRUSTED_PROVENANCE = new Set([
  "official_series_metadata",
  "official_combination_metadata"
]);

export async function auditAggregationHierarchy(options = {}) {
  const buildDir = resolve(options.buildDir || DEFAULT_BUILD_DIR);
  const schemaDir = resolve(options.schemaDir || DEFAULT_SCHEMA_DIR);
  const [manifest, validation, routes, seriesSchema, routeSchema] = await Promise.all([
    readJson(join(buildDir, "manifest.json")),
    readJson(join(buildDir, "validation-report.json")),
    readJson(join(buildDir, "routes.json")),
    readJson(join(schemaDir, "series.schema.json")),
    readJson(join(schemaDir, "route.schema.json"))
  ]);

  const artifactResults = {};
  for (const [family, defaultFilename] of Object.entries(FAMILY_FILES)) {
    const filenames = (validation.artifacts || [])
      .filter(artifact => artifact.family === family)
      .map(artifact => artifact.output);
    const inspections = await Promise.all(
      (filenames.length > 0 ? filenames : [defaultFilename]).map(filename => scanCompressedSeries(join(buildDir, filename)))
    );
    artifactResults[family] = combineInspections(inspections);
  }

  const combined = combineInspections(Object.values(artifactResults));
  const expectedCounts = manifest.record_counts || {};
  const errors = [];
  for (const family of Object.keys(FAMILY_FILES)) {
    if (artifactResults[family].objectCount !== expectedCounts[family]) {
      errors.push(`${family} record count does not match the Phase 1B manifest`);
    }
  }
  if (combined.objectCount !== expectedCounts.total) {
    errors.push("total record count does not match the Phase 1B manifest");
  }

  const schemaInspection = inspectMetadataObjects([seriesSchema]);
  const routeSchemaInspection = inspectMetadataObjects([routeSchema]);
  const routeInspection = inspectMetadataObjects(routes);
  const hierarchy = evaluateVerifiedHierarchy({
    entries: combined.hierarchyEntries,
    candidateIds: combined.candidateIds
  });
  const auditValid = errors.length === 0;
  const hierarchyReady = auditValid && hierarchy.ready;

  return {
    phase: "6",
    gate: "aggregation_hierarchy_evidence",
    status: hierarchyReady ? "ready" : "blocked",
    audit_valid: auditValid,
    hierarchy_ready: hierarchyReady,
    implementation_decision: hierarchyReady
      ? "aggregation_contribution_ranking_may_be_implemented"
      : "do_not_implement_aggregation_contribution_ranking",
    reason_codes: hierarchyReady ? [] : buildBlockedReasons({ combined, hierarchy }),
    metadata: {
      build_version: manifest.build_version,
      content_hash: manifest.content_hash,
      api_version: manifest.api_version,
      expected_records: expectedCounts.total,
      scanned_records: combined.objectCount
    },
    evidence: {
      relationship_field_names: {
        series_schema: schemaInspection.relationshipFieldNames,
        route_schema: routeSchemaInspection.relationshipFieldNames,
        route_records: routeInspection.relationshipFieldNames,
        series_records: combined.relationshipFieldNames
      },
      hierarchy_entries_found: combined.hierarchyEntries.length,
      verified_relationships: hierarchy.validRelationshipCount,
      invalid_relationships: hierarchy.invalidRelationshipCount,
      relationship_errors: hierarchy.errors,
      family_artifacts: Object.fromEntries(Object.entries(artifactResults).map(([family, result]) => [family, {
        record_count: result.objectCount,
        top_level_fields: result.topLevelFields,
        relationship_field_names: result.relationshipFieldNames,
        hierarchy_entries_found: result.hierarchyEntries.length
      }]))
    },
    safeguards: {
      title_text_accepted_as_relationship_evidence: false,
      independent_facets_accepted_as_hierarchy_evidence: false,
      phase4_semantic_taxonomy_accepted_as_official_series_hierarchy: false,
      observation_values_read: false,
      live_api_calls: 0
    },
    errors
  };
}

export function inspectMetadataObjects(objects) {
  const accumulator = createInspectionAccumulator();
  for (const object of objects || []) addInspectedObject(accumulator, object);
  return finalizeInspection(accumulator);
}

export function evaluateVerifiedHierarchy({ entries = [], candidateIds = new Set() } = {}) {
  const knownCandidateIds = candidateIds instanceof Set ? candidateIds : new Set(candidateIds);
  if (entries.length > 0 && knownCandidateIds.size === 0) {
    return {
      ready: false,
      entryCount: entries.length,
      validRelationshipCount: 0,
      invalidRelationshipCount: entries.length,
      errors: ["candidate ID registry is required to verify hierarchy membership"]
    };
  }
  const errors = [];
  const seenEdges = new Set();
  let validEntryCount = 0;
  let validRelationshipCount = 0;

  for (const [index, entry] of entries.entries()) {
    const entryErrors = validateHierarchyEntry(entry, knownCandidateIds, seenEdges);
    if (entryErrors.length) {
      errors.push(...entryErrors.map(error => `relationship ${index}: ${error}`));
    } else {
      validEntryCount += 1;
      validRelationshipCount += entry.component_candidate_ids.length;
    }
  }

  return {
    ready: entries.length > 0 && errors.length === 0 && validRelationshipCount > 0,
    entryCount: entries.length,
    validRelationshipCount,
    invalidRelationshipCount: entries.length - validEntryCount,
    errors
  };
}

async function scanCompressedSeries(filePath) {
  const accumulator = createInspectionAccumulator();
  const input = createReadStream(filePath).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    addInspectedObject(accumulator, JSON.parse(line));
  }
  return finalizeInspection(accumulator);
}

function createInspectionAccumulator() {
  return {
    objectCount: 0,
    topLevelFields: new Set(),
    relationshipFieldNames: new Set(),
    hierarchyEntries: [],
    candidateIds: new Set()
  };
}

function addInspectedObject(accumulator, object) {
  if (!object || typeof object !== "object" || Array.isArray(object)) return;
  accumulator.objectCount += 1;
  for (const key of Object.keys(object)) accumulator.topLevelFields.add(key);
  collectRelationshipFieldNames(object, accumulator.relationshipFieldNames);
  if (CANDIDATE_ID_PATTERN.test(object.candidate_id || "")) accumulator.candidateIds.add(object.candidate_id);
  if (object.aggregation_relationship && typeof object.aggregation_relationship === "object") {
    accumulator.hierarchyEntries.push(object.aggregation_relationship);
  }
  if (Array.isArray(object.aggregation_relationships)) {
    accumulator.hierarchyEntries.push(...object.aggregation_relationships);
  }
}

function finalizeInspection(accumulator) {
  return {
    objectCount: accumulator.objectCount,
    topLevelFields: [...accumulator.topLevelFields].sort(),
    relationshipFieldNames: [...accumulator.relationshipFieldNames].sort(),
    hierarchyEntries: accumulator.hierarchyEntries,
    candidateIds: accumulator.candidateIds
  };
}

function combineInspections(inspections) {
  const combined = createInspectionAccumulator();
  for (const inspection of inspections) {
    combined.objectCount += inspection.objectCount;
    for (const field of inspection.topLevelFields) combined.topLevelFields.add(field);
    for (const field of inspection.relationshipFieldNames) combined.relationshipFieldNames.add(field);
    combined.hierarchyEntries.push(...inspection.hierarchyEntries);
    for (const candidateId of inspection.candidateIds) combined.candidateIds.add(candidateId);
  }
  return finalizeInspection(combined);
}

function collectRelationshipFieldNames(value, fields) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) collectRelationshipFieldNames(item, fields);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (RELATIONSHIP_FIELD_PATTERN.test(key)) fields.add(key);
    collectRelationshipFieldNames(child, fields);
  }
}

function validateHierarchyEntry(entry, candidateIds, seenEdges) {
  const errors = [];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return ["entry must be an object"];
  if (entry.relationship_type !== "verified_component") errors.push("relationship_type must be verified_component");
  if (!CANDIDATE_ID_PATTERN.test(entry.aggregate_candidate_id || "")) errors.push("aggregate_candidate_id is invalid");
  if (!Array.isArray(entry.component_candidate_ids) || entry.component_candidate_ids.length === 0) {
    errors.push("component_candidate_ids must be a non-empty array");
  }

  const components = Array.isArray(entry.component_candidate_ids) ? entry.component_candidate_ids : [];
  if (new Set(components).size !== components.length) errors.push("component_candidate_ids contains duplicates");
  if (components.some(candidateId => !CANDIDATE_ID_PATTERN.test(candidateId))) errors.push("component_candidate_ids contains an invalid candidate ID");
  if (components.includes(entry.aggregate_candidate_id)) errors.push("an aggregate cannot be its own component");
  if (candidateIds.size > 0 && !candidateIds.has(entry.aggregate_candidate_id)) errors.push("aggregate candidate is absent from the metadata cache");
  if (candidateIds.size > 0 && components.some(candidateId => !candidateIds.has(candidateId))) errors.push("a component candidate is absent from the metadata cache");

  const provenance = entry.provenance;
  if (!provenance || typeof provenance !== "object") {
    errors.push("official provenance is required");
  } else {
    if (provenance.source !== "EIA") errors.push("provenance source must be EIA");
    if (!TRUSTED_PROVENANCE.has(provenance.selector_source)) errors.push("provenance selector_source is not trusted");
    if (!/^[a-f0-9]{64}$/.test(provenance.metadata_hash || "")) errors.push("provenance metadata_hash is invalid");
    if (!isOfficialEiaReference(provenance.raw_metadata_reference)) errors.push("provenance reference is not an official safe EIA URL");
  }

  for (const componentId of components) {
    const edge = `${entry.aggregate_candidate_id}|${componentId}`;
    if (seenEdges.has(edge)) errors.push("relationship edge is duplicated");
    seenEdges.add(edge);
  }
  return errors;
}

function isOfficialEiaReference(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      (url.hostname === "eia.gov" || url.hostname.endsWith(".eia.gov")) &&
      !url.searchParams.has("api_key");
  } catch {
    return false;
  }
}

function buildBlockedReasons({ combined, hierarchy }) {
  const reasons = [];
  if (combined.relationshipFieldNames.length === 0) reasons.push("metadata_contains_no_aggregation_relationship_fields");
  if (combined.hierarchyEntries.length === 0) reasons.push("no_explicit_aggregate_component_entries");
  if (hierarchy.validRelationshipCount === 0) reasons.push("no_verified_aggregate_component_relationships");
  if (hierarchy.errors.length > 0) reasons.push("aggregation_relationship_validation_failed");
  return reasons;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const result = await auditAggregationHierarchy();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.audit_valid) process.exitCode = 1;
}
