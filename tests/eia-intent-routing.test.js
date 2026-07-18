import assert from "node:assert/strict";
import { test } from "node:test";

import { buildStructuredIntent, resolveApprovedGeography } from "../lib/sources/eia/intent-routing.js";
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

test("blocks an unresolved source qualifier instead of inferring an activity", () => {
  const intent = interpretQueryWithRules("California monthly electricity from moon");

  assert.equal(intent.route.family, "domestic");
  assert.equal(intent.product, "electricity");
  assert.equal(intent.activity, null);
  assert.equal(intent.structuredIntent.activityInference, null);
  assert.deepEqual(intent.unknownQualifiers.map(item => item.value), ["moon"]);
  assert.equal(intent.blockingClarification, true);
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
  assert.deepEqual(intent.conceptPairs.map(pair => `${pair.product}:${pair.activity}`), [
    "natural gas:production",
    "petroleum:consumption"
  ]);
  assert.equal(intent.route.family, "international");
  assert.equal(intent.ambiguity.status, "ambiguous");
  assert.ok(intent.ambiguity.reasons.includes("multiple_geographies"));
});

test("preserves only governed product and activity pair scopes", () => {
  const ordered = interpretQueryWithRules("Texas coal production and natural gas consumption");
  const sharedTrailing = interpretQueryWithRules("Texas oil and natural gas production");
  const unresolved = interpretQueryWithRules("Texas coal and natural gas production and consumption");

  assert.deepEqual(ordered.conceptPairs.map(pair => [pair.product, pair.activity]), [
    ["coal", "production"],
    ["natural gas", "consumption"]
  ]);
  assert.equal(ordered.structuredIntent.conceptPairRule, "ordered_one_to_one_pairs");
  assert.deepEqual(sharedTrailing.conceptPairs.map(pair => [pair.product, pair.activity]), [
    ["petroleum", "production"],
    ["natural gas", "production"]
  ]);
  assert.equal(sharedTrailing.structuredIntent.conceptPairRule, "shared_trailing_activity");
  assert.deepEqual(unresolved.conceptPairs, []);
  assert.equal(unresolved.structuredIntent.schemaVersion, "2.1.0");
  assert.equal(unresolved.structuredIntent.conceptPairStatus, "unresolved");
  assert.equal(unresolved.needsClarification, true);
  assert.equal(unresolved.blockingClarification, true);
  assert.ok(unresolved.ambiguity.reasons.includes("concept_pair_scope_unresolved"));
  assert.ok(!unresolved.ambiguity.reasons.includes("activity_or_scope_missing"));
});

test("treats a specific source followed by energy as one product", () => {
  const cases = [
    ["nuclear", "nuclear"],
    ["solar", "solar"],
    ["coal", "coal"],
    ["petroleum", "petroleum"],
    ["hydroelectric", "hydro"],
    ["wind", "wind"],
    ["geothermal", "geothermal"],
    ["biofuels", "biofuels"],
    ["renewable", "renewable"],
    ["fossil fuel", "fossil fuels"],
    ["natural gas", "natural gas"],
    ["electricity", "electricity"]
  ];

  for (const [term, product] of cases) {
    const intent = interpretQueryWithRules(`Texas ${term} energy consumption`);
    assert.deepEqual(intent.conceptPairs.map(pair => [pair.product, pair.activity]), [[product, "consumption"]]);
  }

  const separate = interpretQueryWithRules("Texas coal prices and energy consumption");
  assert.deepEqual(separate.conceptPairs.map(pair => [pair.product, pair.activity]), [
    ["coal", "prices"],
    ["total energy", "consumption"]
  ]);
});

test("uses context to distinguish the state and country named Georgia", () => {
  const codes = query => interpretQueryWithRules(query).structuredIntent.geographies.map(item => item.code);

  assert.deepEqual(codes("Georgia natural gas production"), ["GA"]);
  assert.deepEqual(codes("Georgia and Alabama natural gas production"), ["GA", "AL"]);
  assert.deepEqual(codes("Georgia and France natural gas production"), ["GEO", "FRA"]);
  assert.deepEqual(codes("Georgia and United States natural gas production"), ["GA", "USA"]);
  assert.deepEqual(codes("international Georgia natural gas production"), ["GEO"]);
  assert.deepEqual(codes("foreign Georgia natural gas production"), ["GEO"]);
  assert.deepEqual(codes("Georgia country natural gas production"), ["GEO"]);
});

test("routes mixed U.S. and foreign-country requests through International", () => {
  const intent = interpretQueryWithRules("United States then Canada annual natural gas production");

  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["USA", "CAN"]);
  assert.equal(intent.route.family, "international");
});

test("canonicalizes U.S. aliases to the governed national geography", () => {
  assert.equal(resolveApprovedGeography("US").code, "USA");
  assert.equal(resolveApprovedGeography("United States").code, "USA");
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

test("preserves sector, ordered repeated activities, explicit frequency, and negation", () => {
  const sector = interpretQueryWithRules("New York monthly residential natural gas consumption");
  const repeated = interpretQueryWithRules("Germany renewable energy production and consumption");
  const negated = interpretQueryWithRules("plz shwo montly nat gas prodction in Texas, not prices");

  assert.equal(sector.sector, "residential");
  assert.equal(sector.frequencyExplicit, true);
  assert.equal(sector.requestedFrequency, "monthly");
  assert.deepEqual(repeated.conceptPairs.map(pair => pair.activity), ["production", "consumption"]);
  assert.deepEqual(negated.exclusions.map(item => `${item.type}:${item.value}`), ["activity:prices"]);
  assert.deepEqual(negated.conceptPairs.map(pair => pair.activity), ["production"]);
});

test("does not reinterpret an explicit sector phrase as a second product", () => {
  const intent = interpretQueryWithRules("Ohio monthly coal consumption electric power sector");

  assert.equal(intent.product, "coal");
  assert.equal(intent.fields.product.normalizedValue, "coal");
  assert.equal(intent.sector, "electric power");
  assert.deepEqual(intent.conceptPairs.map(pair => pair.product), ["coal"]);
});

test("preserves a requested unsupported frequency instead of silently replacing it", () => {
  const intent = buildStructuredIntent({}, "Japan weekly solar electricity generation");

  assert.equal(intent.frequency, "weekly");
  assert.equal(intent.requestedFrequency, "weekly");
  assert.equal(intent.frequencyExplicit, true);
  assert.equal(intent.validation.frequency, "unsupported");
  assert.equal(intent.validation.frequencySupportedByRoute, false);
});
