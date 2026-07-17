import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { GET as searchEia } from "../app/api/search-eia/route.js";

const originalEnvironment = {
  EIA_API_KEY: process.env.EIA_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LOGIN_REQUIRED: process.env.LOGIN_REQUIRED,
  EIA_CANDIDATE_PIPELINE: process.env.EIA_CANDIDATE_PIPELINE
};
const originalFetch = globalThis.fetch;
let seriesRequests = 0;

before(() => {
  process.env.EIA_API_KEY = "fixture-eia-key";
  process.env.LOGIN_REQUIRED = "off";
  process.env.EIA_CANDIDATE_PIPELINE = "on";
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
  assert.equal(Object.hasOwn(candidate, "equivalentChoiceGroup"), false);
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

async function mockFetch(input) {
  const url = new URL(String(input));
  if (url.pathname.includes("/v2/seriesid/")) {
    seriesRequests += 1;
    assert.equal(url.searchParams.get("api_key"), "fixture-eia-key");
    return jsonResponse({
      response: {
        data: [
          { period: "2024", countryRegionId: "BRA", consumption: "11.25", "consumption-units": "quadrillion Btu" },
          { period: "2023", countryRegionId: "BRA", consumption: "10.5", "consumption-units": "quadrillion Btu" }
        ]
      }
    });
  }
  throw new Error(`Unexpected network request: ${url}`);
}

function jsonResponse(body) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

function restoreEnvironment(values) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}
