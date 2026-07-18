import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  auditAggregationHierarchyRegistry,
  validateRegistryDocument
} from "../scripts/eia-metadata/audit-aggregation-hierarchy-registry.js";

const registry = JSON.parse(await readFile(new URL("../data/eia/aggregation-hierarchy-registry.json", import.meta.url), "utf8"));
const manifest = JSON.parse(await readFile(new URL("../data/eia/builds/phase1b/manifest.json", import.meta.url), "utf8"));

test("the reviewed SEDS relationship matches the exact Phase 1B candidates and remains inactive", async () => {
  const result = await auditAggregationHierarchyRegistry();

  assert.equal(result.registry_valid, true);
  assert.equal(result.status, "shadow_ready_inactive");
  assert.equal(result.activation_ready, false);
  assert.equal(result.public_ranking_enabled, false);
  assert.equal(result.contribution_calculation_enabled, false);
  assert.equal(result.evidence.relationship_count, 1);
  assert.equal(result.evidence.verified_component_edges, 5);
  assert.equal(result.evidence.required_candidate_records, 6);
  assert.equal(result.evidence.matched_candidate_records, 6);
  assert.equal(result.evidence.official_evidence_documents, 2);
  assert.equal(result.safeguards.public_ranking_disconnected, true);
  assert.equal(result.safeguards.observation_shadow_pending, true);
  assert.deepEqual(result.errors, []);
});

test("public ranking cannot be enabled before shadow testing and activation approval", () => {
  const modified = structuredClone(registry);
  modified.activation.publicRankingEnabled = true;

  const errors = validateRegistryDocument(modified, { manifest });

  assert.ok(errors.includes("public ranking must remain disabled before shadow approval"));
});

test("a metadata rebuild invalidates the curated registry until candidate identities are reviewed", () => {
  const modified = structuredClone(registry);
  modified.sourceBuild.contentHash = "0".repeat(64);

  const errors = validateRegistryDocument(modified, { manifest });

  assert.ok(errors.includes("registry content hash does not match the active metadata manifest"));
});

test("formula membership cannot silently diverge from the reviewed component records", () => {
  const modified = structuredClone(registry);
  modified.relationships[0].formula.componentSeriesIds.pop();

  const errors = validateRegistryDocument(modified, { manifest });

  assert.ok(errors.some(error => error.includes("formula component series do not match")));
});
