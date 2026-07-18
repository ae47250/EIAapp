import assert from "node:assert/strict";
import test from "node:test";

import {
  buildComparisonDefinitions,
  buildDefinitionId,
  buildDefinitionSignature,
  definitionSignatureKey,
  validateComparisonCandidate
} from "../lib/sources/eia/multi-country-comparison.js";

function candidate(countryRegionId, title = "Electricity net generation, Brazil, Annual") {
  return {
    route_family: "international",
    title,
    product_or_scope: "electricity",
    activity: "generation",
    frequency: "annual",
    unit: "billion kilowatthours",
    source: "EIA",
    date_start: "1980",
    date_end: "2024",
    selector: {
      route: "/international",
      measure: "value",
      frequency: "annual",
      facets: { countryRegionId, activityId: "12", productId: "2", unit: "BKWH" }
    },
    ranking: {
      tier: "A",
      score: 75,
      reasonCodes: ["product_exact_electricity", "activity_exact_generation"],
      signals: { semanticFloorPassed: true },
      components: {
        productOrScope: { points: 22 },
        activity: { points: 18 },
        fieldedLexical: { points: 3.5 },
        availability: { points: 3 },
        currentness: { points: 3 }
      }
    }
  };
}

test("canonical definition signatures omit geography and retain semantic selector facets", () => {
  const brazil = buildDefinitionSignature(candidate("BRA"), { product: "electricity", activity: "generation" });
  const japan = buildDefinitionSignature(candidate("JPN", "Electricity net generation, Japan, Annual"), { product: "electricity", activity: "generation" });

  assert.deepEqual(brazil, japan);
  assert.deepEqual(brazil.selectorFacets, { activityId: "12", productId: "2", unit: "bkwh" });
  assert.equal(brazil.grossNetTreatment, "net");
});

test("definition IDs are stable across country and object key order", () => {
  const brazil = candidate("BRA");
  const japan = candidate("JPN", "Electricity net generation, Japan, Annual");
  japan.selector.facets = { unit: "BKWH", productId: "2", countryRegionId: "JPN", activityId: "12" };

  assert.equal(buildDefinitionId(brazil), buildDefinitionId(japan));
  assert.equal(definitionSignatureKey(brazil), definitionSignatureKey(japan));
});

test("meaningful definition differences produce different IDs", () => {
  const net = candidate("BRA");
  const gross = candidate("BRA", "Electricity gross generation, Brazil, Annual");

  assert.notEqual(buildDefinitionId(net), buildDefinitionId(gross));
});

test("groups and ranks a definition once while retaining unavailable countries", () => {
  const geographies = [
    { code: "BRA", name: "Brazil", type: "country" },
    { code: "JPN", name: "Japan", type: "country" },
    { code: "DEU", name: "Germany", type: "country" }
  ];
  const intent = { geographies, multiCountryComparison: { active: true }, route: { family: "international" } };
  const retrievals = geographies.slice(0, 2).map(geography => ({
    geography,
    concept: { product: "electricity", activity: "generation" },
    displayCandidates: [candidate(geography.code, `Electricity net generation, ${geography.name}, Annual`)]
  }));

  const definitions = buildComparisonDefinitions(intent, { routeFamily: "international", retrievals });

  assert.equal(definitions.length, 1);
  assert.equal(definitions[0].rank, 1);
  assert.equal(definitions[0].availableCountryCount, 2);
  assert.deepEqual(definitions[0].countries.map(country => [country.geography.code, country.status]), [
    ["BRA", "comparable"],
    ["JPN", "comparable"],
    ["DEU", "variable_unavailable"]
  ]);
  assert.equal(definitions[0].semanticScore, 43.5);
});

test("definition ranking is independent of requested country order", () => {
  const makeResult = codes => {
    const geographies = codes.map(code => ({ code, name: code, type: "country" }));
    const intent = { geographies, multiCountryComparison: { active: true }, route: { family: "international" } };
    const retrievals = geographies.map(geography => ({
      geography,
      concept: { product: "electricity", activity: "generation" },
      displayCandidates: [candidate(geography.code, `Electricity net generation, ${geography.name}, Annual`)]
    }));
    return buildComparisonDefinitions(intent, { routeFamily: "international", retrievals });
  };

  assert.deepEqual(
    makeResult(["BRA", "JPN", "DEU"]).map(definition => definition.definitionId),
    makeResult(["DEU", "BRA", "JPN"]).map(definition => definition.definitionId)
  );
});

test("validates hard comparability mismatches and safe unit conversion", () => {
  const reference = candidate("BRA");
  const partial = { ...candidate("JPN"), date_start: "1991" };
  const frequency = { ...candidate("JPN"), frequency: "monthly" };
  const unit = { ...candidate("JPN"), unit: "quadrillion Btu" };
  const converted = { ...candidate("JPN"), unit: "million kilowatthours" };
  const scope = { ...candidate("JPN"), methodology: "utility-only" };
  const gross = candidate("JPN", "Electricity gross generation, Japan, Annual");

  assert.equal(validateComparisonCandidate(partial, reference).status, "partial_coverage");
  assert.equal(validateComparisonCandidate(frequency, reference).status, "frequency_mismatch");
  assert.equal(validateComparisonCandidate(unit, reference).status, "unit_mismatch");
  assert.equal(validateComparisonCandidate(converted, reference).status, "comparable_after_safe_unit_conversion");
  assert.equal(validateComparisonCandidate(scope, reference).status, "scope_or_methodology_mismatch");
  assert.equal(validateComparisonCandidate(gross, reference).status, "definition_mismatch");
  assert.equal(validateComparisonCandidate(null, reference).status, "variable_unavailable");
});
