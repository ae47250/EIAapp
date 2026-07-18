import assert from "node:assert/strict";
import { test } from "node:test";

import {
  classifyDifference,
  findExpectedGeographyFailures,
  rankingSignature,
  semanticSignature
} from "../scripts/eia-benchmark/run-hoho8.js";

test("HoHo8 ignores certainty-only additions when selecting human review cases", () => {
  const production = output();
  production.statusCode = 200;
  const candidate = structuredClone(production);
  delete candidate.statusCode;
  candidate.topCandidates[0].certainty.routeRelation = "exact";

  const difference = classifyDifference(candidate, production);
  assert.equal(difference.certaintyChanged, true);
  assert.equal(difference.reviewRelevant, false);
});

test("HoHo8 detects semantic and visible-ranking differences independently", () => {
  const baseline = output();
  const semantic = structuredClone(baseline);
  semantic.structuredIntent.geographies = [{ code: "GEO" }];
  const ranking = structuredClone(baseline);
  ranking.topCandidates[0].seriesId = "OTHER";

  assert.notEqual(semanticSignature(semantic), semanticSignature(baseline));
  assert.equal(rankingSignature(semantic), rankingSignature(baseline));
  assert.notEqual(rankingSignature(ranking), rankingSignature(baseline));
});

test("HoHo8 detects an objective geography failure even when both arms match", () => {
  const candidate = output();
  const production = structuredClone(candidate);
  candidate.structuredIntent.geographies = [{ code: "FRA" }];
  production.structuredIntent.geographies = [{ code: "FRA" }];

  assert.equal(classifyDifference(candidate, production).reviewRelevant, false);
  assert.deepEqual(
    findExpectedGeographyFailures(["GEO", "FRA"], candidate, production),
    [
      { arm: "candidate", expected: ["GEO", "FRA"], actual: ["FRA"], missing: ["GEO"] },
      { arm: "production", expected: ["GEO", "FRA"], actual: ["FRA"], missing: ["GEO"] }
    ]
  );
});

function output() {
  return {
    statusCode: 200,
    route: "seds",
    clarificationRequired: false,
    structuredIntent: {
      geographies: [{ code: "GA" }],
      conceptPairs: [{ product: "natural gas", activity: "production" }],
      exclusions: [],
      unknownQualifiers: [],
      frequency: "annual"
    },
    topCandidates: [{
      seriesId: "SERIES",
      certainty: {
        semanticCompatibility: "compatible",
        frequencyRelation: "defaulted",
        aggregationRelation: "unknown",
        hierarchyEvidenceStatus: "none"
      }
    }]
  };
}
