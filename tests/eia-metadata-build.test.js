import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  normalizePlantDirectoryEntry,
  normalizeBulkSeries,
  parseElectricityPlantDirectorySource,
  shouldIncludeBulkSeries
} from "../scripts/eia-metadata/normalize.js";
import {
  activateBuildDirectory,
  validateCompressedPlantDirectory
} from "../scripts/eia-metadata/build-cache.js";
import {
  validateManifest,
  validatePlantDirectoryRecord,
  validateSeriesRecord
} from "../scripts/eia-metadata/validate-build.js";

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

const naturalGasRecord = {
  series_id: "NG.N9050NM2.M",
  name: "New Mexico Natural Gas Marketed Production, Monthly",
  description: "New Mexico Natural Gas Marketed Production",
  units: "Million Cubic Feet",
  f: "M",
  geography: "USA-NM",
  start: "198901",
  end: "202604",
  data: [["202604", 1]]
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
  assert.deepEqual(normalizeBulkSeries(naturalGasRecord, { routeFamily: "domestic" }).selector, {
    route: "/seriesid",
    measure: "n9050nm2",
    frequency: "monthly",
    facets: { series_id: "NG.N9050NM2.M" }
  });
  assert.deepEqual(normalizeBulkSeries(naturalGasRecord, { routeFamily: "domestic" }).geography, {
    name: "New Mexico",
    code: "NM",
    type: "state"
  });
  assert.deepEqual(normalizeBulkSeries({
    ...naturalGasRecord,
    series_id: "NG.NW2_EPG0_SWO_R48_BCF.W",
    name: "Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly",
    geography: null,
    iso3166: null,
    f: "W"
  }, { routeFamily: "domestic" }).geography, {
    name: "Lower 48 States",
    code: "USA",
    type: "national"
  });
});

test("facility-level Electricity records are explicitly excluded", () => {
  assert.equal(shouldIncludeBulkSeries({ series_id: "ELEC.PLANT.GEN.123" }, "domestic"), false);
  assert.equal(shouldIncludeBulkSeries(bulkRecords.domestic, "domestic"), true);
  assert.equal(shouldIncludeBulkSeries(naturalGasRecord, "domestic"), true);
});

test("plant records normalize to a compact on-demand directory entry", () => {
  const source = parseElectricityPlantDirectorySource({
    series_id: "ELEC.PLANT.AVG_HEAT.10026-NG-ALL.A",
    name: "MMBtu per unit : Encina Water Pollution Control (10026) : natural gas : all primemovers : annual",
    geography: "USA-CA",
    lat: "33.1165",
    lon: "-117.3215"
  });
  assert.deepEqual(source, {
    plant_id: "10026",
    name: "Encina Water Pollution Control",
    state_code: "CA",
    latitude: 33.1165,
    longitude: -117.3215
  });

  const record = normalizePlantDirectoryEntry({
    ...source,
    aliases: ["Encina WPC", "Encina WPC"],
    series_count: 42
  });
  assert.deepEqual(validatePlantDirectoryRecord(record), []);
  assert.equal(record.lookup_mode, "official_eia_api_v2_on_demand");
  assert.deepEqual(record.aliases, ["Encina WPC"]);
  assert.equal(Object.hasOwn(record, "series_id"), false);
  assert.equal(Object.hasOwn(record, "data"), false);
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
    domestic: 102046,
    international: 104407,
    seds: 48046,
    total: 254499
  });
  assert.equal(manifest.directory_counts.plants, report.directories[0].records);
  assert.equal(report.valid, true);
  assert.equal(report.production_activated, false);
  assert.equal(report.scope.comprehensive_domestic, false);

  const hierarchyArtifact = JSON.parse(await readFile(
    new URL("aggregation-hierarchy.generated.json", buildRoot),
    "utf8"
  ));
  assert.equal(hierarchyArtifact.sourceBuild.contentHash, manifest.content_hash);
  assert.equal(hierarchyArtifact.status, "shadow_ready_inactive");
  assert.equal(hierarchyArtifact.counts.relationships, 52);
  assert.equal(hierarchyArtifact.counts.componentEdges, 259);
  assert.equal(hierarchyArtifact.activation.publicRankingEnabled, false);
  assert.deepEqual(report.derived_artifacts, [{
    output: "aggregation-hierarchy.generated.json",
    status: "shadow_ready_inactive",
    registry_version: hierarchyArtifact.registryVersion,
    artifact_hash: hierarchyArtifact.artifactHash,
    relationship_count: 52,
    component_edges: 259,
    public_ranking_enabled: false
  }]);

  for (const artifact of report.artifacts) {
    assert.equal((await stat(new URL(artifact.output, buildRoot))).size, artifact.compressed_bytes);
    if (artifact.output === "natural-gas.jsonl.gz") assert.ok(artifact.missing_geographies > 0);
    else assert.equal(artifact.missing_geographies, 0);
  }

  const plantDirectory = report.directories[0];
  assert.equal(plantDirectory.output, "plants.jsonl.gz");
  assert.equal(plantDirectory.lookup_mode, "official_eia_api_v2_on_demand");
  assert.equal(plantDirectory.source_records, report.totals.excluded_records);
  assert.ok(plantDirectory.records > 1_000);
  assert.ok(plantDirectory.compressed_bytes < 10 * 1024 * 1024);
  assert.equal((await stat(new URL(plantDirectory.output, buildRoot))).size, plantDirectory.compressed_bytes);
  assert.deepEqual(
    (await validateCompressedPlantDirectory(new URL(plantDirectory.output, buildRoot))).errors,
    []
  );
});
