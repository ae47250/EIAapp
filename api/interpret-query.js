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

const COUNTRY_ALIASES = new Map([
  ["us", "USA"], ["usa", "USA"], ["united states", "USA"], ["america", "USA"],
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
  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.status(400).json({ error: "Missing query.", userMessage: "Enter a search phrase such as Brazil energy consumption." });
  }

  const intent = await interpretQuery(query);
  return res.status(200).json({ intent });
}

export async function interpretQuery(query, countries = []) {
  const ruleIntent = interpretQueryWithRules(query, countries);
  const aiIntent = await interpretQueryWithOpenAI(query, countries, ruleIntent);
  return aiIntent || ruleIntent;
}

export function interpretQueryWithRules(query, countries = []) {
  const normalizedQuery = normalizeText(query);
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const detectedCountries = detectCountries(normalizedQuery, countryList);
  const product = firstRuleMatch(normalizedQuery, PRODUCT_RULES);
  const activity = firstRuleMatch(normalizedQuery, ACTIVITY_RULES);
  const frequency = firstRuleMatch(normalizedQuery, FREQUENCY_RULES) || "annual";

  return {
    originalQuery: String(query || "").trim(),
    correctedQuery: String(query || "").trim(),
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
  };
}

async function interpretQueryWithOpenAI(query, countries, fallbackIntent) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES).slice(0, 250);
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const prompt = [
    "Convert the user's EIA energy data search into strict JSON.",
    "Use EIA-compatible intent fields. Correct obvious typos, but do not invent data values.",
    "Allowed product values: natural gas, petroleum, electricity, coal, nuclear, renewable, hydro, solar, wind, biofuels, total energy, or null.",
    "Allowed activity values: consumption, production, generation, imports, exports, reserves, capacity, prices, or null.",
    "Allowed frequency values: annual, monthly, quarterly.",
    "Return only JSON with keys: correctedQuery, countryName, countryCode, product, activity, frequency, confidence.",
    `Known countries: ${countryList.map(country => `${country.name}=${country.code}`).join(", ")}`,
    `User query: ${query}`
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: prompt
      })
    });

    const data = await response.json();
    if (!response.ok) return null;

    const parsed = parseJsonObject(extractResponseText(data));
    if (!parsed) return null;

    const country = resolveAiCountry(parsed, countryList) || fallbackIntent.country || null;
    const product = normalizeAllowed(parsed.product, PRODUCT_RULES.map(rule => rule.value));
    const activity = normalizeAllowed(parsed.activity, ACTIVITY_RULES.map(rule => rule.value));
    const frequency = normalizeAllowed(parsed.frequency, FREQUENCY_RULES.map(rule => rule.value)) || "annual";
    const confidence = Number(parsed.confidence);

    return {
      ...fallbackIntent,
      correctedQuery: String(parsed.correctedQuery || query).trim(),
      normalizedQuery: normalizeText(parsed.correctedQuery || query),
      interpreter: "openai",
      country,
      countryCode: country?.code || null,
      product: product || fallbackIntent.product,
      activity: activity || fallbackIntent.activity,
      frequency,
      confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0.75,
      cleanedKeywords: buildCleanedKeywords(normalizeText(parsed.correctedQuery || query), country ? [country] : [])
    };
  } catch {
    return null;
  }
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
    countries.find(country => hasPhrase(normalizeText(country.name), normalizedName)) || null;
}

function normalizeAllowed(value, allowed) {
  const normalized = normalizeText(value);
  return allowed.find(item => normalizeText(item) === normalized) || null;
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
