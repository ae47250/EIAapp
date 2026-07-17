import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";

import { GET as searchEia } from "../app/api/search-eia/route.js";
import { GET as interpretQuery } from "../app/api/interpret-query/route.js";
import { buildXlsx, workbookFileName } from "../lib/client/xlsx.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/eia-search.json", import.meta.url), "utf8"));
const originalEnvironment = {
  EIA_API_KEY: process.env.EIA_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LOGIN_REQUIRED: process.env.LOGIN_REQUIRED,
  EIA_CANDIDATE_PIPELINE: process.env.EIA_CANDIDATE_PIPELINE
};
const originalFetch = globalThis.fetch;
let exactSeriesRequests = 0;
let openAiRequests = 0;
let broadDataRequests = 0;
let failNextExactRequest = false;
let lastOpenAiInput = "";

before(() => {
  process.env.EIA_API_KEY = "fixture-eia-key";
  process.env.LOGIN_REQUIRED = "off";
  process.env.EIA_CANDIDATE_PIPELINE = "off";
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = mockEiaFetch;
});

after(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment(originalEnvironment);
});

test("Next search route preserves the EIA response contract with a variable typo", async () => {
  exactSeriesRequests = 0;
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
  assert.equal(body.variables[1].coverage, "2023-2024 (2 obs.)");
  assert.equal(exactSeriesRequests, 1);
  assert.equal(JSON.stringify(body).includes("fixture-eia-key"), false);
});

test("full staged workflow preserves exact raw input and separate cleaned text", async () => {
  process.env.OPENAI_API_KEY = "fixture-openai-key";
  openAiRequests = 0;
  lastOpenAiInput = "";
  try {
    const raw = "  Brazil\u00a0  enrgy\nproduction  ";
    const interpretationUrl = new URL("https://example.test/api/interpret-query");
    interpretationUrl.searchParams.set("q", raw);
    const interpretationResponse = await interpretQuery(new Request(interpretationUrl));
    const { intent } = await interpretationResponse.json();
    assert.equal(intent.interpreter, "openai");
    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.cleanedQuery, "Brazil enrgy production");
    assert.match(lastOpenAiInput, new RegExp(`Raw query: ${escapeRegExp(JSON.stringify(raw))}`));
    assert.doesNotMatch(lastOpenAiInput, /Lightly cleaned query:/);
    assert.equal(openAiRequests, 1);

    const url = new URL("https://example.test/api/search-eia");
    url.searchParams.set("q", raw);
    url.searchParams.set("intentReady", "1");
    url.searchParams.set("intentPayload", JSON.stringify({
      originalQuery: intent.originalQuery,
      cleanedQuery: intent.cleanedQuery,
      correctedQuery: intent.correctedQuery,
      correctedQuerySource: intent.correctedQuerySource,
      interpreter: intent.interpreter,
      confidence: intent.confidence,
      fields: intent.fields,
      ambiguity: intent.ambiguity,
      fallback: intent.fallback
    }));
    url.searchParams.set("intentCorrectedQuery", intent.correctedQuery);
    url.searchParams.set("intentInterpreter", intent.interpreter);
    url.searchParams.set("intentCountryCode", intent.countryCode);
    url.searchParams.set("intentProduct", intent.product);
    url.searchParams.set("intentActivity", intent.activity);
    url.searchParams.set("intentFrequency", intent.frequency);
    const response = await searchEia(new Request(url));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.intent.interpreter, "openai");
    assert.equal(body.intent.originalQuery, raw);
    assert.equal(body.intent.cleanedQuery, "Brazil enrgy production");
    assert.equal(body.intent.correctedQuerySource, "ai");
    assert.equal(body.intent.fields.product.validation, "approved");
    assert.equal(body.intent.fields.product.fallbackUsed, false);
    assert.equal(openAiRequests, 1);
  } finally {
    delete process.env.OPENAI_API_KEY;
  }
});

test("legacy ranking ignores adversarial AI-corrected wording", async () => {
  const raw = "Brazil energy production";
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", raw);
  url.searchParams.set("intentReady", "1");
  url.searchParams.set("intentPayload", JSON.stringify({
    originalQuery: raw,
    cleanedQuery: raw,
    correctedQuery: "Brazil energy consumption",
    interpreter: "openai",
    confidence: 0.98,
    fields: {
      country: { value: "BRA", confidence: 0.98 },
      product: { value: "total energy", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 },
      frequency: { value: "annual", explicit: false, confidence: 0.98 }
    }
  }));

  const response = await searchEia(new Request(url));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.intent.activity, "production");
  assert.equal(body.intent.correctedQuery, "Brazil energy consumption");
  assert.equal(body.selectedSeries.activity, "Production");
  assert.equal(body.variables[0].activity, "Production");
});

test("unclear input asks for clarification before a broad EIA data request", async () => {
  broadDataRequests = 0;
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Brazil%20numbers"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.needsClarification, true);
  assert.deepEqual(body.intent.missingFields, ["product", "activity"]);
  assert.equal(body.selectedSeries, null);
  assert.deepEqual(body.variables, []);
  assert.match(body.userMessage, /product and activity/i);
  assert.equal(broadDataRequests, 0);
});

test("legacy exact selectors cannot bypass clarification", async () => {
  exactSeriesRequests = 0;
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", "Brazil energy");
  url.searchParams.set("country", "BRA");
  url.searchParams.set("productId", "44");
  url.searchParams.set("activityId", "1");
  url.searchParams.set("unit", "QBTU");

  const response = await searchEia(new Request(url));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.needsClarification, true);
  assert.equal(body.intent.blockingClarification, true);
  assert.equal(body.selectedSeries, null);
  assert.deepEqual(body.variables, []);
  assert.equal(exactSeriesRequests, 0);
});

test("a transient EIA server error retries only the selected top series", async () => {
  globalThis.__EIA_APP_CACHE__?.clear();
  exactSeriesRequests = 0;
  failNextExactRequest = true;

  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Brazil%20energy%20production"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.selectedSeries.activityId, "1");
  assert.equal(exactSeriesRequests, 2);
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

test("an exact series with no observations is marked for the UI to hide", async () => {
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", "Brazil energy consumption empty series");
  url.searchParams.set("country", "BRA");
  url.searchParams.set("productId", "999");
  url.searchParams.set("activityId", "999");
  url.searchParams.set("unit", "QBTU");
  const response = await searchEia(new Request(url));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.selectedSeries, null);
  assert.equal(body.emptySeries, true);
});

test("a legacy EIA entity returns a clear historical-data notice", async () => {
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Former%20Czechoslovakia%20energy%20production"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.country.name, "Former Czechoslovakia");
  assert.equal(body.selectedSeries, null);
  assert.equal(body.legacyEntity, true);
  assert.match(body.userMessage, /historical EIA entity/i);
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

async function mockEiaFetch(input, options = {}) {
  const url = new URL(String(input));
  if (url.hostname === "api.openai.com") {
    openAiRequests += 1;
    lastOpenAiInput = JSON.parse(options.body).input;
    return jsonResponse({
      output_text: JSON.stringify({
        correctedQuery: "Brazil energy production",
        countryName: "Brazil",
        countryCode: "BRA",
        product: "total energy",
        activity: "production",
        frequency: "annual",
        confidence: 0.98
      })
    });
  }
  if (url.pathname.endsWith("/facet/countryRegionId/")) return jsonResponse(fixture.countries);

  const countryCode = url.searchParams.get("facets[countryRegionId][]");
  const activityId = url.searchParams.get("facets[activityId][]");
  if (activityId) exactSeriesRequests += 1;
  else if (countryCode) broadDataRequests += 1;
  if (activityId && failNextExactRequest) {
    failNextExactRequest = false;
    return new Response("<html><h1>502 Bad Gateway</h1></html>", {
      status: 502,
      headers: { "Content-Type": "text/html" }
    });
  }
  const rows = countryCode === "CSK"
    ? [{ period: "2024", value: "NA", countryRegionId: "CSK", productId: "44", activityId: "1", unit: "QBTU" }]
    : activityId ? fixture.exactRows[activityId] || [] : fixture.broadRows;
  return jsonResponse({ response: { data: rows } });
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
