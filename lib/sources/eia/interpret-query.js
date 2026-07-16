import { requireAuthentication } from "../../auth.js";
import { buildStructuredIntent } from "./intent-routing.js";

const PRODUCT_RULES = [
  { value: "natural gas", terms: ["natural gas", "nat gas", "gas"] },
  { value: "petroleum", terms: ["petroleum", "oil", "crude", "crude oil", "gasoline", "diesel", "liquid fuels", "petroleum and other liquids"] },
  { value: "electricity", terms: ["electricity", "electric power", "power"] },
  { value: "coal", terms: ["coal"] },
  { value: "nuclear", terms: ["nuclear"] },
  { value: "renewable", terms: ["renewable", "renewables", "renewable energy"] },
  { value: "hydro", terms: ["hydro", "hydroelectric", "hydropower"] },
  { value: "solar", terms: ["solar"] },
  { value: "wind", terms: ["wind"] },
  { value: "biofuels", terms: ["biofuel", "biofuels", "biomass"] },
  { value: "total energy", terms: ["total energy", "primary energy", "energy"] }
];

const ACTIVITY_RULES = [
  { value: "consumption", terms: ["consumption", "consume", "consumed", "use", "usage", "demand"] },
  { value: "production", terms: ["production", "produce", "produced", "supply", "output"] },
  { value: "generation", terms: ["generation", "generated", "electricity generation", "power generation"] },
  { value: "imports", terms: ["imports", "import", "imported"] },
  { value: "exports", terms: ["exports", "export", "exported"] },
  { value: "reserves", terms: ["reserves", "reserve"] },
  { value: "capacity", terms: ["capacity"] },
  { value: "prices", terms: ["price", "prices", "cost"] }
];

const FREQUENCY_RULES = [
  { value: "monthly", terms: ["monthly", "month", "months"] },
  { value: "quarterly", terms: ["quarterly", "quarter", "quarters"] },
  { value: "annual", terms: ["annual", "yearly", "year", "years"] }
];

// Explicit aliases tolerate common input mistakes without guessing at unrelated words.
const QUERY_TERM_CORRECTIONS = new Map([
  ["ergy", "energy"],
  ["enrgy", "energy"],
  ["consn", "consumption"],
  ["consumtion", "consumption"],
  ["prodction", "production"],
  ["prducton", "production"],
  ["genration", "generation"],
  ["electricty", "electricity"],
  ["montly", "monthly"],
  ["anual", "annual"]
]);

const PRODUCT_ALIASES = new Map([
  ["energy", "total energy"],
  ["primary energy", "total energy"],
  ["gas", "natural gas"],
  ["oil", "petroleum"],
  ["power", "electricity"],
  ["renewables", "renewable"]
]);
const ACTIVITY_ALIASES = new Map([
  ["consume", "consumption"],
  ["use", "consumption"],
  ["demand", "consumption"],
  ["produce", "production"],
  ["output", "production"],
  ["generate", "generation"],
  ["import", "imports"],
  ["export", "exports"],
  ["price", "prices"]
]);
const FREQUENCY_ALIASES = new Map([
  ["year", "annual"],
  ["yearly", "annual"],
  ["month", "monthly"],
  ["quarter", "quarterly"]
]);

const OPENAI_TIMEOUT_MS = 20000;
const MIN_AI_CONFIDENCE = 0.6;

const COUNTRY_ALIASES = new Map([
  ["us", "USA"], ["u s", "USA"], ["usa", "USA"], ["united states", "USA"], ["america", "USA"],
  ["uk", "GBR"], ["britain", "GBR"], ["great britain", "GBR"], ["united kingdom", "GBR"],
  ["uae", "ARE"], ["emirates", "ARE"], ["south korea", "KOR"], ["north korea", "PRK"],
  ["russia", "RUS"], ["iran", "IRN"], ["venezuela", "VEN"], ["vietnam", "VNM"],
  ["czech republic", "CZE"], ["czechia", "CZE"]
]);

const FALLBACK_COUNTRIES = [
  ["Afghanistan", "AFG"], ["Albania", "ALB"], ["Algeria", "DZA"], ["Argentina", "ARG"], ["Australia", "AUS"], ["Austria", "AUT"],
  ["Bahrain", "BHR"], ["Bangladesh", "BGD"], ["Belarus", "BLR"], ["Belgium", "BEL"], ["Bolivia", "BOL"], ["Brazil", "BRA"],
  ["Canada", "CAN"], ["Chile", "CHL"], ["China", "CHN"], ["Colombia", "COL"], ["Costa Rica", "CRI"], ["Cuba", "CUB"],
  ["Denmark", "DNK"], ["Dominican Republic", "DOM"], ["Ecuador", "ECU"], ["Egypt", "EGY"], ["France", "FRA"], ["Germany", "DEU"],
  ["Ghana", "GHA"], ["Greece", "GRC"], ["India", "IND"], ["Indonesia", "IDN"], ["Iran", "IRN"], ["Iraq", "IRQ"], ["Ireland", "IRL"],
  ["Israel", "ISR"], ["Italy", "ITA"], ["Jamaica", "JAM"], ["Japan", "JPN"], ["Jordan", "JOR"], ["Kazakhstan", "KAZ"],
  ["Kuwait", "KWT"], ["Malaysia", "MYS"], ["Mexico", "MEX"], ["Morocco", "MAR"], ["Netherlands", "NLD"], ["New Zealand", "NZL"],
  ["Nigeria", "NGA"], ["Norway", "NOR"], ["Oman", "OMN"], ["Pakistan", "PAK"], ["Peru", "PER"], ["Philippines", "PHL"],
  ["Poland", "POL"], ["Portugal", "PRT"], ["Qatar", "QAT"], ["Romania", "ROU"], ["Russia", "RUS"], ["Saudi Arabia", "SAU"],
  ["Singapore", "SGP"], ["South Africa", "ZAF"], ["South Korea", "KOR"], ["Spain", "ESP"], ["Sweden", "SWE"], ["Switzerland", "CHE"],
  ["Thailand", "THA"], ["Turkey", "TUR"], ["Ukraine", "UKR"], ["United Arab Emirates", "ARE"], ["United Kingdom", "GBR"],
  ["United States", "USA"], ["Uruguay", "URY"], ["Venezuela", "VEN"], ["Vietnam", "VNM"], ["World", "WOR"]
].map(([name, code]) => ({ name, code }));

const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "by", "can", "chart", "country", "data", "download", "eia", "for", "from", "graph", "i", "in", "of", "on", "or", "please", "plot", "search", "series", "show", "table", "the", "to", "with"]);

export default async function handler(req, res) {
  if (!requireAuthentication(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed.", userMessage: "Use a GET request for this endpoint." });
  }

  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing query.", userMessage: "Enter a search phrase such as Brazil energy consumption." });
  }
  if (query.length > 240) {
    return res.status(400).json({ error: "Search query is too long.", userMessage: "Use a shorter country and energy topic search." });
  }

  const intent = await interpretQuery(query);
  return res.status(200).json({ intent });
}

export async function interpretQuery(query, countries = []) {
  const aiIntent = await interpretQueryWithOpenAI(query, countries);
  return aiIntent || interpretQueryWithRules(query, countries);
}

export function normalizeSubmittedIntent(rawIntent, query, countries = []) {
  const fallbackIntent = interpretQueryWithRules(query, countries);
  const correctedQuery = String(rawIntent.correctedQuery || query || "").trim().slice(0, 240) || fallbackIntent.correctedQuery;
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const country = findCountryByCode(countryList, rawIntent.countryCode) || fallbackIntent.country || null;
  const product = normalizeCategory(rawIntent.product, PRODUCT_RULES, PRODUCT_ALIASES) || fallbackIntent.product;
  const activity = normalizeCategory(rawIntent.activity, ACTIVITY_RULES, ACTIVITY_ALIASES) || fallbackIntent.activity;
  const frequency = normalizeCategory(rawIntent.frequency, FREQUENCY_RULES, FREQUENCY_ALIASES) || fallbackIntent.frequency;
  const normalizedQuery = correctQueryTerms(normalizeText(correctedQuery));

  return addClarificationState({
    ...fallbackIntent,
    correctedQuery,
    normalizedQuery,
    interpreter: rawIntent.interpreter === "openai" ? "openai" : "rules",
    country,
    countryCode: country?.code || null,
    product,
    activity,
    frequency,
    cleanedKeywords: buildCleanedKeywords(normalizedQuery, country ? [country] : [])
  });
}

export function interpretQueryWithRules(query, countries = []) {
  const originalQuery = String(query || "").trim();
  const rawNormalizedQuery = normalizeText(originalQuery);
  const normalizedQuery = correctQueryTerms(rawNormalizedQuery);
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const detectedCountries = detectCountries(normalizedQuery, countryList);
  const product = firstRuleMatch(normalizedQuery, PRODUCT_RULES);
  const activity = firstRuleMatch(normalizedQuery, ACTIVITY_RULES);
  const frequency = firstRuleMatch(normalizedQuery, FREQUENCY_RULES) || "annual";

  return addClarificationState({
    originalQuery,
    correctedQuery: normalizedQuery === rawNormalizedQuery ? originalQuery : normalizedQuery,
    normalizedQuery,
    interpreter: "rules",
    mode: "single",
    country: detectedCountries[0] || null,
    countryCode: detectedCountries[0]?.code || null,
    extraCountriesIgnored: detectedCountries.slice(1),
    product,
    activity,
    frequency,
    confidence: product || activity || detectedCountries.length ? 0.65 : 0.25,
    cleanedKeywords: buildCleanedKeywords(normalizedQuery, detectedCountries)
  });
}

async function interpretQueryWithOpenAI(query, countries) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES).slice(0, 250);
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const prompt = [
    "Convert the user's EIA energy data search into strict JSON.",
    "Act as the primary natural-language parser: correct obvious typos, expand common abbreviations, and ignore filler text.",
    "Extract one country, product, activity, and frequency. Use null for any unclear field and lower confidence when the request is ambiguous.",
    "Do not invent countries or categories. Use only a country from Known countries and only the allowed EIA-compatible values below.",
    "Allowed product values: natural gas, petroleum, electricity, coal, nuclear, renewable, hydro, solar, wind, biofuels, total energy, or null.",
    "Allowed activity values: consumption, production, generation, imports, exports, reserves, capacity, prices, or null.",
    "Allowed frequency values: annual, monthly, quarterly, or null. Use annual when no frequency is stated.",
    "Return only JSON with keys: correctedQuery, countryName, countryCode, product, activity, frequency, confidence.",
    `Known countries: ${countryList.map(country => `${country.name}=${country.code}`).join(", ")}`,
    `User query: ${query}`
  ].join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        input: prompt
      })
    });

    const data = await response.json();
    if (!response.ok) return null;

    const parsed = parseJsonObject(extractResponseText(data));
    if (!parsed) return null;

    return validateAiInterpretation(parsed, query, countryList);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function validateAiInterpretation(parsed, query, countries = [], fallbackIntent = null) {
  if (!parsed || typeof parsed !== "object") return null;

  const confidenceValue = Number(parsed.confidence);
  const confidence = Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0;
  if (confidence < MIN_AI_CONFIDENCE) return null;

  const ruleIntent = fallbackIntent || interpretQueryWithRules(query, countries);
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const aiCountry = resolveAiCountry(parsed, countryList);
  const aiProduct = normalizeCategory(parsed.product, PRODUCT_RULES, PRODUCT_ALIASES);
  const aiActivity = normalizeCategory(parsed.activity, ACTIVITY_RULES, ACTIVITY_ALIASES);
  const aiFrequency = normalizeCategory(parsed.frequency, FREQUENCY_RULES, FREQUENCY_ALIASES);
  if (!aiCountry && !aiProduct && !aiActivity && !aiFrequency) return null;

  const country = aiCountry || ruleIntent.country || null;
  const product = aiProduct || ruleIntent.product;
  const activity = aiActivity || ruleIntent.activity;
  const frequency = aiFrequency || ruleIntent.frequency || "annual";
  const correctedQuery = String(parsed.correctedQuery || ruleIntent.correctedQuery || query || "").trim().slice(0, 240);
  const normalizedQuery = correctQueryTerms(normalizeText(correctedQuery));

  return addClarificationState({
    ...ruleIntent,
    correctedQuery: correctedQuery || ruleIntent.correctedQuery,
    normalizedQuery,
    interpreter: "openai",
    country,
    countryCode: country?.code || null,
    product,
    activity,
    frequency,
    confidence,
    cleanedKeywords: buildCleanedKeywords(normalizedQuery, country ? [country] : [])
  });
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  return output.flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(part => part.text || part.output_text || "")
    .join("\n")
    .trim();
}

function parseJsonObject(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try { return JSON.parse(match[0]); } catch { return null; }
}

function resolveAiCountry(parsed, countries) {
  const byCode = findCountryByCode(countries, parsed.countryCode);
  if (byCode) return byCode;
  const normalizedName = normalizeText(parsed.countryName || "");
  if (!normalizedName) return null;
  return countries.find(country => normalizeText(country.name) === normalizedName) ||
    detectCountries(normalizedName, countries)[0] ||
    null;
}

function normalizeCategory(value, rules, aliases = new Map()) {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const allowed = rules.map(rule => rule.value);
  return allowed.find(item => normalizeText(item) === normalized) || aliases.get(normalized) || null;
}

function correctQueryTerms(normalizedQuery) {
  return normalizedQuery.split(" ")
    .map(term => QUERY_TERM_CORRECTIONS.get(term) || term)
    .join(" ");
}

function addClarificationState(intent) {
  const missingFields = [];
  if (!intent.country) missingFields.push("country");
  if (!intent.product) missingFields.push("product");
  if (!intent.activity) missingFields.push("activity");
  const needsClarification = missingFields.length > 0;

  const clarifiedIntent = {
    ...intent,
    needsClarification,
    missingFields,
    clarificationMessage: needsClarification
      ? `Please clarify the ${formatList(missingFields)}. Example: United States total energy consumption.`
      : null
  };
  const structuredIntent = buildStructuredIntent(clarifiedIntent, clarifiedIntent.originalQuery);

  return {
    ...clarifiedIntent,
    frequency: structuredIntent.frequency,
    structuredIntent,
    route: structuredIntent.route,
    validation: structuredIntent.validation,
    ambiguity: structuredIntent.ambiguity,
    fallback: structuredIntent.fallback
  };
}

function formatList(items) {
  if (items.length < 2) return items[0] || "request";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function detectCountries(normalizedQuery, countries = []) {
  const found = new Map();
  const countryList = Array.isArray(countries) ? countries.filter(country => !String(country.code || "").startsWith("WP")) : [];

  for (const [alias, code] of COUNTRY_ALIASES.entries()) {
    if (!hasPhrase(normalizedQuery, alias)) continue;
    const country = findCountryByCode(countryList, code) || { code, name: alias.toUpperCase() };
    found.set(country.code, country);
  }

  for (const token of normalizedQuery.split(" ").filter(Boolean)) {
    if (token.length !== 3) continue;
    const country = findCountryByCode(countryList, token.toUpperCase());
    if (country) found.set(country.code, country);
  }

  const countryMatches = countryList
    .map(country => ({ country, nameNorm: normalizeText(country.name) }))
    .filter(item => item.nameNorm && hasPhrase(normalizedQuery, item.nameNorm))
    .sort((a, b) => b.nameNorm.length - a.nameNorm.length);

  for (const match of countryMatches) found.set(match.country.code, match.country);
  return Array.from(found.values());
}

export function findCountryByCode(countries, code) {
  const target = String(code || "").toUpperCase();
  return (countries || []).find(country => String(country.code || "").toUpperCase() === target) || null;
}

export function firstRuleMatch(text, rules) {
  for (const rule of rules) {
    if (rule.terms.some(term => hasPhrase(text, normalizeText(term)))) return rule.value;
  }
  return null;
}

export function buildCleanedKeywords(normalizedQuery, countries = []) {
  const ignoreWords = new Set();
  for (const country of countries) {
    for (const word of normalizeText(country.name).split(" ")) if (word) ignoreWords.add(word);
    if (country.code) ignoreWords.add(normalizeText(country.code));
  }
  for (const rule of [...PRODUCT_RULES, ...ACTIVITY_RULES, ...FREQUENCY_RULES]) {
    for (const term of rule.terms) {
      for (const word of normalizeText(term).split(" ")) if (word) ignoreWords.add(word);
    }
  }
  return normalizedQuery.split(" ")
    .filter(word => word.length > 2)
    .filter(word => !STOP_WORDS.has(word))
    .filter(word => !ignoreWords.has(word))
    .join(" ");
}

export function hasPhrase(text, phrase) {
  const cleanText = ` ${normalizeText(text)} `;
  const cleanPhrase = ` ${normalizeText(phrase)} `;
  return cleanPhrase.trim() !== "" && cleanText.includes(cleanPhrase);
}

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeCountries(primary = [], fallback = []) {
  const merged = new Map();
  for (const country of fallback) merged.set(country.code, country);
  for (const country of primary) {
    if (country?.code && country?.name && !String(country.code).startsWith("WP")) merged.set(country.code, country);
  }
  return Array.from(merged.values());
}
