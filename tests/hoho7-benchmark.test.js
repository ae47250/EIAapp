import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLocalCandidatePipeline } from "../lib/sources/eia/candidate-pipeline.js";
import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";
import { SEDS_TARGETS, buildQueryBank } from "../scripts/eia-benchmark/hoho7-corpus.js";

test("HoHo7 freezes 50 development and 150 unique sealed holdout queries", () => {
  const bank = buildQueryBank();
  const development = bank.queries.filter(item => item.partition === "development");
  const holdout = bank.queries.filter(item => item.partition === "holdout");

  assert.deepEqual(bank.counts, { total: 200, development: 50, holdout: 150 });
  assert.equal(development.length, 50);
  assert.equal(holdout.length, 150);
  assert.equal(new Set(bank.queries.map(item => item.id)).size, 200);
  assert.equal(new Set(bank.queries.map(item => item.query.toLowerCase())).size, 200);
  assert.ok(development.every(item => item.id.startsWith("H7-D")));
  assert.ok(holdout.every(item => item.id.startsWith("H7-H") && item.categories.includes("holdout")));
  assert.ok(bank.queries.every(item => item.gold && item.gold.hierarchy));
});

test("HoHo7 represents all 52 reviewed SEDS targets without inventing national route eligibility", () => {
  assert.equal(SEDS_TARGETS.length, 52);
  assert.equal(new Set(SEDS_TARGETS.map(item => item.code)).size, 52);

  const bank = buildQueryBank();
  const hierarchyHoldout = bank.queries.filter(item => item.partition === "holdout" && item.categories.includes("hierarchy-eligible"));
  assert.equal(hierarchyHoldout.length, 52);

  const national = hierarchyHoldout.find(item => item.gold.expectedGeographies.includes("USA"));
  assert.deepEqual(national.gold.acceptableRoutes, ["domestic"]);
  assert.equal(national.gold.hierarchy.preferenceExpected, false);
  assert.equal(national.gold.hierarchy.relation, "verified_aggregate_route_limited");

  const statesAndDc = hierarchyHoldout.filter(item => !item.gold.expectedGeographies.includes("USA"));
  assert.equal(statesAndDc.length, 51);
  assert.ok(statesAndDc.every(item => item.gold.acceptableRoutes.includes("seds")));
  assert.ok(statesAndDc.every(item => item.gold.hierarchy.preferenceExpected));
});

test("HoHo7 hierarchy isolation preserves raw input and does not replace requested components", async () => {
  const cases = [
    ["Texas total energy consumption", "SEDS.TETCB.TX.A", true],
    ["Texas renewable energy consumption", "SEDS.RETCB.TX.A", false],
    ["Texas fossil fuel consumption", "SEDS.FFTCB.TX.A", false]
  ];

  for (const [query, expectedTop, expectedApplied] of cases) {
    const intent = interpretQueryWithRules(query);
    const result = await buildLocalCandidatePipeline(intent, { hierarchyMode: "on" });
    const top = result.retrievals.flatMap(retrieval => retrieval.displayCandidates)[0];

    assert.equal(intent.originalQuery, query);
    assert.equal(top.series_id, expectedTop);
    assert.equal(result.diagnostics.hierarchyPreferenceApplied, expectedApplied);
  }
});
