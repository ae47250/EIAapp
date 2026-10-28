import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { GET as searchEia } from "../app/api/search-eia/route.js";
import { GET as interpretQuery } from "../app/api/interpret-query/route.js";
import {
  buildComparisonXlsx,
  buildXlsx,
  comparisonWorkbookFileName,
  workbookFileName
} from "../lib/client/xlsx.js";

const originalEnvironment = {
  EIA_API_KEY: process.env.EIA_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  LOGIN_REQUIRED: process.env.LOGIN_REQUIRED
};
const originalFetch = globalThis.fetch;
let openAiRequests = 0;
let seriesRequests = 0;
let lastOpenAiInput = "";
let openAiResponseOverride = null;

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

test("candidate selection and browser-side XLSX export retain verified metadata", async () => {
  const query = "Brazil annual petroleum consumption";
  const initialResponse = await searchEia(new Request(`https://example.test/api/search-eia?q=${encodeURIComponent(query)}`));
  const initial = await initialResponse.json();
  const candidate = initial.variables[0];

  assert.equal(initialResponse.status, 200);
  assert.equal(initial.mode, "candidate-selection");
  assert.equal(initial.selectedSeries, null);
  assert.ok(candidate);

  seriesRequests = 0;
  const selectionUrl = new URL("https://example.test/api/search-eia");
  selectionUrl.searchParams.set("q", query);
  selectionUrl.searchParams.set("candidateId", candidate.candidateId);
  const selectionResponse = await searchEia(new Request(selectionUrl));
  const body = await selectionResponse.json();
  const workbookText = new TextDecoder().decode(await buildXlsx(body.selectedSeries).arrayBuffer());

  assert.equal(selectionResponse.status, 200);
  assert.equal(seriesRequests, 1);
  assert.equal(body.selectedSeries.selectorVerified, true);
  assert.equal(body.selectedSeries.seriesId, candidate.seriesId);
  assert.match(workbookText, /All_Data/);
  assert.match(workbookText, /Metadata/);
  assert.match(workbookText, /Observation period/);
  assert.ok(workbookText.includes(candidate.title));
  assert.ok(workbookText.includes(candidate.seriesId));
  assert.equal(workbookFileName(body.selectedSeries), "Brazil_Petroleum_Consumption.xlsx");
  assert.equal(JSON.stringify(body).includes("fixture-eia-key"), false);
});

test("combined comparison XLSX includes all definitions, countries, statuses, and warning fields", async () => {
  const query = "Brazil, Japan, and Germany electricity generation";
  const initial = await (await searchEia(new Request(`https://example.test/api/search-eia?q=${encodeURIComponent(query)}`))).json();
  const url = new URL("https://example.test/api/search-eia");
  url.searchParams.set("q", query);
  url.searchParams.set("definitionIds", initial.comparisonDefinitions.map(definition => definition.definitionId).join(","));
  seriesRequests = 0;
  const response = await searchEia(new Request(url));
  const body = await response.json();
  const workbookText = new TextDecoder().decode(await buildComparisonXlsx(body.selectedComparisons).arrayBuffer());

  assert.equal(response.status, 200);
  assert.equal(seriesRequests, 15);
  assert.equal(body.selectedComparisons.length, 5);
  assert.match(workbookText, /All_Data/);
  assert.match(workbookText, /Variables/);
  assert.match(workbookText, /Comparability/);
  assert.match(workbookText, /Warnings/);
  assert.match(workbookText, /Notes/);
  assert.match(workbookText, /Comparability status/);
  assert.match(workbookText, /Warning details/);
  assert.match(workbookText, /Brazil/);
  assert.match(workbookText, /Japan/);
  assert.match(workbookText, /Germany/);
  assert.equal(comparisonWorkbookFileName(body.selectedComparisons), "EIA_Comparison_Brazil_Japan_Germany.xlsx");
  assert.equal(JSON.stringify(body).includes("fixture-eia-key"), false);
});

async function mockFetch(input, options = {}) {
  const url = new URL(String(input));
  if (url.hostname === "api.openai.com") {
    openAiRequests += 1;
    lastOpenAiInput = JSON.parse(options.body).input;
    return jsonResponse({
      output_text: JSON.stringify(openAiResponseOverride || {
        correctedQuery: "Brazil annual petroleum consumption",
        countryName: "Brazil",
        countryCode: "BRA",
        product: "petroleum",
        activity: "consumption",
        frequency: "annual",
        confidence: 0.98
      })
    });
  }
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
