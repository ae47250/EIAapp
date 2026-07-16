import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  normalizeBulkSeries,
  shouldIncludeBulkSeries
} from "../scripts/eia-metadata/normalize.js";
import { activateBuildDirectory } from "../scripts/eia-metadata/build-cache.js";
import { validateManifest, validateSeriesRecord } from "../scripts/eia-metadata/validate-build.js";

const bulkRecords = {
  domestic: {
    series_id: "ELEC.SALES.CO-RES.A",
    name: "Electricity sales : Colorado : residential : annual",
    units: "million kilowatt hours",
    f: "A",
    geography: "USA-CO",
    start: "2001",
    end: "2025",
    data: [["2025", 1]]
  },
  international: {
    series_id: "INTL.44-1-BRA-QBTU.A",
    name: "Primary energy production, Brazil, Annual",
    units: "quadrillion Btu",
    f: "A",
    geography: "BRA",
    start: "1980",
    end: "2024",
    data: [["2024", 1]]
  },
  seds: {
    series_id: "SEDS.TETCB.IN.A",
    name: "Total energy consumption, Indiana",
    units: "Billion Btu",
    f: "A",
    geography: "USA-IN",
    start: "1960",
    end: "2024",
    data: [["2024", 1]]
  }
};

test("bulk adapters produce deterministic valid records without observations", () => {
  for (const [routeFamily, input] of Object.entries(bulkRecords)) {
    const first = normalizeBulkSeries(input, { routeFamily });
    const second = normalizeBulkSeries({ ...input, data: [["1900", 999]] }, { routeFamily });
    assert.deepEqual(first, second);
    assert.deepEqual(validateSeriesRecord(first), []);
    assert.equal(Object.hasOwn(first, "data"), false);
    assert.match(first.candidate_id, /^eia:1:[a-f0-9]{64}$/);
    assert.match(first.metadata_hash, /^[a-f0-9]{64}$/);
  }
});

test("family adapters preserve the required retrieval selectors", () => {
  assert.deepEqual(
    normalizeBulkSeries(bulkRecords.domestic, { routeFamily: "domestic" }).selector,
    {
      route: "/seriesid",
      measure: "sales",
      frequency: "annual",
      facets: { series_id: "ELEC.SALES.CO-RES.A" }
    }
  );
  assert.deepEqual(
    normalizeBulkSeries(bulkRecords.international, { routeFamily: "international" }).selector.facets,
    { activityId: "1", countryRegionId: "BRA", productId: "44", unit: "QBTU" }
  );
  assert.equal(
    normalizeBulkSeries(bulkRecords.international, { routeFamily: "international" }).geography.type,
    "other"
  );
  assert.deepEqual(
    normalizeBulkSeries(bulkRecords.seds, { routeFamily: "seds" }).selector.facets,
    { seriesId: "TETCB", stateId: "IN" }
  );
  assert.deepEqual(
    normalizeBulkSeries({ ...bulkRecords.seds, geography: null }, { routeFamily: "seds" }).geography,
    { name: "Indiana", code: "IN", type: "state" }
  );
});

test("facility-level Electricity records are explicitly excluded", () => {
  assert.equal(shouldIncludeBulkSeries({ series_id: "ELEC.PLANT.GEN.123" }, "domestic"), false);
  assert.equal(shouldIncludeBulkSeries(bulkRecords.domestic, "domestic"), true);
});

test("invalid or cross-family series IDs are rejected", () => {
  assert.throws(
    () => normalizeBulkSeries({ ...bulkRecords.international, series_id: "INTL.invalid" }, { routeFamily: "international" }),
    /unsupported shape/
  );
  assert.throws(
    () => normalizeBulkSeries(bulkRecords.seds, { routeFamily: "domestic" }),
    /outside the domestic build scope/
  );
});

test("staging activation atomically preserves the previous build", async () => {
  const root = await mkdtemp(join(tmpdir(), "eia-phase1b-"));
  const active = join(root, "active");
  const stage = join(root, "stage");
  await mkdir(active);
  await mkdir(stage);
  await writeFile(join(active, "version.txt"), "old", "utf8");
  await writeFile(join(stage, "version.txt"), "new", "utf8");

  const rollback = await activateBuildDirectory(stage, active);
  assert.equal(await readFile(join(active, "version.txt"), "utf8"), "new");
  assert.equal(await readFile(join(rollback, "version.txt"), "utf8"), "old");
});

test("failed activation restores the previous build", async () => {
  const root = await mkdtemp(join(tmpdir(), "eia-phase1b-rollback-"));
  const active = join(root, "active");
  const stage = join(root, "stage");
  await mkdir(active);
  await mkdir(stage);
  await writeFile(join(active, "version.txt"), "old", "utf8");
  await writeFile(join(stage, "version.txt"), "new", "utf8");

  await assert.rejects(
    activateBuildDirectory(stage, active, { afterBackup: () => { throw new Error("simulated failure"); } }),
    /simulated failure/
  );
  assert.equal(await readFile(join(active, "version.txt"), "utf8"), "old");
});

test("generated Phase 1B artifacts remain valid staging metadata", async () => {
  const buildRoot = new URL("../data/eia/builds/phase1b/", import.meta.url);
  const manifest = JSON.parse(await readFile(new URL("manifest.json", buildRoot), "utf8"));
  const report = JSON.parse(await readFile(new URL("validation-report.json", buildRoot), "utf8"));

  assert.deepEqual(validateManifest(manifest), []);
  assert.equal(manifest.refresh_status, "partial");
  assert.deepEqual(manifest.record_counts, {
    domestic: 86025,
    international: 104407,
    seds: 48046,
    total: 238478
  });
  assert.equal(report.valid, true);
  assert.equal(report.production_activated, false);
  assert.equal(report.scope.comprehensive_domestic, false);

  for (const artifact of report.artifacts) {
    assert.equal((await stat(new URL(artifact.output, buildRoot))).size, artifact.compressed_bytes);
    assert.equal(artifact.missing_geographies, 0);
  }
});
