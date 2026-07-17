import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SEMANTIC_RERANKING_CONFIG_VERSION,
  applyConditionalSemanticReranking,
  buildSemanticRerankingRequest,
  evaluateSemanticRerankingTrigger,
  validateSemanticRerankingResponse
} from "../lib/sources/eia/semantic-reranking.js";

test("candidate labels do not create a protected aggregate status", () => {
  const trigger = evaluateSemanticRerankingTrigger(
    ambiguousIntent(),
    rankedFixture({ firstTier: "B", secondTier: "B" }).retrievals[0]
  );

  assert.equal(trigger.eligible, true);
  assert.equal(trigger.reason, "conditional_ambiguity_trigger");
});

test("ambiguous close same-tier families receive a validated shadow order only", async () => {
  const input = ambiguousIntent();
  const deterministic = rankedFixture();
  const result = await applyConditionalSemanticReranking(input, deterministic, {
    mode: "shadow",
    requestRerank: async request => {
      assert.equal(request.rawQuery, "Japan energy supply");
      assert.equal("lightlyCleanedQuery" in request, false);
      assert.deepEqual(request.allowedFamilyIds, ["family-a", "family-b"]);
      return { ...validResponse(["family-b", "family-a"]), usage: { input_tokens: 120, output_tokens: 24, total_tokens: 144 }, model: "fixture-model" };
    }
  });

  const status = result.retrievals[0].semanticReranking;
  assert.equal(status.valid, true);
  assert.equal(status.applied, false);
  assert.deepEqual(status.shadowFamilyIds, ["family-b", "family-a"]);
  assert.deepEqual(result.retrievals[0].displayCandidates.map(candidate => candidate.ranking.signals.familyId), ["family-a", "family-b"]);
  assert.equal(result.diagnostics.semanticRerankingInvocationCount, 1);
  assert.equal(result.diagnostics.semanticRerankingInvocationRate, 1);
  assert.deepEqual(result.diagnostics.semanticRerankingUsage, { inputTokens: 120, outputTokens: 24, totalTokens: 144 });
});

test("unknown IDs and incomplete orders are rejected without changing deterministic output", async () => {
  const unknown = await runWithResponse({ ordered_family_ids: ["invented", "family-a"], confidence: 0.9, reason_codes: ["invented"] });
  const incomplete = await runWithResponse({ ordered_family_ids: ["family-a"], confidence: 0.9, reason_codes: [] });

  assert.equal(unknown.retrievals[0].semanticReranking.reason, "semantic_order_contains_unknown_family");
  assert.equal(incomplete.retrievals[0].semanticReranking.reason, "semantic_order_incomplete_or_duplicate");
  assert.deepEqual(unknown.retrievals[0].semanticReranking.shadowFamilyIds, ["family-a", "family-b"]);
});

test("AI timeout, failure, invalid JSON, and low confidence preserve deterministic ranking", async () => {
  const responses = [
    async () => { const error = new Error("aborted"); error.name = "AbortError"; throw error; },
    async () => ({ ok: false, reason: "openai_http_500" }),
    async () => ({ outputText: "not-json" }),
    async () => ({ ordered_family_ids: ["family-b", "family-a"], confidence: 0.2, reason_codes: [] })
  ];

  for (const requestRerank of responses) {
    const result = await applyConditionalSemanticReranking(ambiguousIntent(), rankedFixture(), { mode: "shadow", requestRerank });
    assert.equal(result.retrievals[0].semanticReranking.valid, false);
    assert.deepEqual(result.retrievals[0].semanticReranking.shadowFamilyIds, ["family-a", "family-b"]);
    assert.deepEqual(result.retrievals[0].displayCandidates.map(candidate => candidate.ranking.signals.familyId), ["family-a", "family-b"]);
  }
});

test("off mode is an immediate rollback and never invokes AI", async () => {
  let calls = 0;
  const result = await applyConditionalSemanticReranking(ambiguousIntent(), rankedFixture(), {
    mode: "off",
    requestRerank: async () => { calls += 1; return validResponse(["family-b", "family-a"]); }
  });

  assert.equal(calls, 0);
  assert.equal(result.diagnostics.semanticRerankingMode, "off");
  assert.equal(result.diagnostics.semanticRerankingInvocationCount, 0);
  assert.equal(result.diagnostics.semanticRerankingConfigVersion, SEMANTIC_RERANKING_CONFIG_VERSION);
});

test("conditional and always-AI evaluation policies report different invocation behavior", async () => {
  const deterministic = rankedFixture({ ambiguous: false });
  let conditionalCalls = 0;
  let alwaysCalls = 0;
  const conditional = await applyConditionalSemanticReranking(clearIntent(), deterministic, {
    mode: "shadow",
    requestRerank: async () => { conditionalCalls += 1; return validResponse(["family-a", "family-b"]); }
  });
  const always = await applyConditionalSemanticReranking(clearIntent(), deterministic, {
    mode: "shadow",
    triggerPolicy: "always",
    requestRerank: async () => { alwaysCalls += 1; return validResponse(["family-a", "family-b"]); }
  });

  assert.equal(conditionalCalls, 0);
  assert.equal(alwaysCalls, 1);
  assert.equal(conditional.diagnostics.semanticRerankingInvocationRate, 0);
  assert.equal(always.diagnostics.semanticRerankingInvocationRate, 1);
});

test("trigger requires ambiguity, credible same-tier families, and a close score gap", () => {
  assert.equal(evaluateSemanticRerankingTrigger(ambiguousIntent(), rankedFixture().retrievals[0]).eligible, true);
  assert.equal(evaluateSemanticRerankingTrigger(clearIntent(), rankedFixture({ ambiguous: false }).retrievals[0]).reason, "no_unresolved_ambiguity");
  assert.equal(evaluateSemanticRerankingTrigger(ambiguousIntent(), rankedFixture({ scoreGap: 12 }).retrievals[0]).reason, "deterministic_score_gap_is_decisive");
  assert.equal(evaluateSemanticRerankingTrigger(ambiguousIntent(), rankedFixture({ secondTier: "B" }).retrievals[0]).reason, "top_families_are_in_different_tiers");
});

test("request contains raw text, structured intent, and only known eligible families", () => {
  const request = buildSemanticRerankingRequest(ambiguousIntent(), rankedFixture().retrievals[0], ["family-a", "family-b"]);

  assert.equal(request.rawQuery, "Japan energy supply");
  assert.equal("lightlyCleanedQuery" in request, false);
  assert.equal(request.structuredIntent.product, "total energy");
  assert.deepEqual(request.allowedFamilyIds, ["family-a", "family-b"]);
  assert.ok(request.candidates.every(candidate => request.allowedFamilyIds.includes(candidate.familyId)));
  assert.ok(request.candidates.every(candidate => candidate.representativeCandidateId));
});

test("validated shadow ordering can improve a graded offline case without changing live order", async () => {
  const deterministic = rankedFixture();
  const relevance = new Map([["family-a", 1], ["family-b", 3]]);
  const before = ndcg(["family-a", "family-b"], relevance);
  const result = await applyConditionalSemanticReranking(ambiguousIntent(), deterministic, {
    mode: "shadow",
    requestRerank: async () => validResponse(["family-b", "family-a"])
  });
  const shadow = result.retrievals[0].semanticReranking.shadowFamilyIds;

  assert.ok(ndcg(shadow, relevance) > before);
  assert.deepEqual(result.retrievals[0].displayCandidates.map(candidate => candidate.ranking.signals.familyId), ["family-a", "family-b"]);
});

test("response validation accepts only a complete permutation of known family IDs", () => {
  const valid = validateSemanticRerankingResponse(validResponse(["family-b", "family-a"]), ["family-a", "family-b"]);
  const duplicate = validateSemanticRerankingResponse(validResponse(["family-a", "family-a"]), ["family-a", "family-b"]);

  assert.equal(valid.valid, true);
  assert.equal(duplicate.valid, false);
});

test("response validation accepts a complete permutation inside a JSON code fence", () => {
  const response = {
    outputText: `\`\`\`json
${JSON.stringify(validResponse(["family-b", "family-a"]))}
\`\`\``
  };

  const validated = validateSemanticRerankingResponse(response, ["family-a", "family-b"]);

  assert.equal(validated.valid, true);
  assert.deepEqual(validated.orderedFamilyIds, ["family-b", "family-a"]);
});

async function runWithResponse(response) {
  return applyConditionalSemanticReranking(ambiguousIntent(), rankedFixture(), {
    mode: "shadow",
    requestRerank: async () => response
  });
}

function validResponse(order) {
  return { ordered_family_ids: order, confidence: 0.9, reason_codes: ["better_query_fit"] };
}

function ambiguousIntent() {
  return {
    originalQuery: "Japan energy supply",
    cleanedQuery: "Japan energy supply",
    normalizedQuery: "japan energy supply",
    geography: { name: "Japan", code: "JPN", type: "country" },
    product: "total energy",
    productBreadth: "broad",
    productAlternatives: ["petroleum", "natural gas"],
    activity: "production",
    frequency: "annual",
    ambiguity: { status: "ambiguous", reasons: ["broad_product"] },
    route: { family: "international" }
  };
}

function clearIntent() {
  return {
    ...ambiguousIntent(),
    originalQuery: "California monthly electricity generation",
    cleanedQuery: "California monthly electricity generation",
    normalizedQuery: "california monthly electricity generation",
    geography: { name: "California", code: "CA", type: "state" },
    product: "electricity",
    productBreadth: "specific",
    productAlternatives: [],
    activity: "generation",
    frequency: "monthly",
    ambiguity: { status: "none", reasons: [] },
    route: { family: "domestic" }
  };
}

function rankedFixture(options = {}) {
  const first = candidate("candidate-a", "family-a", 72, options.firstTier || "C", ["aggregation_relation_unknown_no_verified_hierarchy"]);
  const second = candidate("candidate-b", "family-b", 72 - (options.scoreGap ?? 2), options.secondTier || "C", ["ordinary_series"]);
  return {
    routeFamily: "international",
    retrievals: [{
      geography: { name: "Japan", code: "JPN", type: "country" },
      concept: {
        product: options.ambiguous === false ? "petroleum" : "total energy",
        productBreadth: options.ambiguous === false ? "specific" : "broad",
        productAlternatives: options.ambiguous === false ? [] : ["petroleum", "natural gas"],
        activity: "production",
        activitySource: "explicit_or_validated"
      },
      displayCandidates: [first, second],
      rankedCandidates: [first, second],
      candidateFamilies: [
        { familyId: "family-a", representativeCandidateId: "candidate-a", candidateIds: ["candidate-a"], variantCount: 1 },
        { familyId: "family-b", representativeCandidateId: "candidate-b", candidateIds: ["candidate-b"], variantCount: 1 }
      ],
      diagnostics: {}
    }],
    diagnostics: { semanticRerankingApplied: false }
  };
}

function candidate(candidateId, familyId, score, tier, reasonCodes) {
  return {
    candidate_id: candidateId,
    series_id: candidateId,
    route_family: "international",
    title: `${candidateId} title`,
    geography: { name: "Japan", code: "JPN", type: "country" },
    frequency: "annual",
    unit: "quadrillion btu",
    ranking: {
      score,
      tier,
      reasonCodes,
      warnings: [],
      signals: { familyId }
    }
  };
}

function ndcg(order, relevance) {
  const gain = order.reduce((sum, id, index) => sum + ((2 ** (relevance.get(id) || 0)) - 1) / Math.log2(index + 2), 0);
  const ideal = [...relevance.values()].sort((left, right) => right - left)
    .reduce((sum, value, index) => sum + ((2 ** value) - 1) / Math.log2(index + 2), 0);
  return gain / ideal;
}
