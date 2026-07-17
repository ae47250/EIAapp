import assert from "node:assert/strict";
import { test } from "node:test";

import {
  LIVE_COMPARISON_QUERIES,
  assessExpectedIntent,
  benchmarkStats,
  intentSignature,
  preValidationSignature,
  provenanceStats,
  summarizeIntent
} from "../scripts/eia-metadata/run-live-model-comparison.js";

test("live comparison keeps the original cohort and expands to forty curated expected outcomes", () => {
  assert.equal(LIVE_COMPARISON_QUERIES.length, 40);
  assert.equal(LIVE_COMPARISON_QUERIES[0].raw, "California monthly electricity generation");
  assert.equal(LIVE_COMPARISON_QUERIES[13].raw, "California monthly electricity from moon");
  for (const phrase of ["prices", "expenditures", "not production", "date range", "barrels", "quarterly", "weekly", "Califronia", "multiple products", "multiple sectors", "excluding petroleum", "conversion factor"]) {
    assert.ok(LIVE_COMPARISON_QUERIES.some(query => `${query.focus} ${query.raw}`.toLowerCase().includes(phrase.toLowerCase())), phrase);
  }
  for (const query of LIVE_COMPARISON_QUERIES) {
    assert.deepEqual(Object.keys(query.expected), [
      "geographies", "product", "activity", "sector", "frequency", "route", "needsClarification",
      "conceptProducts", "conceptActivities", "exclusions", "unknownQualifiers"
    ]);
  }
});

test("curated benchmark grading reports exact agreement and field-level disagreement", () => {
  const expected = LIVE_COMPARISON_QUERIES[0].expected;
  const matching = {
    geographies: [{ code: "CA" }],
    product: "electricity",
    activity: "generation",
    sector: null,
    frequency: "monthly",
    route: { family: "domestic" },
    needsClarification: false,
    conceptPairs: [{ product: "electricity", activity: "generation" }],
    exclusions: [],
    unknownQualifiers: []
  };

  assert.equal(assessExpectedIntent(matching, expected).passed, true);
  const mismatch = assessExpectedIntent({ ...matching, activity: "consumption" }, expected);
  assert.equal(mismatch.passed, false);
  assert.equal(mismatch.checks.activity, false);
});

test("benchmark statistics retain failed query IDs and fields", () => {
  const stats = benchmarkStats([
    { queryId: "Q01", benchmark: { passed: true, checks: { activity: true } } },
    { queryId: "Q02", benchmark: { passed: false, checks: { product: true, activity: false } } },
    { queryId: "Q03", error: { message: "unavailable" } }
  ]);

  assert.deepEqual(stats, {
    graded: 2,
    passed: 1,
    failed: 1,
    failures: [{ queryId: "Q02", fields: ["activity"] }]
  });
});

test("intent summaries retain field-level provenance", () => {
  const fields = {
    product: { aiValue: "oil", normalizedValue: "petroleum", validation: "fallback", fallbackUsed: true, fallbackReason: "unsupported_ai_value" }
  };
  const summary = summarizeIntent({ interpreter: "openai", fields, structuredIntent: { product: "petroleum", fields } });

  assert.deepEqual(summary.fields, fields);
});

test("provenance statistics separate acceptance, rejection, repair, and visible failure", () => {
  const results = [
    resultWithFields("openai", {
      country: { aiValue: "TX", normalizedValue: "TX", validation: "approved", fallbackUsed: false },
      product: { aiValue: "moon gas", normalizedValue: "natural gas", validation: "fallback", fallbackUsed: true, fallbackReason: "unsupported_ai_value" },
      sector: { aiValue: "invented", normalizedValue: null, validation: "rejected", fallbackUsed: false }
    }),
    { ...resultWithFields("rules", {}), retrievals: [{ emptyResult: true }] }
  ];
  const stats = provenanceStats(results);

  assert.equal(stats.aiFields, 3);
  assert.equal(stats.acceptedFields, 1);
  assert.equal(stats.rejectedFields, 1);
  assert.equal(stats.repairedFields, 1);
  assert.equal(stats.fullRulesFallbacks, 1);
  assert.equal(stats.userVisibleFailures, 1);
  assert.deepEqual(stats.repairReasons, { unsupported_ai_value: 1 });
});

test("raw AI disagreement can disappear after local validation", () => {
  const left = resultWithFields("openai", { product: { aiValue: "oil", normalizedValue: "petroleum" } });
  const right = resultWithFields("openai", { product: { aiValue: "petroleum", normalizedValue: "petroleum" } });
  left.intent.product = "petroleum";
  right.intent.product = "petroleum";

  assert.notEqual(preValidationSignature(left), preValidationSignature(right));
  assert.equal(intentSignature(left), intentSignature(right));
});

function resultWithFields(interpreter, fields) {
  return {
    intent: {
      interpreter,
      fields,
      geographies: [],
      productAlternatives: [],
      conceptPairs: [],
      exclusions: [],
      unknownQualifiers: []
    },
    diagnostics: { intentElapsedMs: 100, totalElapsedMs: 200 },
    retrievals: [{ emptyResult: false }]
  };
}
