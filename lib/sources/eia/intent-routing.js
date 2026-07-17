import { readFileSync } from "node:fs";

const ROUTING_METADATA = JSON.parse(readFileSync(new URL("../../../data/eia/routing-metadata.json", import.meta.url), "utf8"));
const ROUTING_CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase4-routing-config.json", import.meta.url), "utf8"));

const ROUTE_LABELS = Object.fromEntries(Object.entries(ROUTING_CONFIG.routeProfiles || {}).map(([family, profile]) => [family, profile.label]));
const GEOGRAPHY_ALIASES = new Map(Object.entries(ROUTING_CONFIG.geographyAliases || {}));
const CONCEPT_RULES = buildConceptRules(ROUTING_CONFIG.vocabulary);
const FREQUENCY_RULES = buildRules(ROUTING_CONFIG.vocabulary?.frequencies);
const SECTOR_RULES = buildRules(ROUTING_CONFIG.vocabulary?.sectors);

const geographyByCode = new Map();
for (const geography of ROUTING_METADATA.geographies) {
  const current = geographyByCode.get(geography.code);
  if (!current) geographyByCode.set(geography.code, geography);
  else geographyByCode.set(geography.code, {
    ...current,
    name: current.name || geography.name,
    type: current.type === "national" || geography.type !== "national" ? current.type : geography.type,
    routeFamilies: [...new Set([...current.routeFamilies, ...geography.routeFamilies])]
  });
}

export function buildStructuredIntent(baseIntent, query) {
  const originalQuery = String(query ?? baseIntent?.originalQuery ?? "");
  const authoritativeAi = baseIntent?.interpreter === "openai";
  const authoritativeQuery = authoritativeAi
    ? baseIntent?.cleanedQuery || originalQuery
    : baseIntent?.correctedQuery || baseIntent?.cleanedQuery || originalQuery;
  const normalizedQuery = normalizeText(authoritativeQuery);
  const scannedGeographies = findGeographyMentions(normalizedQuery, originalQuery);
  const scannedConcepts = findConceptMentions(normalizedQuery);
  const scannedFrequencies = findFrequencyMentions(normalizedQuery);
  const exclusions = normalizeExclusions(baseIntent?.exclusions);
  const unknownQualifiers = normalizeUnknownQualifiers(baseIntent?.unknownQualifiers);
  const geographyMentions = selectGeographyMentions(baseIntent, scannedGeographies, authoritativeAi);
  const conceptMentions = selectConceptMentions(baseIntent, scannedConcepts, exclusions, authoritativeAi);
  const frequencyMentions = selectFrequencyMentions(baseIntent, scannedFrequencies, authoritativeAi);
  const interpreterFallbackReasons = [];
  const countryCode = String(baseIntent?.countryCode || "").toUpperCase();
  const validatedGeography = geographyByCode.get(countryCode) || null;
  if (validatedGeography && !geographyMentions.some(mention => mention.geography.code === validatedGeography.code)) {
    const allowInterpreterGeography = baseIntent?.fields?.country?.validation === "approved" || baseIntent?.fields?.country?.fallbackUsed || hasUppercaseCode(originalQuery, countryCode);
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
  const primaryGeography = geographyMentions[0]?.geography || validatedGeography || null;
  const product = firstMentionValue(conceptMentions, "product") || approvedFieldValue(baseIntent, "product") || null;
  const activity = firstMentionValue(conceptMentions, "activity") || approvedFieldValue(baseIntent, "activity") || null;
  const sector = approvedFieldValue(baseIntent, "sector") || firstRuleValue(normalizedQuery, SECTOR_RULES) || null;
  const conceptPairs = buildOrderedConceptPairs(baseIntent, conceptMentions, product, activity);
  const activityInference = activity || unknownQualifiers.length > 0 ? null : findWeakActivityInference(normalizedQuery, product);
  const explicitFrequency = frequencyMentions.length > 0;
  const requestedFrequency = frequencyMentions[0]?.value || (baseIntent?.frequencyExplicit ? baseIntent?.requestedFrequency || baseIntent?.frequency : null);
  const effectiveFrequency = requestedFrequency || baseIntent?.frequency || "annual";
  const route = chooseRoute({ geographyMentions, primaryGeography, conceptMentions, product, activity, requestedFrequency: effectiveFrequency });
  const frequency = validateFrequency(effectiveFrequency, route.family, explicitFrequency || Boolean(baseIntent?.frequencyExplicit));
  const ambiguityReasons = buildAmbiguityReasons(geographyMentions, conceptMentions, conceptPairs, route, baseIntent?.fields, unknownQualifiers);
  const fallbackReasons = [...interpreterFallbackReasons, ...route.fallbackReasons, ...frequency.fallbackReasons];
  const controlledProductAlternatives = product
    ? ROUTING_CONFIG.vocabulary?.products?.[product]?.alternatives || []
    : baseIntent?.fields?.product?.alternatives || baseIntent?.productAlternatives || [];

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
    productBreadth: product
      ? controlledProductAlternatives.length > 0 ? "broad" : "specific"
      : baseIntent?.fields?.product?.breadth || (controlledProductAlternatives.length > 0 ? "ambiguous" : "unknown"),
    productAlternatives: controlledProductAlternatives,
    activity,
    activityInference,
    sector,
    conceptPairs,
    exclusions,
    unknownQualifiers,
    frequency: frequency.value,
    requestedFrequency: frequency.requested,
    frequencyExplicit: frequency.explicit,
    validation: {
      geography: geographyMentions.length > 0 ? "valid" : "missing",
      frequency: frequency.status,
      frequencySupportedByRoute: frequency.supported,
      supportedFrequencies: frequency.supportedFrequencies,
      metadataSource: ROUTING_METADATA.source,
      fields: Object.fromEntries(Object.entries(baseIntent?.fields || {}).map(([name, field]) => [name, {
        validation: field?.validation || "unknown",
        confidence: field?.confidence ?? null,
        fallbackUsed: Boolean(field?.fallbackUsed)
      }]))
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
    },
    provenance: {
      query: authoritativeAi ? "mechanically_cleaned_raw_query" : baseIntent?.correctedQuery ? "deterministically_corrected_query" : "mechanically_cleaned_query",
      geographies: geographyMentions.map(mention => mention.source || "query"),
      concepts: conceptPairs.map(pair => pair.source),
      sector: baseIntent?.fields?.sector?.validation || (sector ? "deterministic_query" : "missing"),
      frequency: frequencyMentions[0]?.source || (frequency.explicit ? "validated_interpreter" : "default"),
      exclusions: exclusions.map(item => item.source),
      unknownQualifiers: unknownQualifiers.map(item => item.source)
    }
  };
}

export function listApprovedGeographies() {
  return [...geographyByCode.values()].map(cleanGeography);
}

function selectGeographyMentions(baseIntent, scanned, authoritativeAi) {
  if (!authoritativeAi) return scanned;
  const validated = Array.isArray(baseIntent?.validatedGeographies) ? baseIntent.validatedGeographies : [];
  const values = validated.length > 0 ? validated : baseIntent?.country ? [baseIntent.country] : [];
  const mentions = values.map((value, order) => {
    const geography = resolveApprovedGeography(value?.code || value?.name || value);
    return geography ? { index: order, text: null, source: "validated_interpreter", geography } : null;
  }).filter(Boolean);
  return mentions.length > 0 ? mentions : scanned;
}

function selectConceptMentions(baseIntent, scanned, exclusions, authoritativeAi) {
  const isExcluded = mention => exclusions.some(item => item.type === mention.type && item.value === mention.value);
  if (!authoritativeAi) return scanned.filter(mention => !isExcluded(mention));

  const validatedPairs = Array.isArray(baseIntent?.validatedConceptPairs) ? baseIntent.validatedConceptPairs : [];
  if (validatedPairs.length > 0) {
    return validatedPairs.flatMap((pair, order) => [
      pair.product ? { index: order * 2, text: null, type: "product", value: pair.product, source: "validated_interpreter" } : null,
      pair.activity ? { index: order * 2 + 1, text: null, type: "activity", value: pair.activity, source: "validated_interpreter" } : null
    ]).filter(Boolean).filter(mention => !isExcluded(mention));
  }

  const selected = [];
  for (const type of ["product", "activity"]) {
    const value = approvedFieldValue(baseIntent, type);
    if (value) selected.push({ index: selected.length, text: null, type, value, source: "validated_interpreter" });
    else selected.push(...scanned.filter(mention => mention.type === type));
  }
  if (selected.length === 0) selected.push(...scanned.filter(mention => mention.type === "scope"));
  return selected.filter(mention => !isExcluded(mention)).sort((left, right) => left.index - right.index || left.type.localeCompare(right.type));
}

function selectFrequencyMentions(baseIntent, scanned, authoritativeAi) {
  if (!authoritativeAi) return scanned;
  if (baseIntent?.frequencyExplicit) {
    const value = baseIntent.requestedFrequency || baseIntent.frequency;
    return value ? [{ index: 0, text: null, type: "frequency", value, source: "validated_interpreter" }] : [];
  }
  const validation = baseIntent?.fields?.frequency?.validation;
  return validation === "missing" || validation === "rejected" ? scanned : [];
}

function approvedFieldValue(baseIntent, name) {
  const field = baseIntent?.fields?.[name];
  if (field && !["approved", "fallback"].includes(field.validation)) return null;
  return baseIntent?.[name] || field?.normalizedValue || null;
}

function normalizeExclusions(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.map((item, order) => {
    const type = item?.type === "conceptType" ? "conceptType" : normalizeText(item?.type);
    const value = normalizeText(item?.value);
    if (!type || !value || seen.has(`${type}:${value}`)) return null;
    seen.add(`${type}:${value}`);
    return { type, value, order: Number.isFinite(Number(item?.order)) ? Number(item.order) : order, confidence: item?.confidence ?? null, source: item?.source || "validated_interpreter" };
  }).filter(Boolean).sort((left, right) => left.order - right.order);
}

function normalizeUnknownQualifiers(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.map((item, order) => {
    const value = String(item?.value ?? item ?? "").trim();
    const key = normalizeText(value);
    if (!key || seen.has(key)) return null;
    seen.add(key);
    return { value, order: Number.isFinite(Number(item?.order)) ? Number(item.order) : order, confidence: item?.confidence ?? null, source: item?.source || "validated_interpreter" };
  }).filter(Boolean).sort((left, right) => left.order - right.order);
}

function buildOrderedConceptPairs(baseIntent, mentions, fallbackProduct, fallbackActivity) {
  const validated = Array.isArray(baseIntent?.validatedConceptPairs) ? baseIntent.validatedConceptPairs : [];
  if (validated.length > 0) {
    return validated.map((pair, order) => ({
      order,
      product: pair.product || null,
      activity: pair.activity || null,
      sector: baseIntent?.sector || null,
      source: pair.source || "validated_interpreter",
      confidence: pair.confidence ?? null
    }));
  }

  let products = mentions.filter(mention => mention.type === "product");
  const activities = mentions.filter(mention => mention.type === "activity");
  products = collapseCompoundCarrierProducts(products, activities);
  if (products.length === 0 && fallbackProduct) products = [{ index: 0, value: fallbackProduct, source: "validated_summary" }];
  const effectiveActivities = activities.length > 0
    ? activities
    : fallbackActivity
      ? [{ index: products[0]?.index ?? 0, value: fallbackActivity, source: "validated_summary" }]
      : [];

  let pairs;
  if (products.length === 1 && effectiveActivities.length > 1) {
    pairs = effectiveActivities.map(activity => ({ product: products[0], activity }));
  } else if (products.length > 1 && effectiveActivities.length === 1) {
    pairs = products.map(product => ({ product, activity: effectiveActivities[0] }));
  } else {
    pairs = products.map(product => ({ product, activity: nearestMention(product, effectiveActivities) }));
  }
  if (pairs.length === 0 && (baseIntent?.productAlternatives?.length || baseIntent?.fields?.product?.alternatives?.length)) {
    pairs = [{ product: null, activity: effectiveActivities[0] || null }];
  }

  const seen = new Set();
  return pairs.map((pair, order) => {
    const product = pair.product?.value || null;
    const activity = pair.activity?.value || null;
    const key = `${product || ""}:${activity || ""}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      order,
      product,
      activity,
      sector: baseIntent?.sector || null,
      source: pair.product?.source === "validated_interpreter" || pair.activity?.source === "validated_interpreter"
        ? "validated_interpreter"
        : "deterministic_ordered_mentions",
      confidence: null
    };
  }).filter(Boolean);
}

function collapseCompoundCarrierProducts(products, activities) {
  if (products.length < 2) return products;
  const rules = ROUTING_CONFIG.compoundProductRules || [];
  return products.filter(product => !rules.some(rule =>
    product.value === rule.carrier &&
    activities.some(activity => activity.value === rule.activity) &&
    rule.preferSpecificProduct &&
    products.some(other => other !== product && other.value !== rule.carrier)
  ));
}

function nearestMention(source, candidates) {
  return [...candidates].sort((left, right) => {
    const leftDistance = Math.abs(Number(left.index || 0) - Number(source.index || 0));
    const rightDistance = Math.abs(Number(right.index || 0) - Number(source.index || 0));
    return leftDistance - rightDistance || Number(left.index || 0) - Number(right.index || 0);
  })[0] || null;
}

function firstRuleValue(text, rules) {
  for (const rule of rules) {
    if (rule.terms.some(term => hasPhrase(text, term))) return rule.value;
  }
  return null;
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
  const aliasCode = GEOGRAPHY_ALIASES.get(normalizeText(text));
  if (aliasCode && geographyByCode.has(aliasCode)) return cleanGeography(geographyByCode.get(aliasCode));
  const byCode = geographyByCode.get(text.toUpperCase());
  if (byCode) return cleanGeography(byCode);
  const normalized = normalizeText(text);
  const byName = ROUTING_METADATA.geographies.find(geography => normalizeText(geography.name) === normalized);
  return byName ? cleanGeography(byName) : null;
}

export function findConceptMentions(normalizedQuery) {
  const matches = [];
  for (const rule of CONCEPT_RULES) {
    for (const term of rule.terms) addPhraseMatch(matches, normalizedQuery, term, { type: rule.type, value: rule.value });
  }
  const explicitSectorRanges = findExplicitSectorRanges(normalizedQuery);
  const conceptMatches = matches.filter(match => match.type !== "product" || !explicitSectorRanges.some(range => rangesOverlap(match, range)));
  return selectOrderedMentions(conceptMatches, "concept");
}

function findExplicitSectorRanges(normalizedQuery) {
  const matches = [];
  for (const rule of SECTOR_RULES) {
    for (const term of rule.terms) addPhraseMatch(matches, normalizedQuery, term, { value: rule.value });
  }
  return matches.filter(match => /^ sector(?: |$)/.test(normalizedQuery.slice(match.index + match.length)));
}

function rangesOverlap(left, right) {
  return left.index < right.index + right.length && left.index + left.length > right.index;
}

function findFrequencyMentions(normalizedQuery) {
  const matches = [];
  for (const rule of FREQUENCY_RULES) {
    for (const term of rule.terms) addPhraseMatch(matches, normalizedQuery, term, { value: rule.value });
  }
  return selectOrderedMentions(matches, "frequency");
}

function chooseRoute({ geographyMentions, primaryGeography, conceptMentions, product, activity, requestedFrequency }) {
  const geographies = geographyMentions.length > 0
    ? geographyMentions.map(mention => mention.geography)
    : primaryGeography ? [primaryGeography] : [];
  const hasState = geographies.some(geography => geography.type === "state");
  const hasInternational = geographies.some(geography => geography.routeFamilies.includes("international") && geography.code !== "USA");
  const hasUsNational = geographies.some(geography => geography.code === "USA");
  const concepts = new Set(conceptMentions.map(mention => mention.value));
  if (product) concepts.add(product);
  if (activity) concepts.add(activity);
  const domesticProfile = ROUTING_CONFIG.routeProfiles?.domestic || {};
  const sedsProfile = ROUTING_CONFIG.routeProfiles?.seds || {};
  const domesticSpecific = (domesticProfile.conceptHints || []).some(value => concepts.has(value));
  const electricitySpecific = (domesticProfile.stateElectricityConceptHints || []).some(value => concepts.has(value));
  const sedsAnnualSpecific = (sedsProfile.stateAnnualConceptHints || []).some(value => concepts.has(value));

  if (hasInternational || geographies.length > 1 && !hasState) {
    return decision("international", "A non-U.S. country or multi-country request uses International.");
  }
  if (hasState && requestedFrequency !== "annual" && domesticProfile.stateNonAnnualPrimary) {
    return decision("domestic", "A nonannual U.S. state request uses Domestic EIA first because SEDS is annual-only.");
  }
  if (hasState && electricitySpecific) {
    return decision("domestic", "A state-level electricity request uses Domestic EIA.");
  }
  if (hasState && sedsAnnualSpecific) {
    return decision("seds", "A state-level energy request uses SEDS.");
  }
  if (hasState) {
    return decision("seds", "A state request defaults to SEDS.", ["route_defaulted_for_state"]);
  }
  if (hasUsNational && domesticSpecific) {
    return decision("domestic", "A U.S. national Electricity or Natural Gas request uses Domestic EIA.");
  }
  if (hasUsNational) {
    return decision("international", "A U.S. non-electricity request uses the available International metadata.");
  }
  if (electricitySpecific || requestedFrequency !== "annual") {
    return decision("domestic", "An electricity or nonannual request without geography defaults to Domestic EIA.", ["route_defaulted_without_geography"]);
  }
  return decision("international", "A request without routable geography defaults to International.", ["route_defaulted_without_geography"]);
}

function validateFrequency(requested, routeFamily, explicit) {
  const supportedFrequencies = [...new Set(ROUTING_METADATA.routes
    .filter(item => item.family === routeFamily)
    .flatMap(item => item.frequencies || []))];
  const supported = supportedFrequencies.includes(requested);
  return {
    value: requested,
    requested: explicit ? requested : null,
    explicit,
    supported,
    supportedFrequencies,
    status: supported ? "valid" : "unsupported",
    fallbackReasons: supported ? [] : [`frequency_${requested}_unsupported_by_${routeFamily}`]
  };
}

function buildAmbiguityReasons(geographies, concepts, conceptPairs, route, fields = {}, unknownQualifiers = []) {
  const reasons = [];
  if (geographies.length === 0) reasons.push("geography_missing");
  if (geographies.length > 1) reasons.push("multiple_geographies");
  if (!concepts.some(mention => mention.type === "product" || mention.type === "scope")) reasons.push("product_or_scope_missing");
  if (!conceptPairs.some(pair => pair.activity) && !concepts.some(mention => mention.type === "scope")) reasons.push("activity_or_scope_missing");
  if (unknownQualifiers.length > 0) reasons.push("unresolved_qualifier");
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

function findWeakActivityInference(normalizedQuery, product) {
  for (const [term, config] of Object.entries(ROUTING_CONFIG.weakActivityHints || {})) {
    if (!hasPhrase(normalizedQuery, term)) continue;
    const activity = config.productOverrides?.[product] || config.activity || null;
    if (!activity) continue;
    return {
      activity,
      sourceTerm: term,
      confidence: "weak",
      reasonCode: config.reasonCode || "activity_inferred_from_weak_hint",
      warning: config.warning || "No explicit activity was found; a weak hint was used for ranking."
    };
  }
  return null;
}

function hasPhrase(text, phrase) {
  const normalizedPhrase = normalizeText(phrase);
  return normalizedPhrase !== "" && ` ${text} `.includes(` ${normalizedPhrase} `);
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
