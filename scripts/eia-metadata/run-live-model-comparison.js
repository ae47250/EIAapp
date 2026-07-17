import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { buildLocalCandidatePipeline } from "../../lib/sources/eia/candidate-pipeline.js";
import { interpretQuery } from "../../lib/sources/eia/interpret-query.js";

const MODELS = String(
  process.env.EIA_COMPARISON_MODELS || "gpt-5.4-mini,gpt-4.1-nano,o3"
)
  .split(",")
  .map(model => model.trim())
  .filter(Boolean);
const TOP_LIMIT = 5;
const REPORT_PATH = resolve(process.argv[2] || "HOHO.md");
const DEFAULT_MODEL = "gpt-5.4-mini";
const MODEL_PROBE_TIMEOUT_MS = 30_000;

const OFFICIAL_SOURCES = [
  {
    label: "EIA Electric Power Monthly",
    url: "https://www.eia.gov/electricity/monthly/",
    use: "monthly state net generation, fuels, and sectors"
  },
  {
    label: "EIA Natural Gas Data",
    url: "https://www.eia.gov/naturalgas/data.php",
    use: "production, consumption, storage, prices, imports, and exports"
  },
  {
    label: "EIA Renewable and Alternative Fuels Data",
    url: "https://www.eia.gov/renewable/data.php",
    use: "wind, solar, hydroelectric, biomass, and renewable generation"
  },
  {
    label: "EIA International Energy Statistics",
    url: "https://www.eia.gov/international/data/world",
    use: "country-level petroleum, electricity, renewable, production, and consumption concepts"
  }
];

export const LIVE_COMPARISON_QUERIES = [
  benchmarkQuery("Q01", "Clear Domestic monthly baseline", "California monthly electricity generation", ["CA"], "electricity", "generation", "monthly", "domestic", false),
  benchmarkQuery("Q02", "Domestic-to-SEDS frequency fallback", "Texas monthly total energy consumption", ["TX"], "total energy", "consumption", "monthly", "domestic", false),
  benchmarkQuery("Q03", "Specific natural-gas production terminology", "New Mexico monthly marketed natural gas production", ["NM"], "natural gas", "production", "monthly", "domestic", false),
  benchmarkQuery("Q04", "Explicit sector and activity", "New York monthly residential natural gas consumption", ["NY"], "natural gas", "consumption", "monthly", "domestic", false, { sector: "residential" }),
  benchmarkQuery("Q05", "Renewable subtype and generation wording", "Iowa monthly wind net generation", ["IA"], "wind", "generation", "monthly", "domestic", false),
  benchmarkQuery("Q06", "Broad renewable request with missing activity", "California renewable energy", ["CA"], "renewable", null, "annual", "seds", true),
  benchmarkQuery("Q07", "Ambiguous product and missing activity", "Texas gas", ["TX"], null, null, "annual", "seds", true),
  benchmarkQuery("Q08", "Weekly storage wording", "United States weekly working gas in underground storage", ["USA"], "natural gas", "storage", "weekly", "domestic", false),
  benchmarkQuery("Q09", "Clear International petroleum request", "Brazil annual petroleum consumption", ["BRA"], "petroleum", "consumption", "annual", "international", false),
  benchmarkQuery("Q10", "International monthly renewable generation", "Japan monthly solar electricity generation", ["JPN"], "solar", "generation", "monthly", "international", false),
  benchmarkQuery("Q11", "Broad product with two activity mentions", "Germany renewable energy production and consumption", ["DEU"], "renewable", "production", "annual", "international", false, { conceptActivities: ["production", "consumption"] }),
  benchmarkQuery("Q12", "Multiple geographies and mention order", "Brazil then Japan annual electricity generation", ["BRA", "JPN"], "electricity", "generation", "annual", "international", false),
  benchmarkQuery("Q13", "Messy spelling and negative constraint", "plz shwo montly nat gas prodction in Texas, not prices", ["TX"], "natural gas", "production", "monthly", "domestic", false, { exclusions: ["activity:prices"] }),
  benchmarkQuery("Q14", "Impossible source term and weak activity hint", "California monthly electricity from moon", ["CA"], "electricity", null, "monthly", "domestic", true, { unknownQualifiers: ["moon"] }),
  benchmarkQuery("Q15", "Explicit price measure", "Texas annual natural gas prices", ["TX"], "natural gas", "prices", "annual", "seds", false),
  benchmarkQuery("Q16", "Explicit expenditure measure", "California annual petroleum expenditures", ["CA"], "petroleum", "expenditures", "annual", "seds", false),
  benchmarkQuery("Q17", "Stock request with flow exclusion", "United States weekly natural gas storage, not production", ["USA"], "natural gas", "storage", "weekly", "domestic", false, { exclusions: ["activity:production"] }),
  benchmarkQuery("Q18", "State and U.S. national geographies", "Texas and United States monthly natural gas production", ["TX", "USA"], "natural gas", "production", "monthly", "domestic", false),
  benchmarkQuery("Q19", "U.S. and foreign-country geographies", "United States then Canada annual natural gas production", ["USA", "CAN"], "natural gas", "production", "annual", "international", false),
  benchmarkQuery("Q20", "Explicit requested date range", "Brazil annual petroleum consumption from 2010 to 2020", ["BRA"], "petroleum", "consumption", "annual", "international", false),
  benchmarkQuery("Q21", "Explicit requested unit", "Brazil annual petroleum consumption in barrels", ["BRA"], "petroleum", "consumption", "annual", "international", false),
  benchmarkQuery("Q22", "Quarterly Domestic request", "California quarterly electricity generation", ["CA"], "electricity", "generation", "quarterly", "domestic", false),
  benchmarkQuery("Q23", "Weekly non-storage request", "United States weekly natural gas production", ["USA"], "natural gas", "production", "weekly", "domestic", false),
  benchmarkQuery("Q24", "Misspelled geography", "Califronia monthly electricity generation", ["CA"], "electricity", "generation", "monthly", "domestic", false),
  benchmarkQuery("Q25", "Multiple products with one activity", "Brazil annual petroleum and natural gas consumption", ["BRA"], "petroleum", "consumption", "annual", "international", false, { conceptProducts: ["petroleum", "natural gas"] }),
  benchmarkQuery("Q26", "One product with multiple sectors", "Texas annual natural gas consumption for residential and commercial sectors", ["TX"], "natural gas", "consumption", "annual", "seds", false, { sector: "residential" }),
  benchmarkQuery("Q27", "Broad product with explicit product exclusion", "Brazil annual energy consumption excluding petroleum", ["BRA"], "total energy", "consumption", "annual", "international", false, { exclusions: ["product:petroleum"] }),
  benchmarkQuery("Q28", "Unavailable geography-frequency combination", "France weekly solar electricity generation", ["FRA"], "solar", "generation", "weekly", "international", false),
  benchmarkQuery("Q29", "Explicit stock wording", "United States weekly working natural gas stocks", ["USA"], "natural gas", "storage", "weekly", "domestic", false),
  benchmarkQuery("Q30", "Explicit technical measure", "Texas annual natural gas conversion factor", ["TX"], "natural gas", null, "annual", "seds", true),
  benchmarkQuery("Q31", "Negated competing activity", "Brazil annual petroleum consumption, not production", ["BRA"], "petroleum", "consumption", "annual", "international", false, { exclusions: ["activity:production"] }),
  benchmarkQuery("Q32", "Domestic activity injection guard", "Texas monthly natural gas production, not consumption", ["TX"], "natural gas", "production", "monthly", "domestic", false, { exclusions: ["activity:consumption"] }),
  benchmarkQuery("Q33", "Product exclusion injection guard", "California monthly electricity generation, not natural gas", ["CA"], "electricity", "generation", "monthly", "domestic", false, { exclusions: ["product:natural gas"] }),
  benchmarkQuery("Q34", "Clear nuclear generation", "France annual nuclear electricity generation", ["FRA"], "nuclear", "generation", "annual", "international", false),
  benchmarkQuery("Q35", "Explicit electric-power sector", "Ohio monthly coal consumption electric power sector", ["OH"], "coal", "consumption", "monthly", "domestic", false, { sector: "electric power" }),
  benchmarkQuery("Q36", "Ordered imports and exports", "Canada annual natural gas imports and exports", ["CAN"], "natural gas", "imports", "annual", "international", false, { conceptActivities: ["imports", "exports"] }),
  benchmarkQuery("Q37", "Quarterly crude-oil production", "Alaska quarterly crude oil production", ["AK"], "petroleum", "production", "quarterly", "domestic", false),
  benchmarkQuery("Q38", "Implicit annual International default", "Brazil electricity generation", ["BRA"], "electricity", "generation", "annual", "international", false),
  benchmarkQuery("Q39", "Unknown source qualifier", "California electricity from moon", ["CA"], "electricity", null, "annual", "domestic", true, { unknownQualifiers: ["moon"] }),
  benchmarkQuery("Q40", "Missing geography", "annual coal production", [], "coal", "production", "annual", "international", true)
];

function benchmarkQuery(id, focus, raw, geographies, product, activity, frequency, route, needsClarification, options = {}) {
  return {
    id,
    focus,
    raw,
    expected: {
      geographies,
      product,
      activity,
      sector: options.sector ?? null,
      frequency,
      route,
      needsClarification,
      conceptProducts: options.conceptProducts || (product ? [product] : []),
      conceptActivities: options.conceptActivities || (activity ? [activity] : []),
      exclusions: options.exclusions || [],
      unknownQualifiers: options.unknownQualifiers || []
    }
  };
}

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required. Run with node --env-file=.env.local.");
  }

  const originalModel = process.env.OPENAI_MODEL;
  const run = {
    status: "running",
    startedAt: new Date().toISOString(),
    completedAt: null,
    defaultModel: DEFAULT_MODEL,
    models: MODELS,
    topLimit: TOP_LIMIT,
    queries: LIVE_COMPARISON_QUERIES,
    modelAvailability: [],
    results: []
  };

  await checkpoint(run);
  try {
    for (const model of MODELS) {
      process.env.OPENAI_MODEL = model;
      console.error(`[${model}] checking model access`);
      const availability = await probeModel(model);
      run.modelAvailability.push(availability);
      await checkpoint(run);

      if (!availability.available) {
        for (const query of LIVE_COMPARISON_QUERIES) run.results.push(blockedResult(model, query, availability));
        await checkpoint(run);
        continue;
      }

      for (const [index, query] of LIVE_COMPARISON_QUERIES.entries()) {
        console.error(`[${model}] ${index + 1}/${LIVE_COMPARISON_QUERIES.length} ${query.id}: ${query.raw}`);
        run.results.push(await executeQuery(model, query));
        await checkpoint(run);
      }
    }
    run.status = "complete";
    run.completedAt = new Date().toISOString();
    await checkpoint(run);
  } finally {
    if (originalModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = originalModel;
  }

  const blocked = run.results.filter(result => result.blocked).length;
  const failures = run.results.filter(result => result.error && !result.blocked).length;
  console.log(JSON.stringify({
    report: REPORT_PATH,
    status: run.status,
    models: MODELS,
    queriesPerModel: LIVE_COMPARISON_QUERIES.length,
    completedResults: run.results.length,
    blocked,
    failures
  }, null, 2));
}

async function probeModel(model) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_PROBE_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({ model, input: "Return exactly OK." })
    });
    const data = await response.json();
    return {
      model,
      available: response.ok,
      status: response.status,
      resolvedModel: data?.model || null,
      error: data?.error ? {
        message: data.error.message || "OpenAI rejected the model access check.",
        type: data.error.type || null,
        param: data.error.param || null,
        code: data.error.code || null
      } : null
    };
  } catch (error) {
    return {
      model,
      available: false,
      status: null,
      resolvedModel: null,
      error: {
        message: error?.name === "AbortError" ? "Model access check timed out." : "Model access check failed.",
        type: error?.name || "Error",
        param: null,
        code: error?.name === "AbortError" ? "openai_timeout" : "openai_request_failed"
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

function blockedResult(model, query, availability) {
  return {
    model,
    queryId: query.id,
    rawInput: query.raw,
    focus: query.focus,
    blocked: true,
    error: {
      name: "ModelUnavailableError",
      code: "model_unavailable",
      upstreamCode: availability.error?.code || null,
      message: availability.error?.message || `${model} is unavailable for this OpenAI project.`
    },
    diagnostics: { totalElapsedMs: 0 },
    retrievals: []
  };
}

async function executeQuery(model, query) {
  const startedAt = performance.now();
  try {
    const intentStartedAt = performance.now();
    const intent = await interpretQuery(query.raw);
    const intentElapsedMs = round(performance.now() - intentStartedAt);
    const intentSummary = summarizeIntent(intent);

    const pipelineStartedAt = performance.now();
    const deterministic = await buildLocalCandidatePipeline(intent);
    const deterministicElapsedMs = round(performance.now() - pipelineStartedAt);

    return {
      model,
      queryId: query.id,
      rawInput: query.raw,
      focus: query.focus,
      intent: intentSummary,
      benchmark: assessExpectedIntent(intentSummary, query.expected),
      diagnostics: {
        intentElapsedMs,
        deterministicElapsedMs,
        totalElapsedMs: round(performance.now() - startedAt),
        candidatePipelineVersion: deterministic.diagnostics?.candidatePipelineVersion || null,
        rankingConfigVersion: deterministic.diagnostics?.rankingConfigVersion || null,
        rankingTaxonomyVersion: deterministic.diagnostics?.rankingTaxonomyVersion || null,
        semanticRerankingApplied: false,
        semanticInvocationCount: 0,
        crossRouteFallback: deterministic.diagnostics?.crossRouteFallback || null,
        index: deterministic.diagnostics?.index || null
      },
      retrievals: (deterministic.retrievals || []).map(summarizeRetrieval)
    };
  } catch (error) {
    return {
      model,
      queryId: query.id,
      rawInput: query.raw,
      focus: query.focus,
      error: {
        name: error?.name || "Error",
        code: error?.code || null,
        message: error?.message || "Unknown live comparison error."
      },
      diagnostics: { totalElapsedMs: round(performance.now() - startedAt) },
      retrievals: []
    };
  }
}

export function summarizeIntent(intent) {
  const structured = intent?.structuredIntent || intent || {};
  return {
    interpreter: intent?.interpreter || null,
    interpretationMethod: intent?.interpretationMethod || null,
    confidence: intent?.confidence ?? null,
    originalQuery: intent?.originalQuery || "",
    cleanedQuery: intent?.cleanedQuery || "",
    correctedQuery: intent?.correctedQuery || "",
    correctedQuerySource: intent?.correctedQuerySource || "unknown",
    geography: structured.geography || null,
    geographies: structured.geographies || [],
    product: structured.product || null,
    productBreadth: structured.productBreadth || null,
    productAlternatives: structured.productAlternatives || [],
    activity: structured.activity || null,
    activityInference: structured.activityInference || null,
    conceptPairs: structured.conceptPairs || [],
    sector: structured.sector || null,
    exclusions: structured.exclusions || [],
    unknownQualifiers: structured.unknownQualifiers || [],
    requestedFrequency: structured.requestedFrequency || null,
    frequencyExplicit: Boolean(structured.frequencyExplicit),
    frequency: structured.frequency || null,
    route: structured.route || null,
    ambiguity: structured.ambiguity || null,
    validation: structured.validation || null,
    fallback: intent?.fallback || structured.fallback || null,
    missingFields: intent?.missingFields || [],
    ambiguousFields: intent?.ambiguousFields || [],
    needsClarification: Boolean(intent?.needsClarification),
    clarificationMessage: intent?.clarificationMessage || null,
    mentions: structured.mentions || null,
    fields: structured.fields || intent?.fields || {}
  };
}

export function assessExpectedIntent(intent, expected) {
  const actual = {
    geographies: (intent?.geographies || []).map(item => item.code),
    product: intent?.product ?? null,
    activity: intent?.activity ?? null,
    sector: intent?.sector ?? null,
    frequency: intent?.frequency ?? null,
    route: intent?.route?.family ?? null,
    needsClarification: Boolean(intent?.needsClarification),
    conceptProducts: [...new Set((intent?.conceptPairs || []).map(item => item.product).filter(Boolean))],
    conceptActivities: [...new Set((intent?.conceptPairs || []).map(item => item.activity).filter(Boolean))],
    exclusions: (intent?.exclusions || []).map(item => `${item.type}:${item.value}`),
    unknownQualifiers: (intent?.unknownQualifiers || []).map(item => item.value)
  };
  const checks = Object.fromEntries(Object.keys(expected || {}).map(key => [key, JSON.stringify(actual[key]) === JSON.stringify(expected[key])]));
  return { passed: Object.values(checks).every(Boolean), checks, expected, actual };
}

function summarizeRetrieval(retrieval) {
  const deterministic = (retrieval.displayCandidates || []).slice(0, TOP_LIMIT);

  return {
    key: [retrieval.geography?.code, retrieval.concept?.product, retrieval.concept?.activity, retrieval.concept?.sector].filter(Boolean).join(":"),
    geography: retrieval.geography || null,
    concept: retrieval.concept || null,
    frequency: retrieval.frequency || null,
    emptyResult: Boolean(retrieval.emptyResult),
    interpretationGroups: retrieval.interpretationGroups || [],
    selectionPolicy: retrieval.selectionPolicy || null,
    userWarnings: retrieval.userWarnings || [],
    rankingWarnings: retrieval.diagnostics?.rankingWarnings || [],
    retrievalDiagnostics: retrieval.diagnostics || {},
    deterministicTop: deterministic.map((candidate, index) => summarizeCandidate(candidate, index + 1, index + 1)),
    modelTop: deterministic.map((candidate, index) => summarizeCandidate(candidate, index + 1, index + 1))
  };
}

function summarizeCandidate(candidate, deterministicRank, modelRank) {
  return {
    modelRank,
    deterministicRank,
    candidateId: candidate.candidate_id || null,
    seriesId: candidate.series_id || null,
    title: candidate.title || null,
    familyId: candidate.ranking?.signals?.familyId || null,
    routeFamily: candidate.route_family || null,
    geography: candidate.geography || null,
    pool: candidate.retrieval?.pool || candidate.ranking?.signals?.sourcePool || null,
    retrievalTier: candidate.retrieval?.tier || null,
    rankingTier: candidate.ranking?.tier || null,
    score: candidate.ranking?.score ?? null,
    frequency: candidate.frequency || null,
    unit: candidate.unit || null,
    dateStart: candidate.date_start || null,
    dateEnd: candidate.date_end || null,
    active: candidate.is_active ?? null,
    reasons: candidate.ranking?.reasonCodes || [],
    warnings: candidate.ranking?.warnings || [],
    retrievalReasons: candidate.retrieval?.reasonCodes || [],
    components: Object.entries(candidate.ranking?.components || {}).map(([name, component]) => ({
      name,
      points: component.points,
      maximum: component.maximum,
      reasons: component.reasonCodes || []
    }))
  };
}

async function checkpoint(run) {
  const report = renderReport(run);
  let lastError;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await writeFile(REPORT_PATH, report, "utf8");
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 5) await new Promise(resolveDelay => setTimeout(resolveDelay, attempt * 100));
    }
  }
  throw lastError;
}

function renderReport(run) {
  const lines = [];
  const completeCount = run.results.length;
  const expectedCount = run.models.length * run.queries.length;

  lines.push("# Live EIA intent-model comparison with deterministic ranking", "");
  lines.push(`Status: **${run.status}** (${completeCount}/${expectedCount} model-query runs recorded).`, "");
  lines.push(`Started: ${run.startedAt}`);
  lines.push(`Completed: ${run.completedAt || "in progress"}`);
  lines.push(`Application default retained: \`${run.defaultModel}\`.`);
  lines.push(`Comparison overrides: ${run.models.map(model => `\`${model}\``).join(" and ")}.`);
  lines.push(`Ranking output: complete top ${run.topLimit} display families per retrieval.`);
  lines.push("");

  lines.push("## Scope and safeguards", "");
  lines.push("1. Each model receives exactly the same raw query set.");
  lines.push("2. Each available model performs query interpretation; validated intent then enters the same local metadata indexes.");
  lines.push("3. AI fields are authoritative only after controlled-vocabulary and query-evidence validation; deterministic rules repair missing, rejected, or unresolved fields.");
  lines.push("4. Hard route, geography, product, activity, sector, frequency, selector, negation, and duplicate checks run before scoring.");
  lines.push("5. The same local Phase 3 retrieval and Phase 4 deterministic ranking run for every validated intent.");
  lines.push("6. Semantic reranking is disabled. AI cannot reorder candidates, invent selectors, or change ranking points.");
  lines.push("7. The configured public/default model remains gpt-5.4-mini; this runner changes only its own process environment.");
  lines.push("8. No Vercel environment, public route, observation data, or login behavior is changed.");
  lines.push("9. OpenAI intent-call token usage is not exposed by the current interpretation interface.");
  lines.push("");

  lines.push("## Official EIA vocabulary sources", "");
  lines.push("The stress queries use concepts and wording found on official EIA data pages:", "");
  for (const source of OFFICIAL_SOURCES) lines.push(`- [${source.label}](${source.url}): ${source.use}.`);
  lines.push("");

  lines.push("## Fixed raw query inventory", "");
  lines.push("| ID | Test focus | Raw input text | Human-reviewed expected intent |", "| --- | --- | --- | --- |");
  for (const query of run.queries) lines.push(`| ${query.id} | ${md(query.focus)} | ${code(query.raw)} | ${md(formatExpectedIntent(query.expected))} |`);
  lines.push("");

  lines.push("## Model access preflight", "");
  lines.push("| Requested model | Available | HTTP status | Resolved model | Error code | Safe error detail |", "| --- | --- | ---: | --- | --- | --- |");
  for (const model of run.models) {
    const availability = run.modelAvailability.find(item => item.model === model);
    if (!availability) {
      lines.push(`| ${code(model)} | pending | n/a | n/a | n/a | pending |`);
      continue;
    }
    lines.push(`| ${code(model)} | ${yesNo(availability.available)} | ${availability.status ?? "n/a"} | ${code(availability.resolvedModel || "none")} | ${code(availability.error?.code || "none")} | ${md(availability.error?.message || "none")} |`);
  }
  lines.push("");

  lines.push("## Model summary", "");
  lines.push("| Model | Runs | AI interpretations | Rule fallbacks | Retrievals | Semantic calls | Blocked | Errors | Total elapsed |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |");
  for (const model of run.models) {
    const stats = modelStats(run.results.filter(result => result.model === model));
    lines.push(`| ${code(model)} | ${stats.runs} | ${stats.aiInterpretations} | ${stats.ruleFallbacks} | ${stats.retrievals} | 0 | ${stats.blocked} | ${stats.errors} | ${formatMs(stats.totalElapsedMs)} |`);
  }
  lines.push("");

  lines.push("## Intent provenance diagnostics", "");
  lines.push("| Model | AI fields | Accepted | Rejected | Deterministic repairs | Full rules fallbacks | User-visible failures | Intent p95 | Total p95 | Repair reasons |", "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |");
  for (const model of run.models) {
    const stats = provenanceStats(run.results.filter(result => result.model === model));
    lines.push(`| ${code(model)} | ${stats.aiFields} | ${formatRate(stats.acceptedFields, stats.aiFields)} | ${formatRate(stats.rejectedFields, stats.aiFields)} | ${stats.repairedFields} | ${stats.fullRulesFallbacks} | ${formatRate(stats.userVisibleFailures, stats.completedRuns)} | ${formatMs(stats.intentP95Ms)} | ${formatMs(stats.totalP95Ms)} | ${md(formatReasonCounts(stats.repairReasons))} |`);
  }
  lines.push("");

  lines.push("## Human-reviewed benchmark", "");
  lines.push("| Model | Graded | Passed | Failed | Mismatched fields |", "| --- | ---: | ---: | ---: | --- |");
  for (const model of run.models) {
    const stats = benchmarkStats(run.results.filter(result => result.model === model));
    lines.push(`| ${code(model)} | ${stats.graded} | ${stats.passed} | ${stats.failed} | ${md(formatBenchmarkFailures(stats.failures))} |`);
  }
  lines.push("");

  lines.push("## Cross-model comparison", "");
  lines.push("| ID | Mini vs nano: same validated semantic intent | Mini vs nano: same top-five order | gpt-5.4-mini top result(s) | gpt-4.1-nano top result(s) | o3 top result(s) | Warning difference |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const query of run.queries) {
    const left = findResult(run, "gpt-5.4-mini", query.id);
    const right = findResult(run, "gpt-4.1-nano", query.id);
    const o3 = findResult(run, "o3", query.id);
    if (!left || !right) {
      lines.push(`| ${query.id} | pending | pending | ${left ? md(topLabels(left)) : "pending"} | ${right ? md(topLabels(right)) : "pending"} | ${o3 ? md(topLabels(o3)) : "pending"} | pending |`);
      continue;
    }
    const comparable = !left.error && !right.error;
    lines.push(`| ${query.id} | ${comparable ? yesNo(intentSignature(left) === intentSignature(right)) : "not comparable"} | ${comparable ? yesNo(orderSignature(left) === orderSignature(right)) : "not comparable"} | ${md(topLabels(left))} | ${md(topLabels(right))} | ${o3 ? md(topLabels(o3)) : "pending"} | ${md(warningDifference(run, query.id))} |`);
  }
  lines.push("");

  const comparison = comparisonStats(run);
  const requiredBenchmarkModels = ["gpt-5.4-mini", "gpt-4.1-nano"];
  const requiredBenchmarksPass = requiredBenchmarkModels.every(model => {
    const stats = benchmarkStats(run.results.filter(result => result.model === model));
    return stats.graded === run.queries.length && stats.passed === stats.graded;
  });
  const cohortPassed = run.status === "complete"
    && comparison.comparable === run.queries.length
    && comparison.sameIntent === comparison.comparable
    && comparison.sameOrder === comparison.comparable
    && requiredBenchmarksPass;
  const o3Availability = run.modelAvailability.find(item => item.model === "o3");
  lines.push("## Assessment", "");
  lines.push(`- Mini/nano comparable queries: ${comparison.comparable}/${run.queries.length}.`);
  lines.push(`- Same validated semantic intent: ${comparison.sameIntent}/${comparison.comparable || 0}.`);
  lines.push(`- Same deterministic top-five order: ${comparison.sameOrder}/${comparison.comparable || 0}.`);
  lines.push(`- Same warnings: ${comparison.sameWarnings}/${comparison.comparable || 0}.`);
  lines.push(`- Raw AI-field disagreement before validation: ${comparison.comparable - comparison.sameAiFields}/${comparison.comparable || 0}.`);
  lines.push(`- Validated semantic-intent disagreement after validation: ${comparison.comparable - comparison.sameIntent}/${comparison.comparable || 0}.`);
  for (const model of requiredBenchmarkModels) {
    const stats = benchmarkStats(run.results.filter(result => result.model === model));
    lines.push(`- ${model} human-reviewed benchmark: ${stats.passed}/${stats.graded || 0}.`);
  }
  lines.push(`- Semantic reranking calls: 0. Candidate scores and order remain deterministic.`);
  lines.push(`- o3 access: ${o3Availability?.available ? "available" : `blocked${o3Availability?.error?.code ? ` (${o3Availability.error.code})` : ""}`}.`);
  lines.push(`- Gate conclusion: ${cohortPassed
    ? "the available mini/nano cohort agrees end to end; keep the revised pipeline disconnected until human review approves promotion"
    : "model or deterministic-output differences remain; do not promote the revised pipeline"}.`);
  lines.push("");

  lines.push("## Detailed results", "");
  for (const query of run.queries) {
    lines.push(`### ${query.id}: ${query.focus}`, "");
    lines.push(`**Raw input text:** ${code(query.raw)}`, "");
    for (const model of run.models) {
      const result = findResult(run, model, query.id);
      lines.push(`#### ${model}`, "");
      if (!result) {
        lines.push("_Pending._", "");
        continue;
      }
      if (result.error) {
        lines.push(`**${result.blocked ? "Blocked" : "Error"}:** ${code([result.error.code, result.error.upstreamCode, result.error.message].filter(Boolean).join(": "))}`, "");
        continue;
      }
      renderIntent(lines, result);
      for (const [index, retrieval] of result.retrievals.entries()) renderRetrieval(lines, retrieval, index);
    }
  }

  lines.push("## Interpretation notes", "");
  lines.push("- Each model is evaluated as an intent interpreter only. All displayed scores and ordering come from the same deterministic ranker.");
  lines.push("- A model that fails the access preflight has no attributed rankings. Deterministic fallback output is not presented as that model's work.");
  lines.push("- `semanticRerankingApplied` remains false and semantic invocation count remains zero for every run.");
  lines.push("- Empty or fallback results are retained rather than silently replacing the requested frequency, route, geography, or concept.");
  lines.push("- Scores are deterministic Phase 4 scores. AI creates no points and supplies no candidate ordering.");
  lines.push("- Semantic-intent comparison excludes confidence, fallback provenance, corrected wording, and model-reported ambiguity when all validated routing and retrieval fields are identical.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function renderIntent(lines, result) {
  const intent = result.intent;
  const geographies = (intent.geographies || []).map(item => `${item.name || item.code} (${item.code})`).join(" -> ") || "none";
  const route = intent.route?.family || "none";
  lines.push("| Interpretation field | Value |", "| --- | --- |");
  lines.push(`| Interpreter | ${md(intent.interpreter || "none")} |`);
  lines.push(`| Cleaned query | ${code(intent.cleanedQuery || "")} |`);
  lines.push(`| Corrected query | ${code(intent.correctedQuery || "")} |`);
  lines.push(`| Corrected-query source | ${md(intent.correctedQuerySource || "unknown")} |`);
  lines.push(`| Confidence | ${formatNumber(intent.confidence)} |`);
  lines.push(`| Geography order | ${md(geographies)} |`);
  lines.push(`| Product | ${md(intent.product || "missing")} |`);
  lines.push(`| Product breadth / alternatives | ${md(`${intent.productBreadth || "unknown"}; ${(intent.productAlternatives || []).join(", ") || "none"}`)} |`);
  lines.push(`| Activity / weak inference | ${md(`${intent.activity || "missing"}; ${intent.activityInference?.activity || "none"}`)} |`);
  lines.push(`| Ordered concept pairs | ${md(formatConceptPairs(intent.conceptPairs))} |`);
  lines.push(`| Sector | ${md(intent.sector || "missing")} |`);
  lines.push(`| Exclusions | ${md(formatStructuredValues(intent.exclusions))} |`);
  lines.push(`| Unknown qualifiers | ${md(formatStructuredValues(intent.unknownQualifiers))} |`);
  lines.push(`| Frequency | ${md(intent.frequency || "missing")} |`);
  lines.push(`| Explicit requested frequency | ${md(intent.frequencyExplicit ? intent.requestedFrequency || "present" : "none")} |`);
  lines.push(`| Route | ${md(route)} |`);
  lines.push(`| Ambiguity | ${md(intent.ambiguity?.status || "none")} |`);
  lines.push(`| Fallback | ${md(intent.fallback?.used ? (intent.fallback.reasons || []).join(", ") || "used" : "not used")} |`);
  lines.push(`| Clarification | ${md(intent.needsClarification ? intent.clarificationMessage || "required" : "not required")} |`);
  lines.push("");

  const failedBenchmarkFields = Object.entries(result.benchmark?.checks || {}).filter(([, passed]) => !passed).map(([field]) => field);
  lines.push(`- Human-reviewed benchmark: ${result.benchmark?.passed ? "pass" : `fail (${failedBenchmarkFields.join(", ") || "not graded"})`}.`);

  const fields = Object.entries(intent.fields || {});
  if (fields.length > 0) {
    lines.push("| Field provenance | AI value | Deterministic evidence | Validated value | Status | Conflict | Resolution source | Repair reason |", "| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const [name, field] of fields) {
      lines.push(`| ${md(name)} | ${code(formatFieldValue(field.aiValue))} | ${code(formatFieldValue(field.deterministicValue))} | ${code(formatFieldValue(field.normalizedValue ?? field.value))} | ${md(field.validation || "unknown")} | ${md(field.conflictStatus || "unknown")} | ${md(field.resolutionSource || "unknown")} | ${md(field.fallbackReason || field.reason || "none")} |`);
    }
    lines.push("");
  }

  const geographyMentions = formatMentions(intent.mentions?.geographies);
  const conceptMentions = formatMentions(intent.mentions?.concepts);
  const frequencyMentions = formatMentions(intent.mentions?.frequencies);
  lines.push(`- Mention order: geography=${geographyMentions}; concepts=${conceptMentions}; frequency=${frequencyMentions}.`);
  lines.push(`- Timing: intent ${formatMs(result.diagnostics.intentElapsedMs)}, deterministic retrieval/ranking ${formatMs(result.diagnostics.deterministicElapsedMs)}, total ${formatMs(result.diagnostics.totalElapsedMs)}.`);
  lines.push(`- Pipeline versions: candidate ${code(result.diagnostics.candidatePipelineVersion || "unknown")}, ranking ${code(result.diagnostics.rankingConfigVersion || "unknown")}, taxonomy ${code(result.diagnostics.rankingTaxonomyVersion || "unknown")}.`);
  lines.push("");
}

function renderRetrieval(lines, retrieval, index) {
  lines.push(`##### Retrieval ${index + 1}: ${retrieval.key || "unnamed"}`, "");
  lines.push(`- Geography: ${md(`${retrieval.geography?.name || retrieval.geography?.code || "unknown"} (${retrieval.geography?.code || "unknown"})`)}.`);
  lines.push(`- Concept: product=${md(retrieval.concept?.product || "missing")}; activity=${md(retrieval.concept?.activity || "missing")}; activity source=${md(retrieval.concept?.activitySource || "unknown")}.`);
  lines.push(`- Frequency rule: requested=${md(retrieval.frequency?.requested || retrieval.frequency?.value || "none")}; mode=${md(retrieval.frequency?.mode || "unknown")}.`);
  lines.push(`- User warnings: ${formatWarnings(retrieval.userWarnings)}.`);
  lines.push("- Ranking mode: deterministic only; semantic reranking was not invoked.");
  lines.push("");

  if (!retrieval.modelTop.length) {
    lines.push("_No displayable candidate. No substitute was silently selected._", "");
    return;
  }

  lines.push("| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |", "| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |");
  for (const candidate of retrieval.modelTop) {
    lines.push(`| ${candidate.modelRank} | ${candidate.deterministicRank} | ${code(candidate.seriesId || candidate.candidateId)} | ${md(candidate.title || "untitled")} | ${code(candidate.familyId || "none")} | ${md(`${candidate.routeFamily || "unknown"} / ${candidate.pool || "unknown"} / ${candidate.rankingTier || "unknown"}`)} | ${formatNumber(candidate.score)} | ${md(candidate.frequency || "unknown")} | ${md(candidate.unit || "unknown")} | ${md(formatCoverage(candidate))} | ${md(formatComponents(candidate.components))} | ${md(candidate.reasons.join(", ") || "none")} | ${md(candidate.warnings.join(", ") || "none")} |`);
  }
  lines.push("");
}

function modelStats(results) {
  const completed = results.filter(result => !result.error);
  const retrievals = completed.flatMap(result => result.retrievals || []);
  return {
    runs: results.length,
    aiInterpretations: completed.filter(result => result.intent?.interpreter === "openai").length,
    ruleFallbacks: completed.filter(result => result.intent?.interpreter !== "openai").length,
    retrievals: retrievals.length,
    blocked: results.filter(result => result.blocked).length,
    errors: results.filter(result => result.error && !result.blocked).length,
    totalElapsedMs: results.reduce((sum, result) => sum + Number(result.diagnostics?.totalElapsedMs || 0), 0)
  };
}

export function benchmarkStats(results) {
  const graded = results.filter(result => !result.error && result.benchmark);
  const failures = graded.filter(result => !result.benchmark.passed).map(result => ({
    queryId: result.queryId,
    fields: Object.entries(result.benchmark.checks || {}).filter(([, passed]) => !passed).map(([field]) => field)
  }));
  return {
    graded: graded.length,
    passed: graded.length - failures.length,
    failed: failures.length,
    failures
  };
}

export function provenanceStats(results) {
  const completed = results.filter(result => !result.error);
  const stats = {
    completedRuns: completed.length,
    aiFields: 0,
    acceptedFields: 0,
    rejectedFields: 0,
    repairedFields: 0,
    fullRulesFallbacks: 0,
    userVisibleFailures: 0,
    intentP95Ms: percentile(completed.map(result => result.diagnostics?.intentElapsedMs), 0.95),
    totalP95Ms: percentile(completed.map(result => result.diagnostics?.totalElapsedMs), 0.95),
    repairReasons: {}
  };

  for (const result of completed) {
    if (result.intent?.interpreter !== "openai") stats.fullRulesFallbacks += 1;
    if (isUserVisibleFailure(result)) stats.userVisibleFailures += 1;
    for (const field of Object.values(result.intent?.fields || {})) {
      if (field?.aiValue !== null && field?.aiValue !== undefined && field.aiValue !== "") stats.aiFields += 1;
      if (field?.validation === "approved") stats.acceptedFields += 1;
      if (field?.validation === "rejected") stats.rejectedFields += 1;
      if (field?.fallbackUsed) {
        stats.repairedFields += 1;
        const reason = field.fallbackReason || "unspecified_repair";
        stats.repairReasons[reason] = (stats.repairReasons[reason] || 0) + 1;
      }
    }
  }
  return stats;
}

function isUserVisibleFailure(result) {
  if (result.error) return true;
  if (result.intent?.needsClarification) return false;
  return (result.retrievals || []).length === 0 || (result.retrievals || []).every(retrieval => retrieval.emptyResult);
}

function findResult(run, model, queryId) {
  return run.results.find(result => result.model === model && result.queryId === queryId) || null;
}

function comparisonStats(run) {
  const stats = { comparable: 0, sameAiFields: 0, sameIntent: 0, sameOrder: 0, sameWarnings: 0 };
  for (const query of run.queries) {
    const left = findResult(run, "gpt-5.4-mini", query.id);
    const right = findResult(run, "gpt-4.1-nano", query.id);
    if (!left || !right || left.error || right.error) continue;
    stats.comparable += 1;
    if (preValidationSignature(left) === preValidationSignature(right)) stats.sameAiFields += 1;
    if (intentSignature(left) === intentSignature(right)) stats.sameIntent += 1;
    if (orderSignature(left) === orderSignature(right)) stats.sameOrder += 1;
    if (JSON.stringify(collectWarnings(left)) === JSON.stringify(collectWarnings(right))) stats.sameWarnings += 1;
  }
  return stats;
}

export function intentSignature(result) {
  if (result.error) return `error:${result.error.code || result.error.message}`;
  const intent = result.intent;
  return JSON.stringify({
    geographies: (intent.geographies || []).map(item => item.code),
    product: intent.product,
    alternatives: intent.productAlternatives,
    activity: intent.activity,
    activityInference: intent.activityInference?.activity || null,
    conceptPairs: (intent.conceptPairs || []).map(pair => ({ product: pair.product || null, activity: pair.activity || null, sector: pair.sector || null })),
    sector: intent.sector,
    exclusions: (intent.exclusions || []).map(item => ({ type: item.type, value: item.value })),
    unknownQualifiers: (intent.unknownQualifiers || []).map(item => item.value),
    requestedFrequency: intent.requestedFrequency,
    frequencyExplicit: intent.frequencyExplicit,
    frequency: intent.frequency,
    route: intent.route?.family
  });
}

export function preValidationSignature(result) {
  if (result.error) return `error:${result.error.code || result.error.message}`;
  return JSON.stringify(Object.fromEntries(Object.entries(result.intent?.fields || {}).map(([name, field]) => [name, field.aiValue ?? null])));
}

function orderSignature(result) {
  if (result.error) return `error:${result.error.code || result.error.message}`;
  return JSON.stringify((result.retrievals || []).map(retrieval => ({
    key: retrieval.key,
    ids: retrieval.modelTop.map(candidate => candidate.seriesId || candidate.candidateId)
  })));
}

function topLabels(result) {
  if (result.error) return `error: ${result.error.code || result.error.message}`;
  const labels = (result.retrievals || []).map(retrieval => retrieval.modelTop[0]?.seriesId || retrieval.modelTop[0]?.candidateId || "no candidate");
  return labels.join("; ") || "no retrieval";
}

function warningDifference(run, queryId) {
  const available = run.models
    .map(model => [model, findResult(run, model, queryId)])
    .filter(([, result]) => result && !result.error)
    .map(([model, result]) => [model, collectWarnings(result)]);
  if (available.length < 2) return "not comparable";
  if (available.every(([, warnings]) => JSON.stringify(warnings) === JSON.stringify(available[0][1]))) return "none";
  return available.map(([model, warnings]) => `${model}: ${warnings.join(", ") || "none"}`).join("; ");
}

function collectWarnings(result) {
  return [...new Set((result.retrievals || []).flatMap(retrieval => [
    ...retrieval.userWarnings.map(warning => warning.code || warning.message),
    ...retrieval.modelTop.flatMap(candidate => candidate.warnings)
  ]).filter(Boolean))];
}

function formatMentions(mentions) {
  if (!Array.isArray(mentions) || !mentions.length) return "none";
  return mentions.map(mention => `${mention.text || mention.value}:${mention.value || mention.type}@${mention.index}`).join(" -> ");
}

function formatConceptPairs(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) return "none";
  return pairs.map(pair => [pair.product, pair.activity, pair.sector].filter(Boolean).join(" / ") || "empty").join(" -> ");
}

function formatStructuredValues(values) {
  if (!Array.isArray(values) || values.length === 0) return "none";
  return values.map(item => `${item.type ? `${item.type}:` : ""}${item.value || item}`).join(", ");
}

function formatExpectedIntent(expected) {
  return [
    `geo=${expected.geographies.join(",") || "none"}`,
    `product=${expected.product || "none"}`,
    `activity=${expected.activity || "none"}`,
    `sector=${expected.sector || "none"}`,
    `frequency=${expected.frequency || "none"}`,
    `route=${expected.route || "none"}`,
    `clarify=${yesNo(expected.needsClarification)}`
  ].join("; ");
}

function formatBenchmarkFailures(failures) {
  if (!failures.length) return "none";
  return failures.map(failure => `${failure.queryId}: ${failure.fields.join(", ") || "unknown"}`).join("; ");
}

function formatWarnings(warnings) {
  if (!warnings?.length) return "none";
  return warnings.map(warning => `${code(warning.code || "warning")} ${md(warning.message || "")}`).join("; ");
}

function formatComponents(components) {
  return components.filter(component => component.maximum > 0)
    .map(component => `${component.name} ${formatNumber(component.points)}/${formatNumber(component.maximum)}`)
    .join("; ") || "none";
}

function formatCoverage(candidate) {
  if (!candidate.dateStart && !candidate.dateEnd) return "unknown";
  return `${candidate.dateStart || "?"} to ${candidate.dateEnd || "?"}`;
}

function formatMs(value) {
  return `${formatNumber(value || 0)} ms`;
}

function formatRate(numerator, denominator) {
  if (!denominator) return "0/0 (0%)";
  return `${numerator}/${denominator} (${Math.round(numerator / denominator * 1000) / 10}%)`;
}

function formatReasonCounts(reasons) {
  return Object.entries(reasons || {}).sort(([left], [right]) => left.localeCompare(right)).map(([reason, count]) => `${reason}: ${count}`).join("; ") || "none";
}

function formatFieldValue(value) {
  if (value === null || value === undefined || value === "") return "none";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function percentile(values, percentileValue) {
  const numbers = values.map(Number).filter(Number.isFinite).sort((left, right) => left - right);
  if (numbers.length === 0) return 0;
  return numbers[Math.max(0, Math.ceil(numbers.length * percentileValue) - 1)];
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "n/a";
  const number = Number(value);
  return Number.isFinite(number) ? String(Math.round(number * 1000) / 1000) : md(value);
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function round(value) {
  return Math.round(Number(value || 0) * 1000) / 1000;
}

function code(value) {
  return `\`${md(value).replaceAll("`", "\\`")}\``;
}

function md(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\r", " ").replaceAll("\n", " ");
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch(error => {
    console.error(error?.stack || error);
    process.exitCode = 1;
  });
}
