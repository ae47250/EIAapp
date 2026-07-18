import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluateVerifiedHierarchy } from "./audit-aggregation-hierarchy.js";
import {
  GENERATED_HIERARCHY_FILENAME,
  generateAggregationHierarchyArtifact
} from "./generate-aggregation-hierarchy.js";
import { sha256, stableStringify } from "./normalize.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_BUILD_DIR = join(ROOT_DIR, "data", "eia", "builds", "phase1b");
const DEFAULT_REGISTRY_PATH = join(ROOT_DIR, "data", "eia", "aggregation-hierarchy-registry.json");
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SUPPORTED_ADAPTERS = new Set(["seds_series_code_geography"]);

export async function auditAggregationHierarchyRegistry(options = {}) {
  const buildDir = resolve(options.buildDir || DEFAULT_BUILD_DIR);
  const registryPath = resolve(options.registryPath || DEFAULT_REGISTRY_PATH);
  const [registry, manifest, validation, committedArtifact] = await Promise.all([
    readJson(registryPath),
    readJson(join(buildDir, "manifest.json")),
    readJson(join(buildDir, "validation-report.json")),
    readJson(join(buildDir, GENERATED_HIERARCHY_FILENAME))
  ]);
  const expectedArtifact = await generateAggregationHierarchyArtifact({
    buildDir,
    registryPath,
    registry,
    manifest,
    validation
  });
  const errors = [
    ...validateRegistryDocument(registry, { manifest }),
    ...validateGeneratedArtifact(committedArtifact, { manifest })
  ];
  if (stableStringify(committedArtifact) !== stableStringify(expectedArtifact)) {
    errors.push("generated hierarchy artifact does not match deterministic expansion of the active metadata cache");
  }

  const candidateIds = new Set(committedArtifact.relationships.flatMap(relationship => [
    relationship.aggregate?.candidateId,
    ...(relationship.components || []).map(component => component.candidateId)
  ]).filter(Boolean));
  const hierarchy = evaluateVerifiedHierarchy({
    entries: committedArtifact.relationships.map(toVerifiedEntry),
    candidateIds
  });
  if (!hierarchy.ready) errors.push(...hierarchy.errors);

  const registryValid = errors.length === 0 && hierarchy.ready;
  const evidenceDocuments = new Set((registry.templates || []).flatMap(template =>
    (template.officialEvidence || []).map(evidence => `${evidence.url}|${evidence.sha256}`)
  ));

  return {
    phase: "11",
    gate: "generated_aggregation_hierarchy_registry",
    status: registryValid ? "production_ranking_approved" : "blocked",
    registry_valid: registryValid,
    activation_ready: registryValid && registry.activation?.rankingActivationApproval === "approved",
    public_ranking_enabled: registry.activation?.publicRankingEnabled === true,
    contribution_calculation_enabled: false,
    source_build: committedArtifact.sourceBuild,
    evidence: {
      template_count: (registry.templates || []).length,
      relationship_count: committedArtifact.counts.relationships,
      state_or_district_relationships: committedArtifact.counts.stateOrDistrictRelationships,
      national_relationships: committedArtifact.counts.nationalRelationships,
      verified_component_edges: hierarchy.validRelationshipCount,
      required_candidate_records: committedArtifact.counts.selectedCandidates,
      excluded_geographies: committedArtifact.counts.excludedGeographies,
      official_evidence_documents: evidenceDocuments.size,
      relationship_hash: committedArtifact.relationshipHash,
      artifact_hash: committedArtifact.artifactHash
    },
    safeguards: {
      public_ranking_governed_by_approved_post_ranker: registry.activation?.publicRankingEnabled === true,
      observation_shadow_complete: registry.activation?.observationShadowEnabled === true,
      contribution_calculation_disconnected: registry.activation?.contributionCalculationEnabled === false,
      incomplete_geographies_rejected: true,
      title_or_facet_inference_used: false,
      unsupported_route_templates_rejected: true
    },
    errors: [...new Set(errors)]
  };
}

export function validateRegistryDocument(registry, { manifest = null } = {}) {
  const errors = [];
  if (registry?.schemaVersion !== "2.0.0") errors.push("registry schemaVersion must be 2.0.0");
  if (registry?.status !== "production_ranking_approved") errors.push("registry must be production_ranking_approved");
  if (!Array.isArray(registry?.templates) || registry.templates.length === 0) errors.push("registry must contain at least one reviewed template");
  if (registry?.activation?.publicRankingEnabled !== true) errors.push("public ranking must be explicitly approved after Preview verification");
  if (registry?.activation?.contributionCalculationEnabled !== false) errors.push("contribution calculation must remain disabled before shadow approval");
  if (registry?.activation?.observationShadowEnabled !== true) errors.push("observation shadow must be complete before preview approval");
  if (registry?.activation?.rankingActivationApproval !== "approved") errors.push("ranking activation approval must be explicit");
  if (manifest && registry?.reviewedAgainst?.buildVersion !== manifest.build_version) {
    errors.push("registry template build version does not match the active metadata manifest");
  }

  const templateIds = new Set();
  for (const [index, template] of (registry?.templates || []).entries()) {
    const prefix = `template ${index}`;
    if (!template?.templateId || templateIds.has(template.templateId)) errors.push(`${prefix}: templateId is missing or duplicated`);
    templateIds.add(template?.templateId);
    if (!SUPPORTED_ADAPTERS.has(template?.adapterId)) errors.push(`${prefix}: hierarchy adapter is not approved`);
    if (template?.relationshipType !== "verified_component") errors.push(`${prefix}: relationshipType must be verified_component`);
    if (template?.status !== "research_reviewed_shadow_pending") errors.push(`${prefix}: status must remain research_reviewed_shadow_pending`);
    if (!template?.aggregateSeriesCode) errors.push(`${prefix}: aggregate series code is required`);
    if (!Array.isArray(template?.componentSeriesCodes) || template.componentSeriesCodes.length === 0) errors.push(`${prefix}: component series codes are required`);
    if (new Set(template?.componentSeriesCodes || []).size !== (template?.componentSeriesCodes || []).length) errors.push(`${prefix}: component series codes are duplicated`);
    if ((template?.componentSeriesCodes || []).includes(template?.aggregateSeriesCode)) errors.push(`${prefix}: aggregate cannot be its own component`);
    if (!template?.formula?.expression) errors.push(`${prefix}: formula expression is required`);
    if (!template?.geographyScope?.selectorFacet) errors.push(`${prefix}: geography selector facet is required`);
    if (!template?.officialEvidence?.length) errors.push(`${prefix}: official evidence is required`);
    for (const evidence of template?.officialEvidence || []) {
      if (!isOfficialEiaReference(evidence.url)) errors.push(`${prefix}: evidence URL must be an official safe EIA URL`);
      if (!HASH_PATTERN.test(evidence.sha256 || "")) errors.push(`${prefix}: evidence SHA-256 is invalid`);
      if (!Number.isInteger(evidence.bytes) || evidence.bytes <= 0) errors.push(`${prefix}: evidence byte count is invalid`);
      if (!evidence.locator) errors.push(`${prefix}: evidence locator is required`);
    }
    if (template?.provenance?.source !== "EIA") errors.push(`${prefix}: provenance source must be EIA`);
    if (template?.provenance?.selector_source !== "official_combination_metadata") errors.push(`${prefix}: provenance selector source is not approved`);
    if (!HASH_PATTERN.test(template?.provenance?.metadata_hash || "")) errors.push(`${prefix}: provenance metadata hash is invalid`);
    if (!isOfficialEiaReference(template?.provenance?.raw_metadata_reference)) errors.push(`${prefix}: provenance reference is not an official safe EIA URL`);
  }
  return errors;
}

export function validateGeneratedArtifact(artifact, { manifest = null } = {}) {
  const errors = [];
  if (artifact?.schemaVersion !== "1.0.0") errors.push("generated artifact schemaVersion must be 1.0.0");
  if (artifact?.status !== "shadow_ready_inactive") errors.push("generated artifact must remain shadow_ready_inactive");
  if (artifact?.activation?.observationShadowEnabled !== false) errors.push("generated artifact observation shadow must remain disabled");
  if (artifact?.activation?.publicRankingEnabled !== false) errors.push("generated artifact public ranking must remain disabled");
  if (artifact?.activation?.contributionCalculationEnabled !== false) errors.push("generated artifact contribution calculation must remain disabled");
  if (!Array.isArray(artifact?.relationships) || artifact.relationships.length === 0) errors.push("generated artifact must contain relationships");
  if (manifest) {
    if (artifact?.sourceBuild?.buildVersion !== manifest.build_version) errors.push("generated artifact build version does not match the active metadata manifest");
    if (artifact?.sourceBuild?.contentHash !== manifest.content_hash) errors.push("generated artifact content hash does not match the active metadata manifest");
  }
  if (artifact?.relationshipHash !== sha256(stableStringify(artifact?.relationships || []))) {
    errors.push("generated artifact relationship hash is invalid");
  }
  const { artifactHash: ignored, ...body } = artifact || {};
  if (artifact?.artifactHash !== sha256(stableStringify(body))) errors.push("generated artifact hash is invalid");
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
