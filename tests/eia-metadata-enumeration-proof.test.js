import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildPhase1a2Proof,
  loadPhase1a2Fixtures,
  summarizeEnumerationFixture
} from "../scripts/eia-metadata/prove-selector-enumeration.js";

test("Phase 1A.2 fixtures are sanitized and cover the three route families", async () => {
  const entries = await loadPhase1a2Fixtures();
  assert.deepEqual(
    entries.map(entry => entry.fixture.route_family).sort(),
    ["domestic", "international", "seds"]
  );

  for (const { fixture } of entries) {
    const serialized = JSON.stringify(fixture);
    assert.equal(/api_key/i.test(serialized), false);
    assert.equal(serialized.includes('"downloaded":true'), false);
    assert.equal(fixture.evidence.active_snapshot.measurement_columns_requested.length, 0);
    assert.equal(fixture.evidence.series_id_probe.measurement_value_omitted, true);
  }
});

test("conditional facet requests do not expose relationships", async () => {
  const entries = await loadPhase1a2Fixtures();
  for (const { fixture } of entries) {
    const probe = fixture.evidence.conditional_facet_probe;
    assert.equal(probe.filtered_total_facets, probe.unfiltered_total_facets);
    assert.equal(summarizeEnumerationFixture(fixture).conditional_facet_filter_reduced_values, false);
  }
});

test("independent facet products overgenerate international and SEDS selectors", async () => {
  const entries = await loadPhase1a2Fixtures();
  const summaries = Object.fromEntries(entries.map(({ fixture }) => [
    fixture.route_family,
    summarizeEnumerationFixture(fixture)
  ]));

  assert.equal(summaries.domestic.facet_cartesian_count, 372);
  assert.equal(summaries.domestic.active_snapshot.valid_combination_rows, 372);
  assert.equal(summaries.international.facet_cartesian_count, 1041984);
  assert.equal(summaries.international.active_snapshot.valid_combination_rows, 84623);
  assert.equal(summaries.seds.facet_cartesian_count, 52272);
  assert.equal(summaries.seds.active_snapshot.valid_combination_rows, 48046);
});

test("representative bulk series IDs round-trip to the expected v2 routes", async () => {
  const entries = await loadPhase1a2Fixtures();
  for (const { fixture } of entries) {
    assert.equal(summarizeEnumerationFixture(fixture).series_id_round_trip_confirmed, true);
  }
});

test("complete no-value observation enumeration has a measured high cost", async () => {
  const proof = buildPhase1a2Proof(await loadPhase1a2Fixtures());
  assert.deepEqual(proof.totals, {
    observation_index_rows: 7916442,
    rough_uncompressed_bytes: 2243316312,
    minimum_requests_at_5000_rows: 1586,
    bulk_compressed_bytes: 325029416
  });
  assert.equal(proof.findings.full_no_value_observation_scan_recommended, false);
});

test("Phase 1A.2 stops at the review gate before Phase 1B", async () => {
  const proof = buildPhase1a2Proof(await loadPhase1a2Fixtures());
  assert.equal(proof.phase, "1A.2");
  assert.equal(proof.status, "review_required");
  assert.equal(proof.findings.independent_facet_values_enumerate_valid_combinations, false);
  assert.equal(proof.findings.current_period_no_value_rows_enumerate_observed_combinations, true);
  assert.equal(proof.findings.current_period_snapshot_is_historically_complete, false);
  assert.equal(proof.findings.representative_series_ids_round_trip_to_v2_routes, true);
  assert.equal(proof.findings.bulk_files_are_route_native, false);
  assert.equal(proof.findings.phase_1b_ready_without_review, false);
});
