import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { buildLocalCandidatePipeline } from "../lib/sources/eia/candidate-pipeline.js";
import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";

const benchmark = JSON.parse(readFileSync(new URL("./fixtures/eia/top-five-benchmark.json", import.meta.url), "utf8"));

test("top-five benchmark retains the approved human-reviewed Q01-Q14 contract", () => {
  assert.equal(benchmark.schemaVersion, "1.0.0");
  assert.equal(benchmark.reviewStatus, "human-reviewed");
  assert.deepEqual(benchmark.cases.map(item => item.id), [
    "Q01", "Q02", "Q03", "Q04", "Q05", "Q06", "Q07",
    "Q08", "Q09", "Q10", "Q11", "Q12", "Q13", "Q14"
  ]);
  assert.ok(benchmark.cases.every(item => item.query && item.expected));
});

test("candidate pipeline matches exact top-five, clarification, and zero-hierarchy expectations", async () => {
  for (const item of benchmark.cases) {
    const first = await buildLocalCandidatePipeline(interpretQueryWithRules(item.query));
    const second = await buildLocalCandidatePipeline(interpretQueryWithRules(item.query));

    assert.equal(Boolean(first.diagnostics.clarificationBlocked), item.expected.clarificationRequired, item.id);
    assert.deepEqual(stableGroups(first), item.expected.groups, item.id);
    assert.deepEqual(stableGroups(second), item.expected.groups, `${item.id} repeat`);
    assert.equal(first.diagnostics.hierarchyEvidenceStatus, "none", item.id);
    assert.equal(first.diagnostics.verifiedHierarchyRelationshipCount, 0, item.id);
    assert.equal(first.diagnostics.hierarchyPreferenceApplied, false, item.id);

    for (const reason of item.expected.clarificationReasons || []) {
      assert.ok(first.diagnostics.clarificationReasons.includes(reason), `${item.id}: ${reason}`);
    }
    for (const retrieval of first.retrievals) {
      for (const candidate of retrieval.displayCandidates.slice(0, 5)) {
        assert.equal(candidate.ranking.components.measureOrAggregation.maximum, 0, item.id);
        assert.equal(candidate.ranking.components.measureOrAggregation.points, 0, item.id);
        assert.ok(candidate.ranking.reasonCodes.includes("aggregation_relation_unknown_no_verified_hierarchy"), item.id);
        assert.ok(!candidate.ranking.reasonCodes.some(reason => /subtype|equivalent/i.test(reason)), item.id);
      }
    }
  }
});

function stableGroups(result) {
  return result.retrievals.map(retrieval => ({
    geography: retrieval.geography.code,
    product: retrieval.concept.product,
    activity: retrieval.concept.activity,
    topSeriesIds: retrieval.displayCandidates.slice(0, 5).map(candidate => candidate.series_id)
  }));
}
