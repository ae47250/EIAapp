import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { stableStringify } from "./normalize.js";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_ARTIFACT_PATH = join(ROOT_DIR, "data", "eia", "builds", "phase1b", "aggregation-hierarchy.generated.json");
const DEFAULT_JSON_REPORT_PATH = join(ROOT_DIR, "data", "eia", "reports", "aggregation-hierarchy-shadow.json");
const DEFAULT_MARKDOWN_REPORT_PATH = join(ROOT_DIR, "data", "eia", "reports", "aggregation-hierarchy-shadow.md");
const EIA_SEDS_DATA_URL = "https://api.eia.gov/v2/seds/data/";

export const HIERARCHY_SHADOW_RUNNER_VERSION = "phase11-observation-shadow-v1";
export const HIERARCHY_SHADOW_LIMITS = Object.freeze({
  maximumRelationships: 52,
  maximumSeriesPerRelationship: 6,
  maximumRowsPerRequest: 5000,
  minimumCommonPeriods: 10,
  defaultConcurrency: 3,
  timeoutMs: 20_000,
  maximumAttempts: 2
});

export async function runAggregationHierarchyShadow(options = {}) {
  const artifactPath = resolve(options.artifactPath || DEFAULT_ARTIFACT_PATH);
  const jsonReportPath = resolve(options.jsonReportPath || DEFAULT_JSON_REPORT_PATH);
  const markdownReportPath = resolve(options.markdownReportPath || DEFAULT_MARKDOWN_REPORT_PATH);
  const apiKey = options.apiKey || process.env.EIA_API_KEY;
  if (!apiKey) throw new Error("EIA_API_KEY is required for hierarchy observation shadowing.");

  const artifact = options.artifact || JSON.parse(await readFile(artifactPath, "utf8"));
  validateBoundedArtifact(artifact);
  const concurrency = clampInteger(
    options.concurrency,
    1,
    HIERARCHY_SHADOW_LIMITS.defaultConcurrency,
    HIERARCHY_SHADOW_LIMITS.defaultConcurrency
  );
  const results = await mapWithConcurrency(artifact.relationships, concurrency, async relationship => {
    try {
      const fetched = await fetchRelationshipObservations(relationship, {
        apiKey,
        fetchImpl: options.fetchImpl || fetch,
        start: options.start || "1960",
        end: options.end || null,
        timeoutMs: options.timeoutMs || HIERARCHY_SHADOW_LIMITS.timeoutMs,
        maximumAttempts: options.maximumAttempts || HIERARCHY_SHADOW_LIMITS.maximumAttempts
      });
      return {
        relationshipId: relationship.relationshipId,
        templateId: relationship.templateId,
        geography: relationship.compatibility,
        request: fetched.request,
        ...evaluateRelationshipObservations(relationship, fetched.rows),
        apiStatus: "success",
        attempts: fetched.attempts
      };
    } catch (error) {
      return {
        relationshipId: relationship.relationshipId,
        templateId: relationship.templateId,
        geography: relationship.compatibility,
        status: "blocked",
        apiStatus: "failed",
        error: safeErrorReason(error)
      };
    }
  });

  const summary = summarizeShadowResults(results);
  const evidence = {
    runnerVersion: HIERARCHY_SHADOW_RUNNER_VERSION,
    generatedArtifactHash: artifact.artifactHash,
    generatedRelationshipHash: artifact.relationshipHash,
    sourceBuild: artifact.sourceBuild,
    configuration: {
      relationshipLimit: HIERARCHY_SHADOW_LIMITS.maximumRelationships,
      seriesPerRelationshipLimit: HIERARCHY_SHADOW_LIMITS.maximumSeriesPerRelationship,
      rowsPerRequestLimit: HIERARCHY_SHADOW_LIMITS.maximumRowsPerRequest,
      minimumCommonPeriods: HIERARCHY_SHADOW_LIMITS.minimumCommonPeriods,
      concurrency,
      start: options.start || "1960",
      end: options.end || null,
      tolerance: "half-unit rounding bound derived independently from aggregate and component decimal precision"
    },
    summary,
    relationships: results
  };
  const report = {
    schemaVersion: "1.0.0",
    runAt: options.runAt || new Date().toISOString(),
    ...evidence,
    evidenceHash: sha256(stableStringify(evidence))
  };

  if (options.writeReports !== false) {
    await Promise.all([
      mkdir(dirname(jsonReportPath), { recursive: true }),
      mkdir(dirname(markdownReportPath), { recursive: true })
    ]);
    await writeFile(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    await writeFile(markdownReportPath, renderShadowReportMarkdown(report), "utf8");
  }
  return report;
}

export async function fetchRelationshipObservations(relationship, options = {}) {
  const memberSeriesIds = [
    relationship.aggregate?.seriesId,
    ...(relationship.components || []).map(component => component.seriesId)
  ];
  if (relationship.compatibility?.routeFamily !== "seds") throw new Error("Only reviewed SEDS hierarchy relationships are supported.");
  if (memberSeriesIds.some(seriesId => !/^SEDS\.[A-Z0-9]+\.[A-Z]{2}\.A$/.test(seriesId || ""))) {
    throw new Error("Relationship contains an invalid SEDS annual series ID.");
  }
  if (memberSeriesIds.length > HIERARCHY_SHADOW_LIMITS.maximumSeriesPerRelationship) {
    throw new Error("Relationship exceeds the six-series shadow request limit.");
  }
  const sourceGeographyCode = relationship.compatibility?.sourceGeographyCode;
  const seriesCodes = memberSeriesIds.map(seriesCodeFromId);
  const url = buildSedsRequestUrl({
    apiKey: options.apiKey,
    sourceGeographyCode,
    seriesCodes,
    start: options.start,
    end: options.end
  });
  const maximumAttempts = clampInteger(options.maximumAttempts, 1, 2, HIERARCHY_SHADOW_LIMITS.maximumAttempts);
  let lastError;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs || HIERARCHY_SHADOW_LIMITS.timeoutMs);
    try {
      const response = await (options.fetchImpl || fetch)(url, { signal: controller.signal });
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("EIA returned a non-JSON hierarchy response.");
      }
      if (!response.ok) throw new Error(`EIA hierarchy request failed with HTTP ${response.status}.`);
      const rows = Array.isArray(json?.response?.data) ? json.response.data : [];
      const total = Number(json?.response?.total || rows.length);
      if (total > HIERARCHY_SHADOW_LIMITS.maximumRowsPerRequest) throw new Error("EIA hierarchy response exceeded the bounded row limit.");
      return {
        rows,
        attempts: attempt,
        request: {
          route: "/v2/seds/data/",
          sourceGeographyCode,
          seriesCodes,
          frequency: "annual",
          start: options.start || null,
          end: options.end || null,
          maximumRows: HIERARCHY_SHADOW_LIMITS.maximumRowsPerRequest
        }
      };
    } catch (error) {
      lastError = error?.name === "AbortError" ? new Error("EIA hierarchy request timed out.") : error;
      if (attempt === maximumAttempts || !isRetryable(error)) break;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

export function evaluateRelationshipObservations(relationship, rows) {
  const aggregateCode = seriesCodeFromId(relationship.aggregate?.seriesId);
  const componentCodes = (relationship.components || []).map(component => seriesCodeFromId(component.seriesId));
  const requiredCodes = [aggregateCode, ...componentCodes];
  const series = new Map(requiredCodes.map(code => [code, new Map()]));
  const duplicateObservations = [];

  for (const row of rows || []) {
    const code = String(row?.seriesId || "").trim();
    const period = String(row?.period || "").trim();
    if (!series.has(code) || !period) continue;
    const parsed = parseNumericObservation(row.value);
    if (!parsed) continue;
    if (series.get(code).has(period)) {
      duplicateObservations.push(`${code}:${period}`);
      continue;
    }
    series.get(code).set(period, parsed);
  }

  const missingSeries = requiredCodes.filter(code => series.get(code).size === 0);
  const allPeriods = new Set([...series.values()].flatMap(values => [...values.keys()]));
  const commonPeriods = [...allPeriods]
    .filter(period => requiredCodes.every(code => series.get(code).has(period)))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
  const checks = [];
  let negativeComponentObservationCount = 0;
  let zeroAggregatePeriods = 0;

  for (const period of commonPeriods) {
    const aggregate = series.get(aggregateCode).get(period);
    const components = componentCodes.map(code => series.get(code).get(period));
    negativeComponentObservationCount += components.filter(component => component.value < 0).length;
    if (aggregate.value === 0) zeroAggregatePeriods += 1;
    const componentSum = components.reduce((sum, component) => sum + component.value, 0);
    const difference = aggregate.value - componentSum;
    const tolerance = roundingTolerance(aggregate, components);
    const epsilon = Number.EPSILON * Math.max(1, Math.abs(aggregate.value));
    checks.push({
      period,
      aggregate: aggregate.value,
      componentSum: cleanNumber(componentSum),
      difference: cleanNumber(difference),
      tolerance,
      passed: Math.abs(difference) <= tolerance + epsilon
    });
  }

  const mismatches = checks.filter(check => !check.passed);
  const status = missingSeries.length === 0 &&
    duplicateObservations.length === 0 &&
    commonPeriods.length >= HIERARCHY_SHADOW_LIMITS.minimumCommonPeriods &&
    mismatches.length === 0
    ? "passed"
    : "blocked";
  const maximumDifference = maximum(checks.map(check => Math.abs(check.difference)));
  const worstChecks = checks
    .toSorted((left, right) => Math.abs(right.difference) - Math.abs(left.difference) || right.period.localeCompare(left.period))
    .slice(0, 3);
  const observationEvidence = Object.fromEntries(requiredCodes.map(code => [
    code,
    [...series.get(code)].map(([period, observation]) => [period, observation.raw])
  ]));

  return {
    status,
    requiredSeriesCodes: requiredCodes,
    seriesObservationCounts: Object.fromEntries(requiredCodes.map(code => [code, series.get(code).size])),
    commonPeriodCount: commonPeriods.length,
    firstCommonPeriod: commonPeriods[0] || null,
    lastCommonPeriod: commonPeriods.at(-1) || null,
    incompletePeriodCount: allPeriods.size - commonPeriods.length,
    missingSeries,
    duplicateObservations,
    mismatchCount: mismatches.length,
    maximumAbsoluteDifference: maximumDifference,
    negativeComponentObservationCount,
    zeroAggregatePeriods,
    worstChecks,
    observationEvidenceHash: sha256(stableStringify(observationEvidence))
  };
}

export function renderShadowReportMarkdown(report) {
  const summary = report.summary;
  const failures = report.relationships.filter(relationship => relationship.status !== "passed");
  const lines = [
    "# EIA aggregation hierarchy observation-shadow report",
    "",
    `Status: **${summary.status}**`,
    "",
    `Run: ${report.runAt}`,
    `Runner: \`${report.runnerVersion}\``,
    `Generated artifact: \`${report.generatedArtifactHash}\``,
    `Evidence hash: \`${report.evidenceHash}\``,
    "",
    "## Results",
    "",
    `- Relationships requested: ${summary.relationshipsRequested}`,
    `- Relationships passed: ${summary.relationshipsPassed}`,
    `- Relationships blocked: ${summary.relationshipsBlocked}`,
    `- API failures: ${summary.apiFailures}`,
    `- Common periods checked: ${summary.commonPeriodsChecked}`,
    `- Formula mismatches: ${summary.formulaMismatches}`,
    `- Negative component observations: ${summary.negativeComponentObservations}`,
    `- Zero aggregate periods: ${summary.zeroAggregatePeriods}`,
    `- Maximum absolute residual: ${summary.maximumAbsoluteDifference}`,
    "",
    "## Gate",
    "",
    summary.activationRecommended
      ? "Observation evidence passed. Hierarchy ranking may proceed to non-user-visible shadow comparison; public activation still requires a separate explicit gate."
      : "Observation evidence did not pass. Do not connect hierarchy evidence to ranking or contribution calculations.",
    "",
    "## Blocked relationships",
    ""
  ];
  if (failures.length === 0) lines.push("None.");
  else {
    for (const failure of failures) {
      lines.push(`- \`${failure.relationshipId}\`: ${failure.error || `${failure.mismatchCount || 0} mismatches, ${failure.commonPeriodCount || 0} common periods`}`);
    }
  }
  lines.push("", "API keys and raw request URLs are not stored in this report.", "");
  return lines.join("\n");
}

function buildSedsRequestUrl({ apiKey, sourceGeographyCode, seriesCodes, start, end }) {
  const url = new URL(EIA_SEDS_DATA_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "annual");
  url.searchParams.append("data[0]", "value");
  url.searchParams.append("facets[stateId][]", sourceGeographyCode);
  for (const seriesCode of seriesCodes) url.searchParams.append("facets[seriesId][]", seriesCode);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "asc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", String(HIERARCHY_SHADOW_LIMITS.maximumRowsPerRequest));
  return url;
}

function validateBoundedArtifact(artifact) {
  const relationships = artifact?.relationships || [];
  if (artifact?.status !== "shadow_ready_inactive") throw new Error("Hierarchy artifact is not approved for shadow preparation.");
  if (relationships.length === 0 || relationships.length > HIERARCHY_SHADOW_LIMITS.maximumRelationships) {
    throw new Error("Hierarchy artifact exceeds the 52-relationship shadow limit.");
  }
  for (const relationship of relationships) {
    const count = 1 + (relationship.components || []).length;
    if (count < 2 || count > HIERARCHY_SHADOW_LIMITS.maximumSeriesPerRelationship) {
      throw new Error(`Relationship ${relationship.relationshipId || "unknown"} violates the series bound.`);
    }
  }
}

function summarizeShadowResults(results) {
  const passed = results.filter(result => result.status === "passed");
  const apiFailures = results.filter(result => result.apiStatus === "failed");
  const formulaMismatches = results.reduce((sum, result) => sum + Number(result.mismatchCount || 0), 0);
  const blocked = results.length - passed.length;
  return {
    status: blocked === 0 ? "passed" : "blocked",
    activationRecommended: blocked === 0 && apiFailures.length === 0 && formulaMismatches === 0,
    relationshipsRequested: results.length,
    relationshipsPassed: passed.length,
    relationshipsBlocked: blocked,
    apiFailures: apiFailures.length,
    commonPeriodsChecked: results.reduce((sum, result) => sum + Number(result.commonPeriodCount || 0), 0),
    formulaMismatches,
    negativeComponentObservations: results.reduce((sum, result) => sum + Number(result.negativeComponentObservationCount || 0), 0),
    zeroAggregatePeriods: results.reduce((sum, result) => sum + Number(result.zeroAggregatePeriods || 0), 0),
    maximumAbsoluteDifference: maximum(results.map(result => Number(result.maximumAbsoluteDifference || 0)))
  };
}

function parseNumericObservation(value) {
  const raw = String(value ?? "").replaceAll(",", "").trim();
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(raw)) return null;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) return null;
  const decimalPlaces = raw.includes(".") ? raw.length - raw.indexOf(".") - 1 : 0;
  return { value: numeric, resolution: 10 ** -decimalPlaces, raw };
}

function roundingTolerance(aggregate, components) {
  const rawTolerance = 0.5 * (aggregate.resolution + components.reduce((sum, component) => sum + component.resolution, 0));
  return cleanNumber(rawTolerance);
}

function seriesCodeFromId(seriesId) {
  return String(seriesId || "").split(".")[1] || "";
}

function isRetryable(error) {
  const message = String(error?.message || "");
  return error?.name === "AbortError" || /HTTP (429|5\d\d)/.test(message);
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

function clampInteger(value, minimum, maximumValue, fallback) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximumValue, parsed));
}

function maximum(values) {
  return values.length ? Math.max(...values) : 0;
}

function cleanNumber(value) {
  return Number(value.toPrecision(15));
}

function safeErrorReason(error) {
  return String(error?.message || "unknown_error").replace(/api_key=[^&\s]+/gi, "api_key=[redacted]").slice(0, 240);
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function parseArguments(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!name?.startsWith("--") || !value) throw new Error("Arguments must use --name value pairs.");
    options[name.slice(2)] = value;
  }
  return options;
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
  const args = parseArguments(process.argv.slice(2));
  const report = await runAggregationHierarchyShadow({
    concurrency: args.concurrency,
    start: args.start,
    end: args.end,
    jsonReportPath: args["json-report"],
    markdownReportPath: args["markdown-report"]
  });
  process.stdout.write(`${JSON.stringify({
    status: report.summary.status,
    activationRecommended: report.summary.activationRecommended,
    evidenceHash: report.evidenceHash,
    summary: report.summary
  }, null, 2)}\n`);
  if (!report.summary.activationRecommended) process.exitCode = 1;
}
