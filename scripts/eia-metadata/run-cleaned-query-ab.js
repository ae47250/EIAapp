import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { buildLocalCandidatePipeline } from "../../lib/sources/eia/candidate-pipeline.js";
import { cleanQueryMechanically, interpretQuery } from "../../lib/sources/eia/interpret-query.js";

const MODEL = "gpt-4.1-nano";
const REPORT_PATH = resolve("HOHO2.md");
const TOP_LIMIT = 5;
const CONDITIONS = [
  { id: "raw_plus_cleaned", label: "Raw + mechanically cleaned", includeCleanedQueryInPrompt: true },
  { id: "raw_only", label: "Raw only", includeCleanedQueryInPrompt: false }
];

const QUERIES = [
  { id: "Q01", raw: "  “California\u00a0monthly   electricity\n generation”  " },
  { id: "Q02", raw: "\t‘Texas’\u00a0monthly\t total energy   consumption\n" },
  { id: "Q03", raw: "  plz   shwo\n‘montly’\u00a0nat gas prodction in Texas, not prices  " },
  { id: "Q04", raw: "“New Mexico”\u00a0monthly   marketed\n natural gas production" },
  { id: "Q05", raw: "\n ‘New York’   monthly\u00a0residential natural gas\tconsumption " },
  { id: "Q06", raw: "  “Iowa”\u00a0monthly\nwind   net generation\t" },
  { id: "Q07", raw: "\t‘California’\u00a0renewable\n  energy   " },
  { id: "Q08", raw: "  “Texas”\u00a0 gas\n " },
  { id: "Q09", raw: " ‘United States’\u00a0weekly\nworking gas   in underground\tstorage " },
  { id: "Q10", raw: "\n“Brazil”\u00a0annual   petroleum\tconsumption  " },
  { id: "Q11", raw: " ‘Japan’\u00a0monthly\nsolar electricity   generation\t" },
  { id: "Q12", raw: "  “Germany”\u00a0renewable energy\n production   and\tconsumption " },
  { id: "Q13", raw: "\t‘Brazil’ then\u00a0“Japan”\n annual electricity   generation " },
  { id: "Q14", raw: " “California”\u00a0monthly electricity\nfrom   moon\t" },
  { id: "Q15", raw: "  “Alaska”\u00a0quarterly\n crude oil   production\t" },
  { id: "Q16", raw: "\n‘Florida’\u00a0annual residential\t electricity   prices " },
  { id: "Q17", raw: "  “Ohio”\u00a0monthly coal\n consumption   electric power\tsector " },
  { id: "Q18", raw: "\t‘France’\u00a0annual nuclear\n electricity   generation " },
  { id: "Q19", raw: "  “Colorado”\u00a0monthly solar\t generation,   not consumption\n" },
  { id: "Q20", raw: "\n‘Canada’\u00a0annual natural gas   imports\tand exports  " }
];

async function main() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required. Run with node --env-file=.env.local.");
  const previousModel = process.env.OPENAI_MODEL;
  process.env.OPENAI_MODEL = MODEL;
  const run = { status: "running", model: MODEL, startedAt: new Date().toISOString(), completedAt: null, conditions: CONDITIONS, queries: QUERIES, results: [] };
  await checkpoint(run);

  try {
    for (const query of QUERIES) {
      for (const condition of CONDITIONS) {
        console.error(`[${query.id}] ${condition.id}`);
        run.results.push(await execute(query, condition));
        await checkpoint(run);
      }
    }
    run.status = "complete";
    run.completedAt = new Date().toISOString();
    await checkpoint(run);
  } finally {
    if (previousModel === undefined) delete process.env.OPENAI_MODEL;
    else process.env.OPENAI_MODEL = previousModel;
  }

  console.log(JSON.stringify({ report: REPORT_PATH, model: MODEL, calls: run.results.length, status: run.status }, null, 2));
}

async function execute(query, condition) {
  const startedAt = performance.now();
  try {
    const intent = await interpretQuery(query.raw, [], { includeCleanedQueryInPrompt: condition.includeCleanedQueryInPrompt });
    const interpretedAt = performance.now();
    const pipeline = await buildLocalCandidatePipeline(intent);
    return {
      queryId: query.id,
      condition: condition.id,
      intent: summarizeIntent(intent),
      retrievals: (pipeline.retrievals || []).map(summarizeRetrieval),
      diagnostics: {
        intentMs: Math.round(interpretedAt - startedAt),
        pipelineMs: Math.round(performance.now() - interpretedAt),
        totalMs: Math.round(performance.now() - startedAt),
        index: pipeline.diagnostics?.index || null,
        rankingConfigVersion: pipeline.diagnostics?.rankingConfigVersion || null,
        candidatePipelineVersion: pipeline.diagnostics?.candidatePipelineVersion || null,
        semanticRerankingApplied: false
      }
    };
  } catch (error) {
    return { queryId: query.id, condition: condition.id, error: { name: error?.name || "Error", message: error?.message || "Unknown error" }, retrievals: [], diagnostics: { totalMs: Math.round(performance.now() - startedAt) } };
  }
}

function summarizeIntent(intent) {
  const value = intent?.structuredIntent || intent || {};
  return {
    interpreter: intent?.interpreter || null,
    confidence: intent?.confidence ?? null,
    cleanedQuery: intent?.cleanedQuery || "",
    correctedQuery: intent?.correctedQuery || "",
    geographies: value.geographies || [],
    product: value.product || null,
    productBreadth: value.productBreadth || null,
    productAlternatives: value.productAlternatives || [],
    activity: value.activity || null,
    conceptPairs: value.conceptPairs || [],
    sector: value.sector || null,
    exclusions: value.exclusions || [],
    unknownQualifiers: value.unknownQualifiers || [],
    frequency: value.frequency || null,
    requestedFrequency: value.requestedFrequency || null,
    frequencyExplicit: Boolean(value.frequencyExplicit),
    route: value.route || null,
    ambiguity: value.ambiguity || null,
    fallback: intent?.fallback || value.fallback || null,
    needsClarification: Boolean(intent?.needsClarification),
    clarificationMessage: intent?.clarificationMessage || null
  };
}

function summarizeRetrieval(retrieval) {
  return {
    key: [retrieval.geography?.code, retrieval.concept?.product, retrieval.concept?.activity, retrieval.concept?.sector].filter(Boolean).join(":"),
    warnings: [...new Set([...(retrieval.userWarnings || []), ...(retrieval.diagnostics?.rankingWarnings || [])])],
    candidates: (retrieval.displayCandidates || []).slice(0, TOP_LIMIT).map((candidate, index) => ({
      rank: index + 1,
      candidateId: candidate.candidate_id || null,
      seriesId: candidate.series_id || null,
      title: candidate.title || null,
      route: candidate.route_family || null,
      pool: candidate.retrieval?.pool || candidate.ranking?.signals?.sourcePool || null,
      tier: candidate.ranking?.tier || candidate.retrieval?.tier || null,
      score: candidate.ranking?.score ?? null,
      frequency: candidate.frequency || null,
      unit: candidate.unit || null,
      reasons: candidate.ranking?.reasonCodes || [],
      warnings: candidate.ranking?.warnings || []
    }))
  };
}

async function checkpoint(run) {
  await writeFile(REPORT_PATH, renderReport(run), "utf8");
}

function renderReport(run) {
  const lines = [
    "# Raw-only versus raw-plus-cleaned EIA interpretation A/B test",
    "",
    `Status: **${run.status}** (${run.results.length}/${run.queries.length * run.conditions.length} OpenAI calls recorded).`,
    "",
    `Model: \`${run.model}\`.`,
    `Started: ${run.startedAt}.`,
    `Completed: ${run.completedAt || "in progress"}.`,
    "Semantic reranking: disabled; all candidate retrieval and ranking after intent validation is deterministic.",
    "",
    "## Method",
    "",
    "- Condition A sends the exact raw note and the mechanically cleaned copy.",
    "- Condition B sends only the exact raw note.",
    "- Mechanical cleanup changes curly quotes, non-breaking spaces, repeated whitespace, tabs/newlines, and edge whitespace only.",
    "- Both conditions use the same model, local metadata index, validation, routing, retrieval, and ranking configuration.",
    "- There are 20 queries and two conditions, producing exactly 40 interpretation calls with no separate model probe.",
    "",
    "## Summary",
    "",
    "| Metric | Result |",
    "| --- | ---: |",
    `| Completed pairs | ${completedPairs(run)}/${run.queries.length} |`,
    `| Same validated intent | ${countSame(run, intentSignature)}/${completedPairs(run)} |`,
    `| Same top-five order | ${countSame(run, orderSignature)}/${completedPairs(run)} |`,
    `| Same warnings | ${countSame(run, warningSignature)}/${completedPairs(run)} |`,
    `| Errors | ${run.results.filter(result => result.error).length} |`,
    "",
    "## Pair comparison",
    "",
    "| ID | Same intent | Same top five | Same warnings | Raw + cleaned top result | Raw-only top result |",
    "| --- | --- | --- | --- | --- | --- |"
  ];

  for (const query of run.queries) {
    const a = find(run, query.id, "raw_plus_cleaned");
    const b = find(run, query.id, "raw_only");
    lines.push(`| ${query.id} | ${compare(a, b, intentSignature)} | ${compare(a, b, orderSignature)} | ${compare(a, b, warningSignature)} | ${md(topLabel(a))} | ${md(topLabel(b))} |`);
  }

  lines.push("", "## Complete results", "");
  for (const query of run.queries) {
    lines.push(`### ${query.id}`, "", "Raw input:", "", "```text", visibleRaw(query.raw), "```", "", `Mechanically cleaned: \`${inline(cleanQueryMechanically(query.raw))}\``, "");
    for (const condition of run.conditions) renderCondition(lines, condition, find(run, query.id, condition.id));
  }
  lines.push("## GPT analysis instructions", "", "Assess whether supplying the mechanically cleaned copy materially improved validated intent, routing, warnings, or top-five candidate quality. Treat score/order differences as downstream consequences of intent differences because semantic reranking was disabled. Identify failures, regressions, and cases where both conditions were equally wrong. Do not attribute deterministic ranking points to the AI model.", "");
  return `${lines.join("\n")}\n`;
}

function renderCondition(lines, condition, result) {
  lines.push(`#### ${condition.label}`, "");
  if (!result) return lines.push("Pending.", "");
  if (result.error) return lines.push(`Error: \`${inline(result.error.message)}\``, "");
  const intent = result.intent;
  lines.push("| Intent field | Value |", "| --- | --- |",
    `| Interpreter | ${md(intent.interpreter || "none")} |`,
    `| Corrected query | \`${inline(intent.correctedQuery)}\` |`,
    `| Geography | ${md(intent.geographies.map(item => `${item.name || item.code} (${item.code})`).join(" -> ") || "none")} |`,
    `| Product / breadth | ${md(`${intent.product || "none"} / ${intent.productBreadth || "unknown"}`)} |`,
    `| Activity / sector | ${md(`${intent.activity || "none"} / ${intent.sector || "none"}`)} |`,
    `| Concept pairs | ${md(intent.conceptPairs.map(pair => `${pair.product || "?"}:${pair.activity || "?"}`).join(", ") || "none")} |`,
    `| Frequency | ${md(`${intent.frequency || "none"}; explicit=${intent.frequencyExplicit}`)} |`,
    `| Route | ${md(intent.route?.family || "none")} |`,
    `| Exclusions | ${md(JSON.stringify(intent.exclusions))} |`,
    `| Unknown qualifiers | ${md(JSON.stringify(intent.unknownQualifiers))} |`,
    `| Fallback / clarification | ${md(`${intent.fallback?.used ? "fallback" : "none"} / ${intent.needsClarification ? intent.clarificationMessage || "required" : "none"}`)} |`,
    `| Timing | ${result.diagnostics.intentMs} ms AI; ${result.diagnostics.pipelineMs} ms local |`, "");

  for (const retrieval of result.retrievals) {
    lines.push(`Retrieval: \`${inline(retrieval.key || "none")}\`; warnings: ${md(retrieval.warnings.join("; ") || "none")}.`, "");
    lines.push("| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |", "| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |");
    for (const candidate of retrieval.candidates) lines.push(`| ${candidate.rank} | \`${inline(candidate.seriesId || candidate.candidateId)}\` | ${md(candidate.title || "untitled")} | ${md(`${candidate.route}/${candidate.pool}/${candidate.tier}`)} | ${candidate.score ?? "n/a"} | ${md(candidate.frequency || "none")} | ${md(candidate.unit || "none")} | ${md(candidate.reasons.join(", ") || "none")} | ${md(candidate.warnings.join(", ") || "none")} |`);
    if (!retrieval.candidates.length) lines.push("| n/a | none | No displayable candidate | n/a | n/a | n/a | n/a | n/a | n/a |");
    lines.push("");
  }
}

function find(run, queryId, condition) { return run.results.find(result => result.queryId === queryId && result.condition === condition); }
function completePair(run, queryId) { const a = find(run, queryId, "raw_plus_cleaned"); const b = find(run, queryId, "raw_only"); return a && b && !a.error && !b.error ? [a, b] : null; }
function completedPairs(run) { return run.queries.filter(query => completePair(run, query.id)).length; }
function countSame(run, signature) { return run.queries.filter(query => { const pair = completePair(run, query.id); return pair && signature(pair[0]) === signature(pair[1]); }).length; }
function compare(a, b, signature) { return !a || !b ? "pending" : a.error || b.error ? "error" : signature(a) === signature(b) ? "yes" : "no"; }
function intentSignature(result) { const i = result.intent; return JSON.stringify([i.geographies.map(g => g.code), i.product, i.productBreadth, i.productAlternatives, i.activity, i.conceptPairs.map(p => [p.product, p.activity, p.sector]), i.sector, i.exclusions.map(e => [e.type, e.value]), i.unknownQualifiers.map(q => q.value), i.frequency, i.requestedFrequency, i.frequencyExplicit, i.route?.family, i.needsClarification]); }
function orderSignature(result) { return JSON.stringify(result.retrievals.map(r => r.candidates.map(c => c.seriesId || c.candidateId))); }
function warningSignature(result) { return JSON.stringify(result.retrievals.map(r => r.warnings)); }
function topLabel(result) { const c = result?.retrievals?.flatMap(r => r.candidates || [])[0]; return result?.error ? `ERROR: ${result.error.message}` : c ? `${c.seriesId || c.candidateId}: ${c.title}` : "none"; }
function visibleRaw(value) { return String(value).replaceAll("\t", "[TAB]").replaceAll("\u00a0", "[NBSP]").replaceAll("\r", "[CR]").replaceAll("\n", "[NEWLINE]\n"); }
function inline(value) { return String(value ?? "").replaceAll("|", "\\|").replaceAll("`", "'").replace(/\s+/g, " ").trim(); }
function md(value) { return inline(value); }

await main();
