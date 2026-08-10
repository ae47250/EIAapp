import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { GET as searchEia } from "../app/api/search-eia/route.js";

const originalEnvironment = {
  EIA_API_KEY: process.env.EIA_API_KEY,
  EIA_HIERARCHY_RANKING: process.env.EIA_HIERARCHY_RANKING,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LOGIN_REQUIRED: process.env.LOGIN_REQUIRED
};
const originalFetch = globalThis.fetch;
let seriesRequests = 0;
let activeSeriesRequests = 0;
let maximumActiveSeriesRequests = 0;
let delaySeriesRequests = false;
let emptySeriesIds = new Set();
let failedSeriesIds = new Set();

before(() => {
  process.env.EIA_API_KEY = "fixture-eia-key";
  process.env.LOGIN_REQUIRED = "off";
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = mockFetch;
});

after(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment(originalEnvironment);
});

test("candidate mode blocks missing activity before ranking or observation retrieval", async () => {
  seriesRequests = 0;
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Texas%20gas"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.mode, "candidate-selection");
  assert.equal(body.selectedSeries, null);
  assert.deepEqual(body.variables, []);
  assert.deepEqual(body.candidateGroups, []);
  assert.equal(body.needsClarification, true);
  assert.equal(body.intent.blockingClarification, true);
  assert.equal(body.diagnostics.rankingApplied, false);
  assert.equal(body.diagnostics.clarificationBlocked, true);
  assert.ok(body.diagnostics.clarificationReasons.includes("missing_activity"));
  assert.equal(body.diagnostics.hierarchyEvidenceStatus, "none");
  assert.equal(body.diagnostics.verifiedHierarchyRelationshipCount, 0);
  assert.equal(body.diagnostics.hierarchyPreferenceApplied, false);
  assert.equal(body.diagnostics.semanticRerankingApplied, false);
  assert.equal(seriesRequests, 0);
});

test("the retired feature flag cannot switch the route back to legacy search", async () => {
  const previous = process.env.EIA_CANDIDATE_PIPELINE;
  process.env.EIA_CANDIDATE_PIPELINE = "off";
  try {
    const response = await searchEia(new Request("https://example.test/api/search-eia?q=Texas%20gas"));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.mode, "candidate-selection");
    assert.equal(body.diagnostics.clarificationBlocked, true);
  } finally {
    if (previous === undefined) delete process.env.EIA_CANDIDATE_PIPELINE;
    else process.env.EIA_CANDIDATE_PIPELINE = previous;
  }
});

test("preview hierarchy mode exposes only the observation-validated aggregate tie-break", async () => {
  const previous = process.env.EIA_HIERARCHY_RANKING;
  process.env.EIA_HIERARCHY_RANKING = "on";
  try {
    const response = await searchEia(new Request(
      "https://example.test/api/search-eia?q=Texas%20total%20energy%20consumption"
    ));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.variables[0].seriesId, "SEDS.TETCB.TX.A");
    assert.equal(body.variables[0].certainty.aggregationRelation, "verified_aggregate");
    assert.equal(body.variables[0].certainty.hierarchyEvidenceStatus, "observation_validated");
    assert.equal(body.diagnostics.hierarchyRankingMode, "on");
    assert.equal(body.diagnostics.hierarchyEvidenceStatus, "observation_validated");
    assert.equal(body.diagnostics.verifiedHierarchyRelationshipCount, 52);
    assert.equal(body.diagnostics.hierarchyPreferenceApplied, true);
  } finally {
    if (previous === undefined) delete process.env.EIA_HIERARCHY_RANKING;
    else process.env.EIA_HIERARCHY_RANKING = previous;
  }
});

test("certainty labels an approved cross-route fallback without calling it exact", async () => {
  const response = await searchEia(new Request(
    "https://example.test/api/search-eia?q=Texas%20monthly%20total%20energy%20consumption"
  ));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.variables.length > 0);
  assert.ok(body.variables.every(candidate => candidate.routeFamily === "seds"));
  assert.ok(body.variables.every(candidate => candidate.certainty.routeRelation === "approved_fallback"));
});

test("candidate IDs cannot bypass clarification", async () => {
  seriesRequests = 0;
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Texas%20gas&candidateId=invented"));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.needsClarification, true);
  assert.equal(body.diagnostics.clarificationBlocked, true);
  assert.equal(body.selectedSeries, null);
  assert.deepEqual(body.variables, []);
  assert.equal(seriesRequests, 0);
});

test("explicit selection reruns validation and fetches only the verified series ID", async () => {
  const query = "Brazil annual petroleum consumption";
  const initial = await (await searchEia(new Request(`https://example.test/api/search-eia?q=${encodeURIComponent(query)}`))).json();
  const candidate = initial.variables[0];
  assert.equal(initial.comparisonMode, false);
  assert.deepEqual(initial.comparisonDefinitions, []);
  assert.ok(initial.candidateGroups.length > 0);
  assert.equal(Object.hasOwn(candidate, "equivalentChoiceGroup"), false);
  assert.equal(initial.diagnostics.resultCertaintyVersion, "1.1.0");
  assert.equal(candidate.certainty.semanticCompatibility, "compatible");
  assert.equal(candidate.certainty.conceptPairStatus, "validated");
  assert.equal(candidate.certainty.routeRelation, "exact");
  assert.equal(candidate.certainty.aggregationRelation, "unknown");
  assert.equal(candidate.certainty.hierarchyEvidenceStatus, "none");
  seriesRequests = 0;
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", query);
  url.searchParams.set("candidateId", candidate.candidateId);
  const response = await searchEia(new Request(url));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(seriesRequests, 1);
  assert.equal(body.selectedSeries.candidateId, candidate.candidateId);
  assert.equal(body.selectedSeries.seriesId, candidate.seriesId);
  assert.equal(body.selectedSeries.selectorVerified, true);
  assert.equal(body.selectedSeries.measureField, "consumption");
  assert.equal(body.selectedSeries.unit, "quadrillion Btu");
  assert.deepEqual(body.selectedSeries.certainty, candidate.certainty);
  assert.deepEqual(body.selectedSeries.points, [{ period: "2023", value: 10.5 }, { period: "2024", value: 11.25 }]);
});

test("a candidate ID that was not displayed is rejected before any EIA request", async () => {
  seriesRequests = 0;
  const response = await searchEia(new Request("https://example.test/api/search-eia?q=Brazil%20annual%20petroleum%20consumption&candidateId=invented"));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /not valid/i);
  assert.equal(seriesRequests, 0);
});

test("AI corrected wording cannot override the validated activity used for candidates", async () => {
  const raw = "Brazil energy production";
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", raw);
  url.searchParams.set("intentReady", "1");
  url.searchParams.set("intentPayload", JSON.stringify({
    originalQuery: raw,
    cleanedQuery: raw,
    correctedQuery: "Brazil energy consumption",
    correctedQuerySource: "ai",
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
  assert.equal(body.mode, "candidate-selection");
  assert.equal(body.intent.activity, "production");
  assert.equal(body.intent.correctedQuery, "Brazil energy consumption");
  assert.ok(body.variables.length > 0);
  assert.ok(body.variables.every(variable => variable.activity === "production"));
  assert.ok(body.variables.every(variable => !/consumption/i.test(variable.title)));
});

test("multi-country responses rank definitions first without fetching observations", async () => {
  seriesRequests = 0;
  const query = "Brazil, Japan, and Germany electricity production";
  const response = await searchEia(new Request(`https://example.test/api/search-eia?q=${encodeURIComponent(query)}`));
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.comparisonMode, true);
  assert.deepEqual(body.variables, []);
  assert.deepEqual(body.candidateGroups, []);
  assert.equal(body.comparisonDefinitions.length, 5);
  assert.deepEqual(body.comparisonDefinitions.map(definition => definition.rank), [1, 2, 3, 4, 5]);
  assert.ok(body.comparisonDefinitions.every(definition => definition.countries.length === 3));
  assert.equal(body.diagnostics.rankingUnit, "variable_definition");
  assert.equal(seriesRequests, 0);
});

test("definition selection preserves missing and failed countries as warnings", async () => {
  const query = "Brazil, Japan, and Germany electricity production";
  const initial = await (await searchEia(new Request(`https://example.test/api/search-eia?q=${encodeURIComponent(query)}`))).json();
  const definition = initial.comparisonDefinitions[0];
  const japan = definition.countries.find(country => country.geography.code === "JPN");
  const germany = definition.countries.find(country => country.geography.code === "DEU");
  emptySeriesIds = new Set([japan.seriesId]);
  failedSeriesIds = new Set([germany.seriesId]);
  seriesRequests = 0;
  try {
    const url = new URL("https://example.test/api/search-eia");
    url.searchParams.set("q", query);
    url.searchParams.set("definitionId", definition.definitionId);
    const response = await searchEia(new Request(url));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(seriesRequests, 3);
    assert.equal(body.selectedComparison.definitionId, definition.definitionId);
    assert.equal(body.selectedComparison.countries.find(country => country.geography.code === "BRA").status, "comparable");
    assert.equal(body.selectedComparison.countries.find(country => country.geography.code === "JPN").status, "missing_observations");
    assert.equal(body.selectedComparison.countries.find(country => country.geography.code === "JPN").series, null);
    assert.equal(body.selectedComparison.countries.find(country => country.geography.code === "DEU").warningType, "observation_fetch_failed");
    assert.equal(body.selectedComparison.countries.find(country => country.geography.code === "DEU").series, null);
    assert.equal(body.selectedComparison.availableCountryCount, 1);
    assert.equal(body.selectedComparison.missingCountryCount, 2);
  } finally {
    emptySeriesIds = new Set();
    failedSeriesIds = new Set();
  }
});

test("combined definition selection fetches all countries with bounded concurrency", async () => {
  const query = "Brazil, Japan, and Germany electricity generation";
  const initial = await (await searchEia(new Request(`https://example.test/api/search-eia?q=${encodeURIComponent(query)}`))).json();
  seriesRequests = 0;
  activeSeriesRequests = 0;
  maximumActiveSeriesRequests = 0;
  delaySeriesRequests = true;
  try {
    const url = new URL("https://example.test/api/search-eia");
    url.searchParams.set("q", query);
    url.searchParams.set("definitionIds", initial.comparisonDefinitions.map(definition => definition.definitionId).join(","));
    const response = await searchEia(new Request(url));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.selectedComparisons.length, 5);
    assert.equal(seriesRequests, 15);
    assert.ok(maximumActiveSeriesRequests > 1);
    assert.ok(maximumActiveSeriesRequests <= 4);
    assert.ok(body.selectedComparisons.every(definition => definition.countries.length === 3));
  } finally {
    delaySeriesRequests = false;
  }
});

async function mockFetch(input) {
  const url = new URL(String(input));
  if (url.pathname.includes("/v2/seriesid/")) {
    seriesRequests += 1;
    activeSeriesRequests += 1;
    maximumActiveSeriesRequests = Math.max(maximumActiveSeriesRequests, activeSeriesRequests);
    assert.equal(url.searchParams.get("api_key"), "fixture-eia-key");
    const seriesId = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1));
    try {
      if (delaySeriesRequests) await new Promise(resolve => setTimeout(resolve, 10));
      if (failedSeriesIds.has(seriesId)) return jsonResponse({ error: "fixture failure" }, 503);
      if (emptySeriesIds.has(seriesId)) return jsonResponse({ response: { data: [] } });
      const electricityGeneration = /INTL\..+-12-/.test(seriesId);
      return jsonResponse({
        response: {
          data: electricityGeneration ? [
            { period: "2024", value: "11.25", "value-units": "billion kilowatthours" },
            { period: "2023", value: "10.5", "value-units": "billion kilowatthours" }
          ] : [
            { period: "2024", countryRegionId: "BRA", consumption: "11.25", "consumption-units": "quadrillion Btu" },
            { period: "2023", countryRegionId: "BRA", consumption: "10.5", "consumption-units": "quadrillion Btu" }
          ]
        }
      });
    } finally {
      activeSeriesRequests -= 1;
    }
  }
  throw new Error(`Unexpected network request: ${url}`);
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function restoreEnvironment(values) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
