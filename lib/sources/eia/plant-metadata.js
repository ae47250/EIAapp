import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";

import { requireAuthentication } from "../../auth.js";

const gunzipAsync = promisify(gunzip);
const DIRECTORY_PATH = resolve(process.cwd(), "data/eia/builds/phase1b/plants.jsonl.gz");
const EIA_PLANT_DATA_URL = "https://api.eia.gov/v2/electricity/operating-generator-capacity/data/";
const EIA_PLANT_ROUTE_URL = "https://api.eia.gov/v2/electricity/operating-generator-capacity/";
const LIVE_CACHE_TTL_MS = 30 * 60 * 1000;
const LIVE_CACHE_LIMIT = 100;
const DEFAULT_LIVE_TIMEOUT_MS = 5_000;
const MAX_LOCAL_RESULTS = 20;
const LIVE_DATA_FIELDS = [
  "county",
  "latitude",
  "longitude",
  "nameplate-capacity-mw",
  "net-summer-capacity-mw",
  "net-winter-capacity-mw",
  "operating-year-month",
  "planned-retirement-year-month"
];

let directoryPromise;
const liveCache = globalThis.__EIA_PLANT_METADATA_CACHE__ || new Map();
globalThis.__EIA_PLANT_METADATA_CACHE__ = liveCache;

export default async function handler(req, res) {
  setJsonHeaders(res);
  if (!requireAuthentication(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed.",
      userMessage: "Use GET for plant-directory and plant-metadata lookups."
    });
  }

  const plantId = cleanPlantId(req.query.plantId);
  const query = String(req.query.q || "").trim();
  const stateCode = cleanStateCode(req.query.state);

  if (!plantId && !query) {
    return res.status(400).json({
      error: "Missing plant query.",
      userMessage: "Provide a plant name with q or an exact EIA plant ID with plantId."
    });
  }

  if (query.length > 120) {
    return res.status(400).json({
      error: "Plant query is too long.",
      userMessage: "Use a shorter plant name or an exact EIA plant ID."
    });
  }

  try {
    if (!plantId) {
      const matches = await searchPlantDirectory({ query, stateCode, limit: req.query.limit });
      return res.status(200).json({
        mode: "local_plant_directory",
        query,
        state: stateCode,
        matches,
        live_lookup_performed: false
      });
    }

    const plant = await findPlantById(plantId);
    if (!plant) {
      return res.status(404).json({
        error: "Unknown EIA plant ID.",
        userMessage: "That plant ID is not present in the current local EIA plant directory."
      });
    }

    const apiKey = process.env.EIA_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Missing EIA_API_KEY environment variable.",
        userMessage: "The local plant match is available, but live EIA plant metadata is not configured.",
        plant
      });
    }

    try {
      const live = await getPlantMetadata({ plantId, apiKey });
      return res.status(200).json({
        mode: "hybrid_plant_lookup",
        plant,
        live,
        live_lookup_performed: true
      });
    } catch (error) {
      console.error("[plant-metadata] EIA enrichment unavailable", {
        plantId,
        reason: safeErrorReason(error)
      });
      return res.status(200).json({
        mode: "hybrid_plant_lookup",
        plant,
        live: null,
        live_lookup_performed: true,
        warning: "The local plant match succeeded, but live EIA plant metadata is temporarily unavailable."
      });
    }
  } catch (error) {
    console.error("[plant-metadata] Local directory failure", { reason: safeErrorReason(error) });
    return res.status(500).json({
      error: "Plant metadata lookup failed.",
      userMessage: "The local EIA plant directory could not be read."
    });
  }
}

export async function searchPlantDirectory({ query, stateCode, limit = 10 }) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  const normalizedState = cleanStateCode(stateCode);
  const safeLimit = clampInteger(limit, 1, MAX_LOCAL_RESULTS, 10);
  const queryTokens = normalizedQuery.split(" ");
  const directory = await loadPlantDirectory();

  return directory.entries
    .map(entry => ({ entry, score: scorePlantMatch(entry, normalizedQuery, queryTokens, normalizedState) }))
    .filter(result => result.score > 0)
    .sort((left, right) =>
      right.score - left.score ||
      left.entry.name.localeCompare(right.entry.name) ||
      Number(left.entry.plant_id) - Number(right.entry.plant_id)
    )
    .slice(0, safeLimit)
    .map(({ entry, score }) => ({ ...publicPlant(entry), match_score: score }));
}

export async function findPlantById(plantId) {
  const cleanId = cleanPlantId(plantId);
  if (!cleanId) return null;
  const directory = await loadPlantDirectory();
  const entry = directory.byId.get(cleanId);
  return entry ? publicPlant(entry) : null;
}

export async function getPlantMetadata({
  plantId,
  apiKey,
  fetchImpl = fetch,
  timeoutMs = configuredTimeoutMs(),
  now = Date.now()
}) {
  const cleanId = cleanPlantId(plantId);
  if (!cleanId) throw new Error("Invalid plant ID.");
  if (!apiKey) throw new Error("Missing EIA API key.");

  const cached = liveCache.get(cleanId);
  if (cached && now - cached.cachedAt < LIVE_CACHE_TTL_MS) {
    return { ...cached.value, cache_status: "hit" };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), clampInteger(timeoutMs, 1_000, 10_000, DEFAULT_LIVE_TIMEOUT_MS));
  try {
    const url = buildPlantDataUrl(cleanId, apiKey);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    const text = await response.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`EIA returned non-JSON plant metadata with HTTP ${response.status}.`);
    }
    if (!response.ok) throw new Error(`EIA plant metadata request failed with HTTP ${response.status}.`);

    const rows = Array.isArray(payload?.response?.data)
      ? payload.response.data.filter(row => String(row?.plantid || "") === cleanId)
      : [];
    const latestPeriod = rows[0]?.period || null;
    const latestRows = latestPeriod ? rows.filter(row => row.period === latestPeriod) : [];
    const value = {
      source: "U.S. Energy Information Administration API",
      route: "/electricity/operating-generator-capacity",
      facet: { plantid: cleanId },
      api_version: String(payload?.apiVersion || ""),
      latest_period: latestPeriod,
      generators: latestRows.map(sanitizeGeneratorRow),
      source_url: EIA_PLANT_ROUTE_URL,
      fetched_at: new Date(now).toISOString(),
      cache_status: "miss"
    };
    setLiveCache(cleanId, value, now);
    return value;
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("EIA plant metadata request timed out.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function resetPlantMetadataCachesForTests() {
  directoryPromise = undefined;
  liveCache.clear();
}

async function loadPlantDirectory() {
  if (!directoryPromise) directoryPromise = readPlantDirectory();
  return directoryPromise;
}

async function readPlantDirectory() {
  const compressed = await readFile(DIRECTORY_PATH);
  const text = (await gunzipAsync(compressed)).toString("utf8");
  const entries = text.split("\n").filter(Boolean).map(line => {
    const record = JSON.parse(line);
    const names = [record.name, ...(record.aliases || [])];
    return {
      ...record,
      _normalized_name: normalizeSearchText(record.name),
      _normalized_aliases: names.slice(1).map(normalizeSearchText),
      _search_text: normalizeSearchText(`${names.join(" ")} ${record.plant_id}`)
    };
  });
  return { entries, byId: new Map(entries.map(entry => [entry.plant_id, entry])) };
}

function scorePlantMatch(entry, query, queryTokens, stateCode) {
  if (stateCode && entry.state_code !== stateCode) return 0;
  let score = 0;
  if (entry.plant_id === query) score = 200;
  else if (entry._normalized_name === query) score = 120;
  else if (entry._normalized_aliases.includes(query)) score = 115;
  else if (entry._normalized_name.startsWith(query)) score = 100;
  else if (entry._normalized_name.includes(query)) score = 90;
  else if (queryTokens.every(token => entry._search_text.includes(token))) score = 70 + queryTokens.length;
  if (score && stateCode && entry.state_code === stateCode) score += 10;
  return score;
}

function buildPlantDataUrl(plantId, apiKey) {
  const url = new URL(EIA_PLANT_DATA_URL);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", "monthly");
  LIVE_DATA_FIELDS.forEach((field, index) => url.searchParams.set(`data[${index}]`, field));
  url.searchParams.append("facets[plantid][]", plantId);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", "250");
  return url;
}

function sanitizeGeneratorRow(row) {
  return {
    period: nullableText(row.period),
    plant_id: nullableText(row.plantid),
    plant_name: nullableText(row.plantName),
    generator_id: nullableText(row.generatorid),
    state_code: nullableText(row.stateid),
    state_name: nullableText(row.stateName),
    county: nullableText(row.county),
    latitude: nullableNumber(row.latitude),
    longitude: nullableNumber(row.longitude),
    technology: nullableText(row.technology),
    energy_source_code: nullableText(row.energy_source_code),
    energy_source: nullableText(row["energy-source-desc"]),
    prime_mover_code: nullableText(row.prime_mover_code),
    status: nullableText(row.status),
    status_description: nullableText(row.statusDescription),
    nameplate_capacity_mw: nullableNumber(row["nameplate-capacity-mw"]),
    net_summer_capacity_mw: nullableNumber(row["net-summer-capacity-mw"]),
    net_winter_capacity_mw: nullableNumber(row["net-winter-capacity-mw"]),
    operating_year_month: nullableText(row["operating-year-month"]),
    planned_retirement_year_month: nullableText(row["planned-retirement-year-month"])
  };
}

function publicPlant(entry) {
  return Object.fromEntries(Object.entries(entry).filter(([key]) => !key.startsWith("_")));
}

function setLiveCache(plantId, value, cachedAt) {
  if (liveCache.size >= LIVE_CACHE_LIMIT) liveCache.delete(liveCache.keys().next().value);
  liveCache.set(plantId, { value, cachedAt });
}

function configuredTimeoutMs() {
  return clampInteger(process.env.EIA_PLANT_LOOKUP_TIMEOUT_MS, 1_000, 10_000, DEFAULT_LIVE_TIMEOUT_MS);
}

function cleanPlantId(value) {
  const text = String(value || "").trim();
  return /^[0-9]{1,10}$/.test(text) ? text : null;
}

function cleanStateCode(value) {
  const text = String(value || "").trim().toUpperCase();
  return /^[A-Z]{2}$/.test(text) ? text : null;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function clampInteger(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isInteger(number) && number >= minimum && number <= maximum ? number : fallback;
}

function nullableText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function nullableNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeErrorReason(error) {
  const message = String(error?.message || "unknown error");
  return message.replace(/api_key=[^&\s]+/gi, "api_key=[redacted]").slice(0, 180);
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
