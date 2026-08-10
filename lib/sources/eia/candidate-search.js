import { requireAuthentication } from "../../auth.js";
import { buildLocalCandidatePipeline } from "./candidate-pipeline.js";
import { cleanQueryMechanically, interpretQuery, normalizeSubmittedIntent } from "./interpret-query.js";
import { getSafeUnitConversion } from "./multi-country-comparison.js";
import { RESULT_CERTAINTY_VERSION, buildRankedResultCertainty } from "./result-certainty.js";

const SOURCE = "U.S. Energy Information Administration API and validated local EIA metadata";
const PUBLIC_CANDIDATE_LIMIT = 10;
const COMPARISON_DEFINITION_LIMIT = 5;
const OBSERVATION_FETCH_CONCURRENCY = 4;
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
    const comparisonMode = pipeline.comparisonMode === true;
    const comparisonDefinitions = comparisonMode
      ? buildPublicComparisonDefinitions(pipeline.comparisonDefinitions || [], intent)
      : [];
    const candidateGroups = comparisonMode ? [] : buildPublicGroups(pipeline.retrievals || [], intent);
    const variables = candidateGroups.flatMap(group => group.candidates);
    const candidateId = cleanCandidateId(req.query.candidateId);
    const definitionIds = cleanDefinitionIds(req.query.definitionIds || req.query.definitionId);

    if (definitionIds.length > 0 && !pipeline.diagnostics?.clarificationBlocked) {
      const selectedDefinitions = definitionIds.map(id => comparisonDefinitions.find(definition => definition.definitionId === id));
      if (!comparisonMode || selectedDefinitions.some(definition => !definition)) {
        return res.status(400).json({
          error: "Comparison definition is not valid for this query.",
          userMessage: "Run the comparison again and select one of the displayed variable definitions."
        });
      }
      const apiKey = process.env.EIA_API_KEY;
      if (!apiKey) return missingApiKeyResponse(res);
      const selectedComparisons = await fetchSelectedComparisons(selectedDefinitions, apiKey);
      return res.status(200).json({
        mode: "candidate-selection",
        comparisonMode: true,
        query,
        intent,
        source: SOURCE,
        selectedSeries: null,
        selectedComparison: selectedComparisons[0] || null,
        selectedComparisons,
        comparisonDefinitions,
        definitionIds,
        note: "Observations were fetched for every available country only after explicit definition selection. Country failures remain visible as warnings."
      });
    }

    if (candidateId && !pipeline.diagnostics?.clarificationBlocked) {
      const candidate = variables.find(item => item.candidateId === candidateId);
      if (!candidate) {
        return res.status(400).json({
          error: "Candidate is not valid for this query.",
          userMessage: "Run the search again and select one of the displayed EIA series."
        });
      }
      const apiKey = process.env.EIA_API_KEY;
      if (!apiKey) return missingApiKeyResponse(res);
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
    const resultCount = comparisonMode ? comparisonDefinitions.length : variables.length;
    const needsClarification = resultCount === 0 && Boolean(intent.needsClarification || userWarnings.some(warning => warning.code === "unresolved_qualifier_requires_clarification"));
    return res.status(200).json({
      mode: "candidate-selection",
      comparisonMode,
      query,
      intent,
      source: SOURCE,
      selectedSeries: null,
      variables,
      candidateGroups,
      comparisonDefinitions,
      userWarnings,
      needsClarification,
      userMessage: needsClarification
        ? intent.clarificationMessage || userWarnings[0]?.message || "Clarify the request before selecting a series."
        : resultCount === 0 ? "No validated EIA candidates were found. No substitute was selected." : null,
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
        displayedCandidateCount: variables.length,
        rankedDefinitionLimit: COMPARISON_DEFINITION_LIMIT,
        displayedDefinitionCount: comparisonDefinitions.length,
        rankingUnit: pipeline.diagnostics?.multiCountryComparison?.rankingUnit || "country_series"
      },
      note: comparisonMode && comparisonDefinitions.length > 0
        ? `Choose Graph or Excel for one of the ${comparisonDefinitions.length} ranked variable definitions. Each choice keeps every requested country.`
        : variables.length > 0
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

function buildPublicComparisonDefinitions(definitions, intent) {
  return definitions.slice(0, COMPARISON_DEFINITION_LIMIT).map(definition => ({
    definitionId: definition.definitionId,
    rank: definition.rank,
    title: definition.title,
    semanticScore: definition.semanticScore,
    rankingTier: definition.rankingTier,
    rankingReasonCodes: definition.rankingReasonCodes,
    availableCountryCount: definition.availableCountryCount,
    requestedCountryCount: definition.requestedCountryCount,
    definition: {
      product: definition.signature?.product || null,
      activity: definition.signature?.activity || null,
      sector: definition.signature?.sector || null,
      scope: definition.signature?.scope || null,
      frequency: definition.signature?.frequency || null,
      unit: definition.signature?.unit || null,
      grossNetTreatment: definition.signature?.grossNetTreatment || "unspecified",
      source: definition.signature?.source || "eia",
      methodology: definition.signature?.methodology || null
    },
    countries: definition.countries.map(country => serializeComparisonCountry(country, definition, intent)),
    warnings: definition.warnings || []
  }));
}

function serializeComparisonCountry(country, definition, intent) {
  const candidate = country.candidate;
  return {
    geography: country.geography,
    candidateId: country.candidateId,
    seriesId: country.seriesId,
    title: candidate?.title || definition.title,
    product: definition.signature?.product || candidate?.product_or_scope || null,
    activity: definition.signature?.activity || candidate?.activity || null,
    routeFamily: candidate?.route_family || definition.signature?.routeFamily || null,
    frequency: candidate?.frequency || definition.signature?.frequency || null,
    unit: candidate?.unit || null,
    dateStart: candidate?.date_start || null,
    dateEnd: candidate?.date_end || null,
    coverage: candidate ? formatCoverage(candidate.date_start, candidate.date_end) : "Unavailable",
    status: country.status,
    warning: country.warning,
    unitConversion: country.unitConversion || null,
    certainty: candidate ? buildRankedResultCertainty(intent, candidate) : null
  };
}

async function fetchSelectedComparisons(definitions, apiKey) {
  const tasks = definitions.flatMap(definition => definition.countries
    .filter(country => country.candidateId && country.seriesId)
    .map(country => ({ definitionId: definition.definitionId, country })));
  const fetched = await mapWithConcurrency(tasks, OBSERVATION_FETCH_CONCURRENCY, async task => {
    try {
      return { ...task, series: await fetchVerifiedSeries(task.country, apiKey), error: null };
    } catch (error) {
      return { ...task, series: null, error };
    }
  });
  const fetchedByKey = new Map(fetched.map(item => [`${item.definitionId}:${item.country.geography.code}`, item]));
  return definitions.map(definition => finalizeSelectedComparison(definition, fetchedByKey));
}

function finalizeSelectedComparison(definition, fetchedByKey) {
  const countries = definition.countries.map(country => {
    if (!country.candidateId || !country.seriesId) {
      return {
        ...country,
        status: "variable_unavailable",
        warningType: "variable_unavailable",
        warning: `${country.geography.name}: no matching variable is available.`,
        series: null
      };
    }
    const fetched = fetchedByKey.get(`${definition.definitionId}:${country.geography.code}`);
    if (!fetched?.series) {
      return {
        ...country,
        status: "missing_observations",
        warningType: fetched?.error ? "observation_fetch_failed" : "missing_observations",
        warning: fetched?.error
          ? `${country.geography.name}: observations could not be retrieved; other countries are still shown.`
          : `${country.geography.name}: no observations were found for this variable.`,
        series: null
      };
    }
    return { ...country, series: fetched.series };
  });
  const reference = countries.find(country => country.series)?.series || null;
  const validatedCountries = countries.map(country => validateFetchedCountry(country, reference));
  const warnings = validatedCountries.filter(country => country.warning).map(country => ({
    code: country.warningType || country.status,
    geographyCode: country.geography.code,
    message: country.warning
  }));
  return {
    ...definition,
    countries: validatedCountries,
    warnings,
    availableCountryCount: validatedCountries.filter(country => country.series).length,
    missingCountryCount: validatedCountries.filter(country => !country.series).length
  };
}

function validateFetchedCountry(country, reference) {
  if (!country.series || !reference) return country;
  const conversion = getSafeUnitConversion(country.series.unit, reference.unit);
  if (!conversion) {
    return {
      ...country,
      status: "unit_mismatch",
      warningType: "unit_mismatch",
      warning: `${country.geography.name}: ${country.series.unit || "unknown units"} cannot be safely compared with ${reference.unit || "the reference units"}.`
    };
  }
  const convertedSeries = conversion.required ? convertSeries(country.series, conversion) : {
    ...country.series,
    originalUnit: country.series.unit,
    convertedUnit: null
  };
  const partialCoverage = convertedSeries.coverage?.start !== reference.coverage?.start || convertedSeries.coverage?.end !== reference.coverage?.end;
  if (partialCoverage) {
    return {
      ...country,
      series: convertedSeries,
      status: "partial_coverage",
      warningType: "partial_coverage",
      warning: `${country.geography.name}: coverage is ${formatCoverage(convertedSeries.coverage?.start, convertedSeries.coverage?.end)}; the comparison reference is ${formatCoverage(reference.coverage?.start, reference.coverage?.end)}.`
    };
  }
  if (conversion.required) {
    return {
      ...country,
      series: convertedSeries,
      status: "comparable_after_safe_unit_conversion",
      warningType: "safe_unit_conversion",
      warning: `${country.geography.name}: values were safely converted from ${conversion.originalUnit} to ${conversion.convertedUnit}.`
    };
  }
  return { ...country, series: convertedSeries, status: country.status === "partial_coverage" ? country.status : "comparable" };
}

function convertSeries(series, conversion) {
  return {
    ...series,
    originalUnit: series.unit,
    convertedUnit: conversion.convertedUnit,
    unit: conversion.convertedUnit,
    points: series.points.map(point => ({ ...point, originalValue: point.value, value: point.value * conversion.factor })),
    latestValue: Number.isFinite(series.latestValue) ? series.latestValue * conversion.factor : series.latestValue
  };
}

async function mapWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;
  async function run() {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, run));
  return results;
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

function cleanDefinitionIds(value) {
  return [...new Set(String(value || "").split(",").map(item => item.trim()).filter(item => item && item.length <= 120))]
    .slice(0, COMPARISON_DEFINITION_LIMIT);
}

function missingApiKeyResponse(res) {
  return res.status(500).json({
    error: "Missing EIA_API_KEY environment variable.",
    userMessage: "The EIA API key is missing in Vercel. Add EIA_API_KEY under Project Settings -> Environment Variables, then redeploy."
  });
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
