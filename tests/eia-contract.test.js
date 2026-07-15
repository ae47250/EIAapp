import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";

import { GET as searchEia } from "../app/api/search-eia/route.js";
import { buildXlsx, workbookFileName } from "../lib/client/xlsx.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/eia-search.json", import.meta.url), "utf8"));
const originalEnvironment = {
  EIA_API_KEY: process.env.EIA_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LOGIN_REQUIRED: process.env.LOGIN_REQUIRED
};
const originalFetch = globalThis.fetch;

before(() => {
  process.env.EIA_API_KEY = "fixture-eia-key";
  process.env.LOGIN_REQUIRED = "off";
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = mockEiaFetch;
});

after(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment(originalEnvironment);
});

test("Next search route preserves the EIA response contract with a variable typo", async () => {
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Brazil%20enrgy%20production"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body), ["query", "country", "intent", "source", "selectedSeries", "variables", "note"]);
  assert.equal(body.query, "Brazil enrgy production");
  assert.deepEqual(body.country, { code: "BRA", name: "Brazil" });
  assert.equal(body.intent.interpreter, "rules");
  assert.equal(body.intent.countryCode, "BRA");
  assert.equal(body.intent.activity, "production");
  assert.equal(body.selectedSeries.title, "Total primary energy - Production");
  assert.deepEqual(body.selectedSeries.coverage, { start: "2022", end: "2024", count: 3 });
  assert.deepEqual(body.selectedSeries.points, [
    { period: "2022", value: 12.1 },
    { period: "2023", value: 12.8 },
    { period: "2024", value: 13.5 }
  ]);
  assert.equal(body.variables.length, 2);
  assert.equal(body.variables[0].activityId, "1");
  assert.equal(JSON.stringify(body).includes("fixture-eia-key"), false);
});

test("exact-series selection keeps the alternate-series response shape", async () => {
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", "Brazil energy consumption");
  url.searchParams.set("country", "BRA");
  url.searchParams.set("productId", "44");
  url.searchParams.set("activityId", "2");
  url.searchParams.set("unit", "QBTU");
  const response = await searchEia(new Request(url));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(Object.keys(body), ["query", "country", "intent", "source", "selectedSeries", "variables", "note"]);
  assert.equal(body.selectedSeries.activity, "Consumption");
  assert.equal(body.selectedSeries.latestPeriod, "2024");
  assert.deepEqual(body.variables, []);
});

test("browser-side XLSX export retains All_Data and Metadata sheets", async () => {
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Brazil%20energy%20production"));
  const body = await response.json();
  const workbookText = new TextDecoder().decode(await buildXlsx(body.selectedSeries).arrayBuffer());

  assert.match(workbookText, /All_Data/);
  assert.match(workbookText, /Metadata/);
  assert.match(workbookText, /Observation period/);
  assert.match(workbookText, /Total primary energy - Production/);
  assert.equal(workbookFileName(body.selectedSeries), "Brazil_Primary_Energy_Production.xlsx");
});

async function mockEiaFetch(input) {
  const url = new URL(String(input));
  if (url.pathname.endsWith("/facet/countryRegionId/")) return jsonResponse(fixture.countries);

  const activityId = url.searchParams.get("facets[activityId][]");
  const rows = activityId ? fixture.exactRows[activityId] || [] : fixture.broadRows;
  return jsonResponse({ response: { data: rows } });
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

function restoreEnvironment(values) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
