import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { gunzip } from "node:zlib";

const unzip = promisify(gunzip);

export const RETRIEVAL_TARGET = 20;
export const RETRIEVAL_LIMIT = 50;

const ROUTE_FAMILIES = new Set(["domestic", "international", "seds"]);
const INDEX_ROOT = new URL("../../../data/eia/builds/phase1b/", import.meta.url);
const MANIFEST_URL = new URL("manifest.json", INDEX_ROOT);
const VALIDATION_URL = new URL("validation-report.json", INDEX_ROOT);
const WORD_ALIASES = Object.freeze({
  consumption: ["consumption", "consumed", "use", "used"],
  production: ["production", "produced"],
  generation: ["generation", "generated", "output"],
  prices: ["price", "prices", "cost"],
  exports: ["export", "exports"],
  imports: ["import", "imports"],
  petroleum: ["petroleum", "crude oil", "refined petroleum", "petroleum liquids"],
  "natural gas": ["natural gas", "dry natural gas", "marketed natural gas"],
  renewable: ["renewable", "renewables"],
  hydro: ["hydro", "hydroelectric"],
  biofuels: ["biofuel", "biofuels", "biomass"],
  electricity: ["electricity", "electric power", "generation"],
  "total energy": ["total energy", "all energy"]
});

let familyCache = null;

export class LocalRetrievalError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "LocalRetrievalError";
    this.code = code;
  }
}

export async function retrieveLocalCandidates(input, options = {}) {
  const startedAt = performance.now();
  const intent = input?.structuredIntent || input;
  validateIntent(intent);

  const family = intent.route.family;
  const index = options.records
    ? buildInjectedIndex(family, options.records, options.indexMetadata)
    : await loadFamilyIndex(family);
  verifyIntentIndexVersion(intent, index, options.enforceVersion !== false);

  const conceptRequests = buildConceptRequests(intent);
  const geographies = intent.geographies?.length ? intent.geographies : [intent.geography];
  const retrievals = [];

  for (const geography of geographies) {
    validateGeographyForFamily(geography, family);
    for (const concept of conceptRequests) {
      retrievals.push(retrievePair(index.records, intent, geography, concept));
    }
  }

  return {
    schemaVersion: "1.0.0",
    routeFamily: family,
    targetCandidates: RETRIEVAL_TARGET,
    maximumCandidates: RETRIEVAL_LIMIT,
    retrievals,
    diagnostics: {
      index: {
        buildVersion: index.buildVersion,
        manifestContentHash: index.manifestContentHash,
        artifactContentHash: index.artifactContentHash,
        routeFamily: family,
        recordCount: index.records.length,
        refreshStatus: index.refreshStatus,
        versionStatus: "match",
        warnings: index.warnings
      },
      elapsedMs: Number((performance.now() - startedAt).toFixed(3)),
      rankingApplied: false,
      semanticRerankingApplied: false
    }
  };
}

export function clearLocalRetrievalCache() {
  familyCache = null;
}

function retrievePair(records, intent, geography, concept) {
  const frequency = buildFrequencyRule(intent);
  const geographyEligible = records.filter(record =>
    record.route_family === intent.route.family && record.geography?.code === geography.code
  );
  const frequencyEligible = frequency.mode === "exact"
    ? geographyEligible.filter(record => record.frequency === frequency.value)
    : geographyEligible;
  const classified = classifyCandidates(frequencyEligible, intent.route.family, concept, frequency);
  const selected = selectTiers(classified);

  return {
    geography,
    concept,
    frequency,
    primaryCandidates: selected.primary,
    fallbackCandidates: selected.fallback,
    diagnostics: {
      routeEligibleCount: records.length,
      geographyEligibleCount: geographyEligible.length,
      frequencyEligibleCount: frequencyEligible.length,
      primaryCount: selected.primary.length,
      fallbackCount: selected.fallback.length,
      totalCount: selected.primary.length + selected.fallback.length,
      tiersApplied: selected.tiersApplied,
      stoppedAfterTarget: selected.stoppedAfterTarget,
      explicitFrequencyMismatchesExcluded: frequency.mode === "exact"
        ? geographyEligible.length - frequencyEligible.length
        : 0
    }
  };
}

function classifyCandidates(records, family, concept, frequency) {
  const buckets = new Map([
    ["exact_phrase", []],
    ["approved_alias", []],
    ["all_tokens", []],
    ["partial_tokens", []],
    ["trigram", []]
  ]);
  const directProducts = unique([concept.product, ...concept.productAlternatives]);
  const productTerms = expandAliases(directProducts);
  const directActivities = unique([concept.activity]);
  const activityTerms = expandAliases(directActivities);

  for (const record of records) {
    const document = buildSearchDocument(record);
    const productImplied = family === "domestic" && directProducts.includes("electricity");
    const directProductMatch = productImplied || matchesAnyPhrase(document, directProducts);
    const productMatch = productImplied || matchesAnyPhrase(document, productTerms);
    const directActivityMatch = matchesActivity(record, document, directActivities);
    const activityMatch = matchesActivity(record, document, activityTerms);
    const allTerms = unique(unique([...directProducts, ...directActivities]).flatMap(tokenize));
    const matchedTokens = allTerms.filter(token => document.tokens.has(token));

    let tier = null;
    if (directProductMatch && directActivityMatch) tier = "exact_phrase";
    else if (productMatch && activityMatch) tier = "approved_alias";
    else if (allTerms.length > 0 && matchedTokens.length === allTerms.length && productMatch && activityMatch) tier = "all_tokens";
    else if ((directProducts.length === 0 ? activityMatch : productMatch) && matchedTokens.length > 0) tier = "partial_tokens";
    else if (hasTrigramMatch(document.tokens, allTerms)) tier = "trigram";
    if (!tier) continue;

    const pool = frequency.mode === "fallback" || tier === "partial_tokens" || tier === "trigram"
      ? "fallback"
      : "primary";
    const reasonCodes = [
      `route_family_${family}`,
      "geography_exact",
      frequency.mode === "exact" ? "frequency_exact" : frequency.mode === "fallback" ? "frequency_fallback" : "frequency_not_explicit",
      `match_${tier}`
    ];
    buckets.get(tier).push(toRetrievedCandidate(record, pool, tier, reasonCodes));
  }

  for (const values of buckets.values()) values.sort(compareCandidates);
  return buckets;
}

function selectTiers(buckets) {
  const primary = [];
  const fallback = [];
  const tiersApplied = [];
  let stoppedAfterTarget = false;

  for (const tier of ["exact_phrase", "approved_alias", "all_tokens"]) {
    tiersApplied.push(tier);
    const candidates = buckets.get(tier) || [];
    appendUnique(primary, candidates.filter(candidate => candidate.retrieval.pool === "primary"), RETRIEVAL_LIMIT, fallback);
    appendUnique(fallback, candidates.filter(candidate => candidate.retrieval.pool === "fallback"), RETRIEVAL_LIMIT - primary.length, primary);
    if (primary.length + fallback.length >= RETRIEVAL_TARGET) {
      stoppedAfterTarget = true;
      break;
    }
  }

  if (!stoppedAfterTarget) {
    for (const tier of ["partial_tokens", "trigram"]) {
      tiersApplied.push(tier);
      appendUnique(fallback, buckets.get(tier), RETRIEVAL_LIMIT - primary.length, primary);
      if (primary.length + fallback.length >= RETRIEVAL_TARGET) {
        stoppedAfterTarget = true;
        break;
      }
    }
  }

  return {
    primary: primary.slice(0, RETRIEVAL_LIMIT),
    fallback: fallback.slice(0, RETRIEVAL_LIMIT - primary.length),
    tiersApplied,
    stoppedAfterTarget
  };
}

function buildConceptRequests(intent) {
  const mentions = Array.isArray(intent.mentions?.concepts) ? intent.mentions.concepts : [];
  const products = mentions.filter(mention => mention.type === "product");
  const activities = mentions.filter(mention => mention.type === "activity");
  const baseProducts = products.length ? products : intent.product ? [{ index: 0, value: intent.product }] : [];

  if (baseProducts.length === 0 && !intent.productAlternatives?.length) {
    throw new LocalRetrievalError("CONCEPT_REQUIRED", "Local retrieval requires a validated product or approved product alternatives.");
  }

  const requests = (baseProducts.length ? baseProducts : [{ index: 0, value: null }]).map((product, order) => {
    const activity = nearestActivity(product, activities) || (intent.activity ? { value: intent.activity } : null);
    const carriesAlternatives = baseProducts.length === 1 || product.value === intent.product;
    return {
      order,
      product: product.value || null,
      productBreadth: carriesAlternatives ? intent.productBreadth || "specific" : "specific",
      productAlternatives: carriesAlternatives ? unique(intent.productAlternatives || []) : [],
      activity: activity?.value || null
    };
  });

  return requests;
}

function nearestActivity(product, activities) {
  return [...activities].sort((left, right) => {
    const leftDistance = Math.abs(Number(left.index || 0) - Number(product.index || 0));
    const rightDistance = Math.abs(Number(right.index || 0) - Number(product.index || 0));
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    const leftFollows = Number(left.index || 0) >= Number(product.index || 0);
    const rightFollows = Number(right.index || 0) >= Number(product.index || 0);
    if (leftFollows !== rightFollows) return leftFollows ? -1 : 1;
    return Number(left.index || 0) - Number(right.index || 0);
  })[0] || null;
}

function buildFrequencyRule(intent) {
  const mentions = Array.isArray(intent.mentions?.frequencies) ? intent.mentions.frequencies : [];
  if (mentions.length === 0) return { explicit: false, requested: null, value: intent.frequency || null, mode: "not_explicit" };
  const requested = mentions[0].value;
  if (intent.validation?.frequency === "fallback") {
    return { explicit: true, requested, value: intent.frequency, mode: "fallback" };
  }
  return { explicit: true, requested, value: intent.frequency || requested, mode: "exact" };
}

async function loadFamilyIndex(family) {
  if (familyCache?.family === family) return familyCache.promise;
  const promise = loadAndValidateFamily(family);
  familyCache = { family, promise };
  try {
    return await promise;
  } catch (error) {
    if (familyCache?.promise === promise) familyCache = null;
    throw error;
  }
}

async function loadAndValidateFamily(family) {
  const [compressed, manifestText, validationText] = await Promise.all([
    readFile(new URL(`${family}.jsonl.gz`, INDEX_ROOT)),
    readFile(MANIFEST_URL, "utf8"),
    readFile(VALIDATION_URL, "utf8")
  ]);
  const [content, manifest, validation] = await Promise.all([
    unzip(compressed),
    Promise.resolve(JSON.parse(manifestText)),
    Promise.resolve(JSON.parse(validationText))
  ]);
  const artifact = validation.artifacts?.find(item => item.family === family);
  const artifactHash = createHash("sha256").update(content).digest("hex");
  const records = parseJsonLines(content);
  const expectedCount = manifest.record_counts?.[family];

  if (!artifact || artifactHash !== artifact.content_hash) {
    throw new LocalRetrievalError("INDEX_HASH_MISMATCH", `The ${family} metadata artifact does not match its validation hash.`);
  }
  if (records.length !== expectedCount || records.length !== artifact.records) {
    throw new LocalRetrievalError("INDEX_COUNT_MISMATCH", `The ${family} metadata artifact record count is inconsistent.`);
  }

  return {
    records,
    buildVersion: manifest.build_version,
    manifestContentHash: manifest.content_hash,
    artifactContentHash: artifactHash,
    refreshStatus: manifest.refresh_status,
    warnings: manifest.warnings || []
  };
}

function buildInjectedIndex(family, records, metadata = {}) {
  const familyRecords = records.filter(record => record.route_family === family);
  return {
    records: familyRecords,
    buildVersion: metadata.buildVersion || "test",
    manifestContentHash: metadata.manifestContentHash || "test",
    artifactContentHash: metadata.artifactContentHash || "test",
    refreshStatus: metadata.refreshStatus || "test",
    warnings: metadata.warnings || []
  };
}

function verifyIntentIndexVersion(intent, index, enforce) {
  const expected = intent.validation?.metadataSource?.manifestContentHash;
  if (enforce && expected && expected !== index.manifestContentHash) {
    throw new LocalRetrievalError("INDEX_VERSION_MISMATCH", "The structured intent and local retrieval index use different metadata builds.");
  }
}

function validateIntent(intent) {
  if (!intent || typeof intent !== "object") throw new LocalRetrievalError("INTENT_REQUIRED", "Structured intent is required.");
  if (!ROUTE_FAMILIES.has(intent.route?.family)) {
    throw new LocalRetrievalError("ROUTE_REQUIRED", "Structured intent must contain a supported deterministic route family.");
  }
  if (!intent.geography && !intent.geographies?.length) {
    throw new LocalRetrievalError("GEOGRAPHY_REQUIRED", "Local retrieval requires validated geography.");
  }
}

function validateGeographyForFamily(geography, family) {
  if (!geography?.code) throw new LocalRetrievalError("GEOGRAPHY_REQUIRED", "Each retrieval pair requires a geography code.");
  if (geography.routeFamilies?.length && !geography.routeFamilies.includes(family)) {
    throw new LocalRetrievalError("GEOGRAPHY_ROUTE_MISMATCH", `Geography ${geography.code} is not valid for route family ${family}.`);
  }
}

function parseJsonLines(content) {
  return content.toString("utf8").split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function buildSearchDocument(record) {
  const selectorFacets = Object.entries(record.selector?.facets || {}).flat();
  const text = normalizeText([
    record.title,
    record.description,
    record.activity,
    record.product_or_scope,
    record.sector,
    record.concept_type,
    record.unit,
    record.series_id,
    record.selector?.measure,
    ...selectorFacets
  ].filter(Boolean).join(" "));
  return { text, tokens: new Set(tokenize(text)) };
}

function matchesAnyPhrase(document, phrases) {
  return phrases.some(phrase => document.text.includes(normalizeText(phrase)));
}

function matchesActivity(record, document, terms) {
  if (terms.length === 0) return true;
  const title = normalizeText(record.title);
  const measure = normalizeText(record.selector?.measure);

  if (terms.some(term => normalizeText(term) === "generation")) {
    return measure.includes("generation") || title.startsWith("generation ") || title.startsWith("net generation ") || title.includes(" net generation");
  }
  if (terms.some(term => ["price", "prices", "cost"].includes(normalizeText(term)))) {
    return record.concept_type === "price" || /\b(price|prices|cost)\b/.test(title);
  }
  return matchesAnyPhrase({ ...document, text: `${title} ${measure}` }, terms);
}

function expandAliases(values) {
  return unique(values.flatMap(value => WORD_ALIASES[value] || [value]));
}

function hasTrigramMatch(documentTokens, queryTokens) {
  if (queryTokens.length === 0) return false;
  for (const queryToken of queryTokens.filter(token => token.length >= 4)) {
    for (const documentToken of documentTokens) {
      if (documentToken.length >= 4 && trigramSimilarity(queryToken, documentToken) >= 0.6) return true;
    }
  }
  return false;
}

function trigramSimilarity(left, right) {
  const leftSet = trigrams(left);
  const rightSet = trigrams(right);
  let intersection = 0;
  for (const value of leftSet) if (rightSet.has(value)) intersection += 1;
  return leftSet.size + rightSet.size === 0 ? 0 : (2 * intersection) / (leftSet.size + rightSet.size);
}

function trigrams(value) {
  const padded = `  ${value} `;
  const output = new Set();
  for (let index = 0; index <= padded.length - 3; index += 1) output.add(padded.slice(index, index + 3));
  return output;
}

function toRetrievedCandidate(record, pool, tier, reasonCodes) {
  return { ...record, retrieval: { pool, tier, reasonCodes } };
}

function appendUnique(target, candidates, limit, existing = []) {
  const seen = new Set([...existing, ...target].map(candidate => canonicalSelectorKey(candidate.selector)));
  for (const candidate of candidates || []) {
    const key = canonicalSelectorKey(candidate.selector);
    if (seen.has(key)) continue;
    seen.add(key);
    target.push(candidate);
    if (target.length >= limit) break;
  }
}

function canonicalSelectorKey(selector) {
  const facets = Object.entries(selector?.facets || {}).sort(([left], [right]) => left.localeCompare(right));
  return JSON.stringify([selector?.route, selector?.measure, selector?.frequency, facets]);
}

function compareCandidates(left, right) {
  return canonicalSelectorKey(left.selector).localeCompare(canonicalSelectorKey(right.selector)) ||
    String(left.candidate_id).localeCompare(String(right.candidate_id));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean).map(value => normalizeText(value)).filter(Boolean))];
}
