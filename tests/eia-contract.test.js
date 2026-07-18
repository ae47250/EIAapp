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

test("full staged workflow preserves exact raw input and separate cleaned text", async () => {
  process.env.OPENAI_API_KEY = "fixture-openai-key";
  openAiRequests = 0;
  lastOpenAiInput = "";
  try {
    const raw = "  Brazil\u00a0  annual petroleum\nconsumption  ";
    const interpretationUrl = new URL("https://example.test/api/interpret-query");
    interpretationUrl.searchParams.set("q", raw);
    const interpretationResponse = await interpretQuery(new Request(interpretationUrl));
    const { intent } = await interpretationResponse.json();

    assert.equal(interpretationResponse.status, 200);
    assert.equal(intent.interpreter, "openai");
    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.cleanedQuery, "Brazil annual petroleum consumption");
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
      geographies: intent.validatedGeographies,
      geographyEvidence: intent.geographyEvidence,
      conceptPairs: intent.conceptPairs,
      exclusions: intent.exclusions,
      unknownQualifiers: intent.unknownQualifiers,
      ambiguity: intent.ambiguity,
      fallback: intent.fallback
    }));
    const response = await searchEia(new Request(url));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.mode, "candidate-selection");
    assert.equal(body.query, "Brazil annual petroleum consumption");
    assert.equal(body.intent.interpreter, "openai");
    assert.equal(body.intent.originalQuery, raw);
    assert.equal(body.intent.cleanedQuery, "Brazil annual petroleum consumption");
    assert.equal(body.intent.correctedQuerySource, "ai");
    assert.equal(body.intent.fields.product.validation, "approved");
    assert.equal(body.intent.fields.product.fallbackUsed, false);
    assert.ok(body.variables.length > 0);
    assert.equal(body.selectedSeries, null);
    assert.equal(openAiRequests, 1);
  } finally {
    delete process.env.OPENAI_API_KEY;
  }
});

test("full staged workflow retains a verified electricity typo correction through browser resubmission", async () => {
  process.env.OPENAI_API_KEY = "fixture-openai-key";
  openAiRequests = 0;
  openAiResponseOverride = {
    correctedQuery: "Brazil and Japan electricity consumption",
    confidence: 0.98,
    geographies: [
      { value: "Brazil", confidence: 0.99 },
      { value: "Japan", confidence: 0.99 }
    ],
    conceptPairs: [{ product: "electricity", activity: "consumption", order: 0, confidence: 0.98 }],
    fields: {
      country: { rawValue: "Brazil and Japan", value: null, confidence: 0.9, ambiguityReason: "Multiple explicit geographies." },
      product: { rawValue: "electrciity", value: "electricity", confidence: 0.98 },
      activity: { rawValue: "consumption", value: "consumption", confidence: 0.98 },
      frequency: { rawValue: null, value: "annual", explicit: false, confidence: 0.9 }
    }
  };
  try {
    const raw = "brazil and japan electrciity consumption";
    const interpretationUrl = new URL("https://example.test/api/interpret-query");
    interpretationUrl.searchParams.set("q", raw);
    const interpretationResponse = await interpretQuery(new Request(interpretationUrl));
    const { intent } = await interpretationResponse.json();

    assert.equal(interpretationResponse.status, 200);
    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.product, "electricity");
    assert.equal(intent.activity, "consumption");
    assert.deepEqual(intent.validatedGeographies.map(geography => geography.code), ["BRA", "JPN"]);
    assert.equal(intent.fields.product.validationEvidenceSource, "ai_proposed_deterministically_verified");
    assert.deepEqual(intent.fields.product.correction, { from: "electrciity", to: "electricity", editDistance: 2 });
    assert.equal(intent.needsClarification, false);

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
      geographies: intent.validatedGeographies,
      geographyEvidence: intent.geographyEvidence,
      conceptPairs: intent.conceptPairs,
      exclusions: intent.exclusions,
      unknownQualifiers: intent.unknownQualifiers,
      ambiguity: intent.ambiguity,
      fallback: intent.fallback
    }));
    const response = await searchEia(new Request(url));
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.intent.originalQuery, raw);
    assert.equal(body.intent.product, "electricity");
    assert.equal(body.intent.activity, "consumption");
    assert.deepEqual(body.intent.validatedGeographies.map(geography => geography.code), ["BRA", "JPN"]);
    assert.equal(body.intent.fields.product.validationEvidenceSource, "ai_proposed_deterministically_verified");
    assert.equal(body.needsClarification, false);
    assert.equal(body.comparisonMode, true);
    assert.deepEqual(body.variables, []);
    assert.ok(body.comparisonDefinitions.length >= 1 && body.comparisonDefinitions.length <= 5);
    assert.ok(body.comparisonDefinitions.every(definition => definition.definition.product === "electricity"));
    assert.ok(body.comparisonDefinitions.every(definition => definition.definition.activity === "consumption"));
    assert.ok(body.comparisonDefinitions.every(definition =>
      new Set(definition.countries.map(country => country.geography.code)).size === 2
    ));
    assert.equal(openAiRequests, 1);
  } finally {
    openAiResponseOverride = null;
    delete process.env.OPENAI_API_KEY;
  }
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
