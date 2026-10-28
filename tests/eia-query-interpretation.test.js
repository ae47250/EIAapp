import assert from "node:assert/strict";
import { test } from "node:test";

import {
  OPENAI_TIMEOUT_MS,
  cleanQueryMechanically,
  interpretQuery,
  interpretQueryWithRules,
  normalizeSubmittedIntent
} from "../lib/sources/eia/interpret-query.js";

test("mechanical cleanup preserves raw input separately and performs no semantic correction", () => {
  const raw = "   montly  nat gas  prodction usa   ";
  const intent = interpretQueryWithRules(raw);

  assert.equal(intent.originalQuery, raw);
  assert.equal(intent.cleanedQuery, "montly nat gas prodction usa");
  assert.equal(cleanQueryMechanically(raw), "montly nat gas prodction usa");
  assert.equal(intent.correctedQuery, "monthly nat gas production usa");
  assert.equal(intent.correctedQuerySource, "deterministic_typo_rules");
});

test("rules recover the requested country, product, activity, and annual default from messy input", () => {
  const intent = interpretQueryWithRules("looking for data on ergy consn for usa");

  assert.equal(intent.correctedQuery, "looking for data on energy consumption for usa");
  assert.equal(intent.correctedQuerySource, "deterministic_typo_rules");
  assert.equal(intent.countryCode, "USA");
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, false);
});

test("rules normalize supported production and consumption typos without broad fuzzy guessing", () => {
  assert.equal(interpretQueryWithRules("USA energy consumtion").activity, "consumption");
  assert.equal(interpretQueryWithRules("USA energy prodction").activity, "production");
  assert.equal(interpretQueryWithRules("USA energy discussion").activity, null);
  assert.equal(interpretQueryWithRules("USA energy production").correctedQuerySource, "unchanged");
});

test("submitted intent cannot introduce an unknown country code", () => {
  const intent = normalizeSubmittedIntent({
    interpreter: "openai",
    countryCode: "ZZZ",
    product: "total energy",
    activity: "consumption",
    frequency: "annual"
  }, "energy consumption");

  assert.equal(intent.countryCode, null);
  assert.equal(intent.needsClarification, true);
});

test("deterministic gas fallback is phrase-first and context-aware", () => {
  const exact = interpretQueryWithRules("natural gas production in USA");
  const storage = interpretQueryWithRules("gas storage withdrawals in the United States");
  const gasoline = interpretQueryWithRules("regular gas pump prices in the United States");

  assert.equal(exact.product, "natural gas");
  assert.equal(exact.fields.product.breadth, "specific");
  assert.equal(exact.structuredIntent.mentions.concepts.filter(item => item.value === "natural gas").length, 1);
  assert.equal(storage.product, "natural gas");
  assert.match(storage.fields.product.reason, /surrounding context/i);
  assert.equal(gasoline.product, "petroleum");
  assert.match(gasoline.fields.product.reason, /surrounding context/i);
});

test("broad approved product families retain narrower options without forced selection", () => {
  const intent = interpretQueryWithRules("USA renewable energy production");

  assert.equal(intent.product, "renewable");
  assert.equal(intent.fields.product.breadth, "broad");
  assert.deepEqual(intent.fields.product.alternatives, ["wind", "solar", "hydro", "geothermal", "biofuels"]);
  assert.equal(intent.structuredIntent.productBreadth, "broad");
  assert.deepEqual(intent.structuredIntent.productAlternatives, ["wind", "solar", "hydro", "geothermal", "biofuels"]);
  assert.equal(intent.needsClarification, false);
});

test("AI timeout is configured for thirty seconds", () => {
  assert.equal(OPENAI_TIMEOUT_MS, 30000);
});

test("ordinary lowercase three-letter words are not accepted as country codes", () => {
  const intent = interpretQueryWithRules("can you show annual coal production");

  assert.equal(intent.country, null);
  assert.equal(intent.countryCode, null);
  assert.equal(intent.structuredIntent.geography, null);
});

test("AI request failure uses deterministic fallback with provenance", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-openai-key";
  globalThis.fetch = async () => { throw new Error("network unavailable"); };

  try {
    const intent = await interpretQuery("USA energy prodction");
    assert.equal(intent.interpreter, "rules");
    assert.equal(intent.product, "total energy");
    assert.equal(intent.activity, "production");
    assert.ok(intent.fallback.reasons.includes("openai_request_failed"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("unrelated natural wording near gasoline does not become natural gas", () => {
  const intent = interpretQueryWithRules("natural resources and gasoline prices in USA");

  assert.equal(intent.product, "petroleum");
  assert.notEqual(intent.product, "natural gas");
});
