import { cleanQueryMechanically, interpretQuery, findCountryByCode, hasPhrase, normalizeSubmittedIntent, normalizeText } from "./interpret-query.js";
import { requireAuthentication } from "../../auth.js";
import { buildLegacyResultCertainty } from "./result-certainty.js";

const EIA_BASE_URL = "https://api.eia.gov/v2/international";
const DEFAULT_FREQUENCY = "annual";
const MAX_BROAD_ROWS = 5000;
const MAX_SERIES_ROWS = 5000;
const VARIABLE_LIMIT = 12;
const CACHE_TTL_MS = 10 * 60 * 1000;
const COUNTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHE_ITEMS = 150;
const MAX_EIA_ATTEMPTS = 2;
const SOURCE = "U.S. Energy Information Administration API, International Energy Statistics";
const LEGACY_ENTITY_NAMES = new Set([
  "former czechoslovakia",
  "former serbia and montenegro",
  "former u s s r",
  "former yugoslavia",
  "germany east",
  "germany west",
  "hawaiian trade zone"
]);

const cache = globalThis.__EIA_APP_CACHE__ || new Map();
globalThis.__EIA_APP_CACHE__ = cache;

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (!requireAuthentication(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed.", userMessage: "Use the search box on the webpage or send a GET request." });
  }

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Missing EIA_API_KEY environment variable.",
      userMessage: "The EIA API key is missing in Vercel. Add EIA_API_KEY under Project Settings -> Environment Variables, then redeploy."
    });
  }

  const originalQuery = String(req.query.q || "");
  const query = cleanQueryMechanically(originalQuery);
  if (!query) {
    return res.status(400).json({ error: "Missing search query.", userMessage: "Enter a search such as Brazil energy consumption." });
  }
  if (query.length > 240) {
    return res.status(400).json({ error: "Search query is too long.", userMessage: "Use a shorter country and energy topic search." });
  }

  try {
    const countries = await getEiaCountries(apiKey);
    const intent = req.query.intentReady === "1"
      ? normalizeSubmittedIntent(parseSubmittedIntent(req.query), originalQuery, countries)
      : await interpretQuery(originalQuery, countries);
    const country = resolveCountry(req.query.country, intent, countries);
    const frequency = sanitizeFrequency(req.query.frequency || intent.frequency || DEFAULT_FREQUENCY);
    const productId = cleanFacet(req.query.productId);
    const activityId = cleanFacet(req.query.activityId);
    const unit = cleanFacet(req.query.unit);

    if (!country) {
      return res.status(200).json({
        query,
        intent,
        needsCountry: true,
        selectedSeries: null,
        variables: [],
        userMessage: "Please include one country name. Examples: Brazil energy consumption, Jordan electricity generation, Mexico natural gas production."
      });
    }

    if (intent.needsClarification || !intent.product || !intent.activity) {
      return res.status(200).json({
        query,
        country,
        intent,
        needsClarification: true,
        selectedSeries: null,
        variables: [],
        userMessage: intent.clarificationMessage || "Please clarify the energy product and activity before searching EIA data."
      });
    }

    if (productId && activityId && unit) {
      const selectedSeries = await fetchExactSeries({ apiKey, country, productId, activityId, unit, frequency });
      if (!selectedSeries) {
        return res.status(200).json({
          query,
          country,
          intent,
          source: SOURCE,
          selectedSeries: null,
          variables: [],
          emptySeries: true,
          note: "EIA returned no numeric observations for this exact series. The empty series should be hidden."
        });
      }
      if (selectedSeries) selectedSeries.certainty = buildLegacyResultCertainty(intent);
      return res.status(200).json({ query, country, intent, source: SOURCE, selectedSeries, variables: [], note: "Coverage is computed from actual observations returned for the selected EIA series." });
    }

    const payload = await buildSingleCountrySearch({ apiKey, country, query, intent, frequency });
    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: "Server error while contacting EIA API.",
      userMessage: friendlyErrorMessage(error)
    });
  }
}

async function buildSingleCountrySearch({ apiKey, country, query, intent, frequency }) {
  const broadRows = await fetchCountryRows({ apiKey, countryCode: country.code, frequency });

  if (broadRows.length === 0) {
    if (isLegacyEntity(country)) return buildLegacyEntityResult({ query, country, intent });
    return { query, country, intent, selectedSeries: null, variables: [], userMessage: `EIA returned no ${frequency} international rows for ${country.name}.` };
  }

  const rawCandidates = buildCandidateVariables(broadRows, intent, query).slice(0, VARIABLE_LIMIT);
  if (rawCandidates.length === 0) {
    if (isLegacyEntity(country)) return buildLegacyEntityResult({ query, country, intent });
    return { query, country, intent, selectedSeries: null, variables: [], userMessage: "EIA returned rows, but none matched the validated product and activity request." };
  }

  const topCandidate = rawCandidates[0];
  const selectedSeries = await fetchExactSeries({
    apiKey,
    country,
    productId: topCandidate.productId,
    activityId: topCandidate.activityId,
    unit: topCandidate.unitFacet,
    frequency
  });
  if (selectedSeries) selectedSeries.certainty = topCandidate.certainty;

  return {
    query,
    country,
    intent,
    source: SOURCE,
    selectedSeries,
    variables: rawCandidates.map(candidate => candidateToVariable(candidate, country, frequency)),
    note: "Variables are grouped by product and activity. The top series is loaded automatically; other complete series load when Graph or Excel is clicked."
  };
}

async function fetchCountryRows({ apiKey, countryCode, frequency }) {
  const url = buildEiaDataUrl(apiKey, { countryCode, frequency, length: MAX_BROAD_ROWS });
  const json = await fetchJsonCached(url, CACHE_TTL_MS, apiKey);
  return Array.isArray(json?.response?.data) ? json.response.data : [];
}

function candidateToVariable(candidate, country, frequency) {
  return {
    label: candidate.label,
    country: country.name,
    countryCode: country.code,
    productId: candidate.productId,
    activityId: candidate.activityId,
    unitFacet: candidate.unitFacet,
    product: candidate.productName,
    activity: candidate.activityName,
    coverage: formatCoverage(candidate.coverage),
    frequency,
    unit: candidate.unit,
    latestPeriod: candidate.latestPeriod,
    latestValue: candidate.latestValue,
    observationsFound: candidate.observationsFound,
    matchScore: candidate.score,
    availableUnitCount: candidate.availableUnitCount,
    certainty: candidate.certainty
  };
}

async function fetchExactSeries({ apiKey, country, productId, activityId, unit, frequency }) {
  const url = buildEiaDataUrl(apiKey, { countryCode: country.code, productId, activityId, unit, frequency, length: MAX_SERIES_ROWS });
  const json = await fetchJsonCached(url, CACHE_TTL_MS, apiKey);
  const rows = Array.isArray(json?.response?.data) ? json.response.data : [];
  const points = cleanDataRows(rows);
  if (points.length === 0) return null;

  const sample = rows[0] || {};
  const coverage = computeCoverage(points);
  const latest = points[points.length - 1];
  const productName = getField(sample, "productName") || `Product ${productId}`;
  const activityName = getField(sample, "activityName") || `Activity ${activityId}`;
  const unitName = getUnitName(sample) || unit;

  return {
    title: `${productName} - ${activityName}`,
    product: productName,
    activity: activityName,
    country: country.name,
    countryCode: country.code,
    productId: String(productId),
    activityId: String(activityId),
    unitFacet: String(unit),
    unit: unitName,
    frequency,
    coverage,
    latestPeriod: latest.period,
    latestValue: latest.value,
    points
  };
}

function buildCandidateVariables(rows, intent, query) {
  const groups = new Map();

  for (const row of rows) {
    const value = toNumber(getField(row, "value"));
    if (!Number.isFinite(value)) continue;

    const productId = getField(row, "productId");
    const activityId = getField(row, "activityId");
    const unitFacet = getField(row, "unit");
    if (!productId || !activityId || !unitFacet) continue;

    const key = `${productId}|${activityId}`;
    if (!groups.has(key)) {
      groups.set(key, { productId: String(productId), activityId: String(activityId), productName: getField(row, "productName") || "", activityName: getField(row, "activityName") || "", units: new Map() });
    }

    const group = groups.get(key);
    const unitKey = String(unitFacet);
    if (!group.units.has(unitKey)) group.units.set(unitKey, { unitFacet: unitKey, unit: getUnitName(row) || unitKey, rows: [] });
    group.units.get(unitKey).rows.push(row);
  }

  const candidates = [];
  for (const group of groups.values()) {
    const bestUnit = choosePreferredUnit(group);
    if (!bestUnit) continue;
    const cleanRows = cleanDataRows(bestUnit.rows);
    if (cleanRows.length === 0) continue;

    const candidate = { productId: group.productId, activityId: group.activityId, unitFacet: bestUnit.unitFacet, productName: group.productName, activityName: group.activityName, unit: bestUnit.unit, availableUnitCount: group.units.size };
    if (!isLegacySemanticEligible(candidate, intent)) continue;
    const score = scoreVariable(candidate, intent, query);
    const latest = cleanRows[cleanRows.length - 1];

    candidates.push({
      ...candidate,
      label: `${group.productName} - ${group.activityName}`,
      coverage: computeCoverage(cleanRows),
      latestPeriod: latest.period,
      latestValue: latest.value,
      observationsFound: cleanRows.length,
      score,
      certainty: buildLegacyResultCertainty(intent)
    });
  }

  return candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.observationsFound !== a.observationsFound) return b.observationsFound - a.observationsFound;
    return String(a.label).localeCompare(String(b.label));
  });
}

function choosePreferredUnit(group) {
  return Array.from(group.units.values())
    .map(unit => ({ ...unit, observationCount: cleanDataRows(unit.rows).length, unitScore: scoreUnitPreference(unit, group) }))
    .filter(unit => unit.observationCount > 0)
    .sort((a, b) => b.unitScore - a.unitScore || b.observationCount - a.observationCount || String(a.unitFacet).localeCompare(String(b.unitFacet)))[0] || null;
}

function scoreUnitPreference(unit, group) {
  const unitFacet = normalizeText(unit.unitFacet);
  const unitName = normalizeText(unit.unit);
  const product = normalizeText(group.productName);
  const activity = normalizeText(group.activityName);
  const text = `${unitFacet} ${unitName}`;
  let score = 0;

  if (unitFacet === "qbtu" || unitName.includes("quadrillion btu")) score += 100;
  if (unitFacet === "tbpd" || unitName.includes("barrels per day")) score += 80;
  if (unitFacet === "bkwh" || unitName.includes("kilowatthours")) score += 75;
  if (unitFacet === "bcf" || unitName.includes("billion cubic feet")) score += 65;
  if ((product.includes("petroleum") || product.includes("oil")) && activity.includes("consumption") && text.includes("barrels per day")) score += 30;
  if (product.includes("electricity") && text.includes("watthours")) score += 30;
  if (product.includes("natural gas") && text.includes("cubic feet")) score += 30;
  if ((product.includes("primary energy") || product.includes("total energy")) && text.includes("btu")) score += 30;
  return score;
}

function scoreVariable(group, intent, query) {
  const q = normalizeText(intent.interpreter === "openai"
    ? intent.cleanedQuery || query
    : intent.correctedQuery || intent.cleanedQuery || query);
  const product = normalizeText(group.productName);
  const activity = normalizeText(group.activityName);
  const text = `${product} ${activity} ${normalizeText(group.unit)}`;
  let score = 100;

  if (q.includes("energy consumption") && productMatches("total energy", product) && activity.includes("consumption")) score += 60;
  if (q.includes("electricity generation") && product.includes("electricity") && activity.includes("generation")) score += 60;
  if (q.includes("natural gas production") && product.includes("natural gas") && activity.includes("production")) score += 60;
  if ((q.includes("oil consumption") || q.includes("petroleum consumption")) && productMatches("petroleum", product) && activity.includes("consumption")) score += 60;

  for (const word of q.split(" ")) if (word.length > 3 && hasPhrase(text, word)) score += 2;
  return score;
}

function isLegacySemanticEligible(group, intent) {
  const product = normalizeText(group.productName);
  const activity = normalizeText(group.activityName);
  if (matchesLegacyExclusion(product, activity, intent.exclusions)) return false;
  return (intent.conceptPairs || []).some(pair => {
    if (!pair?.product || !pair?.activity) return false;
    const products = [
      pair.product,
      ...(pair.product === intent.product ? intent.productAlternatives || [] : [])
    ];
    return products.some(value => productMatches(value, product)) && hasPhrase(activity, pair.activity);
  });
}

function matchesLegacyExclusion(product, activity, exclusions = []) {
  return exclusions.some(exclusion =>
    (exclusion?.type === "product" && productMatches(exclusion.value, product))
    || (exclusion?.type === "activity" && hasPhrase(activity, exclusion.value))
  );
}

function productMatches(intentProduct, productText) {
  if (!intentProduct) return false;
  if (productText.includes(intentProduct)) return true;
  if (intentProduct === "total energy") return productText.includes("primary energy") || productText.includes("total energy");
  if (intentProduct === "petroleum") return productText.includes("petroleum") || productText.includes("oil") || productText.includes("liquid fuels");
  if (intentProduct === "renewable") return productText.includes("renewable") || productText.includes("renewables");
  if (intentProduct === "hydro") return productText.includes("hydro") || productText.includes("hydroelectric");
  return false;
}

async function getEiaCountries(apiKey) {
  const url = `${EIA_BASE_URL}/facet/countryRegionId/?api_key=${encodeURIComponent(apiKey)}`;
  try {
    const json = await fetchJsonCached(url, COUNTRY_CACHE_TTL_MS, apiKey);
    const rows = Array.isArray(json?.response?.facets) ? json.response.facets : Array.isArray(json?.response?.data) ? json.response.data : Array.isArray(json?.response) ? json.response : [];
    const countries = rows.map(row => ({ code: String(row.id || row.value || row.countryRegionId || row.code || "").trim(), name: String(row.name || row.description || row.countryRegionName || row.label || "").trim() }))
      .filter(country => country.code && country.name && !country.code.startsWith("WP"));
    if (countries.length > 0) return countries;
  } catch {}
  return [];
}

function resolveCountry(countryParam, intent, countries) {
  const requested = String(countryParam || "").trim();
  if (requested) {
    const byCode = findCountryByCode(countries, requested);
    if (byCode) return byCode;
    const normalized = normalizeText(requested);
    const byName = countries.find(country => hasPhrase(normalizeText(country.name), normalized));
    if (byName) return byName;
  }
  const structuredCode = intent?.structuredIntent?.geography?.code;
  return findCountryByCode(countries, structuredCode) || intent.country || null;
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

function buildEiaDataUrl(apiKey, { countryCode, productId, activityId, unit, frequency = DEFAULT_FREQUENCY, length = 5000 }) {
  const url = new URL(`${EIA_BASE_URL}/data/`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", sanitizeFrequency(frequency));
  url.searchParams.set("data[0]", "value");
  url.searchParams.append("facets[countryRegionId][]", countryCode);
  if (productId) url.searchParams.append("facets[productId][]", productId);
  if (activityId) url.searchParams.append("facets[activityId][]", activityId);
  if (unit) url.searchParams.append("facets[unit][]", unit);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", String(length));
  return url.toString();
}

function cleanDataRows(rows) {
  const seen = new Set();
  const output = [];
  for (const row of rows) {
    const period = String(getField(row, "period") || "").trim();
    const value = toNumber(getField(row, "value"));
    if (!period || !Number.isFinite(value) || seen.has(period)) continue;
    seen.add(period);
    output.push({ period, value });
  }
  return output.sort((a, b) => String(a.period).localeCompare(String(b.period), undefined, { numeric: true, sensitivity: "base" }));
}

function computeCoverage(points) {
  if (!points?.length) return null;
  return { start: points[0].period, end: points[points.length - 1].period, count: points.length };
}

function formatCoverage(coverage) {
  if (!coverage) return "";
  if (coverage.start === coverage.end) return `${coverage.start} (${coverage.count} obs.)`;
  return `${coverage.start}-${coverage.end} (${coverage.count} obs.)`;
}

function getField(row, field) { return row?.[field] ?? row?.[field.toLowerCase()] ?? row?.[field.toUpperCase()]; }
function getUnitName(row) { return row?.["value-units"] || row?.unitName || row?.unitDescription || row?.unit || ""; }
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return Number.NaN;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "" || cleaned.toLowerCase() === "na") return Number.NaN;
  return Number(cleaned);
}
function sanitizeFrequency(value) {
  const normalized = normalizeText(value || DEFAULT_FREQUENCY);
  if (["monthly", "quarterly", "annual"].includes(normalized)) return normalized;
  return DEFAULT_FREQUENCY;
}
function cleanFacet(value) {
  const text = String(value || "").trim();
  if (!text || text === "undefined" || text === "null" || text.length > 80) return "";
  return text;
}
async function fetchJsonCached(url, ttlMs, apiKey) {
  const now = Date.now();
  const cacheKey = buildCacheKey(url);
  const cached = cache.get(cacheKey);
  if (cached && now - cached.createdAt < ttlMs) return cached.value;
  const value = await fetchJson(url, apiKey);
  cache.set(cacheKey, { createdAt: now, value });
  pruneCache();
  return value;
}
async function fetchJson(url, apiKey) {
  for (let attempt = 1; attempt <= MAX_EIA_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      const text = await response.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        logUpstreamEiaResponse("non-JSON response", response, text, url);
        if (response.status >= 500 && attempt < MAX_EIA_ATTEMPTS) continue;
        if (response.status === 503) throw new Error("EIA service unavailable.");
        throw new Error(`EIA returned a non-JSON response: ${text.slice(0, 180)}`);
      }
      if (!response.ok) {
        logUpstreamEiaResponse("non-OK response", response, text, url);
        if (response.status >= 500 && attempt < MAX_EIA_ATTEMPTS) continue;
        throw new Error(`EIA request failed: ${json?.error || json?.message || `HTTP ${response.status}`}`);
      }
      return json;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The EIA request timed out.");
      throw new Error(hideApiKey(error.message, apiKey));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("EIA request failed after retrying.");
}

function isLegacyEntity(country) {
  return LEGACY_ENTITY_NAMES.has(normalizeText(country?.name || ""));
}

function buildLegacyEntityResult({ query, country, intent }) {
  return {
    query,
    country,
    intent,
    selectedSeries: null,
    variables: [],
    legacyEntity: true,
    userMessage: `${country.name} is a historical EIA entity. EIA lists the name in its metadata but currently returns no usable international series for it.`
  };
}
function pruneCache() {
  if (cache.size <= MAX_CACHE_ITEMS) return;
  for (const key of Array.from(cache.keys()).slice(0, cache.size - MAX_CACHE_ITEMS)) cache.delete(key);
}
function buildCacheKey(url) {
  const parsed = new URL(url);
  parsed.searchParams.delete("api_key");
  return parsed.toString();
}
function logUpstreamEiaResponse(reason, response, text, url) {
  const parsed = new URL(url);
  parsed.searchParams.delete("api_key");
  console.error("[search-eia] EIA upstream response issue", {
    reason,
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    url: parsed.toString(),
    bodySnippet: String(text || "").slice(0, 300)
  });
}
function friendlyErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("timed out")) return "The EIA API request timed out. Try the same search again.";
  if (message.includes("service unavailable")) return "EIA is temporarily unavailable. Try again later.";
  if (message.includes("non-JSON")) return "EIA returned an unexpected response. Check the API route and Vercel function logs.";
  if (message.includes("EIA request failed")) return "EIA rejected the request. Check the selected country/series or try a broader search.";
  if (message.includes("fetch failed") || message.includes("network")) return "The backend could not reach EIA. Try again later.";
  if (message.includes("no numeric observations")) return "EIA found the series metadata but returned no numeric observations for that exact series.";
  return "Something went wrong while contacting EIA. Check the Vercel function logs for details.";
}
function hideApiKey(text, apiKey) {
  if (!apiKey) return String(text || "");
  return String(text || "").replaceAll(apiKey || "", "[hidden-api-key]");
}
function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
