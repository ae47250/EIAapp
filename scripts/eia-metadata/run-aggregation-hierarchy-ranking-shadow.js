import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { createGunzip } from "node:zlib";

import { buildLocalCandidatePipeline } from "../../lib/sources/eia/candidate-pipeline.js";
import { interpretQueryWithRules } from "../../lib/sources/eia/interpret-query.js";
import { stableStringify } from "./normalize.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_ARTIFACT_PATH = join(ROOT_DIR, "data", "eia", "builds", "phase1b", "aggregation-hierarchy.generated.json");
const DEFAULT_SEDS_PATH = join(ROOT_DIR, "data", "eia", "builds", "phase1b", "seds.jsonl.gz");
const DEFAULT_JSON_REPORT_PATH = join(ROOT_DIR, "data", "eia", "reports", "aggregation-hierarchy-ranking-shadow.json");
const DEFAULT_MARKDOWN_REPORT_PATH = join(ROOT_DIR, "data", "eia", "reports", "aggregation-hierarchy-ranking-shadow.md");

export const HIERARCHY_RANKING_SHADOW_VERSION = "phase11-ranking-shadow-v1";

export async function runAggregationHierarchyRankingShadow(options = {}) {
  const artifact = options.artifact || JSON.parse(await readFile(options.artifactPath || DEFAULT_ARTIFACT_PATH, "utf8"));
  const geographyNames = options.geographyNames || await loadAggregateGeographyNames(
    options.sedsPath || DEFAULT_SEDS_PATH,
    new Set(artifact.relationships.map(relationship => relationship.aggregate.candidateId))
  );
  const pipeline = options.pipeline || buildLocalCandidatePipeline;
  const interpret = options.interpret || interpretQueryWithRules;
  const stateRelationships = artifact.relationships.filter(
    relationship => relationship.compatibility.sourceGeographyCode !== "US"
  );
  const cases = await mapWithConcurrency(stateRelationships, 4, async relationship => {
    const geographyName = geographyNames.get(relationship.aggregate.candidateId);
    const query = `${geographyName} total energy consumption`;
    const intent = interpret(query);
    const [baseline, shadow] = await Promise.all([
      pipeline(intent, { hierarchyMode: "off" }),
      pipeline(intent, { hierarchyMode: "shadow" })
    ]);
    const retrieval = findGeographyRetrieval(shadow, relationship.compatibility.geographyCode);
    const baselineRetrieval = findGeographyRetrieval(baseline, relationship.compatibility.geographyCode);
    const candidateById = new Map((retrieval?.rankedCandidates || []).map(candidate => [candidate.candidate_id, candidate]));
    const deterministicTopSeriesIds = (baselineRetrieval?.displayCandidates || []).map(candidate => candidate.series_id);
    const shadowTopSeriesIds = (retrieval?.hierarchyRanking?.shadowDisplayCandidateIds || [])
      .map(candidateId => candidateById.get(candidateId)?.series_id)
      .filter(Boolean);
    const visibleUnchanged = stableStringify(deterministicTopSeriesIds) === stableStringify(
      (retrieval?.displayCandidates || []).map(candidate => candidate.series_id)
    );
    const passed = shadowTopSeriesIds[0] === relationship.aggregate.seriesId &&
      retrieval?.hierarchyRanking?.changed === true &&
      visibleUnchanged;
    return {
      relationshipId: relationship.relationshipId,
      geographyCode: relationship.compatibility.geographyCode,
      geographyName,
      query,
      expectedAggregateSeriesId: relationship.aggregate.seriesId,
      deterministicTopSeriesIds,
      shadowTopSeriesIds,
      visibleUnchanged,
      passed,
      reason: retrieval?.hierarchyRanking?.reason || "hierarchy_shadow_missing"
    };
  });

  const national = artifact.relationships.find(relationship => relationship.compatibility.sourceGeographyCode === "US");
  const nationalIntent = interpret("United States total energy consumption");
  const nationalShadow = await pipeline(nationalIntent, { hierarchyMode: "shadow" });
  const nationalAggregateRetrieved = nationalShadow.retrievals.some(retrieval =>
    retrieval.rankedCandidates?.some(candidate => candidate.candidate_id === national.aggregate.candidateId)
  );
  const controls = await Promise.all([
    evaluateControl("Texas renewable energy consumption", pipeline, interpret),
    evaluateControl("Texas fossil fuel consumption", pipeline, interpret),
    evaluateControl("California electricity generation", pipeline, interpret)
  ]);
  const summary = {
    status: cases.every(item => item.passed) && controls.every(item => item.passed) ? "passed" : "blocked",
    activationRecommended: cases.every(item => item.passed) && controls.every(item => item.passed),
    stateOrDistrictCases: cases.length,
    stateOrDistrictAggregatesPromoted: cases.filter(item => item.passed).length,
    visibleOrdersChangedDuringShadow: cases.filter(item => !item.visibleUnchanged).length,
    controlCases: controls.length,
    controlCasesChanged: controls.filter(item => !item.passed).length,
    nationalRelationshipObservationValidated: Boolean(national),
    nationalAggregateRetrievedByCurrentPublicRoute: nationalAggregateRetrieved
  };
  const evidence = {
    runnerVersion: HIERARCHY_RANKING_SHADOW_VERSION,
    generatedArtifactHash: artifact.artifactHash,
    strategy: "same-tier same-score verified aggregate tie-break only",
    summary,
    cases,
    national: {
      relationshipId: national.relationshipId,
      expectedAggregateSeriesId: national.aggregate.seriesId,
      currentRouteFamily: nationalIntent.structuredIntent?.route?.family || nationalIntent.route?.family || null,
      aggregateRetrieved: nationalAggregateRetrieved,
      status: nationalAggregateRetrieved ? "eligible" : "not_applicable_current_domestic_route"
    },
    controls
  };
  const report = {
    schemaVersion: "1.0.0",
    runAt: options.runAt || new Date().toISOString(),
    ...evidence,
    evidenceHash: sha256(stableStringify(evidence))
  };

  if (options.writeReports !== false) {
    const jsonReportPath = resolve(options.jsonReportPath || DEFAULT_JSON_REPORT_PATH);
    const markdownReportPath = resolve(options.markdownReportPath || DEFAULT_MARKDOWN_REPORT_PATH);
    await Promise.all([
      mkdir(dirname(jsonReportPath), { recursive: true }),
      mkdir(dirname(markdownReportPath), { recursive: true })
    ]);
    await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(markdownReportPath, renderMarkdown(report), "utf8");
  }
  return report;
}

async function evaluateControl(query, pipeline, interpret) {
  const intent = interpret(query);
  const [baseline, shadow] = await Promise.all([
    pipeline(intent, { hierarchyMode: "off" }),
    pipeline(intent, { hierarchyMode: "shadow" })
  ]);
  const baselineTop = baseline.retrievals.flatMap(retrieval => retrieval.displayCandidates || []).map(candidate => candidate.series_id);
  const visibleTop = shadow.retrievals.flatMap(retrieval => retrieval.displayCandidates || []).map(candidate => candidate.series_id);
  const eligible = shadow.retrievals.some(retrieval => retrieval.hierarchyRanking?.eligible === true);
  return {
    query,
    passed: stableStringify(baselineTop) === stableStringify(visibleTop) && !eligible,
    hierarchyEligible: eligible,
    deterministicTopSeriesIds: baselineTop,
    visibleTopSeriesIds: visibleTop
  };
}

async function loadAggregateGeographyNames(sedsPath, candidateIds) {
  const names = new Map();
  const input = createReadStream(sedsPath).pipe(createGunzip());
  const lines = createInterface({ input, crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) continue;
    const record = JSON.parse(line);
    if (candidateIds.has(record.candidate_id)) names.set(record.candidate_id, record.geography?.name);
    if (names.size === candidateIds.size) break;
  }
  return names;
}

function findGeographyRetrieval(result, geographyCode) {
  return result.retrievals.find(retrieval => retrieval.geography?.code === geographyCode) || null;
}

function renderMarkdown(report) {
  return [
    "# EIA aggregation hierarchy ranking-shadow report",
    "",
    `Status: **${report.summary.status}**`,
    "",
    `Run: ${report.runAt}`,
    `Evidence hash: \`${report.evidenceHash}\``,
    "",
    "## Results",
    "",
    `- State/DC cases: ${report.summary.stateOrDistrictCases}`,
    `- Verified aggregates promoted to shadow top-one: ${report.summary.stateOrDistrictAggregatesPromoted}`,
    `- Visible orders changed during shadow: ${report.summary.visibleOrdersChangedDuringShadow}`,
    `- Control cases changed: ${report.summary.controlCasesChanged}`,
    `- U.S. observation relationship validated: ${report.summary.nationalRelationshipObservationValidated}`,
    `- U.S. aggregate retrieved by current public route: ${report.summary.nationalAggregateRetrievedByCurrentPublicRoute}`,
    "",
    "## Decision",
    "",
    report.summary.activationRecommended
      ? "The same-tier, same-score aggregate tie-break passed ranking shadow and may proceed to preview-only activation."
      : "Do not activate hierarchy ranking; ranking-shadow requirements did not pass.",
    "",
    "The U.S. national relationship remains outside ranking activation because the current public intent routes national total-energy requests to Domestic rather than SEDS.",
    ""
  ].join("\n");
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, values.length) }, worker));
  return results;
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const report = await runAggregationHierarchyRankingShadow();
  process.stdout.write(`${JSON.stringify({
    status: report.summary.status,
    activationRecommended: report.summary.activationRecommended,
    evidenceHash: report.evidenceHash,
    summary: report.summary
  }, null, 2)}\n`);
  if (!report.summary.activationRecommended) process.exitCode = 1;
}
