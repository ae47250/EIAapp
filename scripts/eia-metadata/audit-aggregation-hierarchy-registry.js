import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

import { evaluateVerifiedHierarchy } from "./audit-aggregation-hierarchy.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_BUILD_DIR = join(ROOT_DIR, "data", "eia", "builds", "phase1b");
const DEFAULT_REGISTRY_PATH = join(ROOT_DIR, "data", "eia", "aggregation-hierarchy-registry.json");
const CANDIDATE_ID_PATTERN = /^eia:1:[a-f0-9]{64}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export async function auditAggregationHierarchyRegistry(options = {}) {
  const buildDir = resolve(options.buildDir || DEFAULT_BUILD_DIR);
  const registryPath = resolve(options.registryPath || DEFAULT_REGISTRY_PATH);
  const [registry, manifest, validation] = await Promise.all([
    readJson(registryPath),
    readJson(join(buildDir, "manifest.json")),
    readJson(join(buildDir, "validation-report.json"))
  ]);
  const wantedCandidateIds = registryCandidateIds(registry);
  const records = await findCandidateRecords(
    buildDir,
    (validation.artifacts || []).map(artifact => artifact.output),
    wantedCandidateIds
  );
  const errors = validateRegistryDocument(registry, { manifest, records });
  const hierarchy = evaluateVerifiedHierarchy({
    entries: (registry.relationships || []).map(toVerifiedEntry),
    candidateIds: new Set(records.keys())
  });
  if (!hierarchy.ready) errors.push(...hierarchy.errors);

  const registryValid = errors.length === 0 && hierarchy.ready;
  const activationReady = registryValid &&
    registry.activation?.observationShadowEnabled === true &&
    registry.activation?.publicRankingEnabled === true &&
    registry.activation?.rankingActivationApproval === "approved";

  return {
    phase: "11",
    gate: "supplementary_aggregation_hierarchy_registry",
    status: registryValid ? "shadow_ready_inactive" : "blocked",
    registry_valid: registryValid,
    activation_ready: activationReady,
    public_ranking_enabled: registry.activation?.publicRankingEnabled === true,
    contribution_calculation_enabled: registry.activation?.contributionCalculationEnabled === true,
    source_build: {
      build_version: manifest.build_version,
      content_hash: manifest.content_hash
    },
    evidence: {
      relationship_count: (registry.relationships || []).length,
      verified_component_edges: hierarchy.validRelationshipCount,
      required_candidate_records: wantedCandidateIds.size,
      matched_candidate_records: records.size,
      official_evidence_documents: (registry.relationships || []).reduce(
        (sum, relationship) => sum + (relationship.officialEvidence || []).length,
        0
      )
    },
    safeguards: {
      public_ranking_disconnected: registry.activation?.publicRankingEnabled !== true,
      observation_shadow_pending: registry.activation?.observationShadowEnabled !== true,
      contribution_calculation_disconnected: registry.activation?.contributionCalculationEnabled !== true,
      title_or_facet_inference_used: false
    },
    errors: [...new Set(errors)]
  };
}

export function validateRegistryDocument(registry, { manifest = null, records = null } = {}) {
  const errors = [];
  if (registry?.schemaVersion !== "1.0.0") errors.push("registry schemaVersion must be 1.0.0");
  if (registry?.status !== "research_reviewed_shadow_pending") errors.push("registry must remain research_reviewed_shadow_pending");
  if (!Array.isArray(registry?.relationships) || registry.relationships.length === 0) errors.push("registry must contain at least one relationship");
  if (registry?.activation?.publicRankingEnabled !== false) errors.push("public ranking must remain disabled before shadow approval");
  if (registry?.activation?.contributionCalculationEnabled !== false) errors.push("contribution calculation must remain disabled before shadow approval");
  if (registry?.activation?.observationShadowEnabled !== false) errors.push("observation shadow must remain disabled until its runner is reviewed");
  if (registry?.activation?.rankingActivationApproval !== "pending_after_shadow") errors.push("ranking activation approval must remain pending_after_shadow");
  if (manifest) {
    if (registry?.sourceBuild?.buildVersion !== manifest.build_version) errors.push("registry build version does not match the active metadata manifest");
    if (registry?.sourceBuild?.contentHash !== manifest.content_hash) errors.push("registry content hash does not match the active metadata manifest");
  }

  const relationshipIds = new Set();
  for (const [index, relationship] of (registry?.relationships || []).entries()) {
    const prefix = `relationship ${index}`;
    if (!relationship?.relationshipId || relationshipIds.has(relationship.relationshipId)) errors.push(`${prefix}: relationshipId is missing or duplicated`);
    relationshipIds.add(relationship?.relationshipId);
    if (relationship?.relationshipType !== "verified_component") errors.push(`${prefix}: relationshipType must be verified_component`);
    if (relationship?.status !== "research_reviewed_shadow_pending") errors.push(`${prefix}: status must remain research_reviewed_shadow_pending`);
    if (!CANDIDATE_ID_PATTERN.test(relationship?.aggregate?.candidateId || "")) errors.push(`${prefix}: aggregate candidateId is invalid`);
    if (!Array.isArray(relationship?.components) || relationship.components.length === 0) errors.push(`${prefix}: components must be non-empty`);

    const componentIds = (relationship?.components || []).map(component => component.candidateId);
    const componentSeriesIds = (relationship?.components || []).map(component => component.seriesId);
    if (new Set(componentIds).size !== componentIds.length) errors.push(`${prefix}: component candidateIds are duplicated`);
    if (componentIds.some(candidateId => !CANDIDATE_ID_PATTERN.test(candidateId || ""))) errors.push(`${prefix}: a component candidateId is invalid`);
    if (componentIds.includes(relationship?.aggregate?.candidateId)) errors.push(`${prefix}: aggregate cannot be its own component`);
    if (relationship?.formula?.aggregateSeriesId !== relationship?.aggregate?.seriesId) errors.push(`${prefix}: formula aggregate series does not match the aggregate record`);
    if (!sameValues(relationship?.formula?.componentSeriesIds, componentSeriesIds)) errors.push(`${prefix}: formula component series do not match the component records`);
    if (!relationship?.formula?.expression) errors.push(`${prefix}: formula expression is required`);

    if (!relationship?.officialEvidence?.length) errors.push(`${prefix}: official evidence is required`);
    for (const evidence of relationship?.officialEvidence || []) {
      if (!isOfficialEiaReference(evidence.url)) errors.push(`${prefix}: evidence URL must be an official safe EIA URL`);
      if (!HASH_PATTERN.test(evidence.sha256 || "")) errors.push(`${prefix}: evidence SHA-256 is invalid`);
      if (!Number.isInteger(evidence.bytes) || evidence.bytes <= 0) errors.push(`${prefix}: evidence byte count is invalid`);
      if (!evidence.locator) errors.push(`${prefix}: evidence locator is required`);
    }

    const expected = relationship?.compatibility || {};
    for (const member of [relationship?.aggregate, ...(relationship?.components || [])]) {
      if (!HASH_PATTERN.test(member?.metadataHash || "")) errors.push(`${prefix}: candidate metadata hash is invalid`);
      if (!records) continue;
      const record = records.get(member.candidateId);
      if (!record) {
        errors.push(`${prefix}: candidate ${member?.candidateId || "unknown"} is absent from the metadata cache`);
        continue;
      }
      if (record.series_id !== member.seriesId) errors.push(`${prefix}: candidate series ID does not match the metadata cache`);
      if (record.metadata_hash !== member.metadataHash) errors.push(`${prefix}: candidate metadata hash does not match the metadata cache`);
      if (record.route_family !== expected.routeFamily) errors.push(`${prefix}: candidate route family is incompatible`);
      if (record.geography?.code !== expected.geographyCode) errors.push(`${prefix}: candidate geography is incompatible`);
      if (record.frequency !== expected.frequency) errors.push(`${prefix}: candidate frequency is incompatible`);
      if (record.unit !== expected.unit) errors.push(`${prefix}: candidate unit is incompatible`);
      if (record.is_active !== true) errors.push(`${prefix}: candidate must be active`);
      if (record.selector_source !== "official_series_metadata") errors.push(`${prefix}: candidate selector source is not official series metadata`);
      if (!isOfficialEiaReference(record.raw_metadata_reference)) errors.push(`${prefix}: candidate metadata reference is not an official safe EIA URL`);
    }
  }
  return errors;
}

function toVerifiedEntry(relationship) {
  return {
    relationship_type: relationship.relationshipType,
    aggregate_candidate_id: relationship.aggregate?.candidateId,
    component_candidate_ids: (relationship.components || []).map(component => component.candidateId),
    provenance: relationship.provenance
  };
}

function registryCandidateIds(registry) {
  return new Set((registry.relationships || []).flatMap(relationship => [
    relationship.aggregate?.candidateId,
    ...(relationship.components || []).map(component => component.candidateId)
  ]).filter(Boolean));
}

async function findCandidateRecords(buildDir, filenames, wantedIds) {
  const records = new Map();
  for (const filename of filenames) {
    if (records.size === wantedIds.size) break;
    const input = createReadStream(join(buildDir, filename)).pipe(createGunzip());
    const lines = createInterface({ input, crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      const record = JSON.parse(line);
      if (wantedIds.has(record.candidate_id)) records.set(record.candidate_id, record);
    }
  }
  return records;
}

function sameValues(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
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

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const result = await auditAggregationHierarchyRegistry();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.registry_valid) process.exitCode = 1;
}
