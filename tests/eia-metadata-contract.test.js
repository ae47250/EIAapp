import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  buildCapabilityReport,
  loadPhase1aFixtures
} from "../scripts/eia-metadata/discover-routes.js";
import {
  buildCandidateId,
  normalizeRouteFixture,
  normalizeSeriesCandidate,
  stableStringify
} from "../scripts/eia-metadata/normalize.js";
import {
  validateManifest,
  validatePhase1aFixtures,
  validateRouteRecord,
  validateSeriesRecord
} from "../scripts/eia-metadata/validate-build.js";

const schemaUrls = [
  new URL("../data/eia/schema/route.schema.json", import.meta.url),
  new URL("../data/eia/schema/series.schema.json", import.meta.url),
  new URL("../data/eia/schema/manifest.schema.json", import.meta.url),
  new URL("../data/eia/schema/plant-directory.schema.json", import.meta.url)
];

test("Phase 1A schemas use JSON Schema 2020-12 and reject unknown fields", async () => {
  for (const url of schemaUrls) {
    const schema = JSON.parse(await readFile(url, "utf8"));
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
  }
});

test("recorded route fixtures cover all three families without exposing an API key", async () => {
  const entries = await loadPhase1aFixtures();
  assert.equal(entries.length, 3);
  assert.deepEqual(
    entries.map(entry => entry.fixture.route_family).sort(),
    ["domestic", "international", "seds"]
  );

  for (const { fixture } of entries) {
    assert.equal(fixture.source, "EIA API v2");
    assert.equal(fixture.api_version, "2.1.13");
    assert.equal(new URL(fixture.source_url).search, "");
    assert.equal(/api_key/i.test(JSON.stringify(fixture)), false);
  }
});

test("official route fixtures normalize and validate deterministically", async () => {
  const result = await validatePhase1aFixtures();
  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(result.route_records.length, 3);

  for (const record of result.route_records) {
    assert.deepEqual(validateRouteRecord(record), []);
    assert.match(record.metadata_hash, /^[a-f0-9]{64}$/);
  }
});

test("route normalization ignores object-property ordering", async () => {
  const [{ fixture }] = await loadPhase1aFixtures();
  const reordered = JSON.parse(stableStringify(fixture));
  assert.deepEqual(normalizeRouteFixture(reordered), normalizeRouteFixture(fixture));
});

test("route metadata reports capabilities but does not claim valid series combinations", async () => {
  const entries = await loadPhase1aFixtures();
  const report = buildCapabilityReport(entries);

  assert.equal(report.findings.route_metadata_exposes_frequencies, true);
  assert.equal(report.findings.route_metadata_exposes_facets, true);
  assert.equal(report.findings.route_metadata_exposes_measures, true);
  assert.equal(report.findings.route_metadata_exposes_route_coverage, true);
  assert.equal(report.findings.route_metadata_enumerates_valid_series_combinations, false);
  assert.equal(report.findings.candidate_generation_allowed_from_route_metadata_alone, false);
});

test("candidate identity is stable across facet ordering", () => {
  const first = {
    route: "/international",
    measure: "value",
    frequency: "annual",
    facets: {
      countryRegionId: "BRA",
      productId: "44",
      activityId: "1",
      unit: "QBTU"
    }
  };
  const reordered = {
    frequency: "annual",
    measure: "value",
    route: "/international/",
    facets: {
      unit: "QBTU",
      activityId: "1",
      productId: "44",
      countryRegionId: "BRA"
    }
  };

  assert.equal(buildCandidateId(first), buildCandidateId(reordered));
  assert.notEqual(
    buildCandidateId(first),
    buildCandidateId({ ...first, facets: { ...first.facets, activityId: "2" } })
  );
});

test("an explicitly sourced selector produces a valid candidate record", () => {
  const record = normalizeSeriesCandidate({
    route_family: "international",
    selector_source: "recorded_observation_fixture",
    selector: {
      route: "/international",
      measure: "value",
      frequency: "annual",
      facets: {
        countryRegionId: "BRA",
        productId: "44",
        activityId: "1",
        unit: "QBTU"
      }
    },
    title: "Total primary energy - Production",
    description: "Recorded Phase 1A selector example.",
    geography: { name: "Brazil", code: "BRA", type: "country" },
    activity: "production",
    product_or_scope: "total energy",
    concept_type: "flow",
    unit: "quadrillion Btu",
    unit_family: "energy",
    unit_scale: 1e15,
    date_start: "2022",
    date_end: "2024",
    raw_metadata_reference: "https://api.eia.gov/v2/international/"
  });

  assert.deepEqual(validateSeriesRecord(record), []);
  assert.match(record.candidate_id, /^eia:1:[a-f0-9]{64}$/);
});

test("route facet definitions alone cannot create a series candidate", () => {
  assert.throws(
    () => normalizeSeriesCandidate({
      route_family: "international",
      selector_source: "route_metadata_facets",
      selector: { route: "/international", measure: "value", frequency: "annual", facets: {} },
      title: "Invented candidate",
      raw_metadata_reference: "https://api.eia.gov/v2/international/"
    }),
    /trusted selector source/
  );
});

test("manifest validation catches inconsistent totals and failed complete builds", () => {
  const manifest = {
    schema_version: "1.0.0",
    source: "EIA",
    api_version: "2.1.13",
    checked_at: "2026-07-16T04:10:26Z",
    content_updated_at: "2026-07-16T04:10:26Z",
    content_hash: "a".repeat(64),
    routes_checked: ["/international"],
    routes_succeeded: ["/international"],
    routes_failed: [],
    refresh_status: "complete",
    record_counts: { domestic: 1, international: 1, seds: 1, total: 3 },
    directory_counts: { plants: 0 },
    change_counts: { added: 3, removed: 0, changed: 0 },
    diff_summary: {
      routes: 3,
      facets: 10,
      measures: 6,
      frequencies: 7,
      units: 4,
      geographies: 0,
      coverage: 3
    },
    rollback_snapshot_reference: null,
    update_schedule_state: "not_configured",
    warnings: [],
    errors: [],
    build_version: "phase1a"
  };

  assert.deepEqual(validateManifest(manifest), []);
  assert.match(validateManifest({
    ...manifest,
    routes_failed: [{ route: "/seds", error: "timeout" }],
    record_counts: { ...manifest.record_counts, total: 4 },
    change_counts: { ...manifest.change_counts, added: -1 }
  }).join(" "), /total is inconsistent|cannot contain failed routes/);
});
