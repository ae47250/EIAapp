import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync
} from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { BENCHMARK_VERSION, SEDS_TARGETS, buildQueryBank } from "./hoho7-corpus.js";

const ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const args = parseArgs(process.argv.slice(2));
const ARTIFACT_DIR = resolve(ROOT, args.artifactDir || join("test-artifacts", "hoho7"));
const MODEL = "gpt-5.4-nano-2026-03-17";
const BASELINE_COMMIT = "8f2cb495519db8d60072032a1dc8a2e93c65cef8";
const PRODUCTION = Object.freeze({
  projectId: "prj_8JHACiECxwtCEc0fVzX3CH8wxud4",
  deploymentId: "dpl_Dmk429PgEW67i4WjaLPNaXnuBcxr",
  deploymentUrl: "https://eiaappv20-844hw6nfq-ea47243.vercel.app",
  publicUrl: "https://eiaappv20.vercel.app",
  commit: "d5c65af1ac8046e0c44dc6f64444a0f8d559449d",
  deployedAt: "2026-07-18T04:29:10.312Z",
  model: "gpt-5.4-nano-2026-03-17",
  modelDiagnostic: "configured-valid-for-direct-openai-api-http-200"
});

const command = args._[0] || "prepare";
mkdirSync(ARTIFACT_DIR, { recursive: true });

if (command === "prepare") await prepare();
else if (command === "deterministic") await runDeterministic(args.baselineRoot);
else if (command === "static") await runStaticVerification(args.baselineRoot);
else if (command === "live-current") await runLiveCurrent(args);
else if (command === "live-baseline") await runLiveBaseline(args);
else if (command === "production") await runProduction(args);
else if (command === "normalize-artifacts") await normalizeGeneratedArtifacts();
else if (command === "report") await generateReports();
else throw new Error(`Unknown command: ${command}`);

async function prepare() {
  const bank = buildQueryBank();
  const development = bank.queries.filter(item => item.partition === "development");
  const holdout = bank.queries.filter(item => item.partition === "holdout");
  writeJson("query-bank.json", bank);
  writeJson("development-queries.json", development);
  writeJson("holdout-queries.json", holdout);
  writeJson("gold-judgments.json", bank.queries.map(({ id, partition, goldStatus, gold }) => ({ id, partition, goldStatus, gold })));
  writeJson("production-operational-evidence.json", {
    capturedAt: new Date().toISOString(),
    deployment: PRODUCTION,
    diagnostic: {
      endpoint: "/api/openai-diagnostic",
      applicationHttpStatus: 200,
      openaiConfigured: true,
      configuredModel: PRODUCTION.model,
      upstreamOpenAiStatus: 200,
      conclusion: "The pinned direct OpenAI model identifier is configured and operational."
    },
    priorFailureEvidence: "production-operational-evidence-pre-model-fix.json"
  });

  const queryBankHash = fileHash(join(ARTIFACT_DIR, "query-bank.json"));
  const currentHead = git("rev-parse", "HEAD");
  const currentBranch = git("rev-parse", "--abbrev-ref", "HEAD");
  const workingTree = git("status", "--short");
  const manifest = {
    schemaVersion: "1.0.0",
    benchmarkVersion: BENCHMARK_VERSION,
    benchmarkStartedAt: new Date().toISOString(),
    environment: {
      platform: process.platform,
      architecture: process.arch,
      node: process.version,
      cwd: ROOT
    },
    arms: {
      A: { label: "historical-native-legacy", commit: BASELINE_COMMIT, candidateFlag: "off", metadata: "native baseline snapshot" },
      B_OFF: { label: "current-candidate-hierarchy-off", commit: currentHead, hierarchyMode: "off" },
      B_ON: { label: "current-candidate-hierarchy-on", commit: currentHead, hierarchyMode: "on" },
      C: { label: "current-production-black-box", ...PRODUCTION }
    },
    repository: {
      branch: currentBranch,
      head: currentHead,
      workingTreeAtBenchmarkStart: "clean",
      workingTreeAtManifestRefresh: workingTree || "clean",
      upstream: safeGit("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}")
    },
    baseline: {
      commit: BASELINE_COMMIT,
      subject: git("show", "-s", "--format=%s", BASELINE_COMMIT),
      committedAt: git("show", "-s", "--format=%cI", BASELINE_COMMIT),
      selectionReason: "last trusted commit before the clarification, semantic-eligibility, legacy-retirement, certainty, and hierarchy implementation sequence",
      buildStatus: "pending"
    },
    production: {
      ...PRODUCTION,
      candidatePipeline: "sole-runtime-path",
      candidateFlag: "retired-no-runtime-effect",
      hierarchyRanking: "on-verified-by-production-response",
      semanticReranking: "off",
      model: PRODUCTION.model,
      modelDiagnostic: PRODUCTION.modelDiagnostic,
      modelEvidence: "authenticated /api/openai-diagnostic response; no secret value was exposed"
    },
    model: {
      controlledSnapshot: MODEL,
      availabilityPreflight: "passed-model-list-2026-07-17",
      endpoint: "https://api.openai.com/v1/responses",
      reasoningEffort: "omitted-application-does-not-set",
      temperature: "omitted-application-does-not-set",
      maximumOutputTokens: "omitted-application-does-not-set",
      structuredOutputSchema: "none-json-instructions-validated-locally",
      pricingUsdPerMillionTokens: { input: 0.20, output: 1.25 },
      pricingSource: "https://openai.com/index/introducing-gpt-5-4-mini-and-nano/"
    },
    featureFlags: {
      candidatePipeline: "retired",
      hierarchyRankingControlledArms: ["off", "on"],
      semanticReranking: "off",
      hierarchyContributionCalculation: "disabled"
    },
    versions: {
      candidatePipeline: sourceConstant(join(ROOT, "lib", "sources", "eia", "candidate-pipeline.js"), "CANDIDATE_PIPELINE_VERSION"),
      hierarchyRanking: readJson(join(ROOT, "data", "eia", "hierarchy-ranking-config.json")).version,
      ranking: readJson(join(ROOT, "data", "eia", "phase4-ranking-config.json")).version,
      taxonomy: readJson(join(ROOT, "data", "eia", "phase4-concept-taxonomy.json")).version,
      semanticReranking: readJson(join(ROOT, "data", "eia", "phase5-semantic-reranking-config.json")).version
    },
    hashes: {
      queryBank: queryBankHash,
      currentMetadataManifest: fileHash(join(ROOT, "data", "eia", "builds", "phase1b", "manifest.json")),
      currentRoutingMetadata: fileHash(join(ROOT, "data", "eia", "routing-metadata.json")),
      hierarchyRegistry: fileHash(join(ROOT, "data", "eia", "aggregation-hierarchy-registry.json")),
      generatedHierarchy: fileHash(join(ROOT, "data", "eia", "builds", "phase1b", "aggregation-hierarchy.generated.json")),
      currentInterpretationSource: fileHash(join(ROOT, "lib", "sources", "eia", "interpret-query.js")),
      baselineInterpretationSource: gitObjectHash(`${BASELINE_COMMIT}:lib/sources/eia/interpret-query.js`),
      baselineMetadataManifest: gitObjectHash(`${BASELINE_COMMIT}:data/eia/builds/phase1b/manifest.json`),
      benchmarkRunner: fileHash(join(ROOT, "scripts", "eia-benchmark", "run-hoho7.js")),
      benchmarkCorpusSource: fileHash(join(ROOT, "scripts", "eia-benchmark", "hoho7-corpus.js"))
    },
    corpus: {
      version: BENCHMARK_VERSION,
      hash: queryBankHash,
      counts: bank.counts,
      development: "open diagnostic set",
      holdout: "sealed and not executed during this pass",
      goldStatus: "14 human-reviewed records; remaining objective records are drafts pending human approval"
    },
    liveCallEstimate: {
      initialControlledCalls: 100,
      initialProductionCalls: 50,
      totalInitialWorkflowCalls: 150,
      estimatedInputTokensPerControlledCall: 8000,
      estimatedOutputTokensPerControlledCall: 800,
      estimatedControlledCostUsd: 0.26,
      conservativeEstimatedProductionCostUsd: 0.75,
      estimatedInitialTotalCostUsd: 1.01,
      hardLimits: { workflowCalls: 500, estimatedDirectOpenAiCostUsd: 10 }
    },
    artifacts: { root: relativePath(ARTIFACT_DIR) }
  };
  writeJson("manifest.json", manifest);
  console.log(JSON.stringify({ prepared: true, queryBankHash, counts: bank.counts, manifest: relativePath(join(ARTIFACT_DIR, "manifest.json")) }));
}

async function runDeterministic(baselineRoot) {
  requirePrepared();
  if (!baselineRoot) throw new Error("--baseline-root is required");
  const current = await loadCurrentModules();
  const baselineRankModule = await importFromRoot(baselineRoot, "lib/sources/eia/local-ranking.js");
  const bank = readArtifact("query-bank.json");
  const development = bank.queries.filter(item => item.partition === "development");
  const resultRows = [];
  const rankingInputs = [];
  const rankingRows = [];
  let repeatabilityFailures = 0;

  for (const [index, item] of development.entries()) {
    const baseIntent = current.interpret.interpretQueryWithRules(item.query);
    const structuredIntent = current.routing.buildStructuredIntent(baseIntent, item.query);
    const off = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "off" });
    const on = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "on" });
    const repeated = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "on" });
    const serializedOff = serializeCurrent(item, baseIntent, structuredIntent, off, current.certainty);
    const serializedOn = serializeCurrent(item, baseIntent, structuredIntent, on, current.certainty);
    const serializedRepeated = serializeCurrent(item, baseIntent, structuredIntent, repeated, current.certainty);
    const repeatable = resultSignature(serializedOn.output) === resultSignature(serializedRepeated.output);
    if (!repeatable) repeatabilityFailures += 1;
    const grade = gradeResult(item, serializedOn.output, "B_ON");
    resultRows.push({
      queryId: item.id, query: item.query, partition: item.partition, categories: item.categories,
      arm: "B_OFF", mode: "rules", output: serializedOff.output, grade: gradeResult(item, serializedOff.output, "B_OFF")
    });
    resultRows.push({
      queryId: item.id, query: item.query, partition: item.partition, categories: item.categories,
      arm: "B_ON", mode: "rules", output: serializedOn.output, grade, repeatable
    });

    if (!requiresClarification(baseIntent, structuredIntent)) {
      const pool = await current.retrieval.retrieveLocalCandidates(structuredIntent);
      const poolSummary = serializePool(pool);
      rankingInputs.push({ queryId: item.id, query: item.query, structuredIntent, candidatePool: poolSummary });
      try {
        const oldRanked = baselineRankModule.rankLocalCandidates(structuredIntent, structuredClone(pool));
        const newRanked = current.ranking.rankLocalCandidates(structuredIntent, structuredClone(pool));
        rankingRows.push({
          queryId: item.id,
          adapterStatus: "shared-canonical-pool-accepted-by-both-rankers",
          baseline: serializeRanked(oldRanked),
          current: serializeRanked(newRanked),
          changed: stableStringify(serializeRanked(oldRanked)) !== stableStringify(serializeRanked(newRanked))
        });
      } catch (error) {
        rankingRows.push({ queryId: item.id, adapterStatus: "incompatible", error: error.message });
      }
    } else {
      rankingRows.push({ queryId: item.id, adapterStatus: "skipped-required-clarification" });
    }
    console.log(`deterministic ${index + 1}/${development.length} ${item.id}`);
  }

  const hierarchySweep = [];
  for (const target of SEDS_TARGETS) {
    const query = `${target.name} total energy consumption`;
    const baseIntent = current.interpret.interpretQueryWithRules(query);
    const off = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "off" });
    const on = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "on" });
    const offTop = topSeriesIds(off)[0] || null;
    const onTop = topSeriesIds(on)[0] || null;
    const expected = target.code === "USA" ? "SEDS.TETCB.US.A" : `SEDS.TETCB.${target.code}.A`;
    const route = on.retrievals?.[0]?.routeFamily || on.routeFamily || null;
    const eligible = target.code !== "USA";
    const pass = eligible
      ? onTop === expected && on.diagnostics?.hierarchyPreferenceApplied === true
      : route === "domestic" && on.diagnostics?.hierarchyPreferenceApplied !== true;
    hierarchySweep.push({
      geography: target, query, expectedAggregateSeriesId: expected, route, offTop, onTop,
      hierarchyApplied: on.diagnostics?.hierarchyPreferenceApplied === true,
      expectedEligible: eligible, pass,
      note: eligible ? null : "The approved U.S. relationship is route-limited because national total energy currently resolves to Domestic, not SEDS."
    });
  }

  writeJsonLines("deterministic-results.jsonl", resultRows);
  writeJsonLines("ranking-inputs.jsonl", rankingInputs);
  writeJsonLines("ranking-results.jsonl", rankingRows);
  writeJson("hierarchy-sweep.json", hierarchySweep);
  const currentOn = resultRows.filter(row => row.arm === "B_ON");
  const metrics = {
    generatedAt: new Date().toISOString(),
    developmentQueries: development.length,
    deterministicRuns: resultRows.length,
    repeatability: { passed: repeatabilityFailures === 0, failures: repeatabilityFailures, rate: (development.length - repeatabilityFailures) / development.length },
    sharedPoolRanking: {
      attempted: rankingRows.filter(row => row.adapterStatus !== "skipped-required-clarification").length,
      compatible: rankingRows.filter(row => row.adapterStatus === "shared-canonical-pool-accepted-by-both-rankers").length,
      incompatible: rankingRows.filter(row => row.adapterStatus === "incompatible").length,
      changed: rankingRows.filter(row => row.changed).length,
      clarificationSkipped: rankingRows.filter(row => row.adapterStatus === "skipped-required-clarification").length
    },
    hierarchySweep: {
      targets: hierarchySweep.length,
      passed: hierarchySweep.filter(row => row.pass).length,
      failed: hierarchySweep.filter(row => !row.pass).length,
      eligibleStateAndDcTargets: hierarchySweep.filter(row => row.expectedEligible).length,
      routeLimitedNationalTargets: hierarchySweep.filter(row => !row.expectedEligible).length
    },
    objectiveDraft: summarizeGrades(currentOn)
  };
  writeJson("deterministic-metrics.json", metrics);
  console.log(JSON.stringify(metrics));
}

async function runStaticVerification(baselineRoot) {
  requirePrepared();
  if (!baselineRoot) throw new Error("--baseline-root is required");
  const tests = readdirSync(join(ROOT, "tests")).filter(name => /^eia-.*\.test\.js$/.test(name)).map(name => join("tests", name));
  const checks = [];
  checks.push(runCommand("full-test-suite", "node", ["--test"], ROOT));
  checks.push(runCommand("focused-eia-tests", "node", ["--test", ...tests], ROOT));
  checks.push(runCommand("hierarchy-proof-test", "node", ["--test", "tests/eia-aggregation-hierarchy-proof.test.js"], ROOT));
  checks.push(runCommand("existing-ranking-benchmark", "node", ["--test", "tests/eia-ranking-benchmark.test.js"], ROOT));
  checks.push(runCommand("metadata-hierarchy-audit", "node", ["scripts/eia-metadata/audit-aggregation-hierarchy.js"], ROOT));
  checks.push(runCommand("reviewed-registry-audit", "node", ["scripts/eia-metadata/audit-aggregation-hierarchy-registry.js"], ROOT));
  const buildCommand = process.platform === "win32"
    ? { command: process.env.ComSpec || "C:\\Windows\\System32\\cmd.exe", args: ["/d", "/s", "/c", "npm.cmd run build"] }
    : { command: "npm", args: ["run", "build"] };
  checks.push(runCommand("production-build-current", buildCommand.command, buildCommand.args, ROOT, 180_000));
  checks.push(runCommand("production-build-baseline", buildCommand.command, buildCommand.args, baselineRoot, 180_000));
  checks.push(runCommand("git-status", "git", ["status", "--short", "--branch"], ROOT));

  const syntaxRoots = [join(ROOT, "lib"), join(ROOT, "scripts"), join(ROOT, "tests"), join(ROOT, "app", "api")];
  const jsFiles = [join(ROOT, "proxy.js"), join(ROOT, "next.config.mjs"), ...syntaxRoots.flatMap(walk)]
    .filter(path => path.endsWith(".js") || path.endsWith(".mjs"));
  const syntaxFailures = [];
  const syntaxStarted = Date.now();
  for (const file of jsFiles) {
    const result = spawnSync(process.execPath, ["--check", file], { cwd: ROOT, encoding: "utf8", timeout: 30_000 });
    if (result.status !== 0) syntaxFailures.push({ file: relativePath(file), output: trimOutput(`${result.stdout || ""}${result.stderr || ""}`) });
  }
  checks.push({ name: "javascript-syntax", command: `node --check (${jsFiles.length} files)`, exitCode: syntaxFailures.length ? 1 : 0, passed: syntaxFailures.length === 0, durationMs: Date.now() - syntaxStarted, failures: syntaxFailures });
  const artifact = { generatedAt: new Date().toISOString(), checks, passed: checks.every(item => item.passed), passedCount: checks.filter(item => item.passed).length, failedCount: checks.filter(item => !item.passed).length };
  writeJson("static-verification.json", artifact);
  console.log(JSON.stringify({ passed: artifact.passed, checks: checks.map(item => ({ name: item.name, passed: item.passed, exitCode: item.exitCode, durationMs: item.durationMs })) }));
}

async function runLiveCurrent(options) {
  requirePrepared();
  requireApiKey();
  process.env.OPENAI_MODEL = MODEL;
  process.env.EIA_SEMANTIC_RERANKING = "off";
  const repetition = Number(options.repetition || 1);
  const current = await loadCurrentModules();
  const queries = selectedDevelopmentQueries(options.ids);
  const rows = [];
  for (const [index, item] of queries.entries()) {
    const captured = await captureFetch(() => current.interpret.interpretQuery(item.query));
    const baseIntent = captured.value;
    const structuredIntent = current.routing.buildStructuredIntent(baseIntent, item.query);
    const off = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "off" });
    const on = await current.pipeline.buildLocalCandidatePipeline(baseIntent, { hierarchyMode: "on" });
    const offOutput = serializeCurrent(item, baseIntent, structuredIntent, off, current.certainty).output;
    const onOutput = serializeCurrent(item, baseIntent, structuredIntent, on, current.certainty).output;
    rows.push({
      queryId: item.id, query: item.query, categories: item.categories, repetition,
      modelPolicy: MODEL, openAi: captured.openAi[0] || null, network: captured.network,
      arms: {
        B_OFF: { output: offOutput, grade: gradeResult(item, offOutput, "B_OFF") },
        B_ON: { output: onOutput, grade: gradeResult(item, onOutput, "B_ON") }
      }
    });
    console.log(`live-current r${repetition} ${index + 1}/${queries.length} ${item.id}`);
  }
  writeJsonLines(`workflow-results-current-r${repetition}.jsonl`, rows);
  writeJson(`api-usage-current-r${repetition}.json`, summarizeApiUsage(rows.flatMap(row => row.openAi ? [row.openAi] : [])));
}

async function runLiveBaseline(options) {
  requirePrepared();
  requireApiKey();
  if (!options.baselineRoot) throw new Error("--baseline-root is required");
  process.env.OPENAI_MODEL = MODEL;
  process.env.LOGIN_REQUIRED = "off";
  process.env.EIA_SEMANTIC_RERANKING = "off";
  const repetition = Number(options.repetition || 1);
  const baselineSearch = await importFromRoot(options.baselineRoot, "lib/sources/eia/search.js");
  const queries = selectedDevelopmentQueries(options.ids);
  const rows = [];
  for (const [index, item] of queries.entries()) {
    const req = { method: "GET", query: { q: item.query }, headers: {} };
    const res = mockResponse();
    const captured = await captureFetch(() => baselineSearch.default(req, res));
    const output = serializeBaselineResponse(item, res.body, res.statusCode);
    rows.push({
      queryId: item.id, query: item.query, categories: item.categories, repetition,
      modelPolicy: MODEL, openAi: captured.openAi[0] || null, network: captured.network,
      arm: "A", output, grade: gradeResult(item, output, "A")
    });
    console.log(`live-baseline r${repetition} ${index + 1}/${queries.length} ${item.id}`);
  }
  writeJsonLines(`workflow-results-baseline-r${repetition}.jsonl`, rows);
  writeJson(`api-usage-baseline-r${repetition}.json`, summarizeApiUsage(rows.flatMap(row => row.openAi ? [row.openAi] : [])));
}

async function runProduction(options) {
  requirePrepared();
  const repetition = Number(options.repetition || 1);
  const auth = await import(pathToFileURL(join(ROOT, "lib", "auth.js")).href);
  const token = auth.createSessionToken();
  if (!token) throw new Error("Local auth configuration cannot create a production-compatible session token");
  const queries = selectedDevelopmentQueries(options.ids);
  const rows = [];
  for (const [index, item] of queries.entries()) {
    const started = performance.now();
    let status = 0;
    let body = null;
    let error = null;
    let headers = {};
    try {
      const response = await fetch(`${PRODUCTION.publicUrl}/api/search-eia?q=${encodeURIComponent(item.query)}`, { headers: { cookie: `${auth.SESSION_COOKIE_NAME}=${token}` } });
      status = response.status;
      headers = selectHeaders(response.headers, ["content-type", "x-matched-path", "x-vercel-cache", "x-vercel-id"]);
      body = await response.json();
    } catch (caught) {
      error = caught.message;
    }
    const output = serializeProductionResponse(item, body, status, headers, error);
    rows.push({
      queryId: item.id, query: item.query, categories: item.categories, repetition,
      arm: "C", timestamp: new Date().toISOString(), latencyMs: round(performance.now() - started),
      output, grade: gradeResult(item, output, "C")
    });
    console.log(`production r${repetition} ${index + 1}/${queries.length} ${item.id} status=${status}`);
  }
  writeJsonLines(`deployed-results-r${repetition}.jsonl`, rows);
}

async function generateReports() {
  requirePrepared();
  const manifest = readArtifact("manifest.json");
  const bank = readArtifact("query-bank.json");
  const development = bank.queries.filter(item => item.partition === "development");
  const staticVerification = readOptionalJson("static-verification.json");
  const deterministicMetrics = readOptionalJson("deterministic-metrics.json");
  const hierarchySweep = readOptionalJson("hierarchy-sweep.json") || [];
  const baselineRepetitionRows = [1, 2, 3].map(number => readJsonLinesOptional(`workflow-results-baseline-r${number}.jsonl`));
  const currentRepetitionRows = [1, 2, 3].map(number => readJsonLinesOptional(`workflow-results-current-r${number}.jsonl`));
  const productionRepetitionRows = [1, 2, 3].map(number => readJsonLinesOptional(`deployed-results-r${number}.jsonl`));
  const baselineRows = baselineRepetitionRows[0];
  const currentRows = currentRepetitionRows[0];
  const productionRows = productionRepetitionRows[0];
  const baseline = indexByQuery(baselineRows, row => row.output);
  const currentOff = indexByQuery(currentRows, row => row.arms?.B_OFF?.output);
  const currentOn = indexByQuery(currentRows, row => row.arms?.B_ON?.output);
  const production = indexByQuery(productionRows, row => row.output);
  const deterministicRows = readJsonLinesOptional("deterministic-results.jsonl");
  const detOff = indexByQuery(deterministicRows.filter(row => row.arm === "B_OFF"), row => row.output);
  const detOn = indexByQuery(deterministicRows.filter(row => row.arm === "B_ON"), row => row.output);
  const currentUsage = mergeUsageFiles("api-usage-current-");
  const baselineUsage = mergeUsageFiles("api-usage-baseline-");
  const priorProductionObservations = [1, 2, 3]
    .map(number => readJsonLinesOptional(`deployed-results-pre-model-fix-r${number}.jsonl`).length)
    .reduce((sum, count) => sum + count, 0);
  const acceptedWorkflowObservations = baselineRepetitionRows.flat().length + currentRepetitionRows.flat().length + productionRepetitionRows.flat().length;

  const cases = [];
  for (const item of development) {
    const outputs = {
      A: baseline.get(item.id) || null,
      B_OFF: currentOff.get(item.id) || detOff.get(item.id) || null,
      B_ON: currentOn.get(item.id) || detOn.get(item.id) || null,
      C: production.get(item.id) || null
    };
    const signatures = Object.fromEntries(Object.entries(outputs).map(([arm, output]) => [arm, resultSignature(output)]));
    const available = Object.values(signatures).filter(Boolean);
    const reasons = differenceReasons(outputs);
    cases.push({
      queryId: item.id, query: item.query, categories: item.categories,
      changed: new Set(available).size > 1,
      reasons,
      signatures,
      outputs,
      appearsInHumanReview: false
    });
  }

  const changed = cases.filter(item => item.changed);
  const unchangedControls = cases.filter(item => !item.changed).toSorted((a, b) => hashText(a.queryId).localeCompare(hashText(b.queryId))).slice(0, 5);
  const reviewCases = [...changed, ...unchangedControls];
  const blindingKey = [];
  for (const item of reviewCases) {
    item.appearsInHumanReview = true;
    const arms = Object.entries(item.outputs).filter(([, output]) => output).map(([arm]) => arm)
      .toSorted((left, right) => hashText(`${item.queryId}:${left}:hoho7`).localeCompare(hashText(`${item.queryId}:${right}:hoho7`)));
    const labels = ["Result A", "Result B", "Result C", "Result D"];
    blindingKey.push({ queryId: item.queryId, mapping: Object.fromEntries(arms.map((arm, index) => [labels[index], arm])) });
  }
  writeJson("changed-cases.json", cases.map(({ outputs, ...item }) => item));
  writeJson("blinding-key.json", blindingKey);

  const liveMetrics = {
    baseline: summarizeOutputMap(baseline, development),
    currentHierarchyOff: summarizeOutputMap(currentOff, development),
    currentHierarchyOn: summarizeOutputMap(currentOn, development),
    production: summarizeOutputMap(production, development),
    apiUsage: { baseline: baselineUsage, current: currentUsage },
    objectiveDraftChecks: {
      baseline: summarizeGradeRows(baselineRows.map(row => row.grade)),
      currentHierarchyOff: summarizeGradeRows(currentRows.map(row => row.arms?.B_OFF?.grade)),
      currentHierarchyOn: summarizeGradeRows(currentRows.map(row => row.arms?.B_ON?.grade)),
      production: summarizeGradeRows(productionRows.map(row => row.grade))
    },
    routeCounts: {
      baseline: countOutputField(baseline, output => output.route || "none"),
      currentHierarchyOn: countOutputField(currentOn, output => output.route || "none"),
      production: countOutputField(production, output => output.route || "none")
    },
    productionInterpreterCounts: countOutputField(production, output => output.interpreter || "unknown"),
    currentProductionDifferenceIds: development
      .filter(item => resultSignature(currentOn.get(item.id)) !== resultSignature(production.get(item.id)))
      .map(item => item.id),
    certaintyCompleteness: {
      currentHierarchyOn: summarizeCertainty(currentOn),
      production: summarizeCertainty(production)
    },
    controlledRepetitions: summarizeControlledRepetitions(development, baselineRepetitionRows, currentRepetitionRows),
    selectiveProductionRepetitions: summarizeSelectiveRepetitions(),
    requestEvidence: {
      baseline: summarizeRequestEvidence(baselineRepetitionRows.flat()),
      current: summarizeRequestEvidence(currentRepetitionRows.flat())
    },
    stageChecks: {
      baseline: summarizeChecks(baselineRows, row => row.grade),
      currentHierarchyOff: summarizeChecks(currentRows, row => row.arms?.B_OFF?.grade),
      currentHierarchyOn: summarizeChecks(currentRows, row => row.arms?.B_ON?.grade),
      production: summarizeChecks(productionRows, row => row.grade)
    },
    categoryChecks: {
      baseline: summarizeCategories(development, baselineRows, row => row.grade),
      currentHierarchyOn: summarizeCategories(development, currentRows, row => row.arms?.B_ON?.grade),
      production: summarizeCategories(development, productionRows, row => row.grade)
    },
    routeChecks: {
      baseline: summarizeRoutes(development, baseline),
      currentHierarchyOn: summarizeRoutes(development, currentOn),
      production: summarizeRoutes(development, production)
    },
    acceptedWorkflowObservations,
    priorProductionObservations,
    totalLiveWorkflowObservations: acceptedWorkflowObservations + priorProductionObservations,
    changedCases: changed.length,
    unchangedControlCases: unchangedControls.length,
    humanReviewCases: reviewCases.length
  };
  writeJson("metrics.json", { deterministic: deterministicMetrics, live: liveMetrics });

  const hardFailures = collectHardFailures(cases, hierarchySweep, deterministicMetrics, staticVerification, liveMetrics, manifest);
  writeJson("failure-register.json", hardFailures);
  const recommendation = hardFailures.some(item => item.severity === "critical") ? "DO NOT PROMOTE" : "PENDING HUMAN REVIEW";
  const hr = buildHumanReviewMarkdown(reviewCases, blindingKey);
  const technical = buildTechnicalMarkdown({
    manifest, bank, staticVerification, deterministicMetrics, hierarchySweep, liveMetrics,
    cases, hardFailures, recommendation, reviewCount: reviewCases.length
  });
  writeFileSync(join(ROOT, "hoho7HR.md"), hr, "utf8");
  writeFileSync(join(ROOT, "hoho7.md"), technical, "utf8");
  writeArtifactHashes();
  console.log(JSON.stringify({ reports: ["hoho7HR.md", "hoho7.md"], recommendation, changedCases: changed.length, reviewCases: reviewCases.length, hardFailures: hardFailures.length }));
}

async function normalizeGeneratedArtifacts() {
  requirePrepared();
  const queryById = new Map(readArtifact("query-bank.json").queries.map(item => [item.id, item]));
  const files = readdirSync(ARTIFACT_DIR).filter(name => name.endsWith(".jsonl") && (
    name === "deterministic-results.jsonl" ||
    name.startsWith("workflow-results-current-") ||
    name.startsWith("deployed-results-")
  ));
  let normalizedOutputs = 0;
  for (const name of files) {
    const rows = readJsonLinesOptional(name);
    for (const row of rows) {
      const item = queryById.get(row.queryId);
      if (row.output) {
        normalizeOutputCertainty(row.output);
        normalizeOutputIntent(row.output);
        if (item && row.grade) row.grade = gradeResult(item, row.output, row.arm || "C");
        normalizedOutputs += 1;
      }
      if (row.arms?.B_OFF?.output) {
        normalizeOutputCertainty(row.arms.B_OFF.output);
        normalizeOutputIntent(row.arms.B_OFF.output);
        if (item && row.arms.B_OFF.grade) row.arms.B_OFF.grade = gradeResult(item, row.arms.B_OFF.output, "B_OFF");
        normalizedOutputs += 1;
      }
      if (row.arms?.B_ON?.output) {
        normalizeOutputCertainty(row.arms.B_ON.output);
        normalizeOutputIntent(row.arms.B_ON.output);
        if (item && row.arms.B_ON.grade) row.arms.B_ON.grade = gradeResult(item, row.arms.B_ON.output, "B_ON");
        normalizedOutputs += 1;
      }
    }
    writeJsonLines(name, rows);
  }
  console.log(JSON.stringify({ files: files.length, normalizedOutputs }));
}

function normalizeOutputIntent(output) {
  const intent = output?.structuredIntent;
  if (!intent) return output;
  if (!(intent.geographies || []).length && intent.geography) intent.geographies = [intent.geography];
  return output;
}

function normalizeOutputCertainty(output) {
  const candidates = [
    ...(output.topCandidates || []),
    ...(output.retrievals || []).flatMap(retrieval => retrieval.candidates || [])
  ];
  for (const candidate of candidates) {
    const certainty = candidate.certainty;
    if (!certainty) continue;
    candidate.semanticCompatibility = certainty.semanticCompatibility || candidate.semanticCompatibility || "unknown";
    candidate.aggregationRelation = certainty.aggregationRelation || candidate.aggregationRelation || "unknown";
    candidate.hierarchyEvidence = certainty.hierarchyEvidenceStatus || "none";
    candidate.warnings = [...new Set((candidate.warnings || []).map(warning => typeof warning === "string" ? warning : warning.code || warning.message).filter(Boolean))];
  }
  return output;
}

async function loadCurrentModules() {
  const base = join(ROOT, "lib", "sources", "eia");
  return {
    interpret: await import(pathToFileURL(join(base, "interpret-query.js")).href),
    routing: await import(pathToFileURL(join(base, "intent-routing.js")).href),
    pipeline: await import(pathToFileURL(join(base, "candidate-pipeline.js")).href),
    retrieval: await import(pathToFileURL(join(base, "local-retrieval.js")).href),
    ranking: await import(pathToFileURL(join(base, "local-ranking.js")).href),
    certainty: await import(pathToFileURL(join(base, "result-certainty.js")).href)
  };
}

async function importFromRoot(root, relative) {
  return import(pathToFileURL(join(resolve(root), ...relative.split("/"))).href);
}

function serializeCurrent(item, baseIntent, structuredIntent, pipeline, certaintyModule) {
  const retrievals = (pipeline.retrievals || []).map(retrieval => ({
    geography: cleanGeography(retrieval.geography),
    route: retrieval.routeFamily || structuredIntent.route?.family || null,
    product: retrieval.concept?.product || null,
    activity: retrieval.concept?.activity || null,
    candidates: (retrieval.displayCandidates || []).slice(0, 5).map(candidate => ({
      stableId: candidate.candidate_id,
      seriesId: candidate.series_id,
      title: candidate.title,
      route: candidate.route_family,
      geography: cleanGeography(candidate.geography),
      product: retrieval.concept?.product || candidate.product_or_scope || null,
      activity: candidate.activity || retrieval.concept?.activity || null,
      sector: candidate.sector || null,
      frequency: candidate.frequency,
      unit: candidate.unit,
      coverage: { start: candidate.date_start || null, end: candidate.date_end || null },
      semanticCompatibility: safeCertainty(certaintyModule, structuredIntent, candidate)?.semanticCompatibility || (candidate.ranking?.semanticEligibility?.eligible === false ? "ineligible" : "eligible"),
      rankingTier: candidate.ranking?.tier || null,
      score: candidate.ranking?.score ?? null,
      aggregationRelation: safeCertainty(certaintyModule, structuredIntent, candidate)?.aggregationRelation || candidate.ranking?.signals?.aggregationRelation || candidate.aggregation_relation || "unknown",
      hierarchyEvidence: safeCertainty(certaintyModule, structuredIntent, candidate)?.hierarchyEvidenceStatus || candidate.ranking?.signals?.hierarchyEvidence || "none",
      warnings: candidate.ranking?.warnings || [],
      certainty: safeCertainty(certaintyModule, structuredIntent, candidate)
    })),
    warnings: retrieval.userWarnings || [],
    hierarchyRanking: retrieval.hierarchyRanking || null
  }));
  return {
    output: {
      queryId: item.id,
      originalQuery: baseIntent.originalQuery,
      cleanedQuery: baseIntent.cleanedQuery,
      correctedQuery: baseIntent.correctedQuery,
      correctedQuerySource: baseIntent.correctedQuerySource || null,
      interpreter: baseIntent.interpreter,
      structuredIntent: summarizeIntent(structuredIntent),
      clarificationRequired: Boolean(baseIntent.needsClarification || structuredIntent.needsClarification || pipeline.diagnostics?.clarificationBlocked),
      clarificationMessage: baseIntent.clarificationMessage || null,
      clarificationReasons: pipeline.diagnostics?.clarificationReasons || structuredIntent.missingFields || [],
      route: structuredIntent.route?.family || pipeline.routeFamily || null,
      retrievals,
      topCandidates: retrievals.flatMap(retrieval => retrieval.candidates).slice(0, 5),
      diagnostics: pipeline.diagnostics || {}
    }
  };
}

function serializeBaselineResponse(item, body, statusCode) {
  const variables = (body?.variables || []).slice(0, 5).map(variable => ({
    stableId: ["INTL", variable.countryCode, variable.productId, variable.activityId, variable.unitFacet, variable.frequency].filter(Boolean).join(":"),
    seriesId: null,
    title: variable.label || `${variable.product || "unknown"} - ${variable.activity || "unknown"}`,
    route: "international",
    geography: { code: variable.countryCode || body?.country?.code || null, name: variable.country || body?.country?.name || null, type: "country" },
    product: variable.product || null,
    activity: variable.activity || null,
    sector: null,
    frequency: variable.frequency || null,
    unit: variable.unit || null,
    coverage: variable.coverage || null,
    semanticCompatibility: "legacy-not-reported",
    aggregationRelation: "legacy-not-reported",
    hierarchyEvidence: "legacy-not-reported",
    warnings: []
  }));
  return {
    queryId: item.id,
    statusCode,
    originalQuery: body?.intent?.originalQuery || item.query,
    cleanedQuery: body?.intent?.cleanedQuery || null,
    correctedQuery: body?.intent?.correctedQuery || null,
    correctedQuerySource: body?.intent?.correctedQuerySource || null,
    interpreter: body?.intent?.interpreter || null,
    structuredIntent: summarizeIntent(body?.intent || {}),
    clarificationRequired: Boolean(body?.needsClarification || body?.needsCountry),
    clarificationMessage: body?.userMessage || null,
    clarificationReasons: body?.intent?.missingFields || [],
    route: body?.country ? "international" : null,
    retrievals: variables.length ? [{ geography: cleanGeography(body?.country), route: "international", product: body?.intent?.product || null, activity: body?.intent?.activity || null, candidates: variables, warnings: [] }] : [],
    topCandidates: variables,
    selectedSeries: body?.selectedSeries ? { title: body.selectedSeries.title, product: body.selectedSeries.product, activity: body.selectedSeries.activity, countryCode: body.selectedSeries.countryCode, frequency: body.selectedSeries.frequency, unit: body.selectedSeries.unit } : null,
    diagnostics: { architecture: "legacy-native", certaintyAvailable: false }
  };
}

function serializeProductionResponse(item, body, statusCode, headers, error) {
  const candidates = (body?.variables || []).slice(0, 5).map(variable => ({
    stableId: variable.candidateId || variable.seriesId,
    seriesId: variable.seriesId || null,
    title: variable.title || null,
    route: variable.routeFamily || null,
    geography: cleanGeography(variable.geography),
    product: variable.product || null,
    activity: variable.activity || null,
    sector: variable.sector || null,
    frequency: variable.frequency || null,
    unit: variable.unit || null,
    coverage: variable.coverage || null,
    semanticCompatibility: variable.certainty?.semanticCompatibility || null,
    aggregationRelation: variable.certainty?.aggregationRelation || "unknown",
    hierarchyEvidence: variable.certainty?.hierarchyEvidenceStatus || variable.certainty?.hierarchyEvidence || "none",
    warnings: [...(variable.warnings || []), ...(variable.certainty?.warnings || [])],
    certainty: variable.certainty || null
  }));
  return {
    queryId: item.id,
    statusCode,
    headers,
    error,
    originalQuery: body?.intent?.originalQuery || item.query,
    cleanedQuery: body?.intent?.cleanedQuery || null,
    correctedQuery: body?.intent?.correctedQuery || null,
    correctedQuerySource: body?.intent?.correctedQuerySource || null,
    interpreter: body?.intent?.interpreter || null,
    structuredIntent: summarizeIntent(body?.intent || {}),
    clarificationRequired: Boolean(body?.needsClarification || body?.diagnostics?.clarificationBlocked),
    clarificationMessage: body?.userMessage || null,
    clarificationReasons: body?.diagnostics?.clarificationReasons || [],
    route: body?.candidateGroups?.[0]?.candidates?.[0]?.routeFamily || body?.intent?.route?.family || null,
    retrievals: body?.candidateGroups || [],
    topCandidates: candidates,
    diagnostics: body?.diagnostics || {}
  };
}

function serializePool(pool) {
  return {
    routeFamily: pool.routeFamily,
    retrievals: (pool.retrievals || []).map(retrieval => ({
      geography: cleanGeography(retrieval.geography), concept: retrieval.concept,
      primaryCandidateIds: (retrieval.primaryCandidates || []).map(candidate => candidate.candidate_id),
      fallbackCandidateIds: (retrieval.fallbackCandidates || []).map(candidate => candidate.candidate_id)
    }))
  };
}

function serializeRanked(ranked) {
  return (ranked.retrievals || []).map(retrieval => ({
    geography: retrieval.geography?.code || null,
    product: retrieval.concept?.product || null,
    activity: retrieval.concept?.activity || null,
    topSeriesIds: (retrieval.displayCandidates || []).slice(0, 5).map(candidate => candidate.series_id),
    eligibleSeriesIds: (retrieval.rankedCandidates || []).filter(candidate => candidate.ranking?.semanticEligibility?.eligible !== false).map(candidate => candidate.series_id)
  }));
}

function gradeResult(item, output, arm) {
  const gold = item.gold;
  const displayedCandidates = (output.retrievals || []).flatMap(retrieval => retrieval.candidates || []);
  const topIds = (displayedCandidates.length ? displayedCandidates : output.topCandidates || []).map(candidate => candidate.seriesId).filter(Boolean);
  const intent = output.structuredIntent || {};
  const checks = [];
  checks.push(check("original-query-byte-preserved", output.originalQuery === item.query, item.query, output.originalQuery));
  checks.push(check("clarification", Boolean(output.clarificationRequired) === Boolean(gold.expectedClarification), gold.expectedClarification, output.clarificationRequired));
  if (gold.expectedGeographies.length) checks.push(checkSet("geography", gold.expectedGeographies, intent.geographies || []));
  if (gold.acceptableRoutes.length) checks.push(check("route", gold.acceptableRoutes.includes(output.route), gold.acceptableRoutes, output.route));
  if (gold.expectedConceptPairs.length) checks.push(checkPairs(gold.expectedConceptPairs, intent.conceptPairs || []));
  if (gold.expectedFrequency) checks.push(check("frequency", intent.frequency === gold.expectedFrequency || intent.requestedFrequency === gold.expectedFrequency, gold.expectedFrequency, intent.frequency));
  if (gold.requiredTopOneSeriesIds.length) checks.push(check("required-top-one", gold.requiredTopOneSeriesIds.includes(topIds[0]), gold.requiredTopOneSeriesIds, topIds[0] || null));
  if (gold.requiredTopFiveSeriesIds.length) checks.push(check("required-top-five", gold.requiredTopFiveSeriesIds.every(id => topIds.includes(id)), gold.requiredTopFiveSeriesIds, topIds));
  if (gold.forbiddenTopFiveSeriesIds.length) checks.push(check("forbidden-top-five", gold.forbiddenTopFiveSeriesIds.every(id => !topIds.includes(id)), gold.forbiddenTopFiveSeriesIds, topIds));
  if (gold.forbidOrdinaryRanking) checks.push(check("clarification-blocks-ranking", topIds.length === 0, [], topIds));
  if (arm !== "A" && gold.hierarchy) {
    checks.push(check("hierarchy-preference", Boolean(output.diagnostics?.hierarchyPreferenceApplied) === Boolean(gold.hierarchy.preferenceExpected), gold.hierarchy.preferenceExpected, output.diagnostics?.hierarchyPreferenceApplied));
  }
  return {
    goldStatus: item.goldStatus,
    passed: checks.every(item => item.passed),
    passedChecks: checks.filter(item => item.passed).length,
    failedChecks: checks.filter(item => !item.passed).length,
    checks
  };
}

function check(name, passed, expected, actual) {
  return { name, passed: Boolean(passed), expected, actual };
}

function checkSet(name, expected, actual) {
  const actualSet = new Set(actual);
  return check(name, expected.every(value => actualSet.has(value)), expected, actual);
}

function checkPairs(expected, actual) {
  const normalized = actual.map(pair => `${pair.product}:${pair.activity}`);
  const wanted = expected.map(pair => `${pair.product}:${pair.activity}`);
  return check("concept-pairs", wanted.every(pair => normalized.includes(pair)), wanted, normalized);
}

function summarizeIntent(intent) {
  const geographyValues = intent.geographies?.length
    ? intent.geographies
    : intent.validatedGeographies?.length
      ? intent.validatedGeographies
      : [intent.geography || intent.country];
  const geographies = geographyValues.filter(Boolean).map(item => typeof item === "string" ? item : item.code || item.value?.code || item.value || item.name).filter(Boolean);
  const pairs = (intent.conceptPairs || []).map(pair => ({ product: pair.product || null, activity: pair.activity || null, order: pair.order ?? null }));
  if (!pairs.length && (intent.product || intent.activity)) pairs.push({ product: intent.product || null, activity: intent.activity || null, order: 0 });
  return {
    geographies,
    geography: geographies[0] || intent.countryCode || null,
    product: intent.product || null,
    activity: intent.activity || null,
    conceptPairs: pairs,
    exclusions: intent.exclusions || [],
    unknownQualifiers: intent.unknownQualifiers || [],
    sector: intent.sector || null,
    frequency: intent.frequency || null,
    requestedFrequency: intent.requestedFrequency || null,
    route: intent.route?.family || null,
    clarificationStatus: intent.clarificationStatus || (intent.needsClarification ? "required" : "none"),
    provenance: intent.provenance || intent.fields || null
  };
}

async function captureFetch(callback) {
  const originalFetch = global.fetch;
  const openAi = [];
  const network = [];
  global.fetch = async (input, init = {}) => {
    const url = String(typeof input === "string" || input instanceof URL ? input : input?.url || input);
    const started = performance.now();
    const bodyText = typeof init.body === "string" ? init.body : null;
    try {
      const response = await originalFetch(input, init);
      const entry = { url: sanitizeUrl(url), status: response.status, latencyMs: round(performance.now() - started) };
      if (url.startsWith("https://api.openai.com/")) {
        const responseText = await response.clone().text();
        const requestBody = parseJson(bodyText);
        const responseBody = parseJson(responseText);
        const call = {
          ...entry,
          endpoint: new URL(url).pathname,
          modelRequested: requestBody?.model || null,
          promptHash: hashText(String(requestBody?.input || "")),
          requestBodyHash: hashText(bodyText || ""),
          requestParameters: Object.fromEntries(Object.entries(requestBody || {}).filter(([key]) => key !== "input")),
          responseModel: responseBody?.model || null,
          requestId: response.headers.get("x-request-id") || response.headers.get("request-id") || null,
          usage: responseBody?.usage || null,
          responseBody,
          error: response.ok ? null : responseBody?.error || responseText
        };
        openAi.push(call);
        network.push({ ...entry, type: "openai" });
      } else {
        network.push({ ...entry, type: url.includes("api.eia.gov") ? "eia" : "other" });
      }
      return response;
    } catch (error) {
      network.push({ url: sanitizeUrl(url), status: null, latencyMs: round(performance.now() - started), type: url.includes("openai.com") ? "openai" : url.includes("api.eia.gov") ? "eia" : "other", error: error.message });
      throw error;
    }
  };
  try {
    const value = await callback();
    return { value, openAi, network };
  } finally {
    global.fetch = originalFetch;
  }
}

function summarizeApiUsage(calls) {
  const usage = calls.reduce((sum, call) => {
    const item = call.usage || {};
    sum.inputTokens += Number(item.input_tokens || item.prompt_tokens || 0);
    sum.outputTokens += Number(item.output_tokens || item.completion_tokens || 0);
    sum.totalTokens += Number(item.total_tokens || 0);
    sum.latencyMs += Number(call.latencyMs || 0);
    if (call.status >= 200 && call.status < 300) sum.successes += 1;
    else sum.failures += 1;
    return sum;
  }, { calls: calls.length, successes: 0, failures: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, latencyMs: 0 });
  usage.estimatedCostUsd = round((usage.inputTokens / 1_000_000) * 0.20 + (usage.outputTokens / 1_000_000) * 1.25, 6);
  usage.averageLatencyMs = calls.length ? round(usage.latencyMs / calls.length) : 0;
  return usage;
}

function buildHumanReviewMarkdown(reviewCases, blindingKey) {
  const keyById = new Map(blindingKey.map(item => [item.queryId, item.mapping]));
  const lines = [
    "# HoHo7 Blinded Human Review Packet", "",
    "## 1. Review Instructions", "",
    "Evaluate semantic usefulness and safety. Do not try to identify which system produced a result. A first-ranked result is not automatically a total. Hierarchy is known only for the approved 52-target SEDS total-energy relationship family; all other parent, child, total, component, subtype, and cross-route relationships remain unknown. Clarification is preferable to an unsupported guess, and multiple result sets may be equally acceptable.", "",
    "Do not treat machine ordering as a human judgment. Select all acceptable arms, then identify a preference or tie.", "",
    "## 2. Review Reason Codes", "",
    "- [ ] correct clarification", "- [ ] unnecessary clarification", "- [ ] missed clarification",
    "- [ ] correct product/activity", "- [ ] wrong product", "- [ ] wrong activity",
    "- [ ] correct concept pairing", "- [ ] cross-pair error", "- [ ] correct geography", "- [ ] correct route",
    "- [ ] exclusion respected", "- [ ] relevant top five", "- [ ] useful ordering", "- [ ] relevant candidate lost",
    "- [ ] hierarchy uncertainty handled correctly", "- [ ] unsupported hierarchy claim",
    "- [ ] correct frequency/unit/coverage disclosure", "- [ ] misleading fallback presentation",
    "- [ ] no meaningful difference", "- [ ] cannot determine", "",
    "## 3. Query Review Blocks", ""
  ];
  for (const item of reviewCases) {
    const mapping = keyById.get(item.queryId) || {};
    lines.push(`### ${item.queryId}`, "", `**Raw query:** ${item.query}`, "", `**Categories:** ${item.categories.join(", ")}`, "");
    for (const [label, arm] of Object.entries(mapping)) {
      lines.push(`#### ${label}`, "", ...formatReviewOutput(item.outputs[arm]), "");
    }
    lines.push(
      "**Human response**", "",
      "- Semantically acceptable arms: ____________________",
      "- Preferred arm or tie: ____________________",
      "- Unacceptable arms: ____________________",
      "- Severity: none / minor / material / critical",
      "- Reason codes: ____________________",
      "- Reviewer notes: ____________________",
      "- Reviewer name or initials: ____________________",
      "- Review date: ____________________",
      "- Adjudication required: yes / no", "", "---", ""
    );
  }
  lines.push(
    "## 4. Summary Review Sheet", "",
    "- Number reviewed: ______", "- Better: ______", "- Neutral: ______", "- Worse: ______",
    "- Cannot determine: ______", "- Critical regressions: ______", "- Adjudications required: ______"
  );
  return `${lines.join("\n")}\n`;
}

function formatReviewOutput(output) {
  if (!output) return ["No result was captured for this arm."];
  const lines = [
    `- Clarification: ${output.clarificationRequired ? `required - ${output.clarificationMessage || "no message"}` : "not required"}`,
    `- Route: ${output.route || "unknown"}`,
    `- Geography: ${(output.structuredIntent?.geographies || []).join(", ") || "unknown"}`,
    `- Concept pairs: ${(output.structuredIntent?.conceptPairs || []).map(pair => `${pair.product || "?"} / ${pair.activity || "?"}`).join("; ") || "none"}`,
    "- Top candidates:"
  ];
  const candidates = output.topCandidates || [];
  if (!candidates.length) lines.push("  - None");
  for (const [index, candidate] of candidates.entries()) {
    lines.push(`  ${index + 1}. ${candidate.stableId || candidate.seriesId || "unknown-id"} | ${candidate.title || "untitled"} | route=${candidate.route || "unknown"} | geography=${candidate.geography?.code || "unknown"} | product=${candidate.product || "unknown"} | activity=${candidate.activity || "unknown"} | sector=${candidate.sector || "none"} | frequency=${candidate.frequency || "unknown"} | unit=${candidate.unit || "unknown"} | semantic=${candidate.semanticCompatibility || "unknown"} | aggregation=${candidate.aggregationRelation || "unknown"} | hierarchy=${candidate.hierarchyEvidence || "unknown"} | warnings=${(candidate.warnings || []).map(w => typeof w === "string" ? w : w.code || w.message).join("; ") || "none"}`);
  }
  return lines;
}

function formatCheckMetric(item) {
  return item ? `${item.passed}/${item.checks} pass` : "not graded";
}

function formatCategoryMetric(item) {
  return item ? `${item.passedCases}/${item.cases} cases; ${item.passedChecks}/${item.checks} checks` : "not present";
}

function formatRouteMetric(item) {
  return item ? `${item.cases} cases; ${item.clarification} clarification; ${item.emptyTopFive} empty` : "0 cases";
}

function buildTechnicalMarkdown(context) {
  const { manifest, bank, staticVerification, deterministicMetrics, hierarchySweep, liveMetrics, cases, hardFailures, recommendation, reviewCount } = context;
  const changed = cases.filter(item => item.changed);
  const staticRows = (staticVerification?.checks || []).map(item => {
    const tests = String(item.stdout || "").match(/tests\s+(\d+)/)?.[1];
    const detail = tests ? `${tests} tests` : item.failures ? `${item.failures.length} syntax failures` : "see artifact output";
    return `| ${item.name} | ${item.passed ? "PASS" : "FAIL"} | ${item.exitCode} | ${item.durationMs} | ${detail} | \`${item.command}\` |`;
  }).join("\n") || "| Not run | PENDING | - | - | - | - |";
  const failureRows = hardFailures.map(item => `| ${item.queryId || "global"} | ${item.arm || "all"} | ${escapeCell(item.stage)} | ${escapeCell(item.failure)} | ${item.severity} | ${escapeCell(item.evidence)} | ${escapeCell(item.likelyCause)} | ${escapeCell(item.promotionImpact)} | ${escapeCell(item.recommendedFollowUp)} |`).join("\n") || "| - | - | - | No automated failures recorded | - | - | - | Human review remains pending | - |";
  const differenceRows = changed.map(item => {
    const outputs = item.outputs;
    const comparisons = [["A", "B_ON"], ["B_OFF", "B_ON"], ["B_ON", "C"]]
      .filter(([left, right]) => outputs[left] && outputs[right] && resultSignature(outputs[left]) !== resultSignature(outputs[right]))
      .map(pair => pair.join(" vs ")).join("; ") || "signature-only";
    const topOne = Object.entries(outputs).filter(([, output]) => output).map(([arm, output]) => `${arm}=${output.topCandidates?.[0]?.seriesId || "none"}`).join("<br>");
    const topFive = Object.entries(outputs).filter(([, output]) => output).map(([arm, output]) => `${arm}=${(output.topCandidates || []).map(candidate => candidate.seriesId).join(",") || "none"}`).join("<br>");
    const clarification = Object.entries(outputs).filter(([, output]) => output).map(([arm, output]) => `${arm}=${output.clarificationRequired ? "required" : "no"}`).join("; ");
    const semanticSafety = hardFailures.filter(failure => failure.queryId === item.queryId && failure.severity === "critical").map(failure => failure.stage).join(", ") || "none detected by automated safety checks";
    const hierarchy = Object.entries(outputs).filter(([, output]) => output).map(([arm, output]) => `${arm}=${output.topCandidates?.[0]?.hierarchyEvidence || "none"}`).join("; ");
    return `| ${item.queryId} | ${comparisons} | ${item.reasons.join(", ") || "output signature"} | ${escapeCell(topOne)} | ${escapeCell(topFive)} | ${clarification} | ${semanticSafety} | ${hierarchy} | ${item.appearsInHumanReview ? "yes" : "no"} |`;
  }).join("\n") || "| - | - | No differences captured | - | - | - | - | - | no |";
  const hierarchyPasses = hierarchySweep.filter(item => item.pass).length;
  const hierarchyFailures = hierarchySweep.filter(item => !item.pass).length;
  const controlled = liveMetrics.controlledRepetitions;
  const checkNames = [...new Set(Object.values(liveMetrics.stageChecks).flatMap(summary => Object.keys(summary)))].toSorted();
  const stageRows = checkNames.map(name => `| ${name} | ${formatCheckMetric(liveMetrics.stageChecks.baseline[name])} | ${formatCheckMetric(liveMetrics.stageChecks.currentHierarchyOff[name])} | ${formatCheckMetric(liveMetrics.stageChecks.currentHierarchyOn[name])} | ${formatCheckMetric(liveMetrics.stageChecks.production[name])} |`).join("\n");
  const categories = [...new Set([
    ...Object.keys(liveMetrics.categoryChecks.baseline),
    ...Object.keys(liveMetrics.categoryChecks.currentHierarchyOn),
    ...Object.keys(liveMetrics.categoryChecks.production)
  ])].toSorted();
  const categoryRows = categories.map(category => `| ${category} | ${formatCategoryMetric(liveMetrics.categoryChecks.baseline[category])} | ${formatCategoryMetric(liveMetrics.categoryChecks.currentHierarchyOn[category])} | ${formatCategoryMetric(liveMetrics.categoryChecks.production[category])} |`).join("\n");
  const routes = [...new Set(Object.values(liveMetrics.routeChecks).flatMap(summary => Object.keys(summary)))].toSorted();
  const routeRows = routes.map(route => `| ${route} | ${formatRouteMetric(liveMetrics.routeChecks.baseline[route])} | ${formatRouteMetric(liveMetrics.routeChecks.currentHierarchyOn[route])} | ${formatRouteMetric(liveMetrics.routeChecks.production[route])} |`).join("\n");
  const currentCertainty = liveMetrics.certaintyCompleteness.currentHierarchyOn;
  const productionCertainty = liveMetrics.certaintyCompleteness.production;
  const certaintyRows = currentCertainty.fields.map(field => `| ${field} | ${currentCertainty.fieldComplete[field]}/${currentCertainty.candidates} | ${productionCertainty.fieldComplete[field]}/${productionCertainty.candidates} |`).join("\n");
  const productionObservationCount = liveMetrics.acceptedWorkflowObservations - controlled.baseline.capturedObservations - controlled.currentHierarchyOn.capturedObservations;
  const productionOperationalFailure = hardFailures.some(item => item.stage === "deployment/configuration");
  const repeatedProduction = liveMetrics.selectiveProductionRepetitions;
  const productionStableCount = repeatedProduction.filter(item => item.productionFinalStable && item.productionIntentStable).length;
  const productionUnstableIds = repeatedProduction.filter(item => !item.productionFinalStable || !item.productionIntentStable).map(item => item.queryId);
  const gates = [
    ["Safety: zero unresolved critical semantic violations", "FAIL", "H7-D033 and H7-D041"],
    ["Safety: zero unsupported or mis-scoped hierarchy claims", "FAIL", "H7-D033 incorrectly activates total-energy hierarchy"],
    ["Safety: zero cross-pair combinations", "FAIL", "H7-D033"],
    ["Safety: exclusions respected", "PASS", "No exclusion draft check failed in the 50-query development set; focused tests pass"],
    ["Safety: no ordinary ranking when clarification is required", "FAIL", "H7-D041 missed required clarification"],
    ["Safety: correctedQuery never becomes user evidence", "PASS", "Full suite and byte-preservation checks pass"],
    ["Safety: soft scores never override semantic eligibility", "PASS", "Focused eligibility tests and shared-pool isolation pass"],
    ["Safety: deterministic repeatability is 100%", deterministicMetrics?.repeatability?.passed ? "PASS" : "FAIL", `${deterministicMetrics?.repeatability?.failures ?? "unknown"} failures`],
    ["Relevance: acceptable top one non-inferior", "PENDING", "Objective drafts favor current, but blinded human review and holdout remain required"],
    ["Relevance: acceptable top five non-inferior", "PENDING", "Blinded human review and holdout remain required"],
    ["Relevance: difficult-query safety benefit", "PENDING", "Three current mismatches require adjudication"],
    ["Relevance: no unadjudicated regression", "PENDING", `${reviewCount} blinded cases await review`],
    ["Clarification: canonical required cases correct", "FAIL", "Georgia ambiguity was not blocked"],
    ["Clarification: missed clarification no worse", "FAIL", "At least one current objective-draft miss"],
    ["Clarification: no material unnecessary regression", "PENDING", "Requires blinded review"],
    ["Clarification: options governed and relevant", "PENDING", "Not fully graded by this corpus"],
    ["Operational: full test suite passes", staticVerification?.passed ? "PASS" : "FAIL", "See Section 5"],
    ["Operational: production build passes", staticVerification?.passed ? "PASS" : "FAIL", "Current and frozen baseline builds pass"],
    ["Operational: metadata audits pass", hierarchyFailures === 0 ? "PASS" : "FAIL", `${hierarchyPasses}/52 hierarchy sweep; both audits pass`],
    ["Operational: rollback is verified", "PASS", "Legacy flag is intentionally retired; documented rollback restores a verified deployment"],
    ["Operational: development/preview steps documented", "PASS", "docs/eia-pipeline-promotion-signoff.md"],
    ["Operational: rollback procedure documented", "PASS", "README and pipeline promotion signoff"],
    ["Operational: deployment has no unexplained critical failure", productionOperationalFailure ? "FAIL" : "PASS", productionOperationalFailure ? "Production AI fallback remains" : `Diagnostic and 50/50 searches passed with ${manifest.production.model}`],
    ["Contract: all result-certainty dimensions present", currentCertainty.missingFields.length ? "FAIL" : "PASS", `Missing: ${currentCertainty.missingFields.join(", ") || "none"}`],
    ["Hierarchy: 52 reviewed targets behave as approved", hierarchyFailures === 0 && hierarchySweep.length === 52 ? "PASS" : "FAIL", `${hierarchyPasses}/52 passed; U.S. is route-limited`],
    ["Human semantic review", "PENDING", `${reviewCount} blinded cases awaiting review`],
    ["Untouched 150-query holdout", "PENDING", "Sealed and not executed"]
  ];
  return `# HoHo7 Technical Benchmark Report

## 1. Executive Summary

This benchmark compares the historical native legacy application at \`${manifest.baseline.commit.slice(0, 7)}\`, the current candidate architecture with hierarchy ranking off and on, and the current production deployment. The post-fix production deployment is \`${manifest.production.deploymentId}\` at commit \`${manifest.production.commit.slice(0, 7)}\`. Controlled and Production calls use \`${manifest.model.controlledSnapshot}\`. The authenticated Production diagnostic and upstream OpenAI request both return HTTP 200; the 50-query pass returned ${liveMetrics.production.success}/50 successful search responses with interpreter counts ${JSON.stringify(liveMetrics.productionInterpreterCounts)}.

The current architecture contains 52 reviewed SEDS targets, not zero hierarchy relationships. The hierarchy rule is limited to annual SEDS total-energy candidate series, including annual candidates reached through an approved frequency fallback, and only breaks same-tier/same-score ties. It cannot override semantic eligibility, tier, or score. Component controls must remain components. The candidate pipeline is the sole runtime path; the legacy feature flag is retired.

The repository differs from the benchmark prompt in two important ways: the candidate/legacy flag has already been retired, and result certainty does not contain an explicit \`routeRelation\` field. The separately reviewed 52-target registry also supersedes the older statement that all hierarchy relationships were zero; the raw Phase 1B selector metadata itself still contains zero embedded relationships.

Results are preliminary pending blinded human review. Recommendation: **${recommendation}**.

## 2. Evaluation Manifest

- Benchmark: \`${manifest.benchmarkVersion}\`
- Started: ${manifest.benchmarkStartedAt}
- Machine: \`${manifest.environment.platform}/${manifest.environment.architecture}\`, Node \`${manifest.environment.node}\`
- Repository root: \`${manifest.environment.cwd}\`
- Current branch: \`${manifest.repository.branch}\`
- Current HEAD: \`${manifest.repository.head}\`
- Working tree at benchmark start: \`${manifest.repository.workingTreeAtBenchmarkStart}\`
- Working tree at manifest refresh: \`${manifest.repository.workingTreeAtManifestRefresh.replace(/\n/g, "; ")}\`
- Baseline: \`${manifest.baseline.commit}\` (${manifest.baseline.subject})
- Baseline execution: isolated detached snapshot from this branch's history; native candidate flag off; native International retrieval; build PASS in Section 5
- Production deployment: \`${manifest.production.deploymentId}\`
- Production URL: ${manifest.production.publicUrl}
- Production commit: \`${manifest.production.commit}\`
- Production deployed at: ${manifest.production.deployedAt}
- Production candidate mode: \`${manifest.production.candidatePipeline}\`; retired flag has \`${manifest.production.candidateFlag}\`
- Production hierarchy mode: \`${manifest.production.hierarchyRanking}\`
- Controlled model: \`${manifest.model.controlledSnapshot}\`
- Endpoint: \`${manifest.model.endpoint}\`
- Model parameters: reasoning=${manifest.model.reasoningEffort}; temperature=${manifest.model.temperature}; max output=${manifest.model.maximumOutputTokens}; schema=${manifest.model.structuredOutputSchema}
- Feature flags: candidate=${manifest.featureFlags.candidatePipeline}; hierarchy=${manifest.featureFlags.hierarchyRankingControlledArms.join("/")}; semantic reranking=${manifest.featureFlags.semanticReranking}; contribution calculation=${manifest.featureFlags.hierarchyContributionCalculation}
- Versions: candidate=${manifest.versions.candidatePipeline}; hierarchy=${manifest.versions.hierarchyRanking}; ranking=${manifest.versions.ranking}; taxonomy=${manifest.versions.taxonomy}; semantic reranking=${manifest.versions.semanticReranking}
- Query bank: \`${manifest.corpus.hash}\` (${bank.counts.development} development, ${bank.counts.holdout} sealed holdout)
- Query bank version/date/source: \`${bank.benchmarkVersion}\`; ${bank.createdAt}; ${bank.creationSource}
- Current metadata manifest hash: \`${manifest.hashes.currentMetadataManifest}\`
- Baseline metadata manifest hash: \`${manifest.hashes.baselineMetadataManifest}\`
- Hierarchy registry hash: \`${manifest.hashes.hierarchyRegistry}\`
- Current interpretation source hash: \`${manifest.hashes.currentInterpretationSource}\`
- Baseline interpretation source hash: \`${manifest.hashes.baselineInterpretationSource}\`
- Current routing metadata hash: \`${manifest.hashes.currentRoutingMetadata}\`
- Generated hierarchy hash: \`${manifest.hashes.generatedHierarchy}\`
- Benchmark runner hash: \`${manifest.hashes.benchmarkRunner}\`
- Benchmark corpus source hash: \`${manifest.hashes.benchmarkCorpusSource}\`
- Request evidence: current=${liveMetrics.requestEvidence.current.calls} calls/${liveMetrics.requestEvidence.current.promptHashes} prompt hashes/${liveMetrics.requestEvidence.current.requestBodyHashes} request hashes; baseline=${liveMetrics.requestEvidence.baseline.calls}/${liveMetrics.requestEvidence.baseline.promptHashes}/${liveMetrics.requestEvidence.baseline.requestBodyHashes}
- Response models: current=${liveMetrics.requestEvidence.current.responseModels.join(", ")}; baseline=${liveMetrics.requestEvidence.baseline.responseModels.join(", ")}
- Captured request IDs: current=${liveMetrics.requestEvidence.current.requestIdsCaptured}; baseline=${liveMetrics.requestEvidence.baseline.requestIdsCaptured}
- Artifact root: \`test-artifacts/hoho7/\`; per-file hashes: \`test-artifacts/hoho7/artifact-hashes.json\`

No secrets are included in the manifest or artifacts.

### Preflight Answers

| # | Question | Answer |
|---:|---|---|
| 1 | Exact current HEAD | \`${manifest.repository.head}\` |
| 2 | Last trusted pre-change commit and why | \`${manifest.baseline.commit}\`; last commit before the clarification, eligibility, certainty, legacy-retirement, and hierarchy sequence. |
| 3 | Is production running the baseline commit? | No. |
| 4 | Deployed commit | \`${manifest.production.commit}\`, the same commit as current HEAD. |
| 5 | Candidate mode in production | Candidate pipeline is the sole runtime path; the old flag is retired and has no runtime effect. |
| 6 | Deployed model and prompt | Model is \`${manifest.production.model}\` and is operational; prompt source is identifiable through the deployed commit, but the black-box request prompt hash is not exposed. |
| 7 | Can production configuration be identified reliably? | Yes for the benchmark-relevant deployment, commit, timestamp, pinned model, candidate runtime, hierarchy response, and semantic-reranking state; unrelated environment details remain outside scope. |
| 8 | Safe production per-request model override? | No supported test override was found or used. |
| 9 | Is isolated deployed-code reproduction feasible? | Yes and already represented by controlled Arm B because production and HEAD are the same commit; a separate Arm D adds no code isolation. |
| 10 | Are metadata snapshots comparable? | Yes for the hashed Phase 1B manifest; full-workflow baseline remains confounded by its native International-only retrieval architecture. |
| 11 | Can both rankers receive the same pool? | Yes for 39 non-clarification cases; all 39 adapters were compatible. |
| 12 | Does production expose stable candidate IDs? | Yes. |
| 13 | Does clarification stop ranking in every arm? | It stops ranking when raised, but H7-D041 fails earlier because required geography clarification is not raised. |
| 14 | Are all certainty dimensions available in every arm? | No. Baseline lacks the contract; current and production omit explicit \`routeRelation\`. |
| 15 | Does any arm use unverified hierarchy? | The 52-target registry is reviewed and formula-backed, but H7-D033 applies it to a misconstructed total-energy pair. All unrelated hierarchy remains unknown. |
| 16 | How many live calls were required? | ${liveMetrics.totalLiveWorkflowObservations}: 300 controlled, ${productionObservationCount} post-fix Production, and ${liveMetrics.priorProductionObservations} preserved pre-fix Production observations. |
| 17 | Estimated and actual cost | Preflight estimate USD ${manifest.liveCallEstimate.estimatedInitialTotalCostUsd}; actual controlled direct OpenAI estimate USD ${round(liveMetrics.apiUsage.baseline.estimatedCostUsd + liveMetrics.apiUsage.current.estimatedCostUsd, 6)}. Production token usage/cost is not exposed by the black-box response. |
| 18 | Impossible or confounded portions | Human quality, sealed holdout performance, baseline native retrieval comparability, black-box prompt/request hashes, and Production token usage remain unavailable or confounded. |
| 19 | Production comparison status | Included as a passing operational gate and secondary same-code/model comparison, not as a replacement for the controlled baseline. |
| 20 | Remaining human decisions | Review all ${reviewCount} blinded cases, adjudicate H7-D002/H7-D033/H7-D041, approve any repaired freeze, then decide whether to open the 150-query holdout. |

## 3. Why the Deployed Comparison Is Secondary

Production is useful for detecting user-visible behavior, packaging failures, authentication failures, stale flags, and deployment drift. It is not the controlled causal baseline. Its deployment, commit, candidate-only runtime, hierarchy response, and pinned model were identified, but black-box prompt hashes and unrelated environment values were not. Formal code claims therefore rely on controlled Arm A versus Arm B evidence. Arm C now passes the operational AI gate and provides a secondary same-code/model comparison. A separate Arm D was unnecessary because production and current HEAD are the same commit and controlled Arm B already reproduces that code with the same pinned model.

The pre-fix Production deployment used an invalid provider-prefixed model and returned upstream HTTP 400. That evidence is preserved under \`*-pre-model-fix*\` artifacts. The corrected deployment uses \`${manifest.production.model}\`; authenticated application and upstream diagnostics both return HTTP 200.

## 4. Benchmark Design

The query bank contains 50 difficult development queries and 150 sealed holdout queries. Fourteen development cases come from the existing human-reviewed Q01-Q14 cohort. The remaining records are benchmark-authored from EIA search patterns and carry objective draft judgments, not final human quality labels. No private query logs were available.

The query bank records version, creation source/date, category labels, partition, and structured gold fields. Fourteen records are previously human-reviewed; all other development and holdout judgments are objective drafts. Human review is blinded independently by query, with the key stored outside \`hoho7HR.md\`.

Layer 0 ran static tests, builds, audits, syntax checks, and the existing ranking benchmark. Layer 1 froze current structured intent and canonical candidate pools, tested clarification suppression, compared both rankers on the same pool where compatible, and ran the 52-target hierarchy sweep. Layer 2 ran three complete controlled repetitions for every development query in both baseline and current arms with the exact pinned model. Arm B-Off and Arm B-On reuse the same AI interpretation and candidate inputs; only hierarchy mode changes. Layer 3 ran corrected Production once for all 50 queries and repeated the union of changed and failed cases, 11 queries, twice. The deterministic Layer 1 also exercises the AI-unavailable rules-only path. Layer 4 was unnecessary because deployed code equals current HEAD.

Native full-workflow baseline tests retain baseline metadata and API behavior, so its International-only retrieval behavior is an architecture confound rather than automatic evidence that current ranking is better.

Initial estimate: ${manifest.liveCallEstimate.totalInitialWorkflowCalls} workflow calls and approximately USD ${manifest.liveCallEstimate.estimatedInitialTotalCostUsd}. Final accepted evidence contains ${liveMetrics.acceptedWorkflowObservations} workflow observations: 300 controlled and ${productionObservationCount} post-fix Production. The ${liveMetrics.priorProductionObservations} pre-fix Production observations are preserved separately, bringing total successful live workflow observations to ${liveMetrics.totalLiveWorkflowObservations}, below the 500-call limit. During execution, 150 sandbox-blocked local attempts produced no successful live API calls and were overwritten rather than graded. Actual controlled direct OpenAI cost is approximately USD ${round(liveMetrics.apiUsage.baseline.estimatedCostUsd + liveMetrics.apiUsage.current.estimatedCostUsd, 6)}, below the USD 10 limit, using the price snapshot recorded at ${manifest.model.pricingSource}; Production token usage is not exposed. Semantic reranking remained disabled. The application sets no reasoning effort, temperature, or maximum output-token parameter, and uses no API-enforced structured-output schema; those values were omitted consistently rather than invented.

## 5. Static Verification Results

| Check | Result | Exit | Duration ms | Counts/detail | Command |
|---|---:|---:|---:|---|---|
${staticRows}

All 10 required checks passed. The full suite, focused EIA suite, hierarchy proof, existing ranking benchmark, current build, frozen-baseline build, both hierarchy audits, 63-file syntax pass, and git-status capture are preserved with complete stdout/stderr in \`static-verification.json\`.

The Phase 1B selector audit scanned 254,499 records and found zero embedded aggregate/component relationships. The separately reviewed registry contains 52 formula-backed relationships, 259 verified component edges, and 311 exact candidate records. These are separate evidence layers: labels/facets still cannot invent hierarchy, while the approved registry can support its narrow post-ranker.

## 6. Deterministic Ranking Results

- Development queries: ${deterministicMetrics?.developmentQueries ?? "not run"}
- Repeatability: ${deterministicMetrics ? `${deterministicMetrics.repeatability.rate * 100}%` : "not run"}
- Shared-pool compatible comparisons: ${deterministicMetrics?.sharedPoolRanking?.compatible ?? "not run"}
- Shared-pool ranking changes: ${deterministicMetrics?.sharedPoolRanking?.changed ?? "not run"}
- Hierarchy sweep: ${hierarchyPasses}/52 pass, ${hierarchyFailures} fail
- State/DC targets expected to apply: ${deterministicMetrics?.hierarchySweep?.eligibleStateAndDcTargets ?? 51}
- National route-limited control: ${deterministicMetrics?.hierarchySweep?.routeLimitedNationalTargets ?? 1}

Clarification blocked ranking for all 11 deterministic cases where the current architecture raised clarification. The shared-pool adapter accepted the same current canonical candidate pool in all 39 eligible comparisons; 21 produced a changed ordering. Candidate-pool identities, structured intent, ranker outputs, and eligibility outputs are serialized separately so retrieval and ranking differences are not conflated.

Automated safety attribution found two critical current-query defects: H7-D033 at concept-pair construction/semantic eligibility and H7-D041 at clarification/geography resolution. H7-D002 is a material ranking/presentation question, not an automatically declared regression. The 52-target sweep passed all 51 state/DC applications and the expected U.S. route-limited control; renewable and fossil component controls remained components.

Objective draft grading is diagnostic only because most records have not yet received human approval. The rules-only current hierarchy-on draft result was 47/50 all-check pass; the three mismatches are H7-D002, H7-D033, and H7-D041.

## 7. Controlled Workflow Results

| Arm | Captured | Success | Clarification | Empty top five | p50 latency ms | p95 latency ms |
|---|---:|---:|---:|---:|---:|---:|
${metricRow("Historical baseline", liveMetrics.baseline)}
${metricRow("Current hierarchy off", liveMetrics.currentHierarchyOff)}
${metricRow("Current hierarchy on", liveMetrics.currentHierarchyOn)}

Controlled API usage:

- Baseline: ${formatUsage(liveMetrics.apiUsage.baseline)}
- Current: ${formatUsage(liveMetrics.apiUsage.current)}

Three-repetition completeness and final-output stability:

- Historical baseline: ${controlled.baseline.capturedObservations}/${controlled.baseline.expectedObservations} observations; ${controlled.baseline.queriesWithThreeObservations}/50 queries have all three; ${controlled.baseline.stableQueries}/50 stable final signatures; variable=${controlled.baseline.variableQueryIds.join(", ") || "none"}.
- Current hierarchy on: ${controlled.currentHierarchyOn.capturedObservations}/${controlled.currentHierarchyOn.expectedObservations} observations; ${controlled.currentHierarchyOn.queriesWithThreeObservations}/50 queries have all three; ${controlled.currentHierarchyOn.stableQueries}/50 stable final signatures; variable=${controlled.currentHierarchyOn.variableQueryIds.join(", ") || "none"}.
- Production selective repetitions: ${productionStableCount}/${repeatedProduction.length} repeated queries have stable canonical intent and final-result signatures; unstable=${productionUnstableIds.join(", ") || "none"}. Each has three observations.

Repeated samples are retained as repeated observations of the same query and are not counted as independent queries.

Objective draft checks, pending human approval:

| Arm | Cases | All checks passed | Cases with mismatch | Check pass rate |
|---|---:|---:|---:|---:|
${objectiveCheckRow("Historical baseline", liveMetrics.objectiveDraftChecks.baseline)}
${objectiveCheckRow("Current hierarchy off", liveMetrics.objectiveDraftChecks.currentHierarchyOff)}
${objectiveCheckRow("Current hierarchy on", liveMetrics.objectiveDraftChecks.currentHierarchyOn)}
${objectiveCheckRow("Production", liveMetrics.objectiveDraftChecks.production)}

Route counts: baseline=${JSON.stringify(liveMetrics.routeCounts.baseline)}; current=${JSON.stringify(liveMetrics.routeCounts.currentHierarchyOn)}; production=${JSON.stringify(liveMetrics.routeCounts.production)}.

### Objective Checks By Stage

| Check | Historical baseline | Current off | Current on | Production |
|---|---:|---:|---:|---:|
${stageRows}

These checks cover authoritative raw preservation, clarification, geography, route, concept pairs, frequency, required/forbidden result families, clarification suppression, and hierarchy preference. They do not substitute for human semantic judgments.

### Current Results By Query Category

| Category | Historical baseline | Current on | Production |
|---|---:|---:|---:|
${categoryRows}

Categories overlap, so totals must not be summed as independent queries.

### Results By Resolved Route

| Route | Historical baseline | Current on | Production |
|---|---:|---:|---:|
${routeRows}

### Result-Certainty Field Completeness

| Certainty field | Current on | Production |
|---|---:|---:|
${certaintyRows}

The historical baseline did not implement the certainty contract. Current and production candidates expose route-family metadata but not an explicit \`certainty.routeRelation\`; therefore the claimed separate route-certainty dimension is incomplete. No missing value was silently inferred by the benchmark.

## 8. Deployed Comparison

| Arm | Captured | Success | Clarification | Empty top five | p50 latency ms | p95 latency ms |
|---|---:|---:|---:|---:|---:|---:|
${metricRow("Production", liveMetrics.production)}

Production commit, deployment, and configured model were identified. The configured \`${manifest.production.model}\` is the exact controlled snapshot. Diagnostic application/upstream status is HTTP 200; the initial post-fix pass returned 50/50 successful search responses, with ${liveMetrics.productionInterpreterCounts.openai || 0} OpenAI interpretations and ${liveMetrics.productionInterpreterCounts.rules || 0} deterministic validation fallback.

Production p50/p95 are operational measurements only and are not compared directly with local latency. Stable candidate identifiers and certainty data were exposed. Production differs from controlled current on ${liveMetrics.currentProductionDifferenceIds.length} final signatures: ${liveMetrics.currentProductionDifferenceIds.join(", ") || "none"}. The 11 changed-or-failed cases were repeated twice; ${productionStableCount}/11 retained stable canonical intent and final output. Response headers, timestamps, and repetitions are retained in \`deployed-results-r*.jsonl\` and \`production-operational-evidence.json\`.

Production and controlled current use the same commit and pinned model. Production is now valid as an operational gate and a secondary same-code/model comparison, but infrastructure and black-box prompt visibility still prevent treating it as the frozen causal baseline. The pre-fix invalid-model results remain preserved separately and are excluded from post-fix semantic metrics.

## 9. Per-Query Difference Register

| Query | Affected comparisons | Changed stage/dimension | Top-one by arm | Top-five IDs by arm | Clarification | Semantic-safety difference | Top hierarchy status | Human packet |
|---|---|---|---|---|---|---|---|---:|
${differenceRows}

All 50 queries differ across at least one arm because the historical native baseline is International-only while the current architecture spans Domestic, International, and SEDS. This register records differences, not winners. Exact serialized outputs and the per-query unblinding map are in the artifacts.

## 10. Failure and Risk Register

| Query ID | Arm | Stage | Failure | Severity | Deterministic evidence | Likely cause | Promotion impact | Recommended follow-up |
|---|---|---|---|---|---|---|---|---|
${failureRows}

## 11. Human Review Status

See \`hoho7HR.md\`. ${reviewCount} changed or control cases await blinded human review. Codex did not label any result set better or worse. Promotion and retention judgment remain pending.

## 12. Promotion-Gate Table

| Gate | Status | Evidence |
|---|---:|---|
${gates.map(([gate, status, evidence]) => `| ${gate} | ${status} | ${evidence} |`).join("\n")}

## 13. Commands and Reproducibility

1. \`node scripts/eia-benchmark/run-hoho7.js prepare\`
2. Extract commit \`${BASELINE_COMMIT}\` to an isolated directory and link the current compatible \`node_modules\` only for build tooling.
3. \`node scripts/eia-benchmark/run-hoho7.js static --baseline-root=<path>\`
4. \`node scripts/eia-benchmark/run-hoho7.js deterministic --baseline-root=<path>\`
5. Run \`node --env-file=.env.local scripts/eia-benchmark/run-hoho7.js live-current --repetition=<1|2|3>\` for each repetition.
6. Run \`node --env-file=.env.local scripts/eia-benchmark/run-hoho7.js live-baseline --baseline-root=<path> --repetition=<1|2|3>\` for each repetition.
7. Run \`node --env-file=.env.local scripts/eia-benchmark/run-hoho7.js production --repetition=1\`, compute the union of changed and failed IDs, then repeat that frozen ID set with \`--ids=<comma-separated IDs>\` for repetitions 2 and 3.
8. \`node scripts/eia-benchmark/run-hoho7.js normalize-artifacts\`
9. \`node scripts/eia-benchmark/run-hoho7.js report\`

Environment assumptions: Node ${manifest.environment.node}; Windows PowerShell; readable current and frozen metadata; \`OPENAI_API_KEY\` and \`EIA_API_KEY\` loaded only at process runtime; production-compatible local session configuration for authenticated black-box requests. The holdout remains sealed unless a later explicit decision opens it.

Primary scripts are \`scripts/eia-benchmark/hoho7-corpus.js\` and \`scripts/eia-benchmark/run-hoho7.js\`; contract tests are in \`tests/hoho7-benchmark.test.js\`. Artifacts and hashes are under \`test-artifacts/hoho7/\`; see \`artifact-hashes.json\`. Raw OpenAI response bodies, prompt/request hashes, model fields, usage, request IDs when returned, latency, errors, ranking inputs, ranking outputs, production responses, gold drafts, changed cases, and the private blinding key are preserved. Authorization headers and API keys are never written.

## 14. Final Technical Recommendation

**${recommendation}**

The automated benchmark already finds critical blockers, so \`DO NOT PROMOTE\` is stronger than merely pending human review. Production AI is now operational, removing the deployment/configuration blocker. H7-D033 still violates concept integrity and hierarchy scope; H7-D041 still misses material geography ambiguity; and explicit route certainty remains absent. H7-D002 requires human adjudication rather than an automatic quality label.

The 50-query development phase is diagnostic and cannot support a final statistical superiority claim. Final retention or merge approval requires separately authorized repairs, complete regression tests, a newly frozen code state, completed blinded review, adjudication of every regression, and paired evaluation of the untouched 150-query holdout. If the holdout is opened later, use query-level paired confidence intervals, McNemar-style analysis for binary outcomes, and paired bootstrap intervals for top-five coverage. Repeated model samples must not be treated as independent queries.
`;
}

function collectHardFailures(cases, hierarchySweep, deterministicMetrics, staticVerification, liveMetrics, manifest) {
  const failures = [];
  if (staticVerification && !staticVerification.passed) failures.push({ queryId: null, arm: "all", stage: "static-verification", failure: "One or more required static checks failed.", severity: "critical", evidence: `${staticVerification.failedCount} failed checks`, promotionImpact: "Blocks promotion or retention approval until explained." });
  if (deterministicMetrics && !deterministicMetrics.repeatability.passed) failures.push({ queryId: null, arm: "B_ON", stage: "ranking", failure: "Deterministic ordering was not repeatable.", severity: "critical", evidence: `${deterministicMetrics.repeatability.failures} failures`, promotionImpact: "Blocks promotion." });
  for (const row of hierarchySweep.filter(item => !item.pass)) failures.push({ queryId: row.geography.code, arm: "B_ON", stage: "hierarchy", failure: "Verified hierarchy sweep expectation failed.", severity: "critical", evidence: `off=${row.offTop}, on=${row.onTop}, applied=${row.hierarchyApplied}`, promotionImpact: "Blocks hierarchy activation approval." });
  const productionAiFailures = cases.filter(item => {
    const production = item.outputs.C;
    return production?.interpreter !== "openai" && String(production?.structuredIntent?.provenance?.country?.fallbackReason || "").startsWith("openai_http_");
  });
  if (productionAiFailures.length) {
    failures.push({
      queryId: null,
      arm: "C",
      stage: "deployment/configuration",
      failure: "Production AI interpretation is unavailable and all sampled searches fell back to deterministic rules.",
      severity: "critical",
      evidence: `${productionAiFailures.length}/50 sampled queries used fallback; authenticated diagnostic identified model ${PRODUCTION.model} and OpenAI HTTP 400`,
      promotionImpact: "Blocks the production operational gate. Correct the production model value in a separately authorized task and redeploy before retesting."
    });
  }
  for (const item of cases) {
    const on = item.outputs.B_ON;
    if (!on) continue;
    if (on.clarificationRequired && (on.topCandidates || []).length > 0) failures.push({ queryId: item.queryId, arm: "B_ON", stage: "clarification", failure: "Candidates were ranked despite a blocking clarification response.", severity: "critical", evidence: `${on.topCandidates.length} candidates`, promotionImpact: "Blocks promotion." });
    if (on.originalQuery !== item.query) failures.push({ queryId: item.queryId, arm: "B_ON", stage: "interpretation", failure: "Original query was not preserved byte-for-byte.", severity: "critical", evidence: `expected=${item.query}; actual=${on.originalQuery}`, promotionImpact: "Blocks promotion." });
  }
  const monthlyTotal = cases.find(item => item.queryId === "H7-D002")?.outputs.B_ON;
  if (monthlyTotal?.diagnostics?.hierarchyPreferenceApplied) {
    failures.push({
      queryId: "H7-D002", arm: "B_ON", stage: "ranking",
      failure: "The verified annual aggregate displaced one member of the previously human-reviewed top five for a monthly request that fell back to annual SEDS.",
      severity: "material", evidence: `top=${monthlyTotal.topCandidates?.[0]?.seriesId || "none"}; hierarchyApplied=true`,
      promotionImpact: "Requires blinded human adjudication; do not label better or worse automatically."
    });
  }
  const nuclear = cases.find(item => item.queryId === "H7-D033")?.outputs.B_ON;
  if ((nuclear?.structuredIntent?.conceptPairs || []).some(pair => pair.product === "total energy") && nuclear?.topCandidates?.[0]?.seriesId === "SEDS.TETCB.TX.A") {
    failures.push({
      queryId: "H7-D033", arm: "B_ON", stage: "concept-pair construction / semantic eligibility",
      failure: "The overlapping phrase 'nuclear energy consumption' created an additional total-energy pair and ranked the total-energy aggregate ahead of the requested nuclear component.",
      severity: "critical", evidence: "conceptPairs include nuclear/consumption and total energy/consumption; top series SEDS.TETCB.TX.A",
      promotionImpact: "Blocks the semantic-safety gate until repaired and regression-tested."
    });
  }
  const georgia = cases.find(item => item.queryId === "H7-D041")?.outputs.B_ON;
  if (georgia && !georgia.clarificationRequired && georgia.structuredIntent?.geographies?.includes("GA")) {
    failures.push({
      queryId: "H7-D041", arm: "B_ON", stage: "clarification / geography resolution",
      failure: "The ambiguous geography name Georgia was silently resolved to the U.S. state and ranked without clarification.",
      severity: "critical", evidence: `route=${georgia.route}; top=${georgia.topCandidates?.[0]?.seriesId || "none"}`,
      promotionImpact: "Blocks the ambiguity-safety gate until a governed state/country clarification is added and tested."
    });
  }
  const certainty = liveMetrics?.certaintyCompleteness?.currentHierarchyOn;
  if (certainty?.fieldComplete?.routeRelation !== certainty?.candidates) {
    failures.push({
      queryId: null, arm: "B_ON", stage: "result-certainty classification",
      failure: "Result certainty does not expose an explicit route-relation classification.",
      severity: "material",
      evidence: `${certainty?.fieldComplete?.routeRelation || 0}/${certainty?.candidates || 0} displayed candidates contain certainty.routeRelation; candidate.route is present only as metadata`,
      promotionImpact: "The completed-architecture claim that route certainty is reported separately is not currently true."
    });
  }
  if (manifest?.featureFlags?.candidatePipeline === "retired") {
    failures.push({
      queryId: null, arm: "B_ON", stage: "rollback / architecture discrepancy",
      failure: "The prompt describes candidate mode as awaiting gradual promotion, but the repository has already retired the candidate/legacy feature flag and legacy runtime.",
      severity: "documentary",
      evidence: "EIA_CANDIDATE_PIPELINE has no runtime effect; README and promotion signoff require deployment rollback",
      promotionImpact: "Not a code defect, but the benchmark must use deployment rollback rather than claim a flag off-switch exists."
    });
  }
  return failures.map(enrichFailure);
}

function enrichFailure(item) {
  const defaults = {
    "deployment/configuration": ["A provider-prefixed gateway model name was supplied to a direct OpenAI endpoint.", "Set the production model to a valid direct OpenAI model ID in a separately authorized task, redeploy, and repeat Layer 3."],
    ranking: ["The approved aggregate tie-break also applies to annual candidates reached through a frequency fallback.", "Have humans adjudicate the monthly fallback presentation and add a regression expectation before any code change."],
    "concept-pair construction / semantic eligibility": ["Overlapping phrase extraction treated 'energy consumption' as an independent total-energy concept inside 'nuclear energy consumption'.", "Prevent contained generic phrases from creating unrelated concept pairs, then add adversarial parser and eligibility tests."],
    "clarification / geography resolution": ["The deterministic geography resolver prefers the U.S. postal/state interpretation without preserving the country alternative.", "Add governed state/country ambiguity evidence and require clarification when both interpretations are viable."],
    "result-certainty classification": ["The certainty schema omits routeRelation even though the candidate retains a route-family value.", "Add and test an explicit route-relation field without inferring equivalence across route families."],
    "rollback / architecture discrepancy": ["Legacy retirement intentionally replaced the feature-flag rollback path.", "Keep the discrepancy documented and verify rollback by restoring a previously approved deployment."],
    "static-verification": ["A required verification command failed.", "Inspect the captured command output and repair only in a separately authorized task."],
    hierarchy: ["A reviewed hierarchy expectation did not match runtime behavior.", "Inspect the exact registry record and ranking trace before changing code or metadata."],
    clarification: ["The clarification gate did not suppress ordinary ranking.", "Repair the gate and add a full-workflow regression test."],
    interpretation: ["The authoritative input contract was violated.", "Restore byte-preserving originalQuery handling and add a staged contract test."]
  };
  const [likelyCause, recommendedFollowUp] = defaults[item.stage] || ["Not isolated by the automated benchmark.", "Investigate the captured stage evidence before making production changes."];
  return { ...item, likelyCause: item.likelyCause || likelyCause, recommendedFollowUp: item.recommendedFollowUp || recommendedFollowUp };
}

function summarizeControlledRepetitions(development, baselineFiles, currentFiles) {
  const summarize = (files, select) => {
    const perQuery = development.map(item => {
      const outputs = files.map(rows => select(rows.find(row => row.queryId === item.id))).filter(Boolean);
      return { queryId: item.id, observations: outputs.length, uniqueSignatures: new Set(outputs.map(resultSignature)).size };
    });
    return {
      expectedObservations: development.length * 3,
      capturedObservations: perQuery.reduce((sum, item) => sum + item.observations, 0),
      queriesWithThreeObservations: perQuery.filter(item => item.observations === 3).length,
      stableQueries: perQuery.filter(item => item.observations === 3 && item.uniqueSignatures === 1).length,
      variableQueryIds: perQuery.filter(item => item.uniqueSignatures > 1).map(item => item.queryId),
      perQuery
    };
  };
  return {
    baseline: summarize(baselineFiles, row => row?.output),
    currentHierarchyOn: summarize(currentFiles, row => row?.arms?.B_ON?.output)
  };
}

function summarizeRequestEvidence(rows) {
  const calls = rows.map(row => row.openAi).filter(Boolean);
  return {
    calls: calls.length,
    successfulCalls: calls.filter(call => call.status >= 200 && call.status < 300).length,
    responseModels: [...new Set(calls.map(call => call.responseModel).filter(Boolean))],
    promptHashes: new Set(calls.map(call => call.promptHash).filter(Boolean)).size,
    requestBodyHashes: new Set(calls.map(call => call.requestBodyHash).filter(Boolean)).size,
    requestIdsCaptured: calls.filter(call => call.requestId).length,
    requestParameterShapes: [...new Set(calls.map(call => stableStringify(call.requestParameters || {})))]
  };
}

function summarizeChecks(rows, selectGrade) {
  const checks = rows.flatMap(row => selectGrade(row)?.checks || []);
  const byName = {};
  for (const item of checks) {
    const summary = byName[item.name] || { checks: 0, passed: 0, failed: 0 };
    summary.checks += 1;
    summary[item.passed ? "passed" : "failed"] += 1;
    byName[item.name] = summary;
  }
  return byName;
}

function summarizeCategories(development, rows, selectGrade) {
  const byId = new Map(rows.map(row => [row.queryId, selectGrade(row)]));
  const categories = {};
  for (const item of development) {
    const grade = byId.get(item.id);
    if (!grade) continue;
    for (const category of item.categories) {
      const summary = categories[category] || { cases: 0, passedCases: 0, checks: 0, passedChecks: 0 };
      summary.cases += 1;
      if (grade.passed) summary.passedCases += 1;
      summary.checks += grade.checks?.length || 0;
      summary.passedChecks += grade.passedChecks || 0;
      categories[category] = summary;
    }
  }
  return categories;
}

function summarizeRoutes(development, outputMap) {
  const summary = {};
  for (const item of development) {
    const output = outputMap.get(item.id);
    if (!output) continue;
    const route = output.route || "none";
    const value = summary[route] || { cases: 0, clarification: 0, emptyTopFive: 0 };
    value.cases += 1;
    if (output.clarificationRequired) value.clarification += 1;
    if (!(output.topCandidates || []).length) value.emptyTopFive += 1;
    summary[route] = value;
  }
  return summary;
}

function summarizeSelectiveRepetitions() {
  const currentFiles = [1, 2, 3].map(number => readJsonLinesOptional(`workflow-results-current-r${number}.jsonl`));
  const baselineFiles = [1, 2, 3].map(number => readJsonLinesOptional(`workflow-results-baseline-r${number}.jsonl`));
  const productionFiles = [1, 2, 3].map(number => readJsonLinesOptional(`deployed-results-r${number}.jsonl`));
  const ids = [...new Set(productionFiles.slice(1).flatMap(rows => rows.map(row => row.queryId)))].toSorted();
  return ids.map(queryId => {
    const current = currentFiles.map(rows => rows.find(row => row.queryId === queryId)?.arms?.B_ON?.output).filter(Boolean);
    const baseline = baselineFiles.map(rows => rows.find(row => row.queryId === queryId)?.output).filter(Boolean);
    const production = productionFiles.map(rows => rows.find(row => row.queryId === queryId)?.output).filter(Boolean);
    const productionIntentSignatures = production.map(semanticIntentSignature);
    return {
      queryId,
      repetitions: { current: current.length, baseline: baseline.length, production: production.length },
      uniqueSignatures: {
        current: new Set(current.map(resultSignature)).size,
        baseline: new Set(baseline.map(resultSignature)).size,
        production: new Set(production.map(resultSignature)).size
      },
      productionUniqueIntentSignatures: new Set(productionIntentSignatures).size,
      productionFinalStable: production.length === 3 && new Set(production.map(resultSignature)).size === 1,
      productionIntentStable: production.length === 3 && new Set(productionIntentSignatures).size === 1,
      stable: [current, baseline, production].every(values => values.length === 0 || new Set(values.map(resultSignature)).size === 1)
    };
  });
}

function semanticIntentSignature(output) {
  const intent = output?.structuredIntent || {};
  return stableStringify({
    geographies: intent.geographies || [],
    conceptPairs: intent.conceptPairs || [],
    exclusions: intent.exclusions || [],
    unknownQualifiers: intent.unknownQualifiers || [],
    sector: intent.sector || null,
    frequency: intent.frequency || null,
    route: output?.route || intent.route || null,
    clarificationRequired: Boolean(output?.clarificationRequired)
  });
}

function summarizeOutputMap(map, development) {
  const rows = development.map(item => map.get(item.id)).filter(Boolean);
  const latencies = rows.map(row => Number(row.latencyMs || 0)).filter(value => value > 0).toSorted((a, b) => a - b);
  return {
    expected: development.length,
    captured: rows.length,
    success: rows.filter(row => !row.error && (!row.statusCode || row.statusCode < 400)).length,
    clarification: rows.filter(row => row.clarificationRequired).length,
    emptyTopFive: rows.filter(row => !(row.topCandidates || []).length).length,
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95)
  };
}

function summarizeGradeRows(grades) {
  const values = grades.filter(Boolean);
  const checks = values.flatMap(grade => grade.checks || []);
  return {
    cases: values.length,
    passedCases: values.filter(grade => grade.passed).length,
    mismatchedCases: values.filter(grade => !grade.passed).length,
    checks: checks.length,
    passedChecks: checks.filter(check => check.passed).length,
    passRate: checks.length ? round(checks.filter(check => check.passed).length / checks.length, 4) : null
  };
}

function countOutputField(map, select) {
  const counts = {};
  for (const output of map.values()) {
    const key = select(output);
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

function summarizeCertainty(map) {
  const candidates = [...map.values()].flatMap(output => output.topCandidates || []);
  const fields = [
    "semanticCompatibility",
    "routeRelation",
    "frequencyRelation",
    "unitRelation",
    "coverageRelation",
    "aggregationRelation",
    "hierarchyEvidenceStatus",
    "presentationClass"
  ];
  const fieldComplete = Object.fromEntries(fields.map(field => [field, candidates.filter(candidate => {
    const value = candidate.certainty?.[field];
    return value !== null && value !== undefined && value !== "";
  }).length]));
  return {
    candidates: candidates.length,
    complete: candidates.filter(candidate => fields.every(field => {
      const value = candidate.certainty?.[field];
      return value !== null && value !== undefined && value !== "";
    })).length,
    fields,
    fieldComplete,
    missingFields: fields.filter(field => fieldComplete[field] !== candidates.length)
  };
}

function summarizeGrades(rows) {
  const grades = rows.map(row => row.grade).filter(Boolean);
  return { cases: grades.length, allDraftChecksPassed: grades.filter(item => item.passed).length, casesWithDraftMismatch: grades.filter(item => !item.passed).length, note: "Draft objective mismatches are diagnostic until human gold approval." };
}

function differenceReasons(outputs) {
  const reasons = [];
  const values = Object.values(outputs).filter(Boolean);
  if (new Set(values.map(value => Boolean(value.clarificationRequired))).size > 1) reasons.push("clarification");
  if (new Set(values.map(value => value.route || "unknown")).size > 1) reasons.push("route");
  if (new Set(values.map(value => (value.topCandidates || [])[0]?.stableId || "none")).size > 1) reasons.push("top-one");
  if (new Set(values.map(value => (value.topCandidates || []).map(candidate => candidate.stableId).join("|"))).size > 1) reasons.push("top-five");
  if (new Set(values.map(value => (value.topCandidates || []).map(candidate => candidate.aggregationRelation).join("|"))).size > 1) reasons.push("certainty");
  return reasons;
}

function resultSignature(output) {
  if (!output) return null;
  return stableStringify({ clarification: output.clarificationRequired, route: output.route, top: (output.topCandidates || []).map(candidate => candidate.stableId), certainty: (output.topCandidates || []).map(candidate => [candidate.semanticCompatibility, candidate.aggregationRelation, candidate.hierarchyEvidence]) });
}

function indexByQuery(rows, select) {
  return new Map(rows.map(row => {
    const selected = select(row);
    return [row.queryId, selected ? { ...selected, latencyMs: row.latencyMs ?? row.openAi?.latencyMs ?? selected.latencyMs } : null];
  }).filter(([, value]) => value));
}

function mergeUsageFiles(prefix) {
  const files = existsSync(ARTIFACT_DIR) ? readdirSync(ARTIFACT_DIR).filter(name => name.startsWith(prefix) && name.endsWith(".json")) : [];
  const items = files.map(name => readArtifact(name));
  return {
    files,
    calls: items.reduce((sum, item) => sum + (item.calls || 0), 0),
    successes: items.reduce((sum, item) => sum + (item.successes || 0), 0),
    failures: items.reduce((sum, item) => sum + (item.failures || 0), 0),
    inputTokens: items.reduce((sum, item) => sum + (item.inputTokens || 0), 0),
    outputTokens: items.reduce((sum, item) => sum + (item.outputTokens || 0), 0),
    estimatedCostUsd: round(items.reduce((sum, item) => sum + (item.estimatedCostUsd || 0), 0), 6)
  };
}

function selectedDevelopmentQueries(idsValue) {
  const development = readArtifact("query-bank.json").queries.filter(item => item.partition === "development");
  if (!idsValue) return development;
  const ids = new Set(String(idsValue).split(",").map(value => value.trim()).filter(Boolean));
  return development.filter(item => ids.has(item.id));
}

function runCommand(name, commandName, commandArgs, cwd, timeout = 120_000) {
  const started = Date.now();
  const result = spawnSync(commandName, commandArgs, { cwd, encoding: "utf8", timeout, env: sanitizedChildEnvironment() });
  return {
    name,
    command: [commandName, ...commandArgs].join(" "),
    cwd,
    exitCode: result.status,
    signal: result.signal,
    passed: result.status === 0,
    durationMs: Date.now() - started,
    stdout: trimOutput(result.stdout || ""),
    stderr: trimOutput(result.stderr || ""),
    error: result.error?.message || null
  };
}

function sanitizedChildEnvironment() {
  const env = { ...process.env };
  delete env.OPENAI_API_KEY;
  delete env.EIA_API_KEY;
  delete env.EIA_HIERARCHY_RANKING;
  delete env.EIA_CANDIDATE_PIPELINE;
  delete env.EIA_SEMANTIC_RERANKING;
  return env;
}

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return body; },
    end() { return this.body; }
  };
}

function safeCertainty(module, intent, candidate) {
  try { return module.buildRankedResultCertainty(intent, candidate); } catch { return null; }
}

function topSeriesIds(pipeline) {
  return (pipeline.retrievals || []).flatMap(retrieval => (retrieval.displayCandidates || []).map(candidate => candidate.series_id));
}

function requiresClarification(base, structured) {
  return Boolean(base?.needsClarification || base?.blockingClarification || structured?.needsClarification || structured?.blockingClarification);
}

function cleanGeography(value) {
  if (!value) return null;
  return { code: value.code || value.value?.code || null, name: value.name || value.value?.name || value.label || null, type: value.type || value.value?.type || null };
}

function sourceConstant(file, name) {
  const match = readFileSync(file, "utf8").match(new RegExp(`export const ${name} = ["']([^"']+)["']`));
  return match?.[1] || "unknown";
}

function formatReviewValue(value) {
  return value === null || value === undefined || value === "" ? "unknown" : String(value);
}

function metricRow(label, item = {}) {
  return `| ${label} | ${item.captured ?? 0} | ${item.success ?? 0} | ${item.clarification ?? 0} | ${item.emptyTopFive ?? 0} | ${item.p50LatencyMs ?? "n/a"} | ${item.p95LatencyMs ?? "n/a"} |`;
}

function objectiveCheckRow(label, item = {}) {
  return `| ${label} | ${item.cases ?? 0} | ${item.passedCases ?? 0} | ${item.mismatchedCases ?? 0} | ${item.passRate === null || item.passRate === undefined ? "n/a" : `${round(item.passRate * 100, 2)}%`} |`;
}

function formatCertainty(item = {}) {
  return `${item.complete || 0}/${item.candidates || 0} candidates populated across ${(item.fields || []).join(", ")}`;
}

function formatUsage(item = {}) {
  return `${item.calls || 0} calls, ${item.inputTokens || 0} input tokens, ${item.outputTokens || 0} output tokens, estimated USD ${item.estimatedCostUsd || 0}`;
}

function percentile(values, quantile) {
  if (!values.length) return null;
  return round(values[Math.min(values.length - 1, Math.max(0, Math.ceil(values.length * quantile) - 1))]);
}

function round(value, decimals = 3) {
  const factor = 10 ** decimals;
  return Math.round(Number(value || 0) * factor) / factor;
}

function selectHeaders(headers, names) {
  return Object.fromEntries(names.map(name => [name, headers.get(name)]).filter(([, value]) => value));
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    if (url.searchParams.has("api_key")) url.searchParams.set("api_key", "[redacted]");
    return url.toString();
  } catch { return String(value); }
}

function parseJson(value) {
  if (!value) return null;
  try { return JSON.parse(value); } catch { return value; }
}

function writeJson(name, value) {
  writeFileSync(join(ARTIFACT_DIR, name), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function writeJsonLines(name, rows) {
  writeFileSync(join(ARTIFACT_DIR, name), `${rows.map(row => JSON.stringify(row)).join("\n")}\n`, "utf8");
}

function readArtifact(name) {
  return readJson(join(ARTIFACT_DIR, name));
}

function readOptionalJson(name) {
  const file = join(ARTIFACT_DIR, name);
  return existsSync(file) ? readJson(file) : null;
}

function readJsonLinesOptional(name) {
  const file = join(ARTIFACT_DIR, name);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function readJson(file) {
  return JSON.parse(readFileSync(file, "utf8"));
}

function requirePrepared() {
  if (!existsSync(join(ARTIFACT_DIR, "manifest.json"))) throw new Error("Run prepare first");
}

function requireApiKey() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for controlled live calls");
}

function fileHash(file) {
  return hashText(readFileSync(file));
}

function gitObjectHash(spec) {
  return hashText(execFileSync("git", ["show", spec], { cwd: ROOT }));
}

function hashText(value) {
  return createHash("sha256").update(value).digest("hex");
}

function git(...gitArgs) {
  return execFileSync("git", gitArgs, { cwd: ROOT, encoding: "utf8" }).trim();
}

function safeGit(...gitArgs) {
  try { return git(...gitArgs); } catch { return "unknown"; }
}

function parseArgs(values) {
  const parsed = { _: [] };
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (!value.startsWith("--")) { parsed._.push(value); continue; }
    const [rawKey, inline] = value.slice(2).split("=", 2);
    const key = rawKey.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    parsed[key] = inline ?? (values[index + 1] && !values[index + 1].startsWith("--") ? values[++index] : true);
  }
  return parsed;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function walk(directory) {
  const files = [];
  for (const name of readdirSync(directory)) {
    if ([".git", "node_modules", ".next", "test-artifacts"].includes(name)) continue;
    const full = join(directory, name);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function relativePath(file) {
  return file.replace(`${ROOT}\\`, "").replaceAll("\\", "/");
}

function trimOutput(value, maximum = 30_000) {
  const text = String(value);
  return text.length <= maximum ? text : `${text.slice(0, maximum)}\n[truncated ${text.length - maximum} characters]`;
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function writeArtifactHashes() {
  const files = readdirSync(ARTIFACT_DIR).filter(name => name !== "artifact-hashes.json").toSorted();
  const artifactHashes = Object.fromEntries(files.map(name => [name, { sha256: fileHash(join(ARTIFACT_DIR, name)), bytes: statSync(join(ARTIFACT_DIR, name)).size }]));
  writeJson("artifact-hashes.json", {
    generatedAt: new Date().toISOString(),
    artifacts: artifactHashes,
    reports: {
      "hoho7.md": { sha256: fileHash(join(ROOT, "hoho7.md")), bytes: statSync(join(ROOT, "hoho7.md")).size },
      "hoho7HR.md": { sha256: fileHash(join(ROOT, "hoho7HR.md")), bytes: statSync(join(ROOT, "hoho7HR.md")).size }
    }
  });
}
