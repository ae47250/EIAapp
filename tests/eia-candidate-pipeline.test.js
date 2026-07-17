import assert from "node:assert/strict";
import { test } from "node:test";

import { CANDIDATE_PIPELINE_VERSION, buildLocalCandidatePipeline } from "../lib/sources/eia/candidate-pipeline.js";
import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";

test("adds separately retrieved annual SEDS fallbacks when monthly Domestic results fail", async () => {
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("Texas monthly total energy consumption"));
  const retrieval = result.retrievals[0];

  assert.equal(result.routeFamily, "domestic");
  assert.equal(result.diagnostics.candidatePipelineVersion, CANDIDATE_PIPELINE_VERSION);
  assert.equal(result.diagnostics.crossRouteFallback.attempted, true);
  assert.ok(retrieval.displayCandidates.length > 0);
  assert.ok(retrieval.displayCandidates.every(candidate => candidate.route_family === "seds"));
  assert.ok(retrieval.displayCandidates.every(candidate => candidate.ranking.tier === "B"));
  assert.ok(retrieval.primaryCandidates.length + retrieval.fallbackCandidates.length <= 50);
  assert.equal(retrieval.displayCandidates[0].series_id, "SEDS.TETCB.TX.A");
  assert.ok(retrieval.userWarnings.some(warning => warning.code === "requested_frequency_unavailable_seds_annual_fallback"));
});

test("does not retrieve SEDS when a valid Domestic result already exists", async () => {
  let calls = 0;
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("California monthly electricity generation"), {
    retrieveCandidates: async input => {
      calls += 1;
      const { retrieveLocalCandidates } = await import("../lib/sources/eia/local-retrieval.js");
      return retrieveLocalCandidates(input);
    }
  });

  assert.equal(calls, 1);
  assert.equal(result.diagnostics.crossRouteFallback.attempted, false);
  assert.equal(result.retrievals[0].displayCandidates[0].series_id, "ELEC.GEN.ALL-CA-99.M");
  assert.deepEqual(result.retrievals[0].userWarnings, []);
});

test("labels narrower national coverage when metadata uses the same geography code", async () => {
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("United States weekly natural gas storage"));
  const retrieval = result.retrievals[0];

  assert.equal(retrieval.displayCandidates[0].geography.name, "Lower 48 States");
  assert.ok(retrieval.userWarnings.some(warning =>
    warning.code === "coverage_geography_scope_note" && warning.message === "Coverage geography: Lower 48 States."
  ));
  assert.ok(!retrieval.displayCandidates[0].ranking.warnings.includes("date_end_missing"));
});

test("uses labeled annual International fallbacks for unavailable country frequencies", async () => {
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("Japan monthly solar electricity generation"));
  const retrieval = result.retrievals[0];

  assert.equal(result.routeFamily, "international");
  assert.equal(result.diagnostics.crossRouteFallback.attempted, true);
  assert.equal(result.diagnostics.crossRouteFallback.toRoute, "international");
  assert.ok(retrieval.displayCandidates.length > 0);
  assert.ok(retrieval.displayCandidates.every(candidate => candidate.route_family === "international"));
  assert.ok(retrieval.displayCandidates.every(candidate => candidate.frequency === "annual"));
  assert.ok(retrieval.displayCandidates.every(candidate => candidate.ranking.tier === "B"));
  assert.ok(retrieval.userWarnings.some(warning => warning.code === "requested_frequency_unavailable_international_annual_fallback"));
});

test("does not label primary annual SEDS results as a frequency fallback", async () => {
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("California renewable energy"));
  const retrieval = result.retrievals[0];

  assert.equal(result.diagnostics.crossRouteFallback.attempted, false);
  assert.ok(retrieval.displayCandidates.length > 0);
  assert.ok(retrieval.userWarnings.some(warning => warning.code === "activity_missing_aggregate_priority"));
  assert.ok(!retrieval.userWarnings.some(warning => warning.code === "requested_frequency_unavailable_seds_annual_fallback"));
  assert.deepEqual(retrieval.interpretationGroups.map(group => group.activity), ["production", "consumption", "capacity"]);
  assert.equal(retrieval.selectionPolicy.requiresExplicitSelection, true);
  assert.equal(retrieval.selectionPolicy.autoSelectionAllowed, false);
});

test("separates technical and expenditure measures for an ambiguous product query", async () => {
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("Texas gas"));
  const naturalGas = result.retrievals.find(retrieval => retrieval.concept.product === "natural gas");
  const technical = naturalGas.interpretationGroups.find(group => group.technical);
  const expenditures = naturalGas.interpretationGroups.find(group => group.measureType === "expenditures");

  assert.ok(technical.candidates.some(candidate => /factor for converting/i.test(candidate.title)));
  assert.equal(technical.defaultVisible, false);
  assert.ok(expenditures.candidates.some(candidate => /expenditures/i.test(candidate.title)));
  assert.ok(naturalGas.selectionPolicy.reasonCodes.includes("activity_not_explicit"));
});

test("asks for clarification instead of showing candidates for unresolved qualifiers", async () => {
  const result = await buildLocalCandidatePipeline(interpretQueryWithRules("California monthly electricity from moon"));
  const retrieval = result.retrievals[0];

  assert.equal(retrieval.emptyResult, true);
  assert.deepEqual(retrieval.displayCandidates, []);
  assert.ok(retrieval.userWarnings.some(warning => warning.code === "unresolved_qualifier_requires_clarification"));
  assert.ok(!retrieval.userWarnings.some(warning => warning.code === "no_displayable_candidate"));
});

test("reports an empty result instead of silently selecting a substitute", async () => {
  let calls = 0;
  const intent = interpretQueryWithRules("Texas monthly total energy consumption");
  const result = await buildLocalCandidatePipeline(intent, {
    retrieveCandidates: async input => {
      calls += 1;
      const structured = input?.structuredIntent || input;
      return emptyRetrievalResult(structured.route.family, structured.geography, structured.product, structured.activity, structured.frequency);
    }
  });

  assert.equal(calls, 2);
  assert.equal(result.retrievals[0].emptyResult, true);
  assert.deepEqual(result.retrievals[0].displayCandidates, []);
  assert.ok(result.retrievals[0].userWarnings.some(warning => warning.code === "no_displayable_candidate"));
});

test("candidate orchestration is repeatable for identical input and metadata", async () => {
  const intent = interpretQueryWithRules("Texas monthly total energy consumption");
  const first = await buildLocalCandidatePipeline(intent);
  const second = await buildLocalCandidatePipeline(intent);

  assert.deepEqual(stableResult(first), stableResult(second));
});

function emptyRetrievalResult(routeFamily, geography, product, activity, frequency) {
  return {
    schemaVersion: "1.0.0",
    routeFamily,
    targetCandidates: 20,
    maximumCandidates: 50,
    retrievals: [{
      routeFamily,
      geography,
      concept: { product, productBreadth: "specific", productAlternatives: [], activity },
      frequency: { explicit: true, requested: frequency, value: frequency, mode: "exact" },
      primaryCandidates: [],
      fallbackCandidates: [],
      diagnostics: { totalCount: 0 }
    }],
    diagnostics: { index: { routeFamily }, rankingApplied: false, semanticRerankingApplied: false }
  };
}

function stableResult(result) {
  return result.retrievals.map(retrieval => ({
    key: `${retrieval.geography.code}:${retrieval.concept.product}:${retrieval.concept.activity}`,
    display: retrieval.displayCandidates.map(candidate => [candidate.candidate_id, candidate.ranking.tier, candidate.ranking.score]),
    warnings: retrieval.userWarnings
  }));
}
