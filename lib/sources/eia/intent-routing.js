import { readFileSync } from "node:fs";

const ROUTING_METADATA = JSON.parse(readFileSync(new URL("../../../data/eia/routing-metadata.json", import.meta.url), "utf8"));
const ROUTING_CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase4-routing-config.json", import.meta.url), "utf8"));

const ROUTE_PRIORITY = ROUTING_CONFIG.routePriority || ["domestic", "international", "seds"];
const ROUTE_LABELS = Object.fromEntries(Object.entries(ROUTING_CONFIG.routeProfiles || {}).map(([family, profile]) => [family, profile.label]));
const GEOGRAPHY_ALIASES = new Map(Object.entries(ROUTING_CONFIG.geographyAliases || {}));
const CONCEPT_RULES = buildConceptRules(ROUTING_CONFIG.vocabulary);
const FREQUENCY_RULES = buildRules(ROUTING_CONFIG.vocabulary?.frequencies);

const geographyByCode = new Map();
for (const geography of ROUTING_METADATA.geographies) {
  const current = geographyByCode.get(geography.code);
  if (!current || routeScore(geography.routeFamilies) > routeScore(current.routeFamilies)) {
    geographyByCode.set(geography.code, geography);
  }
}

export function buildStructuredIntent(baseIntent, query) {
  const originalQuery = String(query ?? baseIntent?.originalQuery ?? "");
  const normalizedQuery = normalizeText(baseIntent?.cleanedQuery || originalQuery);
  const geographyMentions = findGeographyMentions(normalizedQuery, originalQuery);
  const conceptMentions = findConceptMentions(normalizedQuery);
  const frequencyMentions = findFrequencyMentions(normalizedQuery);
  const interpreterFallbackReasons = [];
  const countryCode = String(baseIntent?.countryCode || "").toUpperCase();
  const validatedGeography = geographyByCode.get(countryCode) || null;
  if (validatedGeography && !geographyMentions.some(mention => mention.geography.code === validatedGeography.code)) {
    const allowInterpreterGeography = baseIntent?.fields?.country?.validation === "approved" || hasUppercaseCode(originalQuery, countryCode);
    if (allowInterpreterGeography) {
      geographyMentions.push({ index: null, text: null, source: "validated_interpreter", geography: cleanGeography(validatedGeography) });
      if (baseIntent?.fields?.country?.fallbackUsed) interpreterFallbackReasons.push("geography_from_deterministic_fallback");
    }
  }
  if (!conceptMentions.some(mention => mention.type === "product") && baseIntent?.fields?.product?.fallbackUsed) {
    interpreterFallbackReasons.push("product_from_deterministic_fallback");
  }
  if (!conceptMentions.some(mention => mention.type === "activity") && baseIntent?.fields?.activity?.fallbackUsed) {
    interpreterFallbackReasons.push("activity_from_deterministic_fallback");
  }
  const primaryGeography = validatedGeography || geographyMentions[0]?.geography || null;
  const product = baseIntent?.product || firstMentionValue(conceptMentions, "product") || null;
  const activity = baseIntent?.activity || firstMentionValue(conceptMentions, "activity") || null;
  const requestedFrequency = baseIntent?.frequency || frequencyMentions[0]?.value || "annual";
  const route = chooseRoute({ geographyMentions, primaryGeography, conceptMentions, product, activity, requestedFrequency });
  const frequency = validateFrequency(requestedFrequency, route.family);
  const ambiguityReasons = buildAmbiguityReasons(geographyMentions, conceptMentions, route, baseIntent?.fields);
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
    geography: primaryGeography,
    geographies: geographyMentions.map(mention => mention.geography),
    product,
    productBreadth: baseIntent?.fields?.product?.breadth || (product ? "specific" : "unknown"),
    productAlternatives: baseIntent?.fields?.product?.alternatives || [],
    activity,
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

export function resolveApprovedGeography(value) {
  const text = String(value || "").trim();
  const byCode = geographyByCode.get(text.toUpperCase());
  if (byCode) return cleanGeography(byCode);
  const aliasCode = GEOGRAPHY_ALIASES.get(normalizeText(text));
  if (aliasCode && geographyByCode.has(aliasCode)) return cleanGeography(geographyByCode.get(aliasCode));
  const normalized = normalizeText(text);
  const byName = ROUTING_METADATA.geographies.find(geography => normalizeText(geography.name) === normalized);
  return byName ? cleanGeography(byName) : null;
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

function chooseRoute({ geographyMentions, primaryGeography, conceptMentions, product, activity, requestedFrequency }) {
  const geographies = primaryGeography ? [primaryGeography] : geographyMentions.map(mention => mention.geography);
  const hasState = geographies.some(geography => geography.type === "state");
  const hasInternational = geographies.some(geography => geography.routeFamilies.includes("international") && geography.code !== "USA");
  const hasUsNational = geographies.some(geography => geography.code === "USA");
  const concepts = new Set(conceptMentions.map(mention => mention.value));
  if (product) concepts.add(product);
  if (activity) concepts.add(activity);
  const domesticProfile = ROUTING_CONFIG.routeProfiles?.domestic || {};
  const sedsProfile = ROUTING_CONFIG.routeProfiles?.seds || {};
  const domesticSpecific = (domesticProfile.conceptHints || []).some(value => concepts.has(value));
  const sedsAnnualSpecific = (sedsProfile.stateAnnualConceptHints || []).some(value => concepts.has(value));

  if (hasInternational || geographies.length > 1 && !hasState) {
    return decision("international", "A non-U.S. country or multi-country request uses International.");
  }
  if (hasState && requestedFrequency !== "annual" && domesticProfile.stateNonAnnualPrimary) {
    return decision("domestic", "A nonannual U.S. state request uses Domestic EIA first because SEDS is annual-only.");
  }
  if (hasState && domesticSpecific) {
    return decision("domestic", "A state-level electricity request uses Domestic EIA.");
  }
  if (hasState && sedsAnnualSpecific) {
    return decision("seds", "A state-level energy request uses SEDS.");
  }
  if (hasState) {
    return decision("seds", "A state request defaults to SEDS.", ["route_defaulted_for_state"]);
  }
  if (hasUsNational && domesticSpecific) {
    return decision("domestic", "A U.S. national electricity request uses Domestic EIA.");
  }
  if (hasUsNational) {
    return decision("international", "A U.S. non-electricity request uses the available International metadata.");
  }
  if (domesticSpecific || requestedFrequency !== "annual") {
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

function buildAmbiguityReasons(geographies, concepts, route, fields = {}) {
  const reasons = [];
  if (geographies.length === 0) reasons.push("geography_missing");
  if (geographies.length > 1) reasons.push("multiple_geographies");
  if (!concepts.some(mention => mention.type === "product" || mention.type === "scope")) reasons.push("product_or_scope_missing");
  if (!concepts.some(mention => mention.type === "activity" || mention.type === "scope")) reasons.push("activity_or_scope_missing");
  if (route.fallbackReasons.length > 0) reasons.push("route_required_fallback");
  for (const [name, field] of Object.entries(fields)) {
    if (field?.validation === "ambiguous") reasons.push(`${name}_ambiguous`);
    if (field?.validation === "rejected") reasons.push(`${name}_rejected`);
  }
  return reasons;
}

function decision(family, reason, fallbackReasons = []) {
  return { family, reason, fallbackReasons };
}

function buildConceptRules(vocabulary = {}) {
  return [
    ...buildRules(vocabulary.products, "product"),
    ...buildRules(vocabulary.activities, "activity"),
    ...buildRules(vocabulary.scopes, "scope")
  ];
}

function buildRules(items = {}, type = null) {
  return Object.entries(items).map(([value, config]) => ({
    ...(type ? { type } : {}),
    value,
    terms: config.terms || [value]
  }));
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
