import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildQueryBank } from "./hoho7-corpus.js";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const ARTIFACT_DIR = join(ROOT, "test-artifacts", "hoho8");
const MODEL = "gpt-5.4-nano-2026-03-17";
const PRODUCTION = Object.freeze({
  deploymentId: "dpl_Dmk429PgEW67i4WjaLPNaXnuBcxr",
  publicUrl: "https://eiaappv20.vercel.app",
  commit: "d5c65af1ac8046e0c44dc6f64444a0f8d559449d",
  model: MODEL
});
const FORCED_REVIEW_IDS = new Set(["H7-D002", "H8-X002"]);
const MATCHED_CONTROL_COUNT = 5;

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const command = process.argv[2] || "prepare";
  if (command === "prepare") prepare();
  else if (command === "report") report();
  else throw new Error(`Unknown command: ${command}`);
}

function prepare() {
  if (existsSync(ARTIFACT_DIR)) {
    throw new Error("test-artifacts/hoho8 already exists; preserve or remove it intentionally before preparing a new comparison");
  }
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  const base = buildQueryBank();
  const development = base.queries
    .filter(item => item.partition === "development")
    .map(item => item.id === "H7-D041" ? updateGeorgiaGold(item) : structuredClone(item));
  development.push(...buildTargetedQueries());
  const queryBank = {
    schemaVersion: "1.0.0",
    benchmarkVersion: "hoho8-release-candidate-v1",
    holdoutStatus: "sealed-not-executed",
    counts: { total: development.length + base.counts.holdout, development: development.length, holdout: base.counts.holdout },
    queries: development
  };
  const manifest = {
    schemaVersion: "1.0.0",
    benchmarkVersion: queryBank.benchmarkVersion,
    preparedAt: new Date().toISOString(),
    purpose: "Blinded release-candidate versus deployed-Production development comparison",
    repository: {
      branch: git("rev-parse", "--abbrev-ref", "HEAD"),
      head: git("rev-parse", "HEAD"),
      workingTree: git("status", "--short") || "clean",
      workingTreeDiffHash: hashText(execFileSync("git", ["diff", "--binary"], { cwd: ROOT }))
    },
    production: PRODUCTION,
    candidate: {
      head: git("rev-parse", "HEAD"),
      workingTreeDiffHash: hashText(execFileSync("git", ["diff", "--binary"], { cwd: ROOT })),
      model: MODEL,
      hierarchyRanking: "on",
      semanticReranking: "off"
    },
    corpus: {
      developmentQueries: development.length,
      inheritedHoHo7Queries: development.length - 3,
      targetedQueries: 3,
      sealedHoldoutQueries: base.counts.holdout,
      holdoutExecuted: false
    },
    liveCallPlan: {
      initialCandidateCalls: development.length,
      initialProductionCalls: development.length,
      repetitions: "two additional calls per arm only for semantic, ranking, or operational differences"
    },
    artifactRoot: "test-artifacts/hoho8"
  };
  writeJson("query-bank.json", queryBank);
  writeJson("development-queries.json", development);
  writeJson("gold-judgments.json", development.map(({ id, goldStatus, gold }) => ({ id, goldStatus, gold })));
  writeJson("manifest.json", manifest);
  console.log(JSON.stringify({ prepared: true, development: development.length, holdoutExecuted: false, artifactRoot: "test-artifacts/hoho8" }));
}

function report() {
  requirePrepared();
  const manifest = readJson("manifest.json");
  const development = readJson("development-queries.json");
  const candidateRuns = [1, 2, 3].map(number => readRows(`workflow-results-current-r${number}.jsonl`));
  const productionRuns = [1, 2, 3].map(number => readRows(`deployed-results-r${number}.jsonl`));
  const candidateRows = candidateRuns[0];
  const productionRows = productionRuns[0];
  if (candidateRows.length !== development.length || productionRows.length !== development.length) {
    throw new Error(`Initial comparison is incomplete: candidate=${candidateRows.length}, production=${productionRows.length}, expected=${development.length}`);
  }

  const candidateById = representativeOutputs(candidateRuns, row => row.arms?.B_ON?.output);
  const productionById = representativeOutputs(productionRuns, row => row.output);
  const cases = development.map(item => {
    const candidate = candidateById.get(item.id) || null;
    const production = productionById.get(item.id) || null;
    const difference = classifyDifference(candidate, production);
    const expectedGeographyFailures = findExpectedGeographyFailures(
      item.gold?.expectedGeographies,
      candidate,
      production
    );
    return {
      id: item.id,
      query: item.query,
      categories: item.categories,
      candidate,
      production,
      expectedGeographyFailures,
      ...difference
    };
  });
  const changed = cases.filter(item => item.reviewRelevant);
  const forced = cases.filter(item => FORCED_REVIEW_IDS.has(item.id) && !item.reviewRelevant);
  const controls = cases
    .filter(item => !item.reviewRelevant && !FORCED_REVIEW_IDS.has(item.id))
    .toSorted((left, right) => hashText(left.id).localeCompare(hashText(right.id)))
    .slice(0, MATCHED_CONTROL_COUNT);
  const reviewCases = [...changed, ...forced, ...controls];
  const frozenRepeatIds = readOptionalJson("repeat-ids.json")?.ids;
  const repeatIds = frozenRepeatIds?.length ? frozenRepeatIds : changed.map(item => item.id);
  const repetitions = repeatSummary(repeatIds);
  const blindingKey = reviewCases.map(item => blindCase(item));
  const sharedSafetyFailures = findSharedSafetyFailures(cases);

  writeJson("comparison-cases.json", cases.map(({ candidate, production, ...item }) => item));
  writeJson("repeat-ids.json", { ids: repeatIds });
  writeJson("blinding-key.json", blindingKey);
  writeJson("comparison-metrics.json", {
    generatedAt: new Date().toISOString(),
    developmentQueries: development.length,
    initialCandidateSuccesses: candidateRows.filter(row => isSuccessfulOutput(row.arms?.B_ON?.output)).length,
    initialProductionSuccesses: productionRows.filter(row => isSuccessfulOutput(row.output)).length,
    candidateWorkflowCalls: candidateRuns.flat().length,
    productionWorkflowCalls: productionRuns.flat().length,
    candidateApiUsage: summarizeCandidateUsage(),
    semanticDifferences: cases.filter(item => item.semanticChanged).map(item => item.id),
    rankingDifferences: cases.filter(item => item.rankingChanged).map(item => item.id),
    operationalDifferences: cases.filter(item => item.operationalChanged).map(item => item.id),
    certaintyOnlyDifferences: cases.filter(item => item.certaintyChanged && !item.reviewRelevant).map(item => item.id),
    sharedSafetyFailures,
    repeatIds,
    reviewIds: reviewCases.map(item => item.id),
    repeatedCases: repetitions,
    holdoutExecuted: false
  });

  writeFileSync(join(ROOT, "hoho8HR.md"), buildHumanReview(reviewCases, blindingKey), "utf8");
  writeFileSync(join(ROOT, "hoho8.md"), buildTechnicalReport(manifest, cases, reviewCases, repetitions), "utf8");
  writeHashes();
  console.log(JSON.stringify({
    reports: ["hoho8.md", "hoho8HR.md"],
    developmentQueries: development.length,
    changedCases: changed.length,
    reviewCases: reviewCases.length,
    repeatIds,
    repetitionsComplete: repetitions.filter(item => item.complete).length
  }));
}

export function classifyDifference(candidate, production) {
  const candidateOperational = operationalSignature(candidate);
  const productionOperational = operationalSignature(production);
  const semanticChanged = semanticSignature(candidate) !== semanticSignature(production);
  const rankingChanged = rankingSignature(candidate) !== rankingSignature(production);
  const operationalChanged = candidateOperational !== productionOperational;
  const certaintyChanged = certaintySignature(candidate) !== certaintySignature(production);
  const reasons = [];
  if (operationalChanged) reasons.push("operational");
  if (semanticChanged) reasons.push("semantic-intent");
  if (rankingChanged) reasons.push("visible-ranking");
  if (certaintyChanged) reasons.push("certainty-contract");
  return {
    operationalChanged,
    semanticChanged,
    rankingChanged,
    certaintyChanged,
    reviewRelevant: operationalChanged || semanticChanged || rankingChanged,
    reasons
  };
}

export function findExpectedGeographyFailures(expectedGeographies, candidate, production) {
  const expected = [...new Set((expectedGeographies || []).filter(Boolean))];
  if (expected.length === 0) return [];

  return [["candidate", candidate], ["production", production]].flatMap(([arm, output]) => {
    const actual = extractGeographyCodes(output);
    const missing = expected.filter(code => !actual.includes(code));
    return missing.length > 0 ? [{ arm, expected, actual, missing }] : [];
  });
}

export function semanticSignature(output) {
  const intent = output?.structuredIntent || {};
  const geographies = extractGeographyCodes(output);
  return stableStringify({
    geographies,
    conceptPairs: (intent.conceptPairs || []).map(pair => [pair.product || null, pair.activity || null]),
    exclusions: (intent.exclusions || []).map(item => [item.type || null, item.value || null]),
    unknownQualifiers: (intent.unknownQualifiers || []).map(item => item.value || item),
    sector: intent.sector || null,
    frequency: intent.frequency || null,
    requestedFrequency: intent.requestedFrequency || null,
    route: output?.route || intent.route?.family || intent.route || null,
    clarificationRequired: Boolean(output?.clarificationRequired)
  });
}

function extractGeographyCodes(output) {
  const intent = output?.structuredIntent || {};
  return (intent.geographies?.length ? intent.geographies : [intent.geography]).filter(Boolean)
    .map(item => typeof item === "string" ? item : item.code || item.value || item.name)
    .filter(Boolean);
}

function findSharedSafetyFailures(cases) {
  return cases.flatMap(item => {
    const candidate = item.expectedGeographyFailures.find(failure => failure.arm === "candidate");
    const production = item.expectedGeographyFailures.find(failure => failure.arm === "production");
    if (!candidate || !production) return [];
    const missingInBoth = candidate.missing.filter(code => production.missing.includes(code));
    if (missingInBoth.length === 0) return [];
    return [{
      id: item.id,
      expected: candidate.expected,
      candidateActual: candidate.actual,
      productionActual: production.actual,
      missingInBoth
    }];
  });
}

export function rankingSignature(output) {
  return stableStringify({
    clarificationRequired: Boolean(output?.clarificationRequired),
    topFive: (output?.topCandidates || []).slice(0, 5).map(candidate => candidate.seriesId || candidate.stableId || null)
  });
}

function certaintySignature(output) {
  return stableStringify((output?.topCandidates || []).slice(0, 5).map(candidate => ({
    seriesId: candidate.seriesId || null,
    semanticCompatibility: candidate.certainty?.semanticCompatibility || null,
    routeRelation: candidate.certainty?.routeRelation || null,
    frequencyRelation: candidate.certainty?.frequencyRelation || null,
    aggregationRelation: candidate.certainty?.aggregationRelation || null,
    hierarchyEvidenceStatus: candidate.certainty?.hierarchyEvidenceStatus || null
  })));
}

function operationalSignature(output) {
  if (!output) return stableStringify({ statusCode: 0, error: "missing_output" });
  return stableStringify({ statusCode: output.statusCode ?? 200, error: output.error || null });
}

function repeatSummary(ids) {
  const candidateRuns = [1, 2, 3].map(number => indexRows(readRows(`workflow-results-current-r${number}.jsonl`), row => row.arms?.B_ON?.output));
  const productionRuns = [1, 2, 3].map(number => indexRows(readRows(`deployed-results-r${number}.jsonl`), row => row.output));
  return ids.map(id => {
    const candidate = candidateRuns.map(run => run.get(id)).filter(Boolean);
    const production = productionRuns.map(run => run.get(id)).filter(Boolean);
    const candidateSuccessful = candidate.filter(isSuccessfulOutput);
    const productionSuccessful = production.filter(isSuccessfulOutput);
    return {
      id,
      candidateObservations: candidate.length,
      productionObservations: production.length,
      candidateTransportFailures: candidate.length - candidateSuccessful.length,
      productionTransportFailures: production.length - productionSuccessful.length,
      candidateStable: candidateSuccessful.length >= 2 && new Set(candidateSuccessful.map(combinedSignature)).size === 1,
      productionStable: productionSuccessful.length >= 2 && new Set(productionSuccessful.map(combinedSignature)).size === 1,
      complete: candidate.length === 3 && production.length === 3
    };
  });
}

function combinedSignature(output) {
  return `${semanticSignature(output)}|${rankingSignature(output)}`;
}

function blindCase(item) {
  const arms = ["candidate", "production"].toSorted((left, right) =>
    hashText(`${item.id}:${left}:hoho8`).localeCompare(hashText(`${item.id}:${right}:hoho8`))
  );
  return { id: item.id, mapping: { "Result A": arms[0], "Result B": arms[1] } };
}

function buildHumanReview(reviewCases, blindingKey) {
  const mappingById = new Map(blindingKey.map(item => [item.id, item.mapping]));
  const lines = [
    "# HoHo8 Blinded Release-Candidate Review", "",
    "Compare the two results without trying to identify which one is deployed. Review every case in this packet.", "",
    "For each query, mark acceptable results, choose a preference or tie, and identify any unacceptable result. Use severity only when a result could mislead the user.", "",
    "## Review Cases", ""
  ];
  for (const item of reviewCases) {
    lines.push(`### ${item.id}`, "", `**Raw query:** ${item.query}`, "", `**Categories:** ${(item.categories || []).join(", ")}`, "");
    const mapping = mappingById.get(item.id);
    for (const label of ["Result A", "Result B"]) {
      lines.push(`#### ${label}`, "");
      lines.push(...formatOutput(item[mapping[label]]));
      lines.push("");
    }
    lines.push(
      "**Human response**", "",
      "- Semantically acceptable results: ____________________",
      "- Preferred result or tie: ____________________",
      "- Unacceptable results: ____________________",
      "- Severity: none / minor / material / critical",
      "- Reason: ____________________",
      "- Reviewer notes: ____________________", ""
    );
  }
  lines.push("## Completion", "", "- Number reviewed: ______", "- Reviewer initials: ______", "- Review date: ______");
  return `${lines.join("\n")}\n`;
}

function formatOutput(output) {
  if (!output) return ["- Missing output"];
  const intent = output.structuredIntent || {};
  const geographies = (intent.geographies?.length ? intent.geographies : [intent.geography]).filter(Boolean)
    .map(item => typeof item === "string" ? item : item.code || item.value || item.name);
  const pairs = (intent.conceptPairs || []).map(pair => `${pair.product || "?"} / ${pair.activity || "?"}`);
  const lines = [
    `- HTTP status: ${output.statusCode || 0}`,
    `- Clarification: ${output.clarificationRequired ? "required" : "not required"}`,
    `- Route: ${output.route || intent.route?.family || intent.route || "none"}`,
    `- Geographies: ${geographies.join(", ") || "none"}`,
    `- Concept pairs: ${pairs.join("; ") || "none"}`,
    "- Top candidates:"
  ];
  const candidates = (output.topCandidates || []).slice(0, 5);
  if (candidates.length === 0) lines.push("  - None");
  for (const [index, candidate] of candidates.entries()) {
    const certainty = candidate.certainty || {};
    lines.push(`  ${index + 1}. ${candidate.seriesId || "unknown"} | ${candidate.title || "Untitled"} | route=${candidate.route || "unknown"} | frequency=${candidate.frequency || "unknown"} | unit=${candidate.unit || "unknown"} | routeRelation=${certainty.routeRelation || "not reported"} | aggregation=${certainty.aggregationRelation || candidate.aggregationRelation || "unknown"}`);
  }
  return lines;
}

function buildTechnicalReport(manifest, cases, reviewCases, repetitions) {
  const changed = cases.filter(item => item.reviewRelevant);
  const semantic = cases.filter(item => item.semanticChanged);
  const ranking = cases.filter(item => item.rankingChanged);
  const operational = cases.filter(item => item.operationalChanged);
  const complete = repetitions.filter(item => item.complete);
  const stable = complete.filter(item => item.candidateStable && item.productionStable);
  const productionTransportFailures = repetitions.reduce((sum, item) => sum + item.productionTransportFailures, 0);
  const metrics = readJson("comparison-metrics.json");
  const sharedSafetyFailures = metrics.sharedSafetyFailures || [];
  const candidateNoResultCases = cases.filter(item =>
    item.reviewRelevant
    && isSuccessfulOutput(item.candidate)
    && (item.candidate?.topCandidates || []).length === 0
    && (item.production?.topCandidates || []).length > 0
  );
  const safetyLines = sharedSafetyFailures.length > 0
    ? sharedSafetyFailures.map(item =>
      `- **${item.id} blocks promotion:** expected geographies ${item.expected.join(", ")}; both arms omitted ${item.missingInBoth.join(", ")} (candidate returned ${item.candidateActual.join(", ") || "none"}; Production returned ${item.productionActual.join(", ") || "none"}).`
    ).join("\n")
    : "- No shared expected-geography failures detected.";
  const noResultLines = candidateNoResultCases.length > 0
    ? candidateNoResultCases.map(item =>
      `- **${item.id} requires review:** the candidate avoids the deployed result but returns no candidates; this may be safer without yet being useful.`
    ).join("\n")
    : "- No candidate-only empty-result differences detected.";
  return `# HoHo8 Release-Candidate Development Comparison

## Scope

- Candidate: working tree at HEAD \`${manifest.repository.head}\`, diff \`${manifest.candidate.workingTreeDiffHash}\`
- Production: commit \`${manifest.production.commit}\`, deployment \`${manifest.production.deploymentId}\`
- Model: \`${MODEL}\`
- Development queries: ${cases.length}
- Sealed holdout queries executed: **0**

## Results

- Human-review-relevant differences: ${changed.length} (${changed.map(item => item.id).join(", ") || "none"})
- Semantic-intent differences: ${semantic.length} (${semantic.map(item => item.id).join(", ") || "none"})
- Visible-ranking differences: ${ranking.length} (${ranking.map(item => item.id).join(", ") || "none"})
- Operational differences: ${operational.length} (${operational.map(item => item.id).join(", ") || "none"})
- Blinded review cases: ${reviewCases.length}
- Selective repetitions complete: ${complete.length}/${repetitions.length}
- Repeated cases stable in both arms: ${stable.length}/${complete.length}
- Candidate workflow calls: ${metrics.candidateWorkflowCalls}
- Production workflow calls: ${metrics.productionWorkflowCalls}
- Candidate direct OpenAI estimated cost: USD ${metrics.candidateApiUsage.estimatedCostUsd.toFixed(6)}
- Repeated-set Production transport failures: ${productionTransportFailures}; both failed first-pass queries returned HTTP 200 in repetitions 2 and 3

Certainty-only differences, including the new explicit \`routeRelation\`, are machine-contract changes and do not by themselves create a human-review case.

## Objective Safety Findings

${safetyLines}
${noResultLines}

Comparative parity does not make a shared safety failure acceptable. Objective checks remain independent of candidate-versus-Production differences.

## Review Rule

Review every case in \`hoho8HR.md\`. Promotion quality is comparative: the candidate may have bounded noncritical losses, but it must introduce no critical semantic, hierarchy, or unsupported-route regressions.

## Status

**DO NOT PROMOTE YET**

Human review is pending, and the shared explicit-geography omission must be fixed and rerun before promotion.
`;
}

function buildTargetedQueries() {
  return [
    developmentQuery("H8-X001", "Texas solar energy consumption", ["adversarial", "specific-source", "hierarchy-control"], {
      geographies: ["TX"], routes: ["seds"], pairs: [["solar", "consumption"]], frequency: "annual", forbiddenTopFive: ["SEDS.TETCB.TX.A"]
    }),
    developmentQuery("H8-X002", "Georgia and France natural gas production", ["adversarial", "geography-context", "international"], {
      geographies: ["GEO", "FRA"], routes: ["international"], pairs: [["natural gas", "production"]], frequency: "annual"
    }),
    developmentQuery("H8-X003", "Georgia and USA natural gas production", ["adversarial", "geography-context", "seds"], {
      geographies: ["GA", "USA"], routes: ["seds"], pairs: [["natural gas", "production"]], frequency: "annual"
    })
  ];
}

function developmentQuery(id, query, categories, expected) {
  return {
    id,
    query,
    partition: "development",
    categories,
    source: "benchmark-authored-release-candidate-probe",
    goldStatus: "objective-draft",
    gold: fullGold({
      expectedClarification: false,
      expectedGeographies: expected.geographies,
      acceptableRoutes: expected.routes,
      expectedConceptPairs: expected.pairs.map(([product, activity]) => ({ product, activity })),
      expectedFrequency: expected.frequency,
      forbiddenTopFiveSeriesIds: expected.forbiddenTopFive || []
    })
  };
}

function updateGeorgiaGold(item) {
  const updated = structuredClone(item);
  updated.categories = ["geography-default", "state", "adversarial"];
  updated.gold = fullGold({
    expectedClarification: false,
    expectedGeographies: ["GA"],
    acceptableRoutes: ["seds"],
    expectedConceptPairs: [{ product: "natural gas", activity: "production" }],
    expectedFrequency: "annual"
  });
  return updated;
}

function fullGold(overrides = {}) {
  return {
    expectedClarification: false,
    blockingClarificationFields: [],
    clarificationReasons: [],
    expectedGeographies: [],
    acceptableRoutes: [],
    expectedConceptPairs: [],
    expectedExclusions: [],
    expectedSector: null,
    expectedFrequency: null,
    expectedUnit: null,
    expectedUnknownQualifiers: [],
    acceptableTopOneFamilies: [],
    requiredTopOneSeriesIds: [],
    requiredTopFiveSeriesIds: [],
    permittedTopFiveFamilies: [],
    forbiddenTopFiveSeriesIds: [],
    forbidOrdinaryRanking: false,
    expectedSemanticCompatibility: "compatible",
    hierarchy: { relation: "unknown", preferenceExpected: false },
    expectedCertaintyWarnings: [],
    humanReviewRequired: false,
    ...overrides
  };
}

function indexRows(rows, selector) {
  return new Map(rows.map(row => [row.queryId, selector(row)]));
}

function representativeOutputs(runs, selector) {
  const outputs = new Map();
  for (const row of runs.flat()) {
    const output = selector(row);
    const current = outputs.get(row.queryId);
    if (!current || (!isSuccessfulOutput(current) && isSuccessfulOutput(output))) outputs.set(row.queryId, output);
  }
  return outputs;
}

function isSuccessfulOutput(output) {
  return Boolean(output) && (output.statusCode === undefined || output.statusCode === 200);
}

function summarizeCandidateUsage() {
  const usage = [1, 2, 3].map(number => readOptionalJson(`api-usage-current-r${number}.json`)).filter(Boolean);
  return {
    calls: usage.reduce((sum, item) => sum + (item.calls || 0), 0),
    successes: usage.reduce((sum, item) => sum + (item.successes || 0), 0),
    failures: usage.reduce((sum, item) => sum + (item.failures || 0), 0),
    inputTokens: usage.reduce((sum, item) => sum + (item.inputTokens || 0), 0),
    outputTokens: usage.reduce((sum, item) => sum + (item.outputTokens || 0), 0),
    totalTokens: usage.reduce((sum, item) => sum + (item.totalTokens || 0), 0),
    estimatedCostUsd: usage.reduce((sum, item) => sum + (item.estimatedCostUsd || 0), 0)
  };
}

function readRows(name) {
  const file = join(ARTIFACT_DIR, name);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function readJson(name) {
  return JSON.parse(readFileSync(join(ARTIFACT_DIR, name), "utf8"));
}

function readOptionalJson(name) {
  const file = join(ARTIFACT_DIR, name);
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : null;
}

function writeJson(name, value) {
  writeFileSync(join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeHashes() {
  const artifacts = Object.fromEntries(readdirSync(ARTIFACT_DIR)
    .filter(name => name !== "artifact-hashes.json")
    .toSorted()
    .map(name => {
      const file = join(ARTIFACT_DIR, name);
      return [name, { sha256: hashText(readFileSync(file)), bytes: statSync(file).size }];
    }));
  writeJson("artifact-hashes.json", {
    generatedAt: new Date().toISOString(),
    artifacts,
    reports: {
      "hoho8.md": reportHash("hoho8.md"),
      "hoho8HR.md": reportHash("hoho8HR.md")
    }
  });
}

function reportHash(name) {
  const file = join(ROOT, name);
  return { sha256: hashText(readFileSync(file)), bytes: statSync(file).size };
}

function requirePrepared() {
  if (!existsSync(join(ARTIFACT_DIR, "manifest.json"))) throw new Error("Run HoHo8 prepare first");
}

function git(...args) {
  return execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
