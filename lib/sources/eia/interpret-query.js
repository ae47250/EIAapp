import { requireAuthentication } from "../../auth.js";
import { buildStructuredIntent, findGeographyMentions, resolveApprovedGeography } from "./intent-routing.js";

const PRODUCT_RULES = [
  { value: "natural gas", terms: ["natural gas plant liquids", "natural gas liquids", "dry natural gas", "natural gas", "nat gas"] },
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

export const OPENAI_TIMEOUT_MS = 30000;
const MIN_AI_CONFIDENCE = 0.6;

const BROAD_PRODUCT_OPTIONS = new Map([
  ["renewable", ["wind", "solar", "hydro", "biofuels"]],
  ["total energy", ["natural gas", "petroleum", "electricity", "coal", "nuclear", "renewable"]]
]);

const AMBIGUOUS_PRODUCT_RULES = [
  {
    term: "gas",
    alternatives: ["natural gas", "petroleum"],
    reason: "The product term may refer to more than one approved energy-product family.",
    contexts: [
      { value: "natural gas", terms: ["pipeline", "storage", "withdrawals", "withdrawal", "dry gas", "marketed production", "underground storage", "lng"] },
      { value: "petroleum", terms: ["pump price", "pump prices", "motor fuel", "retail gasoline", "regular grade", "highway use", "gasoline consumption"] }
    ]
  }
];

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

  const originalQuery = String(req.query.q || "");
  const cleanedQuery = cleanQueryMechanically(originalQuery);
  if (!cleanedQuery) {
    return res.status(400).json({ error: "Missing query.", userMessage: "Enter a search phrase such as Brazil energy consumption." });
  }
  if (cleanedQuery.length > 240) {
    return res.status(400).json({ error: "Search query is too long.", userMessage: "Use a shorter country and energy topic search." });
  }

  const intent = await interpretQuery(originalQuery);
  return res.status(200).json({ intent });
}

export async function interpretQuery(query, countries = []) {
  const forms = buildQueryForms(query);
  const aiResult = await interpretQueryWithOpenAI(forms, countries);
  return aiResult.intent || interpretQueryWithRules(query, countries, aiResult.reason);
}

export function normalizeSubmittedIntent(rawIntent, query, countries = []) {
  if (rawIntent?.interpreter !== "openai") {
    return interpretQueryWithRules(query, countries, "submitted_rule_intent");
  }
  const parsed = {
    correctedQuery: rawIntent.correctedQuery,
    confidence: rawIntent.confidence ?? 0.75,
    ambiguity: rawIntent.ambiguity,
    fields: rawIntent.fields || {
      country: { value: rawIntent.countryCode },
      product: { value: rawIntent.product },
      activity: { value: rawIntent.activity },
      frequency: { value: rawIntent.frequency }
    }
  };
  return validateAiInterpretation(parsed, query, countries) || interpretQueryWithRules(query, countries, "submitted_ai_intent_invalid");
}

export function interpretQueryWithRules(query, countries = [], fallbackReason = "openai_not_used") {
  const forms = buildQueryForms(query);
  const rawNormalizedQuery = normalizeText(forms.cleanedQuery);
  const normalizedQuery = correctQueryTerms(rawNormalizedQuery);
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const detectedCountries = detectCountries(normalizedQuery, countryList, forms.originalQuery);
  const localGeography = findGeographyMentions(normalizedQuery, forms.originalQuery)[0]?.geography || null;
  if (localGeography && !detectedCountries.some(geography => geography.code === localGeography.code)) detectedCountries.unshift(localGeography);
  const productResult = interpretProductWithRules(normalizedQuery);
  const product = productResult.value;
  const activity = firstRuleMatch(normalizedQuery, ACTIVITY_RULES);
  const frequency = firstRuleMatch(normalizedQuery, FREQUENCY_RULES) || "annual";
  const fields = {
    country: buildFallbackField(detectedCountries[0]?.code || null, fallbackReason, detectedCountries[0] ? null : "No approved geography was found."),
    product: buildFallbackField(product, fallbackReason, productResult.reason, productResult),
    activity: buildFallbackField(activity, fallbackReason, activity ? null : "No approved activity was found."),
    frequency: buildFallbackField(frequency, fallbackReason, null)
  };

  return addClarificationState({
    ...forms,
    correctedQuery: normalizedQuery === rawNormalizedQuery ? forms.cleanedQuery : normalizedQuery,
    normalizedQuery,
    interpreter: "rules",
    interpretationMethod: "deterministic_fallback",
    mode: "single",
    country: detectedCountries[0] || null,
    countryCode: detectedCountries[0]?.code || null,
    extraCountriesIgnored: detectedCountries.slice(1),
    product,
    activity,
    frequency,
    confidence: product || activity || detectedCountries.length ? 0.65 : 0.25,
    fields,
    fallback: { used: true, method: "deterministic_rules", reasons: [fallbackReason] },
    cleanedKeywords: buildCleanedKeywords(normalizedQuery, detectedCountries)
  });
}

async function interpretQueryWithOpenAI(forms, countries) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { intent: null, reason: "openai_not_configured" };

  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES).slice(0, 250);
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const prompt = [
    "Convert the user's EIA energy data search into strict JSON.",
    "Act as the primary natural-language parser: correct obvious typos, expand common abbreviations, and ignore filler text.",
    "The exact raw query and a mechanically cleaned copy are supplied separately; interpret the cleaned copy while using the raw copy only as context.",
    "Extract one country, product, activity, and frequency. Return null and an ambiguity reason when a field cannot be inferred safely.",
    "Do not invent countries or categories. Use only a country from Known countries and only the allowed EIA-compatible values below.",
    "Allowed product values: natural gas, petroleum, electricity, coal, nuclear, renewable, hydro, solar, wind, biofuels, total energy, or null.",
    "Allowed activity values: consumption, production, generation, imports, exports, reserves, capacity, prices, or null.",
    "Allowed frequency values: annual, monthly, quarterly, or null. Use annual when no frequency is stated.",
    "Never return or invent an EIA series ID.",
    "Return only JSON with correctedQuery, confidence, ambiguity, and fields.",
    "Each fields entry (country, product, activity, frequency) must contain rawValue, value, confidence, and ambiguityReason.",
    `Known countries: ${countryList.map(country => `${country.name}=${country.code}`).join(", ")}`,
    `Raw query: ${JSON.stringify(forms.originalQuery)}`,
    `Lightly cleaned query: ${JSON.stringify(forms.cleanedQuery)}`
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
    if (!response.ok) return { intent: null, reason: `openai_http_${response.status}` };

    const parsed = parseJsonObject(extractResponseText(data));
    if (!parsed) return { intent: null, reason: "openai_invalid_json" };

    const intent = validateAiInterpretation(parsed, forms.originalQuery, countryList);
    return intent ? { intent, reason: null } : { intent: null, reason: "openai_validation_failed" };
  } catch (error) {
    return { intent: null, reason: error?.name === "AbortError" ? "openai_timeout" : "openai_request_failed" };
  } finally {
    clearTimeout(timeout);
  }
}

export function validateAiInterpretation(parsed, query, countries = [], fallbackIntent = null) {
  if (!parsed || typeof parsed !== "object") return null;

  const explicitConfidence = Number(parsed.confidence);
  const fieldConfidences = Object.values(parsed.fields || {}).map(field => Number(field?.confidence)).filter(Number.isFinite);
  const confidenceValue = Number.isFinite(explicitConfidence)
    ? explicitConfidence
    : fieldConfidences.length
      ? fieldConfidences.reduce((sum, value) => sum + value, 0) / fieldConfidences.length
      : 0;
  const confidence = Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0;
  if (confidence < MIN_AI_CONFIDENCE) return null;

  const forms = buildQueryForms(query);
  const ruleIntent = fallbackIntent || interpretQueryWithRules(query, countries, "ai_field_unresolved");
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const countryField = validateAiField("country", readAiField(parsed, "country", ["countryCode", "countryName"]), confidence, value => resolveAiCountryValue(value, parsed, countryList), ruleIntent.fields.country);
  const productField = describeProductBreadth(validateAiField("product", readAiField(parsed, "product", ["product"]), confidence, value => normalizeCategory(value, PRODUCT_RULES, PRODUCT_ALIASES), ruleIntent.fields.product));
  const activityField = validateAiField("activity", readAiField(parsed, "activity", ["activity"]), confidence, value => normalizeCategory(value, ACTIVITY_RULES, ACTIVITY_ALIASES), ruleIntent.fields.activity);
  const frequencyField = validateAiField("frequency", readAiField(parsed, "frequency", ["frequency"]), confidence, value => normalizeCategory(value, FREQUENCY_RULES, FREQUENCY_ALIASES), ruleIntent.fields.frequency);
  const fields = { country: countryField, product: productField, activity: activityField, frequency: frequencyField };
  if (Object.values(fields).every(field => !field.normalizedValue)) return null;

  const country = findCountryByCode(countryList, countryField.normalizedValue) || resolveApprovedGeography(countryField.normalizedValue);
  const product = productField.normalizedValue;
  const activity = activityField.normalizedValue;
  const frequency = frequencyField.normalizedValue || "annual";
  const correctedQuery = cleanQueryMechanically(parsed.correctedQuery || forms.cleanedQuery).slice(0, 240);
  const normalizedQuery = normalizeText(correctedQuery);

  return addClarificationState({
    ...forms,
    correctedQuery: correctedQuery || forms.cleanedQuery,
    normalizedQuery,
    interpreter: "openai",
    interpretationMethod: "ai_primary",
    country,
    countryCode: country?.code || null,
    product,
    activity,
    frequency,
    confidence,
    fields,
    aiAmbiguity: parsed.ambiguity || null,
    fallback: {
      used: Object.values(fields).some(field => field.fallbackUsed),
      method: "field_level_deterministic_fallback",
      reasons: Object.values(fields).map(field => field.fallbackReason).filter(Boolean)
    },
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

function resolveAiCountryValue(value, parsed, countries) {
  const approved = resolveApprovedGeography(value) || resolveApprovedGeography(parsed.countryCode) || resolveApprovedGeography(parsed.countryName);
  if (approved) return approved.code;
  const direct = findCountryByCode(countries, value) || findCountryByCode(countries, parsed.countryCode);
  if (direct) return direct.code;
  const normalized = normalizeText(value || parsed.countryName || "");
  if (!normalized) return null;
  const byName = countries.find(country => normalizeText(country.name) === normalized);
  return byName?.code || null;
}

function readAiField(parsed, fieldName, legacyKeys) {
  const field = parsed?.fields?.[fieldName];
  if (field && typeof field === "object") {
    return {
      rawValue: field.rawValue ?? field.raw_value ?? null,
      value: field.value ?? field.aiValue ?? field.ai_value ?? null,
      confidence: Number(field.confidence),
      ambiguityReason: field.ambiguityReason ?? field.ambiguity_reason ?? null,
      alternatives: Array.isArray(field.alternatives) ? field.alternatives : []
    };
  }
  const value = legacyKeys.map(key => parsed?.[key]).find(item => item !== undefined && item !== null) ?? null;
  return { rawValue: null, value, confidence: Number.NaN, ambiguityReason: null, alternatives: [] };
}

function validateAiField(name, aiField, overallConfidence, validator, fallbackField) {
  const fieldConfidence = Number.isFinite(aiField.confidence) ? Math.max(0, Math.min(1, aiField.confidence)) : overallConfidence;
  const normalizedValue = aiField.ambiguityReason ? null : validator(aiField.value);
  const aiAlternatives = [...new Set((aiField.alternatives || []).map(value => validator(value)).filter(Boolean))];
  const alternatives = aiAlternatives.length
    ? aiAlternatives
    : [...new Set((fallbackField?.alternatives || []).map(value => validator(value)).filter(Boolean))];
  if (normalizedValue && fieldConfidence >= MIN_AI_CONFIDENCE) {
    return {
      rawValue: aiField.rawValue,
      aiValue: aiField.value,
      normalizedValue,
      validation: "approved",
      confidence: fieldConfidence,
      fallbackUsed: false,
      fallbackReason: null,
      fallbackMethod: null,
      reason: null,
      alternatives: []
    };
  }

  if (aiField.ambiguityReason && alternatives.length) {
    return {
      rawValue: aiField.rawValue,
      aiValue: aiField.value,
      normalizedValue: null,
      validation: "ambiguous",
      confidence: fieldConfidence,
      fallbackUsed: false,
      fallbackReason: null,
      fallbackMethod: null,
      reason: aiField.ambiguityReason,
      alternatives
    };
  }

  const fallbackValue = fallbackField?.normalizedValue || null;
  if (fallbackValue) {
    const cause = aiField.ambiguityReason
      ? `${name}_ai_ambiguous`
      : aiField.value == null
        ? `${name}_ai_missing`
        : fieldConfidence < MIN_AI_CONFIDENCE
          ? `${name}_ai_low_confidence`
          : `${name}_ai_rejected`;
    return {
      rawValue: aiField.rawValue,
      aiValue: aiField.value,
      normalizedValue: fallbackValue,
      validation: "fallback",
      confidence: fallbackField.confidence,
      fallbackUsed: true,
      fallbackReason: cause,
      fallbackMethod: "deterministic_rules",
      reason: fallbackField.reason || aiField.ambiguityReason || null,
      alternatives: fallbackField.alternatives || []
    };
  }

  return {
    rawValue: aiField.rawValue,
    aiValue: aiField.value,
    normalizedValue: null,
    validation: aiField.ambiguityReason ? "ambiguous" : aiField.value == null ? "missing" : "rejected",
    confidence: fieldConfidence,
    fallbackUsed: false,
    fallbackReason: null,
    fallbackMethod: null,
    reason: aiField.ambiguityReason || fallbackField?.reason || `${name} did not match an approved value.`,
    alternatives
  };
}

function describeProductBreadth(field) {
  if (field.normalizedValue && BROAD_PRODUCT_OPTIONS.has(field.normalizedValue)) {
    return { ...field, breadth: "broad", alternatives: BROAD_PRODUCT_OPTIONS.get(field.normalizedValue) };
  }
  if (!field.normalizedValue && field.alternatives?.length) return { ...field, breadth: "ambiguous" };
  return { ...field, breadth: field.normalizedValue ? "specific" : "unknown", alternatives: field.alternatives || [] };
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

function buildQueryForms(query) {
  const originalQuery = String(query ?? "");
  return { originalQuery, cleanedQuery: cleanQueryMechanically(originalQuery) };
}

export function cleanQueryMechanically(value) {
  return String(value ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function interpretProductWithRules(normalizedQuery) {
  const direct = firstRuleMatch(normalizedQuery, PRODUCT_RULES);
  if (direct) return {
    value: direct,
    reason: null,
    breadth: BROAD_PRODUCT_OPTIONS.has(direct) ? "broad" : "specific",
    alternatives: BROAD_PRODUCT_OPTIONS.get(direct) || []
  };
  for (const rule of AMBIGUOUS_PRODUCT_RULES) {
    if (!hasPhrase(normalizedQuery, rule.term)) continue;
    const contextualMatches = rule.contexts.filter(context => context.terms.some(term => hasPhrase(normalizedQuery, term)));
    if (contextualMatches.length === 1) {
      return { value: contextualMatches[0].value, reason: "The broad product term was resolved by surrounding context.", breadth: "specific", alternatives: [] };
    }
    return { value: null, reason: rule.reason, breadth: "ambiguous", alternatives: rule.alternatives };
  }
  return { value: null, reason: "No approved product was found.", breadth: "unknown", alternatives: [] };
}

function buildFallbackField(value, fallbackReason, reason, details = {}) {
  return {
    rawValue: null,
    aiValue: null,
    normalizedValue: value,
    validation: value ? "fallback" : details.alternatives?.length ? "ambiguous" : "missing",
    confidence: value ? 0.65 : 0.25,
    fallbackUsed: true,
    fallbackReason,
    fallbackMethod: "deterministic_rules",
    reason: reason || null,
    breadth: details.breadth || (value ? "specific" : "unknown"),
    alternatives: details.alternatives || []
  };
}

function addClarificationState(intent) {
  const missingFields = [];
  if (!intent.country) missingFields.push("country");
  if (!intent.product && !intent.fields?.product?.alternatives?.length) missingFields.push("product");
  if (!intent.activity) missingFields.push("activity");
  const ambiguousFields = Object.entries(intent.fields || {})
    .filter(([, field]) => field?.validation === "ambiguous")
    .map(([name]) => name);
  const blockingAmbiguousFields = ambiguousFields.filter(name => !intent.fields?.[name]?.alternatives?.length);
  const needsClarification = missingFields.length > 0 || blockingAmbiguousFields.length > 0;

  const clarifiedIntent = {
    ...intent,
    needsClarification,
    missingFields,
    ambiguousFields,
    clarificationMessage: needsClarification
      ? buildClarificationMessage(missingFields, blockingAmbiguousFields)
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
    fallback: mergeFallbackState(intent.fallback, structuredIntent.fallback)
  };
}

function buildClarificationMessage(missingFields, ambiguousFields) {
  return `Please clarify the ${formatList([...new Set([...missingFields, ...ambiguousFields])])}. Example: United States total energy consumption.`;
}

function mergeFallbackState(primary, routing) {
  const reasons = [...new Set([...(primary?.reasons || []), ...(routing?.reasons || [])])];
  return {
    used: Boolean(primary?.used || routing?.used),
    method: primary?.method || null,
    reasons
  };
}

function formatList(items) {
  if (items.length < 2) return items[0] || "request";
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
}

export function detectCountries(normalizedQuery, countries = [], originalQuery = "") {
  const found = new Map();
  const countryList = Array.isArray(countries) ? countries.filter(country => !String(country.code || "").startsWith("WP")) : [];

  for (const [alias, code] of COUNTRY_ALIASES.entries()) {
    if (!hasPhrase(normalizedQuery, alias)) continue;
    const country = findCountryByCode(countryList, code) || { code, name: alias.toUpperCase() };
    found.set(country.code, country);
  }

  for (const token of String(originalQuery).match(/\b[A-Z]{3}\b/g) || []) {
    const country = findCountryByCode(countryList, token);
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
