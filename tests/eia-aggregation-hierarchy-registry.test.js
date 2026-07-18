import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  auditAggregationHierarchyRegistry,
  validateGeneratedArtifact,
  validateRegistryDocument
} from "../scripts/eia-metadata/audit-aggregation-hierarchy-registry.js";
import {
  expandHierarchyTemplates,
  generateAggregationHierarchyArtifact
} from "../scripts/eia-metadata/generate-aggregation-hierarchy.js";

const registry = await readJson("../data/eia/aggregation-hierarchy-registry.json");
const manifest = await readJson("../data/eia/builds/phase1b/manifest.json");
const artifact = await readJson("../data/eia/builds/phase1b/aggregation-hierarchy.generated.json");

test("reviewed templates generate every eligible SEDS geography and remain production-inactive", async () => {
  const result = await auditAggregationHierarchyRegistry();

  assert.equal(result.registry_valid, true);
  assert.equal(result.status, "preview_ready_production_inactive");
  assert.equal(result.activation_ready, false);
  assert.equal(result.public_ranking_enabled, false);
  assert.equal(result.contribution_calculation_enabled, false);
  assert.equal(result.evidence.template_count, 2);
  assert.equal(result.evidence.relationship_count, 52);
  assert.equal(result.evidence.state_or_district_relationships, 51);
  assert.equal(result.evidence.national_relationships, 1);
  assert.equal(result.evidence.verified_component_edges, 259);
  assert.equal(result.evidence.required_candidate_records, 311);
  assert.equal(result.evidence.excluded_geographies, 0);
  assert.equal(result.evidence.official_evidence_documents, 2);
  assert.equal(result.safeguards.public_ranking_disconnected, true);
  assert.equal(result.safeguards.observation_shadow_complete, true);
  assert.equal(result.safeguards.incomplete_geographies_rejected, true);
  assert.deepEqual(result.errors, []);
});

test("Texas remains an exact regression canary rather than a manual registry entry", () => {
  const texas = artifact.relationships.find(relationship => relationship.compatibility.sourceGeographyCode === "TX");

  assert.equal(texas.aggregate.candidateId, "eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca");
  assert.equal(texas.aggregate.seriesId, "SEDS.TETCB.TX.A");
  assert.deepEqual(
    texas.components.map(component => component.seriesId),
    ["SEDS.FFTCB.TX.A", "SEDS.NUETB.TX.A", "SEDS.RETCB.TX.A", "SEDS.ELNIB.TX.A", "SEDS.ELISB.TX.A"]
  );
  assert.equal(texas.templateId, "seds-state-dc-total-energy-consumption-annual-v1");
});

test("all 51 state and district relationships are unique and use the five-component formula", () => {
  const stateRelationships = artifact.relationships.filter(
    relationship => relationship.compatibility.sourceGeographyCode !== "US"
  );
  const sourceCodes = stateRelationships.map(relationship => relationship.compatibility.sourceGeographyCode);

  assert.equal(stateRelationships.length, 51);
  assert.equal(new Set(sourceCodes).size, 51);
  assert.ok(sourceCodes.includes("DC"));
  assert.ok(!sourceCodes.includes("US"));
  assert.ok(stateRelationships.every(relationship => relationship.components.length === 5));
  assert.ok(stateRelationships.every(relationship => relationship.compatibility.frequency === "annual"));
  assert.ok(stateRelationships.every(relationship => relationship.compatibility.unit === "Billion Btu"));
});

test("the United States uses its separate four-component official formula", () => {
  const national = artifact.relationships.find(relationship => relationship.compatibility.sourceGeographyCode === "US");

  assert.equal(national.compatibility.geographyCode, "USA");
  assert.equal(national.aggregate.seriesId, "SEDS.TETCB.US.A");
  assert.deepEqual(
    national.components.map(component => component.seriesId),
    ["SEDS.FFTCB.US.A", "SEDS.NUETB.US.A", "SEDS.RETCB.US.A", "SEDS.ELNIB.US.A"]
  );
  assert.ok(!national.formula.componentSeriesIds.includes("SEDS.ELISB.US.A"));
  assert.equal(national.templateId, "seds-us-total-energy-consumption-annual-v1");
});

test("generation is deterministic for the same registry and metadata build", async () => {
  const first = await generateAggregationHierarchyArtifact();
  const second = await generateAggregationHierarchyArtifact();

  assert.deepEqual(first, second);
  assert.equal(first.artifactHash, artifact.artifactHash);
  assert.equal(first.relationshipHash, artifact.relationshipHash);
});

test("an incomplete geography is excluded instead of receiving a partial relationship", () => {
  const templateRegistry = {
    registryVersion: "test-v1",
    templates: [registry.templates[0]]
  };
  const records = ["TETCB", "FFTCB", "NUETB", "RETCB", "ELNIB"].map(seriesCode =>
    syntheticSedsRecord(seriesCode, "ZZ")
  );
  const generated = expandHierarchyTemplates(templateRegistry, records, { manifest });

  assert.equal(generated.counts.relationships, 0);
  assert.equal(generated.counts.excludedGeographies, 1);
  assert.deepEqual(generated.excludedGeographies[0].reasons, ["missing:ELISB"]);
});

test("public ranking cannot be enabled before shadow testing and activation approval", () => {
  const modified = structuredClone(registry);
  modified.activation.publicRankingEnabled = true;

  const errors = validateRegistryDocument(modified, { manifest });

  assert.ok(errors.includes("public ranking must remain disabled before shadow approval"));
});

test("a stale or tampered generated artifact is rejected", () => {
  const stale = structuredClone(artifact);
  stale.sourceBuild.contentHash = "0".repeat(64);
  const tampered = structuredClone(artifact);
  tampered.relationships[0].components.pop();

  assert.ok(validateGeneratedArtifact(stale, { manifest }).includes(
    "generated artifact content hash does not match the active metadata manifest"
  ));
  assert.ok(validateGeneratedArtifact(tampered, { manifest }).includes(
    "generated artifact relationship hash is invalid"
  ));
});

test("unapproved route adapters cannot generate inferred hierarchy", () => {
  const modified = structuredClone(registry);
  modified.templates[0].adapterId = "generic_title_inference";

  assert.throws(
    () => expandHierarchyTemplates(modified, [], { manifest }),
    /Unsupported hierarchy adapter/
  );
  assert.ok(validateRegistryDocument(modified, { manifest }).some(error => error.includes("adapter is not approved")));
});

test("base scoring and retrieval remain unchanged by governed hierarchy post-ranking", async () => {
  const [rankingConfig, localRanking, localRetrieval] = await Promise.all([
    readJson("../data/eia/phase4-ranking-config.json"),
    readFile(new URL("../lib/sources/eia/local-ranking.js", import.meta.url), "utf8"),
    readFile(new URL("../lib/sources/eia/local-retrieval.js", import.meta.url), "utf8")
  ]);

  assert.equal(rankingConfig.hierarchy.evidenceStatus, "none");
  assert.equal(rankingConfig.hierarchy.verifiedRelationshipCount, 0);
  assert.equal(rankingConfig.hierarchy.preferenceEnabled, false);
  assert.equal(rankingConfig.weights.measureOrAggregation, 0);
  assert.doesNotMatch(localRanking, /aggregation-hierarchy\.generated/);
  assert.doesNotMatch(localRetrieval, /aggregation-hierarchy\.generated/);
});

function syntheticSedsRecord(seriesCode, stateId) {
  return {
    candidate_id: `eia:1:${"a".repeat(64)}`,
    series_id: `SEDS.${seriesCode}.${stateId}.A`,
    route_family: "seds",
    selector: { facets: { seriesId: seriesCode, stateId } },
    selector_source: "official_series_metadata",
    geography: { code: stateId, name: stateId, type: "state" },
    frequency: "annual",
    unit: "Billion Btu",
    is_active: true,
    metadata_hash: "b".repeat(64)
  };
}

async function readJson(relativeUrl) {
  return JSON.parse(await readFile(new URL(relativeUrl, import.meta.url), "utf8"));
}
