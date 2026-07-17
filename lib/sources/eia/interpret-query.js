import { readFileSync } from "node:fs";

import { requireAuthentication } from "../../auth.js";
import { buildStructuredIntent, findConceptMentions, findGeographyMentions, listApprovedGeographies, resolveApprovedGeography } from "./intent-routing.js";

const ROUTING_CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase4-routing-config.json", import.meta.url), "utf8"));
const PRODUCT_RULES = buildRules(ROUTING_CONFIG.vocabulary?.products);
const ACTIVITY_RULES = buildRules(ROUTING_CONFIG.vocabulary?.activities);
const SECTOR_RULES = buildRules(ROUTING_CONFIG.vocabulary?.sectors);
const FREQUENCY_RULES = buildRules(ROUTING_CONFIG.vocabulary?.frequencies);
const SCOPE_RULES = buildRules(ROUTING_CONFIG.vocabulary?.scopes);
const UNIT_RULES = buildRules(ROUTING_CONFIG.vocabulary?.units);

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
  ["califronia", "california"],
  ["montly", "monthly"],
  ["anual", "annual"]
]);

const PRODUCT_ALIASES = new Map([
  ...buildValueAliases(PRODUCT_RULES),
  ["energy", "total energy"],
  ["primary energy", "total energy"],
  ["oil", "petroleum"],
  ["power", "electricity"],
  ["renewables", "renewable"]
]);
const ACTIVITY_ALIASES = new Map([
  ...buildValueAliases(ACTIVITY_RULES),
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
  ...buildValueAliases(FREQUENCY_RULES),
  ["year", "annual"],
  ["yearly", "annual"],
  ["month", "monthly"],
  ["quarter", "quarterly"]
]);
const SECTOR_ALIASES = new Map(buildValueAliases(SECTOR_RULES));

export const OPENAI_TIMEOUT_MS = 30000;
const MIN_AI_CONFIDENCE = 0.6;

const BROAD_PRODUCT_OPTIONS = new Map(
  Object.entries(ROUTING_CONFIG.vocabulary?.products || {})
    .filter(([, config]) => Array.isArray(config.alternatives))
    .map(([product, config]) => [product, config.alternatives])
);

const AMBIGUOUS_PRODUCT_RULES = Object.entries(ROUTING_CONFIG.vocabulary?.ambiguousProducts || {})
  .map(([term, config]) => ({ term, ...config }));

const COUNTRY_ALIASES = new Map(Object.entries(ROUTING_CONFIG.geographyAliases || {}).filter(([, code]) => code !== "DC"));

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

function buildRules(items = {}) {
  return Object.entries(items).map(([value, config]) => ({
    value,
    terms: config.terms || [value]
  }));
}

function buildValueAliases(rules) {
  return rules.flatMap(rule => (rule.terms || []).map(term => [normalizeText(term), rule.value]));
}

function formatAllowedValues(rules) {
  return rules.map(rule => rule.value).join(", ");
}

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
    correctedQuerySource: rawIntent.correctedQuerySource,
    confidence: rawIntent.confidence ?? 0.75,
    ambiguity: rawIntent.ambiguity,
    geographies: rawIntent.geographies,
    conceptPairs: rawIntent.conceptPairs,
    exclusions: rawIntent.exclusions,
    unknownQualifiers: rawIntent.unknownQualifiers,
    fields: rawIntent.fields || {
      country: { value: rawIntent.countryCode },
      product: { value: rawIntent.product },
      activity: { value: rawIntent.activity },
      sector: { value: rawIntent.sector },
      frequency: { value: rawIntent.frequency, explicit: rawIntent.frequencyExplicit }
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
  const exclusions = findRuleExclusions(normalizedQuery);
  const productResult = interpretProductWithRules(normalizedQuery, exclusions);
  const product = productResult.value;
  const activity = firstNonExcludedRuleMatch(normalizedQuery, ACTIVITY_RULES, exclusions, "activity");
  const requestedFrequency = firstRuleMatch(normalizedQuery, FREQUENCY_RULES);
  const frequency = requestedFrequency || "annual";
  const sector = firstNonExcludedRuleMatch(normalizedQuery, SECTOR_RULES, exclusions, "sector");
  const fields = {
    country: buildFallbackField(detectedCountries[0]?.code || null, fallbackReason, detectedCountries[0] ? null : "No approved geography was found."),
    product: buildFallbackField(product, fallbackReason, productResult.reason, productResult),
    activity: buildFallbackField(activity, fallbackReason, activity ? null : "No approved activity was found."),
    sector: buildFallbackField(sector, fallbackReason, sector ? null : "No approved sector was found."),
    frequency: { ...buildFallbackField(frequency, fallbackReason, null), explicit: Boolean(requestedFrequency) }
  };

  return addClarificationState({
    ...forms,
    correctedQuery: normalizedQuery === rawNormalizedQuery ? forms.cleanedQuery : normalizedQuery,
    correctedQuerySource: normalizedQuery === rawNormalizedQuery ? "unchanged" : "deterministic_typo_rules",
    normalizedQuery,
    interpreter: "rules",
    interpretationMethod: "deterministic_fallback",
    mode: detectedCountries.length > 1 ? "multiple" : "single",
    country: detectedCountries[0] || null,
    countryCode: detectedCountries[0]?.code || null,
    validatedGeographies: detectedCountries,
    extraCountriesIgnored: detectedCountries.slice(1),
    product,
    activity,
    sector,
    frequency,
    requestedFrequency,
    frequencyExplicit: Boolean(requestedFrequency),
    exclusions,
    unknownQualifiers: findUnknownQualifiers(normalizedQuery),
    confidence: product || activity || detectedCountries.length ? 0.65 : 0.25,
    fields,
    fallback: { used: true, method: "deterministic_rules", reasons: [fallbackReason] },
    cleanedKeywords: buildCleanedKeywords(normalizedQuery, detectedCountries)
  });
}

async function interpretQueryWithOpenAI(forms, countries) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { intent: null, reason: "openai_not_configured" };

  const countryList = mergeCountries([...countries, ...listApprovedGeographies()], FALLBACK_COUNTRIES).slice(0, 350);
  const model = process.env.OPENAI_MODEL || "gpt-5.4-mini";
  const prompt = [
    "Convert the user's EIA energy data search into strict JSON.",
    "Act as the primary natural-language parser: correct obvious typos, expand common abbreviations, and ignore filler text.",
    "Interpret the exact raw query supplied below.",
    "Extract validated geographies, ordered product/activity pairs, sector, frequency, exclusions or negations, and unresolved qualifiers.",
    "Preserve the user's mention order. Do not discard a second geography or a second requested activity.",
    "Preserve every explicitly named geography. Never replace a U.S. state with the United States national geography.",
    "A sector must be explicitly stated. Do not infer the electric-power sector merely from electricity or generation.",
    "Do not list recognized geography, product, activity, sector, or frequency words as unknown qualifiers.",
    "Keep an unresolved broad or ambiguous product null rather than selecting one interpretation without query evidence.",
    "The singular country, product, and activity fields are compatibility summaries; geographies and conceptPairs preserve every validated request.",
    "Return null and an ambiguity reason when a field cannot be inferred safely. Do not turn a negated term into a positive request.",
    "Do not invent geographies or categories. Return a canonical geography name or code; local metadata validation will reject unknown values.",
    `Allowed product values: ${formatAllowedValues(PRODUCT_RULES)}, or null.`,
    `Allowed activity values: ${formatAllowedValues(ACTIVITY_RULES)}, or null.`,
    `Allowed sector values: ${formatAllowedValues(SECTOR_RULES)}, or null.`,
    `Allowed frequency values: ${formatAllowedValues(FREQUENCY_RULES)}, or null. Use annual when no frequency is stated, and set frequency.explicit to false.`,
    "Never return or invent an EIA series ID.",
    "Return only JSON with correctedQuery, confidence, ambiguity, fields, geographies, conceptPairs, exclusions, and unknownQualifiers.",
    "Each fields entry (country, product, activity, sector, frequency) must contain rawValue, value, confidence, and ambiguityReason; frequency must also contain explicit.",
    "Each geography item contains value and confidence. Each conceptPairs item contains product, activity, order, and confidence.",
    "Each exclusion contains type (product, activity, sector, or conceptType), value, and confidence. unknownQualifiers is an ordered array of literal unresolved source or scope terms.",
    `Raw query: ${JSON.stringify(forms.originalQuery)}`
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
  const correctedQuery = cleanQueryMechanically(parsed.correctedQuery || forms.cleanedQuery).slice(0, 240);
  const correctedQuerySource = parsed.correctedQuerySource === "unchanged" && correctedQuery === forms.cleanedQuery
    ? "unchanged"
    : parsed.correctedQuery ? "ai" : "unchanged";
  const deterministicEvidenceQuery = ruleIntent.normalizedQuery || normalizeText(forms.cleanedQuery);
  const ruleExclusions = mergeExclusions(ruleIntent.exclusions, findRuleExclusions(deterministicEvidenceQuery));
  const validatePositiveField = (type, value, validator) => {
    const normalizedValue = validator(value);
    return ruleExclusions.some(item => item.type === type && item.value === normalizedValue) ? null : normalizedValue;
  };
  const countryField = validateAiField("country", readAiField(parsed, "country", ["countryCode", "countryName"]), confidence, value => {
    const code = resolveAiCountryValue(value, parsed, countryList);
    return isGeographySupportedByQuery(code, deterministicEvidenceQuery, ruleIntent, countryList) ? code : null;
  }, ruleIntent.fields.country, {
    claimNormalizer: value => resolveAiCountryValue(value, parsed, countryList)
  });
  const productField = describeProductBreadth(validateAiField(
    "product",
    readAiField(parsed, "product", ["product"]),
    confidence,
    value => validatePositiveField("product", value, candidate => validateExplicitCategory(candidate, PRODUCT_RULES, PRODUCT_ALIASES, deterministicEvidenceQuery)),
    ruleIntent.fields.product,
    {
      preserveFallbackAmbiguity: true,
      fallbackBeforeAmbiguity: !BROAD_PRODUCT_OPTIONS.has(ruleIntent.fields.product?.normalizedValue)
        || hasPhrase(deterministicEvidenceQuery, ruleIntent.fields.product?.normalizedValue),
      alternativeValidator: value => normalizeCategory(value, PRODUCT_RULES, PRODUCT_ALIASES),
      claimNormalizer: value => normalizeCategory(value, PRODUCT_RULES, PRODUCT_ALIASES)
    }
  ));
  const activityField = validateAiField(
    "activity",
    readAiField(parsed, "activity", ["activity"]),
    confidence,
    value => validatePositiveField("activity", value, candidate => validateExplicitCategory(candidate, ACTIVITY_RULES, ACTIVITY_ALIASES, deterministicEvidenceQuery)),
    ruleIntent.fields.activity,
    { claimNormalizer: value => normalizeCategory(value, ACTIVITY_RULES, ACTIVITY_ALIASES) }
  );
  const rawSectorField = readAiField(parsed, "sector", ["sector"]);
  const sectorField = validateAiField("sector", {
    ...rawSectorField,
    ambiguityReason: ruleIntent.fields.sector?.normalizedValue ? rawSectorField.ambiguityReason : null
  }, confidence, value => {
    const sector = normalizeCategory(value, SECTOR_RULES, SECTOR_ALIASES);
    const explicitSector = sector && isCategoryExplicit(sector, SECTOR_RULES, deterministicEvidenceQuery) ? sector : null;
    return ruleExclusions.some(item => item.type === "sector" && item.value === explicitSector) ? null : explicitSector;
  }, ruleIntent.fields.sector, {
    claimNormalizer: value => normalizeCategory(value, SECTOR_RULES, SECTOR_ALIASES)
  });
  const rawFrequencyField = readAiField(parsed, "frequency", ["frequency"]);
  const frequencyField = {
    ...validateAiField("frequency", rawFrequencyField, confidence, value => {
      const frequency = normalizeCategory(value, FREQUENCY_RULES, FREQUENCY_ALIASES);
      if (ruleIntent.frequencyExplicit && frequency !== ruleIntent.requestedFrequency) return null;
      return frequency;
    }, ruleIntent.fields.frequency, {
      claimNormalizer: value => normalizeCategory(value, FREQUENCY_RULES, FREQUENCY_ALIASES)
    }),
    explicit: Boolean(ruleIntent.frequencyExplicit)
  };
  const fields = { country: countryField, product: productField, activity: activityField, sector: sectorField, frequency: frequencyField };
  if (Object.values(fields).every(field => !field.normalizedValue)) return null;

  const validatedGeographies = validateAiGeographies(parsed.geographies, confidence, parsed, countryList, deterministicEvidenceQuery, ruleIntent);
  const country = validatedGeographies[0] || findCountryByCode(countryList, countryField.normalizedValue) || resolveApprovedGeography(countryField.normalizedValue);
  const product = productField.normalizedValue;
  const activity = activityField.normalizedValue;
  const sector = sectorField.normalizedValue;
  const frequency = frequencyField.normalizedValue || "annual";
  const conceptPairs = preserveAmbiguousPairProducts(
    validateAiConceptPairs(parsed.conceptPairs, confidence, deterministicEvidenceQuery, ruleIntent),
    productField
  );
  const exclusions = mergeExclusions(
    ruleExclusions,
    validateAiExclusions(parsed.exclusions, confidence).filter(item => ruleExclusions.some(rule => sameExclusion(rule, item)))
  );
  const unknownQualifiers = validateUnknownQualifiers(parsed.unknownQualifiers, deterministicEvidenceQuery, ruleIntent);
  const normalizedQuery = deterministicEvidenceQuery;

  return addClarificationState({
    ...forms,
    correctedQuery: correctedQuery || forms.cleanedQuery,
    correctedQuerySource,
    normalizedQuery,
    interpreter: "openai",
    interpretationMethod: "ai_primary",
    country,
    countryCode: country?.code || null,
    validatedGeographies,
    product,
    activity,
    sector,
    frequency,
    requestedFrequency: frequencyField.explicit ? frequency : null,
    frequencyExplicit: frequencyField.explicit,
    validatedConceptPairs: conceptPairs,
    exclusions,
    unknownQualifiers,
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
      alternatives: Array.isArray(field.alternatives) ? field.alternatives : [],
      explicit: typeof field.explicit === "boolean" ? field.explicit : undefined
    };
  }
  const value = legacyKeys.map(key => parsed?.[key]).find(item => item !== undefined && item !== null) ?? null;
  return { rawValue: null, value, confidence: Number.NaN, ambiguityReason: null, alternatives: [], explicit: undefined };
}

function validateAiGeographies(values, overallConfidence, parsed, countries, query, ruleIntent) {
  if (!Array.isArray(values)) return [];
  const validated = [];
  for (const item of values) {
    const value = item && typeof item === "object" ? item.value ?? item.code ?? item.name : item;
    const confidence = Number(item?.confidence ?? overallConfidence);
    if (!Number.isFinite(confidence) || confidence < MIN_AI_CONFIDENCE) continue;
    const code = resolveAiCountryValue(value, item && typeof item === "object" ? item : parsed, countries);
    const geography = resolveApprovedGeography(code) || findCountryByCode(countries, code);
    if (
      geography?.code &&
      isGeographySupportedByQuery(geography.code, query, ruleIntent, countries) &&
      !validated.some(existing => existing.code === geography.code)
    ) validated.push(geography);
  }
  return validated;
}

function isGeographySupportedByQuery(code, query, ruleIntent, countries) {
  if (!code) return false;
  const deterministicCodes = new Set(
    (ruleIntent?.validatedGeographies?.length ? ruleIntent.validatedGeographies : [ruleIntent?.country])
      .map(geography => geography?.code)
      .filter(Boolean)
  );
  if (deterministicCodes.size > 0) return deterministicCodes.has(code);

  const geography = resolveApprovedGeography(code) || findCountryByCode(countries, code);
  if (!geography) return false;
  if (hasPhrase(normalizeText(query), geography.name)) return true;
  return new RegExp(`(^|[^A-Z0-9])${escapeRegExp(code)}(?=$|[^A-Z0-9])`).test(String(query || ""));
}

function validateAiConceptPairs(values, overallConfidence, query, ruleIntent) {
  const fallbackPairs = ruleIntent?.structuredIntent?.conceptPairs || [];
  const orderedValues = (Array.isArray(values) ? values : []).map((item, index) => ({
    item,
    index,
    order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index
  })).sort((left, right) => left.order - right.order || left.index - right.index);
  const seen = new Set();

  const validated = orderedValues.map(({ item }, index) => {
    const confidence = Number(item?.confidence ?? overallConfidence);
    if (!Number.isFinite(confidence) || confidence < MIN_AI_CONFIDENCE) return null;
    const fallbackPair = fallbackPairs[index] || (fallbackPairs.length === 1 ? fallbackPairs[0] : null);
    const validatedProduct = validateExplicitCategory(item?.product, PRODUCT_RULES, PRODUCT_ALIASES, query);
    const validatedActivity = validateExplicitCategory(item?.activity, ACTIVITY_RULES, ACTIVITY_ALIASES, query);
    const product = validatedProduct || fallbackPair?.product || null;
    const activity = validatedActivity || fallbackPair?.activity || null;
    if (!product && !activity && !fallbackPair) return null;
    const key = `${product || ""}:${activity || ""}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      order: index,
      product,
      activity,
      confidence: Math.max(0, Math.min(1, confidence)),
      source: "validated_interpreter"
    };
  }).filter(Boolean);

  if (fallbackPairs.length === 0) return validated.map((pair, order) => ({ ...pair, order }));

  const productCanBeFilled = !ruleIntent.fields.product?.alternatives?.length;
  const reconciled = fallbackPairs.map((fallback, index) => {
    const exactMatch = validated.find(pair => pair.product === fallback.product && pair.activity === fallback.activity);
    const fillCandidate = exactMatch || validated[index] || null;
    return {
      order: index,
      product: fallback.product || (productCanBeFilled ? fillCandidate?.product || null : null),
      activity: fallback.activity || fillCandidate?.activity || null,
      confidence: exactMatch?.confidence ?? null,
      source: exactMatch ? exactMatch.source : "deterministic_rules"
    };
  });
  return reconciled.map((pair, order) => ({ ...pair, order }));
}

function validateAiExclusions(values, overallConfidence) {
  if (!Array.isArray(values)) return [];
  const validated = [];
  for (const [index, item] of values.entries()) {
    const type = normalizeText(item?.type);
    const confidence = Number(item?.confidence ?? overallConfidence);
    if (!Number.isFinite(confidence) || confidence < MIN_AI_CONFIDENCE) continue;
    const value = type === "product"
      ? normalizeCategory(item?.value, PRODUCT_RULES, PRODUCT_ALIASES)
      : type === "activity"
        ? normalizeCategory(item?.value, ACTIVITY_RULES, ACTIVITY_ALIASES)
        : type === "sector"
          ? normalizeCategory(item?.value, SECTOR_RULES, SECTOR_ALIASES)
          : type === "concepttype" && ["price", "stock"].includes(normalizeText(item?.value))
            ? normalizeText(item.value)
            : null;
    if (!value) continue;
    const key = `${type}:${value}`;
    if (!validated.some(existing => `${existing.type}:${existing.value}` === key)) {
      validated.push({ type: type === "concepttype" ? "conceptType" : type, value, order: index, confidence, source: "validated_interpreter" });
    }
  }
  return validated;
}

function mergeExclusions(...groups) {
  const merged = [];
  for (const item of groups.flat()) {
    if (!item || merged.some(existing => sameExclusion(existing, item))) continue;
    merged.push({ ...item, order: merged.length });
  }
  return merged;
}

function sameExclusion(left, right) {
  return left?.type === right?.type && left?.value === right?.value;
}

function validateUnknownQualifiers(values, _query, ruleIntent) {
  const deterministic = Array.isArray(ruleIntent?.unknownQualifiers) ? ruleIntent.unknownQualifiers : [];
  if (deterministic.length === 0) return [];
  const aiValues = Array.isArray(values) ? values : [];

  return deterministic.map((item, index) => {
    const value = cleanQueryMechanically(item?.value).slice(0, 80);
    const aiMatch = aiValues.find(candidate => {
      const candidateValue = candidate && typeof candidate === "object" ? candidate.value : candidate;
      return normalizeText(candidateValue) === normalizeText(value);
    });
    const aiConfidence = Number(aiMatch && typeof aiMatch === "object" ? aiMatch.confidence : Number.NaN);
    return {
      value,
      order: Number.isFinite(Number(item?.order)) ? Number(item.order) : index,
      confidence: Number.isFinite(aiConfidence) ? Math.max(0, Math.min(1, aiConfidence)) : item?.confidence ?? 1,
      source: aiMatch ? "validated_interpreter_and_rules" : item?.source || "deterministic_unresolved_qualifier"
    };
  }).filter(item => item.value);
}

function isCategoryExplicit(value, rules, query) {
  const rule = rules.find(item => item.value === value);
  return Boolean(rule && [rule.value, ...(rule.terms || [])].some(term => hasPhrase(normalizeText(query), term)));
}

function validateExplicitCategory(value, rules, aliases, query) {
  const normalized = normalizeCategory(value, rules, aliases);
  return normalized && isCategoryExplicit(normalized, rules, query) ? normalized : null;
}

function preserveAmbiguousPairProducts(pairs, productField) {
  if (productField.normalizedValue || !productField.alternatives?.length) return pairs;
  const alternatives = new Set(productField.alternatives);
  return pairs.map(pair => alternatives.has(pair.product) ? { ...pair, product: null } : pair);
}

function validateAiField(name, aiField, overallConfidence, validator, fallbackField, options = {}) {
  const fieldConfidence = Number.isFinite(aiField.confidence) ? Math.max(0, Math.min(1, aiField.confidence)) : overallConfidence;
  const normalizedValue = aiField.ambiguityReason ? null : validator(aiField.value);
  const alternativeValidator = options.alternativeValidator || validator;
  const claimNormalizer = options.claimNormalizer || alternativeValidator;
  const aiCanonicalValue = aiField.ambiguityReason ? null : claimNormalizer(aiField.value);
  const deterministicValue = fallbackField?.normalizedValue || null;
  const conflictStatus = fieldConflictStatus(aiField.value, aiCanonicalValue, deterministicValue);
  const withProvenance = result => ({
    ...result,
    deterministicValue,
    conflictStatus,
    resolutionSource: fieldResolutionSource(result.validation),
    validationEvidenceSource: "raw_derived_deterministic"
  });
  const aiAlternatives = [...new Set((aiField.alternatives || []).map(value => alternativeValidator(value)).filter(Boolean))];
  const alternatives = aiAlternatives.length
    ? aiAlternatives
    : [...new Set((fallbackField?.alternatives || []).map(value => alternativeValidator(value)).filter(Boolean))];
  if (options.preserveFallbackAmbiguity && !fallbackField?.normalizedValue && fallbackField?.alternatives?.length > 1) {
    return withProvenance({
      rawValue: aiField.rawValue,
      aiValue: aiField.value,
      normalizedValue: null,
      validation: "ambiguous",
      confidence: fieldConfidence,
      fallbackUsed: false,
      fallbackReason: null,
      fallbackMethod: null,
      reason: fallbackField.reason || aiField.ambiguityReason || `${name} remains ambiguous.`,
      alternatives: fallbackField.alternatives
    });
  }
  if (normalizedValue && fieldConfidence >= MIN_AI_CONFIDENCE) {
    return withProvenance({
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
    });
  }

  const fallbackValue = fallbackField?.normalizedValue || null;
  if (fallbackValue && (!aiField.ambiguityReason || options.fallbackBeforeAmbiguity !== false)) {
    const cause = aiField.ambiguityReason
      ? `${name}_ai_ambiguous`
      : aiField.value == null
        ? `${name}_ai_missing`
        : fieldConfidence < MIN_AI_CONFIDENCE
          ? `${name}_ai_low_confidence`
          : `${name}_ai_rejected`;
    return withProvenance({
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
    });
  }

  if (aiField.ambiguityReason && alternatives.length) {
    return withProvenance({
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
    });
  }

  return withProvenance({
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
  });
}

function fieldConflictStatus(aiValue, aiCanonicalValue, deterministicValue) {
  if (aiValue != null && aiValue !== "" && !aiCanonicalValue) return "unsupported_ai_claim";
  if (aiCanonicalValue && deterministicValue) return aiCanonicalValue === deterministicValue ? "agreement" : "conflict";
  if (aiCanonicalValue) return "ai_only";
  if (deterministicValue) return "deterministic_only";
  return "none";
}

function fieldResolutionSource(validation) {
  if (validation === "approved") return "ai_validated";
  if (validation === "fallback") return "deterministic_fallback";
  return "unresolved";
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

function findRuleExclusions(normalizedQuery) {
  const markers = new Set(ROUTING_CONFIG.vocabulary?.negationMarkers || []);
  const exclusions = [];
  for (const mention of findConceptMentions(normalizedQuery)) {
    const prefix = normalizedQuery.slice(0, mention.index).trim().split(" ").slice(-3);
    if (!prefix.some(token => markers.has(token))) continue;
    const type = mention.type === "scope" ? "conceptType" : mention.type;
    const key = `${type}:${mention.value}`;
    if (!exclusions.some(item => `${item.type}:${item.value}` === key)) {
      exclusions.push({ type, value: mention.value, order: exclusions.length, confidence: 1, source: "deterministic_negation" });
    }
  }
  return exclusions;
}

function findUnknownQualifiers(normalizedQuery) {
  const connectors = ROUTING_CONFIG.vocabulary?.unknownQualifierConnectors || [];
  const unknown = [];
  for (const connector of connectors) {
    const pattern = new RegExp(`(?:^| )${escapeRegExp(connector)} ([a-z0-9]+(?: [a-z0-9]+){0,2})(?= |$)`, "g");
    for (const match of normalizedQuery.matchAll(pattern)) {
      const phrase = match[1].split(" ").filter(token => !["a", "an", "the"].includes(token)).join(" ");
      if (!phrase || /^\d/.test(phrase)) continue;
      if (findConceptMentions(phrase).length > 0 || findGeographyMentions(phrase).length > 0) continue;
      if (firstRuleMatch(phrase, SECTOR_RULES) || firstRuleMatch(phrase, FREQUENCY_RULES)) continue;
      const value = phrase.split(" ")[0];
      if (!unknown.some(item => item.value === value)) {
        unknown.push({ value, connector, order: unknown.length, confidence: 1, source: "deterministic_unresolved_qualifier" });
      }
    }
  }
  return unknown;
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

function interpretProductWithRules(normalizedQuery, exclusions = []) {
  const excluded = new Set(exclusions.filter(item => item.type === "product").map(item => item.value));
  const direct = findConceptMentions(normalizedQuery)
    .find(mention => mention.type === "product" && !excluded.has(mention.value))?.value || null;
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

function firstNonExcludedRuleMatch(text, rules, exclusions, type) {
  const excluded = new Set(exclusions.filter(item => item.type === type).map(item => item.value));
  for (const rule of rules) {
    if (!excluded.has(rule.value) && rule.terms.some(term => hasPhrase(text, normalizeText(term)))) return rule.value;
  }
  return null;
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
  const unresolvedQualifiers = (intent.unknownQualifiers || []).map(item => item.value).filter(Boolean);
  const needsClarification = missingFields.length > 0 || blockingAmbiguousFields.length > 0 || unresolvedQualifiers.length > 0;
  const blockingClarification = unresolvedQualifiers.length > 0 || missingFields.some(name => name === "country" || name === "product") || blockingAmbiguousFields.length > 0;

  const clarifiedIntent = {
    ...intent,
    needsClarification,
    blockingClarification,
    missingFields,
    ambiguousFields,
    clarificationMessage: needsClarification
      ? buildClarificationMessage(missingFields, blockingAmbiguousFields, unresolvedQualifiers)
      : null
  };
  const structuredIntent = buildStructuredIntent(clarifiedIntent, clarifiedIntent.originalQuery);

  return {
    ...clarifiedIntent,
    frequency: structuredIntent.frequency,
    requestedFrequency: structuredIntent.requestedFrequency,
    frequencyExplicit: structuredIntent.frequencyExplicit,
    sector: structuredIntent.sector,
    conceptPairs: structuredIntent.conceptPairs,
    exclusions: structuredIntent.exclusions,
    unknownQualifiers: structuredIntent.unknownQualifiers,
    structuredIntent,
    route: structuredIntent.route,
    validation: structuredIntent.validation,
    ambiguity: structuredIntent.ambiguity,
    fallback: mergeFallbackState(intent.fallback, structuredIntent.fallback)
  };
}

function buildClarificationMessage(missingFields, ambiguousFields, unresolvedQualifiers = []) {
  if (unresolvedQualifiers.length > 0) {
    return `Please clarify or remove the unsupported qualifier ${formatList(unresolvedQualifiers)}. No series will be selected until it is resolved.`;
  }
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
  for (const rule of [...PRODUCT_RULES, ...ACTIVITY_RULES, ...SECTOR_RULES, ...FREQUENCY_RULES]) {
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

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function mergeCountries(primary = [], fallback = []) {
  const merged = new Map();
  for (const country of fallback) merged.set(country.code, country);
  for (const country of primary) {
    if (country?.code && country?.name && !String(country.code).startsWith("WP")) merged.set(country.code, country);
  }
  return Array.from(merged.values());
}
