import { readFileSync } from "node:fs";

const ROUTING_METADATA = JSON.parse(readFileSync(new URL("../../../data/eia/routing-metadata.json", import.meta.url), "utf8"));

const ROUTE_PRIORITY = ["domestic", "international", "seds"];
const ROUTE_LABELS = {
  domestic: "Domestic EIA",
  international: "International",
  seds: "SEDS"
};

const GEOGRAPHY_ALIASES = new Map([
  ["us", "USA"], ["u s", "USA"], ["usa", "USA"], ["america", "USA"], ["united states", "USA"],
  ["uk", "GBR"], ["britain", "GBR"], ["great britain", "GBR"], ["united kingdom", "GBR"],
  ["uae", "ARE"], ["emirates", "ARE"], ["south korea", "KOR"],
  ["north korea", "PRK"], ["russia", "RUS"], ["iran", "IRN"],
  ["venezuela", "VEN"], ["vietnam", "VNM"], ["czech republic", "CZE"],
  ["czechia", "CZE"], ["dc", "DC"]
]);

const CONCEPT_RULES = [
  { type: "product", value: "natural gas", terms: ["natural gas", "nat gas", "gas"] },
  { type: "product", value: "petroleum", terms: ["petroleum and other liquids", "liquid fuels", "crude oil", "petroleum", "gasoline", "diesel", "crude", "oil"] },
  { type: "product", value: "electricity", terms: ["electricity", "electric power", "power"] },
  { type: "product", value: "coal", terms: ["coal"] },
  { type: "product", value: "nuclear", terms: ["nuclear"] },
  { type: "product", value: "renewable", terms: ["renewable energy", "renewables", "renewable"] },
  { type: "product", value: "hydro", terms: ["hydroelectric", "hydropower", "hydro"] },
  { type: "product", value: "solar", terms: ["solar"] },
  { type: "product", value: "wind", terms: ["wind"] },
  { type: "product", value: "biofuels", terms: ["biofuels", "biofuel", "biomass"] },
  { type: "product", value: "total energy", terms: ["primary energy", "total energy", "energy"] },
  { type: "activity", value: "consumption", terms: ["consumption", "consumed", "consume", "usage", "demand", "use"] },
  { type: "activity", value: "production", terms: ["production", "produced", "produce", "supply", "output"] },
  { type: "activity", value: "generation", terms: ["electricity generation", "power generation", "generation", "generated"] },
  { type: "activity", value: "imports", terms: ["imports", "imported", "import"] },
  { type: "activity", value: "exports", terms: ["exports", "exported", "export"] },
  { type: "activity", value: "reserves", terms: ["reserves", "reserve"] },
  { type: "activity", value: "capacity", terms: ["capacity"] },
  { type: "activity", value: "prices", terms: ["prices", "price", "cost"] },
  { type: "scope", value: "plant", terms: ["power plant", "electric plant", "plant", "facility"] },
  { type: "scope", value: "sales", terms: ["retail sales", "electricity sales", "sales"] },
  { type: "scope", value: "customers", terms: ["customer accounts", "customers", "customer"] }
];

const FREQUENCY_RULES = [
  { value: "monthly", terms: ["monthly", "months", "month"] },
  { value: "quarterly", terms: ["quarterly", "quarters", "quarter"] },
  { value: "annual", terms: ["annually", "annual", "yearly", "years", "year"] }
];

const geographyByCode = new Map();
for (const geography of ROUTING_METADATA.geographies) {
  const current = geographyByCode.get(geography.code);
  if (!current || routeScore(geography.routeFamilies) > routeScore(current.routeFamilies)) {
    geographyByCode.set(geography.code, geography);
  }
}

export function buildStructuredIntent(baseIntent, query) {
  const originalQuery = String(query || baseIntent?.originalQuery || "").trim();
  const normalizedQuery = normalizeText(originalQuery);
  const geographyMentions = findGeographyMentions(normalizedQuery, originalQuery);
  const conceptMentions = findConceptMentions(normalizedQuery);
  const frequencyMentions = findFrequencyMentions(normalizedQuery);
  const interpreterFallbackReasons = [];
  if (geographyMentions.length === 0) {
    const countryCode = String(baseIntent?.countryCode || "").toUpperCase();
    const allowInterpreterGeography = baseIntent?.interpreter === "openai" || hasUppercaseCode(originalQuery, countryCode);
    const geography = allowInterpreterGeography ? geographyByCode.get(countryCode) : null;
    if (geography) {
      geographyMentions.push({ index: null, text: null, source: "interpreter_fallback", geography: cleanGeography(geography) });
      interpreterFallbackReasons.push("geography_from_validated_interpreter");
    }
  }
  if (!conceptMentions.some(mention => mention.type === "product") && baseIntent?.product) {
    interpreterFallbackReasons.push("product_from_validated_interpreter");
  }
  if (!conceptMentions.some(mention => mention.type === "activity") && baseIntent?.activity) {
    interpreterFallbackReasons.push("activity_from_validated_interpreter");
  }
  const route = chooseRoute({ geographyMentions, conceptMentions, frequencyMentions });
  const frequency = validateFrequency(frequencyMentions[0]?.value || baseIntent?.frequency || "annual", route.family);
  const ambiguityReasons = buildAmbiguityReasons(geographyMentions, conceptMentions, route);
  const fallbackReasons = [...interpreterFallbackReasons, ...route.fallbackReasons, ...frequency.fallbackReasons];

  return {
    schemaVersion: "2.0.0",
    originalQuery,
    normalizedQuery,
    mentions: {
      geographies: geographyMentions,
      concepts: conceptMentions,
      frequencies: frequencyMentions
    },
    geography: geographyMentions[0]?.geography || null,
    geographies: geographyMentions.map(mention => mention.geography),
    product: firstMentionValue(conceptMentions, "product") || baseIntent?.product || null,
    activity: firstMentionValue(conceptMentions, "activity") || baseIntent?.activity || null,
    frequency: frequency.value,
    validation: {
      geography: geographyMentions.length > 0 ? "valid" : "missing",
      frequency: frequency.status,
      metadataSource: ROUTING_METADATA.source
    },
    ambiguity: {
      status: ambiguityReasons.length > 0 ? "ambiguous" : "none",
      reasons: ambiguityReasons
    },
    fallback: {
      used: fallbackReasons.length > 0,
      reasons: fallbackReasons
    },
    route: {
      family: route.family,
      label: ROUTE_LABELS[route.family],
      reason: route.reason,
      deterministic: true
    }
  };
}

export function findGeographyMentions(normalizedQuery, originalQuery = "") {
  const matches = [];
  for (const geography of ROUTING_METADATA.geographies) {
    addPhraseMatch(matches, normalizedQuery, geography.name, { ...geography, matchPriority: 0 });
    if (hasUppercaseCode(originalQuery, geography.code)) {
      addPhraseMatch(matches, normalizedQuery, geography.code, { ...geography, matchPriority: 5 });
    }
  }
  for (const [alias, code] of GEOGRAPHY_ALIASES) {
    const geography = geographyByCode.get(code);
    if (geography) addPhraseMatch(matches, normalizedQuery, alias, { ...geography, matchPriority: 10 });
  }
  return selectOrderedMentions(matches, "geography");
}

export function findConceptMentions(normalizedQuery) {
  const matches = [];
  for (const rule of CONCEPT_RULES) {
    for (const term of rule.terms) addPhraseMatch(matches, normalizedQuery, term, { type: rule.type, value: rule.value });
  }
  return selectOrderedMentions(matches, "concept");
}

function findFrequencyMentions(normalizedQuery) {
  const matches = [];
  for (const rule of FREQUENCY_RULES) {
    for (const term of rule.terms) addPhraseMatch(matches, normalizedQuery, term, { value: rule.value });
  }
  return selectOrderedMentions(matches, "frequency");
}

function chooseRoute({ geographyMentions, conceptMentions, frequencyMentions }) {
  const geographies = geographyMentions.map(mention => mention.geography);
  const hasState = geographies.some(geography => geography.type === "state");
  const hasInternational = geographies.some(geography => geography.routeFamilies.includes("international") && geography.code !== "USA");
  const hasUsNational = geographies.some(geography => geography.code === "USA");
  const concepts = new Set(conceptMentions.map(mention => mention.value));
  const electricitySpecific = ["electricity", "generation", "capacity", "plant", "sales", "customers"].some(value => concepts.has(value));
  const sedsSpecific = ["total energy", "consumption", "production", "prices"].some(value => concepts.has(value));
  const requestedFrequency = frequencyMentions[0]?.value || "annual";

  if (hasInternational || geographies.length > 1 && !hasState) {
    return decision("international", "A non-U.S. country or multi-country request uses International.");
  }
  if (hasState && electricitySpecific) {
    return decision("domestic", "A state-level electricity request uses Domestic EIA.");
  }
  if (hasState && sedsSpecific) {
    return decision("seds", "A state-level energy request uses SEDS.");
  }
  if (hasState) {
    return decision("seds", "A state request defaults to SEDS.", ["route_defaulted_for_state"]);
  }
  if (hasUsNational && electricitySpecific) {
    return decision("domestic", "A U.S. national electricity request uses Domestic EIA.");
  }
  if (hasUsNational) {
    return decision("international", "A U.S. non-electricity request uses the available International metadata.");
  }
  if (electricitySpecific || requestedFrequency !== "annual") {
    return decision("domestic", "An electricity or nonannual request without geography defaults to Domestic EIA.", ["route_defaulted_without_geography"]);
  }
  return decision("international", "A request without routable geography defaults to International.", ["route_defaulted_without_geography"]);
}

function validateFrequency(requested, routeFamily) {
  const route = ROUTING_METADATA.routes.find(item => item.family === routeFamily);
  const supported = route?.frequencies || [];
  if (supported.includes(requested)) return { value: requested, status: "valid", fallbackReasons: [] };
  const value = route?.defaultFrequency || supported[0] || "annual";
  return {
    value,
    status: "fallback",
    fallbackReasons: [`frequency_${requested}_unsupported_by_${routeFamily}_using_${value}`]
  };
}

function buildAmbiguityReasons(geographies, concepts, route) {
  const reasons = [];
  if (geographies.length === 0) reasons.push("geography_missing");
  if (geographies.length > 1) reasons.push("multiple_geographies");
  if (!concepts.some(mention => mention.type === "product" || mention.type === "scope")) reasons.push("product_or_scope_missing");
  if (!concepts.some(mention => mention.type === "activity" || mention.type === "scope")) reasons.push("activity_or_scope_missing");
  if (route.fallbackReasons.length > 0) reasons.push("route_required_fallback");
  return reasons;
}

function decision(family, reason, fallbackReasons = []) {
  return { family, reason, fallbackReasons };
}

function firstMentionValue(mentions, type) {
  return mentions.find(mention => mention.type === type)?.value || null;
}

function addPhraseMatch(matches, text, phrase, payload) {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return;
  const pattern = new RegExp(`(?:^| )${escapeRegExp(normalizedPhrase)}(?= |$)`, "g");
  for (const match of text.matchAll(pattern)) {
    const index = match.index + (match[0].startsWith(" ") ? 1 : 0);
    matches.push({ index, length: normalizedPhrase.length, text: normalizedPhrase, ...payload });
  }
}

function selectOrderedMentions(matches, kind) {
  const selected = [];
  const occupied = [];
  for (const match of matches.sort((a, b) => a.index - b.index || b.length - a.length || (b.matchPriority || 0) - (a.matchPriority || 0) || stableMatchKey(a).localeCompare(stableMatchKey(b)))) {
    const overlapGroup = kind === "concept" ? match.type : kind;
    const overlaps = occupied.some(range => range.group === overlapGroup && match.index < range.end && match.index + match.length > range.start);
    if (overlaps) continue;
    const identity = kind === "geography" ? match.code : `${match.type || kind}:${match.value}`;
    if (selected.some(item => item.identity === identity)) continue;
    occupied.push({ start: match.index, end: match.index + match.length, group: overlapGroup });
    if (kind === "geography") {
      selected.push({ identity, index: match.index, text: match.text, source: "query", geography: cleanGeography(match) });
    } else {
      selected.push({ identity, index: match.index, text: match.text, type: match.type || kind, value: match.value });
    }
  }
  return selected.map(({ identity, ...mention }) => mention);
}

function cleanGeography(match) {
  return {
    name: match.name,
    code: match.code,
    type: match.type,
    routeFamilies: [...match.routeFamilies]
  };
}

function routeScore(families) {
  return ROUTE_PRIORITY.reduce((score, family, index) => score + (families.includes(family) ? ROUTE_PRIORITY.length - index : 0), 0);
}

function stableMatchKey(match) {
  return `${match.code || ""}:${match.type || ""}:${match.value || ""}:${match.text}`;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasUppercaseCode(query, code) {
  if (!code || code.length < 3 || !/^[A-Z0-9]+$/.test(code)) return false;
  return new RegExp(`(?:^|[^A-Z0-9])${escapeRegExp(code)}(?=$|[^A-Z0-9])`).test(String(query || ""));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
