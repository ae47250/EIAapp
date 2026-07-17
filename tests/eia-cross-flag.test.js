import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { GET as searchEia } from "../app/api/search-eia/route.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/eia-search.json", import.meta.url), "utf8"));

test("clarification and correctedQuery safeguards hold across both feature-flag paths", async () => {
  const originalEnvironment = {
    EIA_API_KEY: process.env.EIA_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    LOGIN_REQUIRED: process.env.LOGIN_REQUIRED,
    EIA_CANDIDATE_PIPELINE: process.env.EIA_CANDIDATE_PIPELINE
  };
  const originalFetch = globalThis.fetch;
  let broadDataRequests = 0;

  process.env.EIA_API_KEY = "fixture-eia-key";
  process.env.LOGIN_REQUIRED = "off";
  delete process.env.OPENAI_API_KEY;
  globalThis.fetch = async input => {
    const url = new URL(String(input));
    if (url.pathname.endsWith("/facet/countryRegionId/")) return jsonResponse(fixture.countries);

    const countryCode = url.searchParams.get("facets[countryRegionId][]");
    const activityId = url.searchParams.get("facets[activityId][]");
    if (countryCode && !activityId) broadDataRequests += 1;
    const rows = activityId ? fixture.exactRows[activityId] || [] : fixture.broadRows;
    return jsonResponse({ response: { data: rows } });
  };

  try {
    const clarification = [];
    for (const mode of ["off", "on"]) {
      process.env.EIA_CANDIDATE_PIPELINE = mode;
      clarification.push(await (await searchEia(new Request("https://example.test/api/search-eia?q=Texas%20gas"))).json());
    }

    for (const body of clarification) {
      assert.equal(body.needsClarification, true);
      assert.equal(body.intent.blockingClarification, true);
      assert.equal(body.selectedSeries, null);
      assert.deepEqual(body.variables, []);
    }
    assert.equal(clarification[1].mode, "candidate-selection");
    assert.equal(clarification[1].diagnostics.rankingApplied, false);
    assert.equal(clarification[1].diagnostics.hierarchyPreferenceApplied, false);
    assert.equal(broadDataRequests, 0);

    const responses = [];
    const url = adversarialIntentUrl();
    for (const mode of ["off", "on"]) {
      process.env.EIA_CANDIDATE_PIPELINE = mode;
      responses.push(await (await searchEia(new Request(url))).json());
    }

    assert.equal(responses[0].selectedSeries.activity, "Production");
    assert.ok(responses[0].variables.every(variable => variable.activity === "Production"));
    assert.equal(responses[1].mode, "candidate-selection");
    assert.ok(responses[1].variables.length > 0);
    assert.ok(responses[1].variables.every(variable => variable.activity === "production"));
    for (const body of responses) {
      assert.equal(body.intent.activity, "production");
      assert.equal(body.intent.correctedQuery, "Brazil energy consumption");
      assert.ok(body.variables.every(variable => !/consumption/i.test(variable.title || variable.label || "")));
      assert.ok(body.variables.every(variable => variable.certainty.aggregationRelation === "unknown"));
      assert.ok(body.variables.every(variable => variable.certainty.hierarchyEvidenceStatus === "none"));
    }
  } finally {
    globalThis.fetch = originalFetch;
    restoreEnvironment(originalEnvironment);
  }
});

function adversarialIntentUrl() {
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
  return url;
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
