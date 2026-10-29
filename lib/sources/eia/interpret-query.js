import { readFileSync } from "node:fs";
import { interpretLockedFormV2, recheckSubmittedFormV2 } from "./locked-form-v2.js";

import { requireAuthentication } from "../../auth.js";
import { buildStructuredIntent, findConceptMentions, findGeographyMentions, getNegationScope, listRequestEvidenceMentions, listApprovedGeographies } from "./intent-routing.js";

import { ruleRequestEvidence, validateRequestEvidence } from "./request-evidence.js";

const ROUTING_CONFIG = JSON.parse(readFileSync(new URL("../../../data/eia/phase4-routing-config.json", import.meta.url), "utf8"));
const PRODUCT_RULES = buildRules(ROUTING_CONFIG.vocabulary?.products);
const ACTIVITY_RULES = buildRules(ROUTING_CONFIG.vocabulary?.activities);
const SECTOR_RULES = buildRules(ROUTING_CONFIG.vocabulary?.sectors);
const FREQUENCY_RULES = buildRules(ROUTING_CONFIG.vocabulary?.frequencies);

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

export const OPENAI_TIMEOUT_MS = 30000;

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

const STOP_WORDS = new Set(["a", "an", "and", "are", "as", "at", "by", "can", "chart", "country", "data", "download", "eia", "for", "from", "graph", "i", "in", "of", "on", "or", "please", "plot", "search", "series", "show", "table", "the", "to", "with", "could", "would", "should", "will", "may", "might", "must", "shall", "do", "does", "did", "have", "has", "had", "was", "were", "be", "been", "being", "this", "that", "these", "those", "we", "you", "me", "my", "us", "our", "your", "they", "them", "their", "it", "its"]);

function buildRules(items = {}) {
  return Object.entries(items).map(([value, config]) => ({
    value,
    terms: config.terms || [value]
  }));
}

export default async function handler(req, res) {
  if (!requireAuthentication(req, res)) return;

  if (!["GET", "POST"].includes(req.method)) {
    return res.status(405).json({ error: "Method not allowed.", userMessage: "Use GET for a search or POST for a clarification answer." });
  }

  let body;
  if (req.method === "POST") {
    try {
      if (typeof req.body !== 'string' || req.body.length > 16000) throw new Error();
      body = JSON.parse(req.body);
      if (!body || typeof body.query !== 'string' || typeof body.reply !== 'string' || body.reply.length > 240 || !body.reply.trim()) throw new Error();
    } catch { return res.status(400).json({error:'Invalid clarification answer.',userMessage:'Enter a short answer to the current question.'}); }
  }
  const originalQuery = body ? body.query : String(req.query.q || "");
  const cleanedQuery = cleanQueryMechanically(originalQuery);
  if (!cleanedQuery) {
    return res.status(400).json({ error: "Missing query.", userMessage: "Enter a search phrase such as Brazil energy consumption." });
  }
  if (cleanedQuery.length > 240) {
    return res.status(400).json({ error: "Search query is too long.", userMessage: "Use a shorter country and energy topic search." });
  }

  try {
    const intent = body ? await interpretClarification(originalQuery, body.intentPayload, body.about, body.reply) : await interpretQuery(originalQuery);
    return res.status(200).json({ intent });
  } catch (error) {
    return res.status(error.replyError || error.choiceError ? 400 : 500).json({error:'Unable to apply clarification.',userMessage:error.replyError || error.choiceError ? 'That answer does not match the current question. Run the search again.' : 'Unable to interpret that answer. Please try again.'});
  }
}

export async function interpretClarification(query, submitted, about, reply, dependencies = {}) {
  const {submittedContext} = await import('./lookup-search.js');
  const {interpretFieldReply} = await import('./locked-form-reply.js');
  const context = submittedContext(query, submitted);
  if (!context.intent.lockedForm?.clarification.needed || context.intent.lockedForm.clarification.about !== about) throw Object.assign(new Error('Invalid clarification field.'), {replyError:true});
  const answer = await interpretFieldReply(context, context.effectiveQuery || query, reply, dependencies);
  if (answer.failure) return {...context.intent, userMessage:`I couldn't use that answer. ${context.intent.userMessage || 'Please choose an option or try another answer.'}`, freeText:true};
  const history = [...(context.intent.choiceHistory || []), answer.step];
  return submittedContext(query, {interpreter:'openai_locked_form',lockedForm:answer.form,originForm:context.intent.originForm || context.intent.lockedForm,choiceHistory:history}).intent;
}

export async function interpretQuery(query, countries = [], dependencies = {}) {
  return interpretLockedFormV2(query, { ...dependencies, rules: dependencies.rules || ((raw, reason) => interpretQueryWithRules(raw, countries, reason)) });
}

export function normalizeSubmittedIntent(rawIntent, query, countries = []) {
  return recheckSubmittedFormV2(rawIntent, query, (raw, reason) => interpretQueryWithRules(raw, countries, reason));
}

export function interpretQueryWithRules(query, countries = [], fallbackReason = "openai_not_used", correctionEvidence = [], scopeHandled = false) {
  if (!scopeHandled) return interpretWithEvidence(null, String(query), countries, fallbackReason, correctionEvidence);
  const forms = buildQueryForms(query);
  const rawNormalizedQuery = normalizeText(forms.cleanedQuery);
  const normalizedQuery = correctQueryTerms(rawNormalizedQuery);
  const countryList = mergeCountries(countries, FALLBACK_COUNTRIES);
  const geographyResolution = resolveDeterministicGeographyEvidence(forms.originalQuery, countryList, normalizedQuery);
  const detectedCountries = geographyResolution.geographies;
  const exclusions = findRuleExclusions(normalizedQuery, correctionEvidence, forms.originalQuery);
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
    geographyEvidence: geographyResolution.evidence,
    geographyConflicts: [],
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

function resolveRequestEvidence(query) {
  const corrections = [];
  const mentions = listRequestEvidenceMentions(query).sort((a, b) => a.start - b.start || b.end - a.end);
  const ruleEvidence = ruleRequestEvidence(query, mentions);
  let resolution = validateRequestEvidence(ruleEvidence, query, mentions, { source: "rules" });
  const invalidReasons = resolution.valid ? [] : resolution.errors;
  if (!resolution.valid) resolution = validateRequestEvidence(ruleEvidence, query, mentions, { source: "rules" });
  if (!resolution.valid) throw new Error("Internal request-evidence construction failed.");
  // Projection may remove words, but must never invent a new complete metadata term.
  const invented = listRequestEvidenceMentions(resolution.positiveQuery).filter(m =>
    !mentions.some(raw => raw.start === m.start && raw.end === m.end && raw.type === m.type && raw.value === m.value));
  if (invented.length) {
    invalidReasons.push("projection_created_metadata_term");
    const chars = resolution.positiveQuery.split("");
    for (const mention of invented) for (let i = mention.start; i < mention.end; i++) chars[i] = " ";
    resolution.positiveQuery = chars.join("");
  }
  if (invalidReasons.length) resolution.evidence.invalid = true;
  return { ...resolution, invalidReasons, corrections };
}

function interpretWithEvidence(parsed, query, countries, fallbackReason = "scope_rules", correctionEvidence = []) {
  const resolved = resolveRequestEvidence(query);
  const requested = resolved.mentions.filter(m => m.status === "requested");
  const excluded = resolved.mentions.filter(m => m.status === "excluded");
  const same = (a, b) => a.type === b.type && a.value === b.value;
  const exclusions = [];
  for (const mention of excluded) {
    if (!["product", "activity", "sector", "scope"].includes(mention.type) || requested.some(m => same(m, mention))) continue;
    const type = mention.type === "scope" ? "conceptType" : mention.type;
    if (!exclusions.some(item => item.type === type && item.value === mention.value)) {
      exclusions.push({ type, value: mention.value, order: exclusions.length, confidence: 1, source: "validated_source_scope", ...(mention.correction ? { corrections: [serializeVocabularyCorrection(mention.correction)] } : {}) });
    }
  }
  const positiveFallback = interpretQueryWithRules(resolved.positiveQuery, countries, fallbackReason, correctionEvidence, true);
  const inner = positiveFallback;
  const issues = [...resolved.invalidReasons];
  for (const scope of resolved.evidence.scopes.filter(s => s.status === "excluded")) {
    const members = excluded.filter(m => m.start >= scope.start && m.end <= scope.end);
    const concepts = members.filter(m => ["product", "activity", "sector"].includes(m.type));
    if (concepts.length && concepts.every(m => requested.some(p => same(p, m)))) issues.push("scoped_exclusion_not_representable");
    if (!concepts.length && members.some(m => m.type === "geography" && requested.some(p => same(p, m)))) issues.push("conflicting_geography_scope");
    if (members.some(m => m.type === "frequency" && m.value === inner.frequency)) issues.push("excluded_selected_frequency");
  }
  for (const type of ["frequency", "sector"]) {
    if (new Set(requested.filter(m => m.type === type).map(m => m.value)).size > 1) issues.push(`multiple_requested_${type}_scopes`);
  }
  const requestedScopes = resolved.evidence.scopes.filter(scope => scope.status === "requested").map(scope => {
    const members = requested.filter(m => m.start >= scope.start && m.end <= scope.end);
    const geographies = members.filter(m => m.type === "geography" && inner.structuredIntent.geographies.some(g => g.code === m.value));
    const qualifiers = [...new Set(members.filter(m => ["product", "activity", "frequency", "sector"].includes(m.type)).map(m => `${m.type}:${m.value}`))].sort();
    return { members, geographies, signature: JSON.stringify(qualifiers) };
  }).filter(scope => scope.geographies.length > 0);
  if (requestedScopes.length > 1 && new Set(requestedScopes.map(s => s.signature)).size > 1) issues.push("country_scoped_requests_not_representable");
  for (const scope of requestedScopes) {
    const positions = [...new Set(scope.geographies.map(g => g.start))].sort((a, b) => a - b);
    const concepts = scope.members.filter(m => ["product", "activity"].includes(m.type));
    const multiplePairs = ["product", "activity"].some(type => new Set(concepts.filter(m => m.type === type).map(m => m.value)).size > 1);
    if (new Set(scope.geographies.map(g => g.value)).size > 1 && positions.length > 1 && multiplePairs && concepts.some(m => m.start > positions[0] && m.start < positions.at(-1))) issues.push("interleaved_country_requests_not_representable");
  }
  for (const scope of resolved.evidence.scopes.filter(s => s.status === "context")) {
    if (findUnknownQualifiers(normalizeText(scope.text)).length) issues.push("unsupported_qualifier_hidden_in_context");
  }
  const unresolved = resolved.unresolved;
  const blocked = inner.needsClarification || unresolved.length > 0 || issues.length > 0;
  const message = issues.length > 0
    ? "Please clarify the request scope. The source evidence is invalid, conflicting, or cannot be represented without changing its meaning. No series will be selected."
    : unresolved.length > 0
      ? `Please clarify what is requested or excluded in ${unresolved.map(s => JSON.stringify(s.text.trim())).join("; ")}. Established request fields are preserved; no series will be selected until this is resolved.`
      : inner.clarificationMessage;
  const forms = buildQueryForms(query);
  const structuredIntent = {
    ...inner.structuredIntent,
    originalQuery: forms.originalQuery,
    exclusions,
    needsClarification: blocked,
    blockingClarification: blocked,
    clarificationMessage: message,
    requestEvidence: resolved.evidence,
    scopeValidation: { source: resolved.source, issues: [...new Set(issues)], unresolved: unresolved.length },
    ambiguity: {
      ...inner.structuredIntent.ambiguity,
      status: blocked ? "ambiguous" : inner.structuredIntent.ambiguity.status,
      reasons: [...new Set([...inner.structuredIntent.ambiguity.reasons, ...(unresolved.length || issues.length ? ["request_scope_unresolved"] : [])])]
    },
    provenance: { ...inner.structuredIntent.provenance, query: "validated_source_scopes", scopeSemantics: resolved.source === "model" ? "model_proposed_locally_validated" : "bounded_deterministic_grammar" }
  };
  return {
    ...inner, ...forms,
    correctedQuery: correctQueryTerms(normalizeText(forms.cleanedQuery)) === normalizeText(forms.cleanedQuery) ? forms.cleanedQuery : correctQueryTerms(normalizeText(forms.cleanedQuery)),
    correctedQuerySource: correctQueryTerms(normalizeText(forms.cleanedQuery)) === normalizeText(forms.cleanedQuery) ? "unchanged" : "deterministic_typo_rules",
    normalizedQuery: correctQueryTerms(normalizeText(applyVerifiedTokenCorrections(query, resolved.corrections))),
    validatedCorrections: [...(inner.validatedCorrections || []), ...resolved.corrections.map(serializeVocabularyCorrection)].filter((v, i, all) => all.findIndex(x => x.type === v.type && x.from === v.from && x.to === v.to) === i),
    evidenceQuery: resolved.positiveQuery,
    requestEvidence: resolved.evidence,
    scopeValidation: structuredIntent.scopeValidation,
    exclusions,
    needsClarification: blocked,
    blockingClarification: blocked,
    clarificationMessage: message,
    ambiguity: structuredIntent.ambiguity,
    structuredIntent
  };
}

function correctQueryTerms(normalizedQuery) {
  return normalizedQuery.split(" ")
    .map(term => QUERY_TERM_CORRECTIONS.get(term) || term)
    .join(" ");
}

function findRuleExclusions(normalizedQuery, correctionEvidence = [], originalQuery = normalizedQuery) {
  const mentions = findConceptMentions(normalizedQuery);
  const positive = mentions.filter(mention => getNegationScope(normalizedQuery, mention.index, originalQuery) === null);
  const exclusions = [];
  for (const mention of mentions) {
    const prefixText = normalizedQuery.slice(0, mention.index).trim();
    const prefixTokens = prefixText.split(" ").filter(Boolean);
    if (getNegationScope(normalizedQuery, mention.index, originalQuery) === null) continue;
    if (positive.some(item => item.type === mention.type && item.value === mention.value)) continue;
    const type = mention.type === "scope" ? "conceptType" : mention.type;
    const key = `${type}:${mention.value}`;
    if (!exclusions.some(item => `${item.type}:${item.value}` === key)) {
      const mentionTokenStart = prefixTokens.length;
      const supportingCorrections = correctionEvidence.filter(correction =>
        (correction.type === type && correction.canonicalValue === mention.value)
        || (correction.type === "negation" && correction.tokenStart >= Math.max(0, mentionTokenStart - 3) && correction.tokenStart < mentionTokenStart)
      );
      exclusions.push({
        type,
        value: mention.value,
        order: exclusions.length,
        confidence: 1,
        source: supportingCorrections.length > 0
          ? "deterministic_negation_with_verified_correction"
          : "deterministic_negation",
        ...(supportingCorrections.length > 0
          ? { corrections: supportingCorrections.map(serializeVocabularyCorrection) }
          : {})
      });
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

export function addClarificationState(intent) {
  const preliminaryStructuredIntent = buildStructuredIntent(intent, intent.originalQuery);
  const missingFields = [];
  if (!intent.country) missingFields.push("country");
  if (!intent.product && !intent.fields?.product?.alternatives?.length) missingFields.push("product");
  if (!intent.activity) missingFields.push("activity");
  const ambiguousFields = Object.entries(intent.fields || {})
    .filter(([, field]) => field?.validation === "ambiguous")
    .map(([name]) => name);
  const blockingAmbiguousFields = ambiguousFields.filter(name => !intent.fields?.[name]?.alternatives?.length
    || (name === "product" && !intent.product && AMBIGUOUS_PRODUCT_RULES.some(rule => hasPhrase(intent.normalizedQuery, rule.term))));
  const unresolvedQualifiers = (intent.unknownQualifiers || []).map(item => item.value).filter(Boolean);
  const unresolvedConceptPairs = preliminaryStructuredIntent.conceptPairStatus === "unresolved";
  const needsClarification = missingFields.length > 0 || blockingAmbiguousFields.length > 0 || unresolvedQualifiers.length > 0 || unresolvedConceptPairs;
  const blockingClarification = unresolvedQualifiers.length > 0 || missingFields.length > 0 || blockingAmbiguousFields.length > 0 || unresolvedConceptPairs;

  const clarifiedIntent = {
    ...intent,
    needsClarification,
    blockingClarification,
    conceptPairStatus: preliminaryStructuredIntent.conceptPairStatus,
    missingFields,
    ambiguousFields,
    clarificationMessage: needsClarification
      ? (blockingAmbiguousFields.includes("product") && intent.fields.product.alternatives?.length
        ? `Please clarify the product: ${formatList(intent.fields.product.alternatives.map(value => value === "petroleum" ? "petroleum (including gasoline)" : value))}. No series will be selected until it is resolved.`
        : buildClarificationMessage(missingFields, blockingAmbiguousFields, unresolvedQualifiers, unresolvedConceptPairs))
      : null
  };
  const structuredIntent = {
    ...preliminaryStructuredIntent,
    needsClarification,
    blockingClarification,
    missingFields,
    clarificationMessage: clarifiedIntent.clarificationMessage
  };

  return {
    ...clarifiedIntent,
    frequency: structuredIntent.frequency,
    requestedFrequency: structuredIntent.requestedFrequency,
    frequencyExplicit: structuredIntent.frequencyExplicit,
    sector: structuredIntent.sector,
    activity: structuredIntent.activity,
    conceptPairs: structuredIntent.conceptPairs,
    multiCountryComparison: structuredIntent.multiCountryComparison,
    exclusions: structuredIntent.exclusions,
    unknownQualifiers: structuredIntent.unknownQualifiers,
    structuredIntent,
    route: structuredIntent.route,
    validation: structuredIntent.validation,
    ambiguity: structuredIntent.ambiguity,
    fallback: mergeFallbackState(intent.fallback, structuredIntent.fallback)
  };
}

function buildClarificationMessage(missingFields, ambiguousFields, unresolvedQualifiers = [], unresolvedConceptPairs = false) {
  if (unresolvedQualifiers.length > 0) {
    return `Please clarify or remove the unsupported qualifier ${formatList(unresolvedQualifiers)}. No series will be selected until it is resolved.`;
  }
  if (unresolvedConceptPairs) return "Please clarify which activity applies to each energy product. No series will be selected until the pairing is resolved.";
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

function resolveDeterministicGeographyEvidence(originalQuery, countries = [], normalizedOverride = null) {
  const normalizedQuery = normalizedOverride || correctQueryTerms(normalizeText(cleanQueryMechanically(originalQuery)));
  const mentions = findGeographyMentions(normalizedQuery, originalQuery, countries);
  const selectedNameCodes = new Map();
  for (const mention of mentions) {
    const name = normalizeText(mention.geography?.name);
    const codes = selectedNameCodes.get(name) || new Set();
    codes.add(mention.geography?.code);
    selectedNameCodes.set(name, codes);
  }

  const evidence = mentions.map(mention => ({
    ...mention.geography,
    rawText: mention.text,
    index: mention.index,
    source: hasPhrase(normalizeText(cleanQueryMechanically(originalQuery)), mention.text)
      ? "raw_exact_deterministic"
      : "deterministic_typo_rule",
    resolutionRule: selectedNameCodes.get(normalizeText(mention.geography?.name))?.size === 1
      && approvedGeographiesByName(mention.geography?.name, countries).length > 1
      ? "contextual_state_country"
      : "exact_name_alias_or_code",
    conflictStatus: "deterministic_only",
    aiClaims: []
  }));
  evidence.sort((left, right) => left.index - right.index || left.code.localeCompare(right.code));
  return { evidence, geographies: evidence.map(geographyFromEvidence) };
}

function serializeCorrection(correction) {
  return {
    from: correction.rawText,
    to: correction.proposedTerm || correction.proposedName,
    editDistance: correction.editDistance
  };
}

function serializeVocabularyCorrection(correction) {
  return {
    type: correction.type,
    value: correction.canonicalValue,
    source: correction.source,
    confidence: correction.confidence,
    ...serializeCorrection(correction)
  };
}

function applyVerifiedTokenCorrections(originalQuery, corrections) {
  // Retain clause boundaries; normalization here used to turn a later positive
  // request into part of an earlier exclusion after a spelling correction.
  const original = String(originalQuery).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ");
  const tokens = [...original.matchAll(/[a-z0-9]+/gi)];
  let corrected = original;
  let nextStart = tokens.length;
  for (const correction of [...corrections].sort((left, right) => right.tokenStart - left.tokenStart)) {
    const first = tokens[correction.tokenStart];
    const last = tokens[correction.tokenStart + correction.tokenCount - 1];
    if (!first || !last || correction.tokenStart + correction.tokenCount > nextStart) continue;
    corrected = corrected.slice(0, first.index) + (correction.proposedTerm || correction.proposedName)
      + corrected.slice(last.index + last[0].length);
    nextStart = correction.tokenStart;
  }
  return corrected;
}

function approvedGeographiesByName(value, countries) {
  const normalized = normalizeText(value);
  return mergeCountries([...listApprovedGeographies(), ...(countries || [])], FALLBACK_COUNTRIES)
    .filter(geography => normalizeText(geography.name) === normalized);
}

function geographyFromEvidence(evidence) {
  return {
    name: evidence.name,
    code: evidence.code,
    ...(evidence.type ? { type: evidence.type } : {}),
    ...(Array.isArray(evidence.routeFamilies) ? { routeFamilies: [...evidence.routeFamilies] } : {})
  };
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
