import { readFileSync } from "node:fs";

const CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase5-semantic-reranking-config.json", import.meta.url), "utf8"));

export const SEMANTIC_RERANKING_CONFIG_VERSION = CONFIG.version;

export async function applyConditionalSemanticReranking(input, rankedResult, options = {}) {
  validateInputs(input, rankedResult);
  const intent = resolveStructuredIntent(input);
  const mode = normalizeMode(options.mode ?? process.env.EIA_SEMANTIC_RERANKING ?? CONFIG.defaultMode);
  const triggerPolicy = options.triggerPolicy === "always" ? "always" : "conditional";
  const requestRerank = options.requestRerank || requestOpenAiOrdering;
  const processed = [];

  for (const retrieval of rankedResult.retrievals) {
    const trigger = evaluateSemanticRerankingTrigger(intent, retrieval, { triggerPolicy });
    if (mode === "off" || !trigger.eligible) {
      processed.push({
        ...retrieval,
        semanticReranking: semanticStatus({
          mode,
          triggerPolicy,
          eligible: trigger.eligible,
          invoked: false,
          reason: mode === "off" ? "semantic_reranking_disabled" : trigger.reason,
          deterministicFamilyIds: trigger.familyIds
        })
      });
      continue;
    }

    const request = buildSemanticRerankingRequest(intent, retrieval, trigger.familyIds);
    const startedAt = performance.now();
    let response;
    try {
      response = await requestRerank(request, options);
    } catch (error) {
      response = { ok: false, reason: error?.name === "AbortError" ? "openai_timeout" : "openai_request_failed" };
    }
    const elapsedMs = round(performance.now() - startedAt, 3);
    const validated = validateSemanticRerankingResponse(response, trigger.familyIds);

    processed.push({
      ...retrieval,
      semanticReranking: semanticStatus({
        mode,
        triggerPolicy,
        eligible: true,
        invoked: true,
        reason: validated.reason,
        deterministicFamilyIds: trigger.familyIds,
        shadowFamilyIds: validated.valid ? validated.orderedFamilyIds : trigger.familyIds,
        confidence: validated.confidence,
        reasonCodes: validated.reasonCodes,
        valid: validated.valid,
        elapsedMs,
        model: response?.model || options.model || process.env.EIA_SEMANTIC_RERANK_MODEL || process.env.OPENAI_MODEL || CONFIG.openai.defaultModel,
        usage: normalizeUsage(response?.usage)
      })
    });
  }

  const statuses = processed.map(retrieval => retrieval.semanticReranking);
  const invoked = statuses.filter(status => status.invoked);
  const valid = invoked.filter(status => status.valid);
  return {
    ...rankedResult,
    retrievals: processed,
    diagnostics: {
      ...rankedResult.diagnostics,
      semanticRerankingApplied: false,
      semanticRerankingMode: mode,
      semanticRerankingConfigVersion: SEMANTIC_RERANKING_CONFIG_VERSION,
      semanticRerankingTriggerPolicy: triggerPolicy,
      semanticRerankingInvocationCount: invoked.length,
      semanticRerankingValidCount: valid.length,
      semanticRerankingInvocationRate: statuses.length ? round(invoked.length / statuses.length, 4) : 0,
      semanticRerankingElapsedMs: round(invoked.reduce((sum, status) => sum + status.elapsedMs, 0), 3),
      semanticRerankingUsage: sumUsage(invoked.map(status => status.usage))
    }
  };
}

export function evaluateSemanticRerankingTrigger(input, retrieval, options = {}) {
  const intent = resolveStructuredIntent(input);
  const families = displayFamilies(retrieval).slice(0, CONFIG.trigger.maximumFamilies);
  const familyIds = families.map(candidate => candidate.ranking.signals.familyId);
  if (families.length < CONFIG.trigger.minimumFamilies) return triggerResult(false, "insufficient_credible_families", familyIds);
  if (families.some(candidate => candidate.ranking.score < CONFIG.trigger.minimumScore)) return triggerResult(false, "candidate_below_semantic_display_threshold", familyIds);
  if (options.triggerPolicy !== "always" && CONFIG.trigger.requireSameTier && families[0].ranking.tier !== families[1].ranking.tier) {
    return triggerResult(false, "top_families_are_in_different_tiers", familyIds);
  }
  if (options.triggerPolicy !== "always" && families[0].ranking.score - families[1].ranking.score > CONFIG.trigger.maximumTopScoreGap) {
    return triggerResult(false, "deterministic_score_gap_is_decisive", familyIds);
  }
  if (options.triggerPolicy !== "always" && CONFIG.trigger.requireUnresolvedAmbiguity && !hasUnresolvedAmbiguity(intent, retrieval)) {
    return triggerResult(false, "no_unresolved_ambiguity", familyIds);
  }
  return triggerResult(true, options.triggerPolicy === "always" ? "always_ai_evaluation" : "conditional_ambiguity_trigger", familyIds);
}

export function buildSemanticRerankingRequest(input, retrieval, allowedFamilyIds = null) {
  const intent = resolveStructuredIntent(input);
  const allowed = new Set(allowedFamilyIds || []);
  const candidates = displayFamilies(retrieval)
    .filter(candidate => allowed.size === 0 || allowed.has(candidate.ranking.signals.familyId))
    .map(candidate => ({
      familyId: candidate.ranking.signals.familyId,
      representativeCandidateId: candidate.candidate_id,
      title: candidate.title,
      routeFamily: candidate.route_family,
      geography: candidate.geography,
      frequency: candidate.frequency,
      unit: candidate.unit,
      tier: candidate.ranking.tier,
      deterministicScore: candidate.ranking.score,
      deterministicReasons: candidate.ranking.reasonCodes,
      warnings: candidate.ranking.warnings
    }));

  return {
    rawQuery: intent.originalQuery || "",
    structuredIntent: {
      geography: intent.geography || null,
      product: intent.product || null,
      productBreadth: intent.productBreadth || "specific",
      productAlternatives: intent.productAlternatives || [],
      activity: intent.activity || null,
      activityInference: intent.activityInference || null,
      frequency: intent.frequency || null,
      ambiguity: intent.ambiguity || null,
      route: intent.route || null
    },
    candidates,
    allowedFamilyIds: candidates.map(candidate => candidate.familyId)
  };
}

export function validateSemanticRerankingResponse(response, allowedFamilyIds) {
  if (response?.ok === false) return invalidResponse(response.reason || "openai_request_failed");
  const parsed = parseResponseObject(response);
  if (!parsed) return invalidResponse("openai_invalid_json");
  const ordered = parsed.ordered_family_ids;
  const allowed = [...allowedFamilyIds];
  if (!Array.isArray(ordered) || ordered.length !== allowed.length || new Set(ordered).size !== ordered.length) {
    return invalidResponse("semantic_order_incomplete_or_duplicate");
  }
  if (ordered.some(familyId => !allowed.includes(familyId))) return invalidResponse("semantic_order_contains_unknown_family");
  if (allowed.some(familyId => !ordered.includes(familyId))) return invalidResponse("semantic_order_missing_known_family");

  const confidence = clamp(Number(parsed.confidence), 0, 1);
  if (!Number.isFinite(Number(parsed.confidence)) || confidence < CONFIG.response.minimumConfidence) {
    return invalidResponse("semantic_confidence_below_threshold", confidence);
  }
  const reasonCodes = Array.isArray(parsed.reason_codes)
    ? parsed.reason_codes
      .filter(value => typeof value === "string" && value.length > 0 && value.length <= CONFIG.response.maximumReasonCodeLength)
      .slice(0, CONFIG.response.maximumReasonCodes)
    : [];
  return {
    valid: true,
    reason: "semantic_shadow_order_validated",
    orderedFamilyIds: ordered,
    confidence,
    reasonCodes
  };
}

async function requestOpenAiOrdering(request, options = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { ok: false, reason: "openai_not_configured" };
  const model = options.model || process.env.EIA_SEMANTIC_RERANK_MODEL || process.env.OPENAI_MODEL || CONFIG.openai.defaultModel;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.openai.timeoutMs);
  const prompt = [
    "Review a small set of already eligible EIA metadata families for an ambiguous query.",
    "You may only reorder the supplied allowed family IDs. Do not add, remove, rewrite, or replace an ID.",
    "Do not infer a route, selector, geography, frequency, unit, or metadata fact that is absent from the supplied JSON.",
    "Tier order and deterministic eligibility are fixed outside this task.",
    "Return only JSON with ordered_family_ids, confidence from 0 to 1, and short reason_codes.",
    JSON.stringify(request)
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({ model, input: prompt })
    });
    const data = await response.json();
    if (!response.ok) return { ok: false, reason: `openai_http_${response.status}`, model, usage: data?.usage };
    return { ok: true, outputText: extractResponseText(data), model, usage: data?.usage };
  } catch (error) {
    return { ok: false, reason: error?.name === "AbortError" ? "openai_timeout" : "openai_request_failed", model };
  } finally {
    clearTimeout(timeout);
  }
}

function semanticStatus(values) {
  return {
    mode: values.mode,
    triggerPolicy: values.triggerPolicy,
    eligible: Boolean(values.eligible),
    invoked: Boolean(values.invoked),
    applied: false,
    valid: Boolean(values.valid),
    reason: values.reason,
    deterministicFamilyIds: values.deterministicFamilyIds || [],
    shadowFamilyIds: values.shadowFamilyIds || values.deterministicFamilyIds || [],
    confidence: values.confidence ?? null,
    reasonCodes: values.reasonCodes || [],
    elapsedMs: values.elapsedMs || 0,
    model: values.model || null,
    usage: values.usage || normalizeUsage(null)
  };
}

function displayFamilies(retrieval) {
  const seen = new Set();
  return (retrieval.displayCandidates || []).filter(candidate => {
    const familyId = candidate?.ranking?.signals?.familyId;
    if (!familyId || seen.has(familyId)) return false;
    seen.add(familyId);
    return true;
  });
}

function hasUnresolvedAmbiguity(intent, retrieval) {
  const status = String(intent?.ambiguity?.status || "none").toLowerCase();
  return status !== "none" ||
    new Set(["broad", "ambiguous"]).has(intent?.productBreadth) ||
    (intent?.productAlternatives || []).length > 0 ||
    new Set(["broad", "ambiguous"]).has(retrieval?.concept?.productBreadth) ||
    (retrieval?.concept?.productAlternatives || []).length > 0 ||
    new Set(["weak_inference", "missing"]).has(retrieval?.concept?.activitySource);
}

function triggerResult(eligible, reason, familyIds) {
  return { eligible, reason, familyIds };
}

function parseResponseObject(response) {
  if (!response) return null;
  if (typeof response === "string") return parseJsonObject(response);
  if (response.ordered_family_ids) return response;
  if (typeof response.outputText === "string") return parseJsonObject(response.outputText);
  if (typeof response.output_text === "string") return parseJsonObject(response.output_text);
  return null;
}

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]?.trim();
  const embedded = raw.match(/\{[\s\S]*\}/)?.[0];

  for (const candidate of [raw, fenced, embedded]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      // Try the next bounded JSON representation.
    }
  }
  return null;
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") return content.text;
    }
  }
  return "";
}

function normalizeUsage(usage) {
  return {
    inputTokens: Number(usage?.input_tokens || usage?.inputTokens || 0),
    outputTokens: Number(usage?.output_tokens || usage?.outputTokens || 0),
    totalTokens: Number(usage?.total_tokens || usage?.totalTokens || 0)
  };
}

function sumUsage(usages) {
  return usages.reduce((sum, usage) => ({
    inputTokens: sum.inputTokens + usage.inputTokens,
    outputTokens: sum.outputTokens + usage.outputTokens,
    totalTokens: sum.totalTokens + usage.totalTokens
  }), normalizeUsage(null));
}

function invalidResponse(reason, confidence = null) {
  return { valid: false, reason, orderedFamilyIds: [], confidence, reasonCodes: [] };
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  return CONFIG.allowedModes.includes(mode) ? mode : CONFIG.defaultMode;
}

function resolveStructuredIntent(input) {
  if (!input?.structuredIntent || typeof input.structuredIntent !== "object") return input;
  const { structuredIntent, ...wrapper } = input;
  return { ...wrapper, ...structuredIntent };
}

function validateInputs(input, rankedResult) {
  if (!input || typeof input !== "object") throw new TypeError("Phase 5 semantic reranking requires structured intent.");
  if (!rankedResult || !Array.isArray(rankedResult.retrievals)) throw new TypeError("Phase 5 semantic reranking requires ranked retrievals.");
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((Number(value) || 0) * factor) / factor;
}
