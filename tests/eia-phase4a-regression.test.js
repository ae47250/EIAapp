import assert from "node:assert/strict";
import { test } from "node:test";

import { buildLocalCandidatePipeline } from "../lib/sources/eia/candidate-pipeline.js";
import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";

test("Q03-Q14 deterministic remediation cohort", async () => {
  const results = new Map();
  for (const [id, query] of CASES) {
    results.set(id, await buildLocalCandidatePipeline(interpretQueryWithRules(query)));
  }

  assert.equal(top(results.get("Q03")).series_id, "NG.N9050NM2.M");
  assert.equal(top(results.get("Q04")).series_id, "NG.N3010NY2.M");
  assert.match(top(results.get("Q04")).title, /residential consumption/i);
  assert.equal(top(results.get("Q05")).series_id, "ELEC.GEN.WND-IA-99.M");

  const q06 = results.get("Q06").retrievals[0];
  assert.ok(q06.displayCandidates.slice(0, 3).every(candidate => candidate.ranking.reasonCodes.includes("official_total_label")));
  assert.ok(hasWarning(q06, "activity_missing_aggregate_priority"));
  assert.ok(!hasWarning(q06, "requested_frequency_unavailable_seds_annual_fallback"));

  const q07 = results.get("Q07").retrievals;
  assert.deepEqual(q07.map(item => item.concept.product), ["natural gas", "petroleum"]);
  assert.ok(q07.every(item => item.displayCandidates.length > 0));
  assert.ok(q07.every(item => hasWarning(item, "ambiguous_product_interpretation")));
  assert.ok(q07.every(item => hasWarning(item, "activity_missing_aggregate_priority")));

  assert.equal(top(results.get("Q08")).series_id, "NG.NW2_EPG0_SWO_R48_BCF.W");
  assert.equal(top(results.get("Q08")).frequency, "weekly");
  assert.equal(top(results.get("Q09")).series_id, "INTL.5-2-BRA-MT.A");
  assert.match(top(results.get("Q09")).title, /^Petroleum and other liquids consumption/i);
  assert.ok(top(results.get("Q09")).ranking.reasonCodes.includes("broad_scope_preferred_no_subtype_requested"));

  const q10 = results.get("Q10").retrievals[0];
  assert.equal(q10.displayCandidates[0].series_id, "INTL.116-12-JPN-BKWH.A");
  assert.equal(q10.displayCandidates[0].frequency, "annual");
  assert.equal(q10.displayCandidates[0].ranking.tier, "B");
  assert.ok(hasWarning(q10, "requested_frequency_unavailable_international_annual_fallback"));

  const q11 = results.get("Q11").retrievals;
  assert.deepEqual(q11.map(item => item.concept.activity), ["production", "consumption"]);
  assert.match(q11[0].displayCandidates[0].title, /production/i);
  assert.match(q11[1].displayCandidates[0].title, /consumption/i);

  const q12 = results.get("Q12").retrievals;
  assert.deepEqual(q12.map(item => item.geography.code), ["BRA", "JPN"]);
  assert.deepEqual(q12.map(item => item.displayCandidates[0].series_id), ["INTL.2-12-BRA-BKWH.A", "INTL.2-12-JPN-BKWH.A"]);
  assert.ok(q12.every(item => item.displayCandidates[0].ranking.reasonCodes.includes("official_total_label")));

  const q13 = results.get("Q13").retrievals[0];
  assert.equal(q13.displayCandidates[0].series_id, "NG.N9050TX2.M");
  assert.ok(q13.displayCandidates.every(candidate => /production/i.test(candidate.title)));
  assert.ok(q13.displayCandidates.every(candidate => !/price|cost/i.test(candidate.title)));
  assert.ok(q13.displayCandidates.slice(0, 2).every(candidate => candidate.ranking.signals.equivalentChoiceGroup));

  const q14 = results.get("Q14").retrievals[0];
  assert.deepEqual(q14.displayCandidates, []);
  assert.deepEqual(q14.diagnostics.blockedByUnresolvedQualifiers, ["moon"]);
  assert.ok(hasWarning(q14, "unresolved_qualifier_requires_clarification"));
});

function top(result) {
  return result.retrievals[0].displayCandidates[0];
}

function hasWarning(retrieval, code) {
  return retrieval.userWarnings.some(warning => warning.code === code);
}

const CASES = [
  ["Q03", "New Mexico monthly marketed natural gas production"],
  ["Q04", "New York monthly residential natural gas consumption"],
  ["Q05", "Iowa monthly wind net generation"],
  ["Q06", "California renewable energy"],
  ["Q07", "Texas gas"],
  ["Q08", "United States weekly working gas in underground storage"],
  ["Q09", "Brazil annual petroleum consumption"],
  ["Q10", "Japan monthly solar electricity generation"],
  ["Q11", "Germany renewable energy production and consumption"],
  ["Q12", "Brazil then Japan annual electricity generation"],
  ["Q13", "plz shwo montly nat gas prodction in Texas, not prices"],
  ["Q14", "California monthly electricity from moon"]
];
