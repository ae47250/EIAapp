import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLocalCandidatePipeline } from "../lib/sources/eia/candidate-pipeline.js";
import { evaluateHierarchyRankingGate } from "../lib/sources/eia/hierarchy-ranking.js";
import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";
import { buildRankedResultCertainty } from "../lib/sources/eia/result-certainty.js";

test("validated observation, ranking, and Preview evidence open production", () => {
  assert.deepEqual(evaluateHierarchyRankingGate("shadow"), { ready: true, reason: "evidence_validated" });
  assert.deepEqual(evaluateHierarchyRankingGate("on"), { ready: true, reason: "evidence_validated" });
});

test("shadow mode promotes the verified Texas aggregate without changing visible order", async () => {
  const intent = interpretQueryWithRules("Texas monthly total energy consumption");
  const baseline = await buildLocalCandidatePipeline(intent, { hierarchyMode: "off" });
  const shadow = await buildLocalCandidatePipeline(intent, { hierarchyMode: "shadow" });
  const baselineRetrieval = baseline.retrievals.find(item => item.geography?.code === "TX");
  const shadowRetrieval = shadow.retrievals.find(item => item.geography?.code === "TX");

  assert.deepEqual(
    shadowRetrieval.displayCandidates.map(candidate => candidate.series_id),
    baselineRetrieval.displayCandidates.map(candidate => candidate.series_id)
  );
  assert.equal(shadowRetrieval.hierarchyRanking.changed, true);
  assert.equal(shadowRetrieval.hierarchyRanking.shadowDisplayCandidateIds[0],
    shadowRetrieval.rankedCandidates.find(candidate => candidate.series_id === "SEDS.TETCB.TX.A").candidate_id);
  assert.equal(shadow.diagnostics.hierarchyPreferenceApplied, false);
  assert.equal(shadow.diagnostics.hierarchyRankingChangedRetrievals, 1);
});

test("preview on mode applies only the verified aggregate tie-break", async () => {
  const result = await buildLocalCandidatePipeline(
    interpretQueryWithRules("Texas total energy consumption"),
    { hierarchyMode: "on" }
  );

  assert.equal(result.diagnostics.hierarchyRankingBlocked, undefined);
  assert.equal(result.diagnostics.hierarchyPreferenceApplied, true);
  assert.equal(result.retrievals[0].displayCandidates[0].series_id, "SEDS.TETCB.TX.A");
  assert.equal(result.retrievals[0].displayCandidates[0].ranking.score, 100);
  assert.equal(result.retrievals[0].displayCandidates[0].ranking.tier, "A");
});

test("production gate is approved after deployed Preview verification", () => {
  const previous = process.env.VERCEL_ENV;
  process.env.VERCEL_ENV = "production";
  try {
    assert.deepEqual(evaluateHierarchyRankingGate("on"), { ready: true, reason: "evidence_validated" });
  } finally {
    if (previous === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = previous;
  }
});

test("non-total intents are ineligible and retain deterministic top five", async () => {
  const intent = interpretQueryWithRules("Texas renewable energy consumption");
  const baseline = await buildLocalCandidatePipeline(intent, { hierarchyMode: "off" });
  const shadow = await buildLocalCandidatePipeline(intent, { hierarchyMode: "shadow" });

  assert.deepEqual(
    shadow.retrievals[0].displayCandidates.map(candidate => candidate.series_id),
    baseline.retrievals[0].displayCandidates.map(candidate => candidate.series_id)
  );
  assert.equal(shadow.retrievals[0].hierarchyRanking.eligible, false);
  assert.equal(shadow.retrievals[0].hierarchyRanking.reason, "intent_not_eligible");
});

test("activated aggregate certainty is explicit and removes the unknown warning", () => {
  const certainty = buildRankedResultCertainty(
    { frequencyExplicit: false },
    {
      ranking: {
        tier: "A",
        reasonCodes: ["aggregation_verified_aggregate_for_requested_total"],
        warnings: [],
        signals: { semanticFloorPassed: true, hierarchyRole: "verified_aggregate" },
        components: {}
      }
    }
  );

  assert.equal(certainty.aggregationRelation, "verified_aggregate");
  assert.equal(certainty.hierarchyEvidenceStatus, "observation_validated");
  assert.ok(!certainty.warnings.includes("aggregation_relationship_not_verified"));
});
