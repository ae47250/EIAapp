import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

import { sha256, stableStringify } from "./normalize.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_BUILD_DIR = join(ROOT_DIR, "data", "eia", "builds", "phase1b");
const DEFAULT_REGISTRY_PATH = join(ROOT_DIR, "data", "eia", "aggregation-hierarchy-registry.json");
export const GENERATED_HIERARCHY_FILENAME = "aggregation-hierarchy.generated.json";
const CANDIDATE_ID_PATTERN = /^eia:1:[a-f0-9]{64}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

export async function generateAggregationHierarchyArtifact(options = {}) {
  const buildDir = resolve(options.buildDir || DEFAULT_BUILD_DIR);
  const registryPath = resolve(options.registryPath || DEFAULT_REGISTRY_PATH);
  const [registry, manifest, validation] = await Promise.all([
    options.registry || readJson(registryPath),
    options.manifest || readJson(join(buildDir, "manifest.json")),
    options.validation || readJson(join(buildDir, "validation-report.json"))
  ]);
  const routeFamilies = new Set((registry.templates || []).map(template => template.routeFamily));
  const filenames = (validation.artifacts || [])
    .filter(artifact => routeFamilies.has(artifact.family))
    .map(artifact => artifact.output);
  const records = await readCompressedRecords(buildDir, filenames);
  return expandHierarchyTemplates(registry, records, { manifest });
}

export function expandHierarchyTemplates(registry, records, { manifest } = {}) {
  const relationships = [];
  const excludedGeographies = [];

  for (const template of registry.templates || []) {
    if (template.adapterId !== "seds_series_code_geography") {
      throw new Error(`Unsupported hierarchy adapter: ${template.adapterId || "missing"}`);
    }
    const expanded = expandSedsTemplate(template, records);
    relationships.push(...expanded.relationships);
    excludedGeographies.push(...expanded.excludedGeographies);
  }

  relationships.sort((left, right) => left.relationshipId.localeCompare(right.relationshipId));
  excludedGeographies.sort((left, right) =>
    `${left.templateId}|${left.sourceGeographyCode}`.localeCompare(`${right.templateId}|${right.sourceGeographyCode}`)
  );
  const relationshipHash = sha256(stableStringify(relationships));
  const body = {
    schemaVersion: "1.0.0",
    artifactVersion: "phase11-generated-v1",
    status: "shadow_ready_inactive",
    registryVersion: registry.registryVersion,
    sourceBuild: {
      buildVersion: manifest?.build_version,
      contentHash: manifest?.content_hash
    },
    activation: {
      observationShadowEnabled: false,
      publicRankingEnabled: false,
      contributionCalculationEnabled: false
    },
    counts: summarizeRelationships(relationships, excludedGeographies),
    relationshipHash,
    relationships,
    excludedGeographies
  };
  return { ...body, artifactHash: sha256(stableStringify(body)) };
}

export async function writeAggregationHierarchyArtifact(options = {}) {
  const buildDir = resolve(options.buildDir || DEFAULT_BUILD_DIR);
  const artifact = await generateAggregationHierarchyArtifact({ ...options, buildDir });
  await writeFile(
    join(buildDir, GENERATED_HIERARCHY_FILENAME),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8"
  );
  return artifact;
}

function expandSedsTemplate(template, records) {
  const scoped = records.filter(record => record.route_family === template.routeFamily);
  const geographyCodes = [...new Set(scoped
    .map(record => record.selector?.facets?.[template.geographyScope?.selectorFacet])
    .filter(value => geographyMatches(value, template.geographyScope)))]
    .sort();
  const requiredCodes = [template.aggregateSeriesCode, ...template.componentSeriesCodes];
  const relationships = [];
  const excludedGeographies = [];

  for (const sourceGeographyCode of geographyCodes) {
    const members = new Map();
    const reasons = [];
    for (const seriesCode of requiredCodes) {
      const matches = scoped.filter(record =>
        record.selector?.facets?.[template.geographyScope.selectorFacet] === sourceGeographyCode &&
        record.selector?.facets?.seriesId === seriesCode
      );
      if (matches.length !== 1) {
        reasons.push(matches.length === 0 ? `missing:${seriesCode}` : `duplicate:${seriesCode}`);
        continue;
      }
      const memberErrors = validateMember(matches[0], template);
      if (memberErrors.length) reasons.push(...memberErrors.map(error => `${seriesCode}:${error}`));
      members.set(seriesCode, matches[0]);
    }
    const normalizedGeographyCodes = new Set([...members.values()].map(record => record.geography?.code));
    if (normalizedGeographyCodes.size > 1) reasons.push("normalized_geography_mismatch");
    if (reasons.length) {
      excludedGeographies.push({
        templateId: template.templateId,
        sourceGeographyCode,
        reasons: [...new Set(reasons)].sort()
      });
      continue;
    }

    const aggregate = members.get(template.aggregateSeriesCode);
    const components = template.componentSeriesCodes.map(seriesCode => members.get(seriesCode));
    relationships.push(materializeRelationship(template, sourceGeographyCode, aggregate, components));
  }
  return { relationships, excludedGeographies };
}

function materializeRelationship(template, sourceGeographyCode, aggregate, components) {
  return {
    relationshipId: `${template.templateId}:${sourceGeographyCode}`,
    templateId: template.templateId,
    relationshipType: template.relationshipType,
    status: template.status,
    aggregate: toIdentity(aggregate),
    components: components.map(toIdentity),
    formula: {
      expression: template.formula.expression,
      aggregateSeriesId: aggregate.series_id,
      componentSeriesIds: components.map(component => component.series_id)
    },
    compatibility: {
      routeFamily: template.routeFamily,
      sourceGeographyCode,
      geographyCode: aggregate.geography.code,
      frequency: template.compatibility.frequency,
      unit: template.compatibility.unit,
      signedComponentsAllowed: template.compatibility.signedComponentsAllowed,
      roundingToleranceRequired: template.compatibility.roundingToleranceRequired
    },
    provenance: template.provenance,
    review: {
      formulaResearch: template.review.formulaResearch,
      templateScopeReview: template.review.templateScopeReview,
      exactCandidateAudit: "generated_and_verified",
      observationShadow: "pending",
      rankingActivationApproval: "pending_after_shadow"
    }
  };
}

function toIdentity(record) {
  return {
    candidateId: record.candidate_id,
    seriesId: record.series_id,
    metadataHash: record.metadata_hash
  };
}

function validateMember(record, template) {
  const errors = [];
  if (record.frequency !== template.compatibility.frequency) errors.push("frequency_mismatch");
  if (record.unit !== template.compatibility.unit) errors.push("unit_mismatch");
  if (record.is_active !== true) errors.push("inactive");
  if (record.selector_source !== "official_series_metadata") errors.push("untrusted_selector_source");
  if (!CANDIDATE_ID_PATTERN.test(record.candidate_id || "")) errors.push("candidate_id_invalid");
  if (!HASH_PATTERN.test(record.metadata_hash || "")) errors.push("metadata_hash_invalid");
  if (!record.series_id) errors.push("series_id_missing");
  const geographyTypes = template.geographyScope?.normalizedGeographyTypes;
  if (Array.isArray(geographyTypes) && !geographyTypes.includes(record.geography?.type)) errors.push("geography_type_mismatch");
  const geographyCodes = template.geographyScope?.normalizedGeographyCodes;
  if (Array.isArray(geographyCodes) && !geographyCodes.includes(record.geography?.code)) errors.push("geography_code_mismatch");
  return errors;
}

function geographyMatches(value, scope = {}) {
  if (typeof value !== "string") return false;
  if (Array.isArray(scope.includeValues) && !scope.includeValues.includes(value)) return false;
  if (scope.includePattern && !(new RegExp(scope.includePattern).test(value))) return false;
  if (Array.isArray(scope.excludeValues) && scope.excludeValues.includes(value)) return false;
  return true;
}

function summarizeRelationships(relationships, excludedGeographies) {
  const candidateIds = new Set();
  let componentEdges = 0;
  let stateOrDistrictRelationships = 0;
  let nationalRelationships = 0;
  for (const relationship of relationships) {
    candidateIds.add(relationship.aggregate.candidateId);
    for (const component of relationship.components) candidateIds.add(component.candidateId);
    componentEdges += relationship.components.length;
    if (relationship.compatibility.sourceGeographyCode === "US") nationalRelationships += 1;
    else stateOrDistrictRelationships += 1;
  }
  return {
    relationships: relationships.length,
    stateOrDistrictRelationships,
    nationalRelationships,
    componentEdges,
    selectedCandidates: candidateIds.size,
    excludedGeographies: excludedGeographies.length
  };
}

async function readCompressedRecords(buildDir, filenames) {
  const records = [];
  for (const filename of filenames) {
    const input = createReadStream(join(buildDir, filename)).pipe(createGunzip());
    const lines = createInterface({ input, crlfDelay: Infinity });
    for await (const line of lines) {
      if (line.trim()) records.push(JSON.parse(line));
    }
  }
  return records;
}

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, "utf8"));
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const artifact = await writeAggregationHierarchyArtifact();
  process.stdout.write(`${JSON.stringify({
    output: join(DEFAULT_BUILD_DIR, GENERATED_HIERARCHY_FILENAME),
    artifactHash: artifact.artifactHash,
    counts: artifact.counts
  }, null, 2)}\n`);
}
