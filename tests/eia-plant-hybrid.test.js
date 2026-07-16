import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

import { GET as plantMetadataRoute } from "../app/api/plant-metadata/route.js";
import {
  findPlantById,
  getPlantMetadata,
  resetPlantMetadataCachesForTests,
  searchPlantDirectory
} from "../lib/sources/eia/plant-metadata.js";

beforeEach(() => {
  resetPlantMetadataCachesForTests();
});

test("local plant search returns compact matches without calling EIA", async () => {
  const matches = await searchPlantDirectory({ query: "Encina Water Pollution", stateCode: "CA" });
  assert.ok(matches.length > 0);
  assert.equal(matches[0].plant_id, "10026");
  assert.equal(matches[0].state_code, "CA");
  assert.equal(Object.hasOwn(matches[0], "series_id"), false);
  assert.equal(Object.hasOwn(matches[0], "data"), false);
});

test("exact plant IDs resolve only from the local directory", async () => {
  const plant = await findPlantById("10026");
  assert.equal(plant.name, "Encina Water Pollution Control");
  assert.equal(await findPlantById("9999999999"), null);
  assert.equal(await findPlantById("10026&length=5000"), null);
});

test("live lookup uses the verified plant facet and returns only the latest period", async () => {
  let requestedUrl;
  const fetchImpl = async url => {
    requestedUrl = new URL(url);
    return new Response(JSON.stringify({
      response: {
        total: "2",
        data: [
          plantRow({ period: "2026-04", generatorid: "A" }),
          plantRow({ period: "2026-03", generatorid: "A" })
        ]
      },
      apiVersion: "2.1.13",
      request: { params: { api_key: "must-not-be-returned" } }
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  };

  const result = await getPlantMetadata({
    plantId: "10026",
    apiKey: "fixture-secret-key",
    fetchImpl,
    now: Date.parse("2026-07-16T12:00:00Z")
  });

  assert.equal(requestedUrl.pathname, "/v2/electricity/operating-generator-capacity/data/");
  assert.equal(requestedUrl.searchParams.get("facets[plantid][]"), "10026");
  assert.equal(requestedUrl.searchParams.get("length"), "250");
  assert.equal(result.latest_period, "2026-04");
  assert.equal(result.generators.length, 1);
  assert.equal(result.generators[0].generator_id, "A");
  assert.equal(JSON.stringify(result).includes("fixture-secret-key"), false);
  assert.equal(JSON.stringify(result).includes("must-not-be-returned"), false);
});

test("successful live metadata is cached by plant ID", async () => {
  let requests = 0;
  const fetchImpl = async () => {
    requests += 1;
    return new Response(JSON.stringify({
      response: { data: [plantRow({ period: "2026-04", generatorid: "A" })] },
      apiVersion: "2.1.13"
    }), { status: 200 });
  };

  const first = await getPlantMetadata({ plantId: "10026", apiKey: "key", fetchImpl, now: 1_000_000 });
  const second = await getPlantMetadata({ plantId: "10026", apiKey: "key", fetchImpl, now: 1_001_000 });
  assert.equal(first.cache_status, "miss");
  assert.equal(second.cache_status, "hit");
  assert.equal(requests, 1);
});

test("API name search remains local and reports that no live lookup occurred", async () => {
  const previousLoginRequired = process.env.LOGIN_REQUIRED;
  process.env.LOGIN_REQUIRED = "off";
  try {
    const response = await plantMetadataRoute(new Request(
      "https://example.test/api/plant-metadata?q=Encina%20Water%20Pollution&state=CA"
    ));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.mode, "local_plant_directory");
    assert.equal(body.live_lookup_performed, false);
    assert.equal(body.matches[0].plant_id, "10026");
  } finally {
    if (previousLoginRequired === undefined) delete process.env.LOGIN_REQUIRED;
    else process.env.LOGIN_REQUIRED = previousLoginRequired;
  }
});

function plantRow(overrides) {
  return {
    period: "2026-04",
    stateid: "CA",
    stateName: "California",
    plantid: "10026",
    plantName: "Encina Water Pollution Control",
    generatorid: "A",
    technology: "Natural Gas",
    energy_source_code: "NG",
    "energy-source-desc": "Natural Gas",
    prime_mover_code: "CT",
    status: "OP",
    statusDescription: "Operating",
    county: "San Diego",
    latitude: "33.1165",
    longitude: "-117.3215",
    "nameplate-capacity-mw": "4.5",
    "net-summer-capacity-mw": "4.2",
    "net-winter-capacity-mw": "4.3",
    "operating-year-month": "2001-01",
    "planned-retirement-year-month": null,
    ...overrides
  };
}
