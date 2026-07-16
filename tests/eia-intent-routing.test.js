import assert from "node:assert/strict";
import { test } from "node:test";

import { buildStructuredIntent } from "../lib/sources/eia/intent-routing.js";
import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";

test("routes a country request to International with validated monthly frequency", () => {
  const intent = interpretQueryWithRules("please show Brazil monthly petroleum consumption data");

  assert.equal(intent.route.family, "international");
  assert.equal(intent.route.label, "International");
  assert.equal(intent.structuredIntent.geography.code, "BRA");
  assert.equal(intent.frequency, "monthly");
  assert.equal(intent.validation.geography, "valid");
  assert.equal(intent.validation.frequency, "valid");
  assert.equal(intent.fallback.used, true);
});

test("routes annual state total-energy requests to SEDS", () => {
  const intent = interpretQueryWithRules("Texas annual total energy consumption");

  assert.equal(intent.route.family, "seds");
  assert.equal(intent.structuredIntent.geography.code, "TX");
  assert.equal(intent.structuredIntent.geography.type, "state");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.validation.frequency, "valid");
});

test("routes state electricity requests to Domestic EIA", () => {
  const intent = interpretQueryWithRules("California monthly electricity generation");

  assert.equal(intent.route.family, "domestic");
  assert.equal(intent.route.label, "Domestic EIA");
  assert.equal(intent.structuredIntent.geography.code, "CA");
  assert.equal(intent.frequency, "monthly");
});

test("records weak activity inference without clearing missing-activity ambiguity", () => {
  const intent = interpretQueryWithRules("California monthly electricity from moon");

  assert.equal(intent.route.family, "domestic");
  assert.equal(intent.product, "electricity");
  assert.equal(intent.activity, null);
  assert.equal(intent.structuredIntent.activityInference.activity, "generation");
  assert.equal(intent.structuredIntent.activityInference.sourceTerm, "from");
  assert.ok(intent.ambiguity.reasons.includes("activity_or_scope_missing"));
  assert.ok(intent.missingFields.includes("activity"));
});

test("routes explicit plant requests to Domestic EIA without retrieving plant candidates", () => {
  const intent = interpretQueryWithRules("monthly generation at Palo Verde power plant in Arizona");

  assert.equal(intent.route.family, "domestic");
  assert.equal(intent.structuredIntent.geography.code, "AZ");
  assert.ok(intent.structuredIntent.mentions.concepts.some(mention => mention.value === "plant"));
});

test("preserves geography and concept mention order", () => {
  const intent = buildStructuredIntent({}, "Canada then Mexico: natural gas production and petroleum consumption");

  assert.deepEqual(intent.mentions.geographies.map(mention => mention.geography.code), ["CAN", "MEX"]);
  assert.deepEqual(intent.mentions.concepts.map(mention => `${mention.type}:${mention.value}`), [
    "product:natural gas",
    "activity:production",
    "product:petroleum",
    "activity:consumption"
  ]);
  assert.equal(intent.route.family, "international");
  assert.equal(intent.ambiguity.status, "ambiguous");
  assert.ok(intent.ambiguity.reasons.includes("multiple_geographies"));
});

test("routes nonannual U.S. state requests to Domestic before SEDS fallback", () => {
  const intent = interpretQueryWithRules("Texas monthly total energy consumption");

  assert.equal(intent.route.family, "domestic");
  assert.equal(intent.frequency, "monthly");
  assert.equal(intent.validation.frequency, "valid");
  assert.equal(intent.route.reason, "A nonannual U.S. state request uses Domestic EIA first because SEDS is annual-only.");
});

test("represents missing geography and deterministic route fallback", () => {
  const intent = interpretQueryWithRules("annual coal production");

  assert.equal(intent.route.family, "international");
  assert.equal(intent.validation.geography, "missing");
  assert.equal(intent.ambiguity.status, "ambiguous");
  assert.ok(intent.ambiguity.reasons.includes("geography_missing"));
  assert.ok(intent.fallback.reasons.includes("route_defaulted_without_geography"));
});

test("rejects unknown geography text because it is absent from local metadata", () => {
  const intent = buildStructuredIntent({}, "Atlantis electricity generation monthly");

  assert.equal(intent.geography, null);
  assert.equal(intent.validation.geography, "missing");
  assert.equal(intent.route.family, "domestic");
});

test("does not mistake lowercase filler words for three-letter country codes", () => {
  const intent = interpretQueryWithRules("can you show annual coal production");

  assert.equal(intent.structuredIntent.geography, null);
  assert.equal(intent.validation.geography, "missing");
  assert.equal(intent.route.family, "international");
});

test("accepts an explicitly uppercase local metadata country code", () => {
  const intent = interpretQueryWithRules("BRA annual petroleum production");

  assert.equal(intent.structuredIntent.geography.code, "BRA");
  assert.equal(intent.route.family, "international");
});
