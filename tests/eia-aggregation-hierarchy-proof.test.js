import assert from "node:assert/strict";
import { test } from "node:test";

import {
  auditAggregationHierarchy,
  evaluateVerifiedHierarchy,
  inspectMetadataObjects
} from "../scripts/eia-metadata/audit-aggregation-hierarchy.js";

const AGGREGATE_ID = `eia:1:${"a".repeat(64)}`;
const COMPONENT_ID = `eia:1:${"b".repeat(64)}`;
const METADATA_HASH = "c".repeat(64);

test("an explicit aggregate-component relationship with official provenance is accepted", () => {
  const relationship = verifiedRelationship();
  const result = evaluateVerifiedHierarchy({
    entries: [relationship],
    candidateIds: new Set([AGGREGATE_ID, COMPONENT_ID])
  });

  assert.equal(result.ready, true);
  assert.equal(result.validRelationshipCount, 1);
  assert.deepEqual(result.errors, []);
});

test("a relationship cannot be verified without the cache candidate-ID registry", () => {
  const result = evaluateVerifiedHierarchy({ entries: [verifiedRelationship()] });

  assert.equal(result.ready, false);
  assert.equal(result.validRelationshipCount, 0);
  assert.deepEqual(result.errors, ["candidate ID registry is required to verify hierarchy membership"]);
});

test("aggregate wording in titles is not relationship evidence", () => {
  const inspection = inspectMetadataObjects([{
    candidate_id: AGGREGATE_ID,
    title: "Total energy production from renewable components",
    description: "Includes wind, solar, and hydro."
  }]);
  const result = evaluateVerifiedHierarchy({
    entries: inspection.hierarchyEntries,
    candidateIds: inspection.candidateIds
  });

  assert.deepEqual(inspection.relationshipFieldNames, []);
  assert.equal(result.ready, false);
  assert.equal(result.validRelationshipCount, 0);
});

test("independent route facets are not accepted as a component hierarchy", () => {
  const inspection = inspectMetadataObjects([{
    route: "/international",
    facets: [
      { id: "productId", description: "Product" },
      { id: "activityId", description: "Activity" },
      { id: "countryRegionId", description: "Country" }
    ]
  }]);
  const result = evaluateVerifiedHierarchy({ entries: inspection.hierarchyEntries });

  assert.deepEqual(inspection.relationshipFieldNames, []);
  assert.equal(result.ready, false);
});

test("unofficial, missing, self-referential, and duplicate relationships are rejected", () => {
  const malformed = verifiedRelationship({
    component_candidate_ids: [AGGREGATE_ID, COMPONENT_ID, COMPONENT_ID],
    provenance: {
      source: "EIA",
      selector_source: "title_inference",
      metadata_hash: METADATA_HASH,
      raw_metadata_reference: "https://example.com/?api_key=secret"
    }
  });
  const result = evaluateVerifiedHierarchy({
    entries: [malformed],
    candidateIds: new Set([AGGREGATE_ID])
  });

  assert.equal(result.ready, false);
  assert.ok(result.errors.some(error => error.includes("duplicates")));
  assert.ok(result.errors.some(error => error.includes("own component")));
  assert.ok(result.errors.some(error => error.includes("absent from the metadata cache")));
  assert.ok(result.errors.some(error => error.includes("selector_source is not trusted")));
  assert.ok(result.errors.some(error => error.includes("not an official safe EIA URL")));
});

test("the complete Phase 1B cache has no verified aggregation hierarchy", async () => {
  const proof = await auditAggregationHierarchy();

  assert.equal(proof.audit_valid, true);
  assert.equal(proof.metadata.scanned_records, 238478);
  assert.deepEqual(
    Object.fromEntries(Object.entries(proof.evidence.family_artifacts).map(([family, value]) => [family, value.record_count])),
    { domestic: 86025, international: 104407, seds: 48046 }
  );
  assert.equal(proof.status, "blocked");
  assert.equal(proof.hierarchy_ready, false);
  assert.equal(proof.evidence.hierarchy_entries_found, 0);
  assert.equal(proof.evidence.verified_relationships, 0);
  assert.deepEqual(proof.evidence.relationship_field_names.series_schema, []);
  assert.deepEqual(proof.evidence.relationship_field_names.route_schema, []);
  assert.deepEqual(proof.evidence.relationship_field_names.route_records, []);
  assert.deepEqual(proof.evidence.relationship_field_names.series_records, []);
  assert.equal(proof.safeguards.observation_values_read, false);
  assert.equal(proof.safeguards.live_api_calls, 0);
  assert.equal(proof.implementation_decision, "do_not_implement_aggregation_contribution_ranking");
});

function verifiedRelationship(overrides = {}) {
  return {
    relationship_type: "verified_component",
    aggregate_candidate_id: AGGREGATE_ID,
    component_candidate_ids: [COMPONENT_ID],
    provenance: {
      source: "EIA",
      selector_source: "official_series_metadata",
      metadata_hash: METADATA_HASH,
      raw_metadata_reference: "https://api.eia.gov/v2/seriesid/"
    },
    ...overrides
  };
}
