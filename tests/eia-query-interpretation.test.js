import assert from "node:assert/strict";
import { test } from "node:test";

import {
  interpretQueryWithRules,
  normalizeSubmittedIntent,
  validateAiInterpretation
} from "../lib/sources/eia/interpret-query.js";

test("rules recover the requested country, product, activity, and annual default from messy input", () => {
  const intent = interpretQueryWithRules("looking for data on ergy consn for usa");

  assert.equal(intent.correctedQuery, "looking for data on energy consumption for usa");
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
});

test("validated high-confidence AI output uses only supported categories", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "United States energy consumption",
    countryName: "United States",
    countryCode: "USA",
    product: "energy",
    activity: "use",
    frequency: "yearly",
    confidence: 0.94
  }, "data pls usa ergy consn");

  assert.equal(intent.interpreter, "openai");
  assert.equal(intent.countryCode, "USA");
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, false);
});

test("unsupported AI values are discarded and an invented country code is never accepted", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Zed energy consumption",
    countryName: "Zedland",
    countryCode: "ZZZ",
    product: "fusion",
    activity: "consumption",
    frequency: "weekly",
    confidence: 0.95
  }, "energy consumption");

  assert.equal(intent.country, null);
  assert.equal(intent.countryCode, null);
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, true);
  assert.deepEqual(intent.missingFields, ["country"]);
});

test("low-confidence AI output is rejected in favor of deterministic rules", () => {
  const parsed = {
    correctedQuery: "United States energy consumption",
    countryName: "United States",
    countryCode: "USA",
    product: "total energy",
    activity: "consumption",
    frequency: "annual",
    confidence: 0.3
  };

  assert.equal(validateAiInterpretation(parsed, "USA ergy consn"), null);
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
