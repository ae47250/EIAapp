import { requireAuthentication } from "../../auth.js";
import { buildLocalCandidatePipeline } from "./candidate-pipeline.js";
import { cleanQueryMechanically, interpretQuery, normalizeSubmittedIntent } from "./interpret-query.js";
import { RESULT_CERTAINTY_VERSION, buildRankedResultCertainty } from "./result-certainty.js";

const SOURCE = "U.S. Energy Information Administration API and validated local EIA metadata";
const PUBLIC_CANDIDATE_LIMIT = 10;
const MAX_SERIES_ROWS = 5000;
const EIA_TIMEOUT_MS = 20_000;

export default async function candidateSearchHandler(req, res) {
  setJsonHeaders(res);
  if (!requireAuthentication(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed.", userMessage: "Use the search box on the webpage or send a GET request." });
  }

  const originalQuery = String(req.query.q || "");
  const query = cleanQueryMechanically(originalQuery);
  if (!query) return res.status(400).json({ error: "Missing search query.", userMessage: "Enter a geography and energy topic." });
  if (query.length > 240) return res.status(400).json({ error: "Search query is too long.", userMessage: "Use a shorter geography and energy topic search." });

  try {
    const intent = req.query.intentReady === "1"
      ? normalizeSubmittedIntent(parseSubmittedIntent(req.query), originalQuery)
      : await interpretQuery(originalQuery);
    const pipeline = await buildLocalCandidatePipeline(intent);
    const candidateGroups = buildPublicGroups(pipeline.retrievals || [], intent);
    const variables = candidateGroups.flatMap(group => group.candidates);
    const candidateId = cleanCandidateId(req.query.candidateId);

    if (candidateId && !pipeline.diagnostics?.clarificationBlocked) {
      const candidate = variables.find(item => item.candidateId === candidateId);
      if (!candidate) {
        return res.status(400).json({
          error: "Candidate is not valid for this query.",
          userMessage: "Run the search again and select one of the displayed EIA series."
        });
      }
      const apiKey = process.env.EIA_API_KEY;
      if (!apiKey) {
        return res.status(500).json({
          error: "Missing EIA_API_KEY environment variable.",
          userMessage: "The EIA API key is missing in Vercel. Add EIA_API_KEY under Project Settings -> Environment Variables, then redeploy."
        });
      }
      const selectedSeries = await fetchVerifiedSeries(candidate, apiKey);
      if (!selectedSeries) {
        return res.status(200).json({
          mode: "candidate-selection",
          query,
          intent,
          source: SOURCE,
          selectedSeries: null,
          candidateId,
          emptySeries: true,
          note: "EIA returned no numeric observations for the verified selected series."
        });
      }
      return res.status(200).json({
        mode: "candidate-selection",
        query,
        intent,
        source: SOURCE,
        selectedSeries,
        candidateId,
        note: "Observations were fetched only after explicit selection of a locally verified EIA series."
      });
    }

    const userWarnings = dedupeWarnings((pipeline.retrievals || []).flatMap(retrieval => retrieval.userWarnings || []));
    const needsClarification = variables.length === 0 && Boolean(intent.needsClarification || userWarnings.some(warning => warning.code === "unresolved_qualifier_requires_clarification"));
    return res.status(200).json({
      mode: "candidate-selection",
      query,
      intent,
      source: SOURCE,
      selectedSeries: null,
      variables,
      candidateGroups,
      userWarnings,
      needsClarification,
      userMessage: needsClarification
        ? intent.clarificationMessage || userWarnings[0]?.message || "Clarify the request before selecting a series."
        : variables.length === 0 ? "No validated EIA candidates were found. No substitute was selected." : null,
      diagnostics: {
        candidatePipelineVersion: pipeline.diagnostics?.candidatePipelineVersion || null,
        rankingConfigVersion: pipeline.diagnostics?.rankingConfigVersion || null,
        rankingTaxonomyVersion: pipeline.diagnostics?.rankingTaxonomyVersion || null,
        resultCertaintyVersion: RESULT_CERTAINTY_VERSION,
        hierarchyRankingConfigVersion: pipeline.diagnostics?.hierarchyRankingConfigVersion || null,
        hierarchyRankingMode: pipeline.diagnostics?.hierarchyRankingMode || "off",
        hierarchyEvidenceStatus: pipeline.diagnostics?.hierarchyEvidenceStatus || "none",
        verifiedHierarchyRelationshipCount: pipeline.diagnostics?.verifiedHierarchyRelationshipCount || 0,
        hierarchyPreferenceApplied: pipeline.diagnostics?.hierarchyPreferenceApplied === true,
        rankingApplied: pipeline.diagnostics?.rankingApplied === true,
        clarificationBlocked: pipeline.diagnostics?.clarificationBlocked === true,
        clarificationReasons: pipeline.diagnostics?.clarificationReasons || [],
        semanticRerankingApplied: false,
        initialDisplayLimit: PUBLIC_CANDIDATE_LIMIT,
        displayedCandidateCount: variables.length
      },
      note: variables.length > 0
        ? `Choose Graph or Excel for one of the ${variables.length} displayed series. No series was selected automatically.`
        : "No observations were fetched."
    });
  } catch (error) {
    return res.status(500).json({
      error: "Server error while preparing EIA candidates.",
      userMessage: friendlyErrorMessage(error)
    });
  }
}

function buildPublicGroups(retrievals, intent) {
  const groups = [];
  let remaining = PUBLIC_CANDIDATE_LIMIT;
  for (const retrieval of retrievals) {
    for (const group of retrieval.interpretationGroups || []) {
      if (!group.defaultVisible || remaining <= 0) continue;
      const candidates = group.candidates.slice(0, remaining).map(candidate => serializeCandidate(candidate, retrieval, group, intent));
      if (candidates.length === 0) continue;
      groups.push({
        id: `${retrieval.geography?.code || "unknown"}:${retrieval.concept?.product || "unknown"}:${group.id}`,
        label: group.label,
        product: retrieval.concept?.product || null,
        activity: group.activity,
        measureType: group.measureType,
        technical: group.technical,
        geography: retrieval.geography || null,
        warnings: retrieval.userWarnings || [],
        candidates
      });
      remaining -= candidates.length;
    }
  }
  return groups;
}

function serializeCandidate(candidate, retrieval, group, intent) {
  return {
    candidateId: candidate.candidate_id,
    seriesId: candidate.series_id,
    title: candidate.title,
    product: retrieval.concept?.product || candidate.product_or_scope || null,
    activity: group.activity,
    measureType: group.measureType,
    geography: candidate.geography || retrieval.geography || null,
    routeFamily: candidate.route_family,
    frequency: candidate.frequency,
    unit: candidate.unit,
    coverage: formatCoverage(candidate.date_start, candidate.date_end),
    dateStart: candidate.date_start || null,
    dateEnd: candidate.date_end || null,
    rankingTier: candidate.ranking?.tier || null,
    score: candidate.ranking?.score ?? null,
    reasons: candidate.ranking?.reasonCodes || [],
    warnings: candidate.ranking?.warnings || [],
    certainty: buildRankedResultCertainty(intent, candidate),
    fallback: candidate.ranking?.tier === "B"
  };
}

async function fetchVerifiedSeries(candidate, apiKey) {
  const url = new URL(`https://api.eia.gov/v2/seriesid/${encodeURIComponent(candidate.seriesId)}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("length", String(MAX_SERIES_ROWS));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EIA_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error("EIA returned a non-JSON response.");
    }
    if (!response.ok) throw new Error(`EIA request failed with HTTP ${response.status}.`);
    const rows = Array.isArray(json?.response?.data) ? json.response.data : [];
    const measureField = resolveMeasureField(rows);
    const points = cleanDataRows(rows, measureField);
    if (points.length === 0) return null;
    const latest = points[points.length - 1];
    const sample = rows[0] || {};
    return {
      candidateId: candidate.candidateId,
      seriesId: candidate.seriesId,
      selectorVerified: true,
      title: candidate.title,
      product: candidate.product,
      activity: candidate.activity,
      country: candidate.geography?.name || "",
      countryCode: candidate.geography?.code || "",
      geographyType: candidate.geography?.type || null,
      routeFamily: candidate.routeFamily,
      frequency: candidate.frequency,
      unit: sample[`${measureField}-units`] || sample["value-units"] || sample.units || sample.unit || candidate.unit,
      measureField,
      coverage: { start: points[0].period, end: latest.period, count: points.length },
      latestPeriod: latest.period,
      latestValue: latest.value,
      certainty: candidate.certainty,
      points
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("The EIA observation request timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanDataRows(rows, measureField) {
  const points = [];
  const seen = new Set();
  for (const row of rows) {
    const period = String(row?.period || "").trim();
    const value = toNumber(row?.[measureField]);
    if (!period || !Number.isFinite(value) || seen.has(period)) continue;
    seen.add(period);
    points.push({ period, value });
  }
  return points.sort((left, right) => left.period.localeCompare(right.period, undefined, { numeric: true, sensitivity: "base" }));
}

function resolveMeasureField(rows) {
  const sample = rows.find(row => row && typeof row === "object") || {};
  if (Object.hasOwn(sample, "value")) return "value";

  const unitField = Object.keys(sample).find(key => key.endsWith("-units") && Object.hasOwn(sample, key.slice(0, -6)));
  if (unitField) return unitField.slice(0, -6);

  const excluded = new Set(["period", "unit", "units"]);
  return Object.keys(sample).find(key => {
    const normalized = key.toLowerCase();
    if (excluded.has(normalized) || normalized.endsWith("id") || normalized.endsWith("code") || normalized.endsWith("description")) return false;
    return rows.some(row => Number.isFinite(toNumber(row?.[key])));
  }) || "value";
}

function parseSubmittedIntent(query) {
  const payload = String(query.intentPayload || "");
  if (payload && payload.length <= 12000) {
    try {
      const parsed = JSON.parse(payload);
      if (parsed && typeof parsed === "object") return parsed;
    } catch {}
  }
  return {
    correctedQuery: query.intentCorrectedQuery,
    correctedQuerySource: query.intentCorrectedQuerySource,
    interpreter: query.intentInterpreter,
    countryCode: query.intentCountryCode,
    product: query.intentProduct,
    activity: query.intentActivity,
    frequency: query.intentFrequency,
    confidence: query.intentConfidence
  };
}

function cleanCandidateId(value) {
  const text = String(value || "").trim();
  return text && text.length <= 240 ? text : "";
}

function formatCoverage(start, end) {
  if (!start && !end) return "Unknown";
  return start === end ? String(start) : `${start || "?"} to ${end || "?"}`;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const cleaned = value.replaceAll(",", "").trim();
  return cleaned && cleaned.toLowerCase() !== "na" ? Number(cleaned) : Number.NaN;
}

function dedupeWarnings(warnings) {
  return [...new Map(warnings.map(warning => [`${warning.code}:${warning.message}`, warning])).values()];
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}

function friendlyErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("timed out")) return "The EIA API request timed out. Try the same selection again.";
  if (message.includes("non-JSON")) return "EIA returned an unexpected response. Check the Vercel function logs.";
  if (message.includes("HTTP")) return "EIA rejected the verified series request. Try the search again.";
  return "The EIA candidate search failed. Try again or check the server logs.";
}
