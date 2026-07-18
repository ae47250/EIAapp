import assert from "node:assert/strict";
import { test } from "node:test";

import {
  OPENAI_TIMEOUT_MS,
  cleanQueryMechanically,
  interpretQuery,
  interpretQueryWithRules,
  normalizeSubmittedIntent,
  validateAiInterpretation
} from "../lib/sources/eia/interpret-query.js";

test("mechanical cleanup preserves raw input separately and performs no semantic correction", () => {
  const raw = "   montly  nat gas  prodction usa   ";
  const intent = interpretQueryWithRules(raw);

  assert.equal(intent.originalQuery, raw);
  assert.equal(intent.cleanedQuery, "montly nat gas prodction usa");
  assert.equal(cleanQueryMechanically(raw), "montly nat gas prodction usa");
  assert.equal(intent.correctedQuery, "monthly nat gas production usa");
  assert.equal(intent.correctedQuerySource, "deterministic_typo_rules");
});

test("rules recover the requested country, product, activity, and annual default from messy input", () => {
  const intent = interpretQueryWithRules("looking for data on ergy consn for usa");

  assert.equal(intent.correctedQuery, "looking for data on energy consumption for usa");
  assert.equal(intent.correctedQuerySource, "deterministic_typo_rules");
  assert.equal(intent.countryCode, "USA");
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, false);
});

test("rules normalize supported production and consumption typos without broad fuzzy guessing", () => {
  assert.equal(interpretQueryWithRules("USA energy consumtion").activity, "consumption");
  assert.equal(interpretQueryWithRules("USA energy prodction").activity, "production");
  assert.equal(interpretQueryWithRules("USA energy discussion").activity, null);
  assert.equal(interpretQueryWithRules("USA energy production").correctedQuerySource, "unchanged");
});

test("validated high-confidence AI output uses only supported categories", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "United States energy consumption",
    countryName: "United States",
    countryCode: "USA",
    product: "energy",
    activity: "use",
    frequency: "yearly",
    confidence: 0.94
  }, "data pls usa ergy consn");

  assert.equal(intent.interpreter, "openai");
  assert.equal(intent.correctedQuerySource, "ai");
  assert.equal(intent.countryCode, "USA");
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, false);
});

test("unsupported AI product and country are discarded while frequency is preserved", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Zed energy consumption",
    countryName: "Zedland",
    countryCode: "ZZZ",
    product: "fusion",
    activity: "consumption",
    frequency: "weekly",
    confidence: 0.95
  }, "energy consumption");

  assert.equal(intent.country, null);
  assert.equal(intent.countryCode, null);
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "weekly");
  assert.equal(intent.needsClarification, true);
  assert.deepEqual(intent.missingFields, ["country"]);
});

test("validated AI arrays preserve order and prevent negated raw text from overriding intent", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Texas monthly natural gas production",
    confidence: 0.96,
    geographies: [{ value: "TX", confidence: 0.98 }],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.96 }],
    exclusions: [{ type: "activity", value: "prices", confidence: 0.98 }],
    unknownQualifiers: [],
    fields: {
      country: { rawValue: "Texas", value: "TX", confidence: 0.98 },
      product: { rawValue: "nat gas", value: "natural gas", confidence: 0.96 },
      activity: { rawValue: "prodction", value: "production", confidence: 0.96 },
      sector: { rawValue: null, value: null, confidence: 0.96 },
      frequency: { rawValue: "montly", value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, "plz shwo montly nat gas prodction in Texas, not prices");

  assert.deepEqual(intent.conceptPairs.map(pair => pair.activity), ["production"]);
  assert.deepEqual(intent.exclusions.map(item => `${item.type}:${item.value}`), ["activity:prices"]);
  assert.ok(!intent.structuredIntent.mentions.concepts.some(mention => mention.value === "prices"));
  assert.equal(intent.requestedFrequency, "monthly");
});

test("AI cannot reintroduce a false total-energy pair inside a specific source phrase", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Texas solar energy consumption",
    confidence: 0.97,
    geographies: [{ value: "TX", confidence: 0.98 }],
    conceptPairs: [
      { product: "solar", activity: "consumption", order: 0, confidence: 0.97 },
      { product: "total energy", activity: "consumption", order: 1, confidence: 0.97 }
    ],
    fields: {
      country: { value: "TX", confidence: 0.98 },
      product: { value: "solar", confidence: 0.97 },
      activity: { value: "consumption", confidence: 0.97 },
      frequency: { value: "annual", explicit: false, confidence: 0.9 }
    }
  }, "Texas solar energy consumption");

  assert.deepEqual(intent.validatedConceptPairs.map(pair => [pair.product, pair.activity]), [["solar", "consumption"]]);
  assert.deepEqual(intent.conceptPairs.map(pair => [pair.product, pair.activity]), [["solar", "consumption"]]);
});

test("low-confidence AI output is rejected in favor of deterministic rules", () => {
  const parsed = {
    correctedQuery: "United States energy consumption",
    countryName: "United States",
    countryCode: "USA",
    product: "total energy",
    activity: "consumption",
    frequency: "annual",
    confidence: 0.3
  };

  assert.equal(validateAiInterpretation(parsed, "USA ergy consn"), null);
});

test("submitted intent cannot introduce an unknown country code", () => {
  const intent = normalizeSubmittedIntent({
    interpreter: "openai",
    countryCode: "ZZZ",
    product: "total energy",
    activity: "consumption",
    frequency: "annual"
  }, "energy consumption");

  assert.equal(intent.countryCode, null);
  assert.equal(intent.needsClarification, true);
});

test("AI-corrected product cannot override conflicting raw-derived evidence", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "United States natural gas consumption",
    confidence: 0.9,
    fields: {
      country: { rawValue: "USA", value: "USA", confidence: 0.95 },
      product: { rawValue: "gasoline", value: "natural gas", confidence: 0.9 },
      activity: { rawValue: "consumption", value: "consumption", confidence: 0.95 },
      frequency: { rawValue: "annual", value: "annual", confidence: 0.95 }
    }
  }, "USA gasoline consumption");

  assert.equal(intent.product, "petroleum");
  assert.equal(intent.fields.product.validation, "fallback");
  assert.equal(intent.fields.product.fallbackUsed, true);
  assert.equal(intent.fields.product.deterministicValue, "petroleum");
  assert.equal(intent.fields.product.conflictStatus, "conflict");
  assert.equal(intent.fields.product.resolutionSource, "deterministic_fallback");
  assert.equal(intent.fields.product.validationEvidenceSource, "raw_derived_deterministic");
});

test("AI-corrected text cannot manufacture sector evidence absent from the raw query", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Iowa monthly wind net generation electric power sector",
    confidence: 0.97,
    fields: {
      country: { value: "IA", confidence: 0.98 },
      product: { value: "wind", confidence: 0.98 },
      activity: { value: "generation", confidence: 0.98 },
      sector: { value: "electric power", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, "Iowa monthly wind net generation");

  assert.equal(intent.sector, null);
  assert.equal(intent.fields.sector.validation, "rejected");
  assert.equal(intent.fields.sector.conflictStatus, "ai_only");
  assert.equal(intent.fields.sector.resolutionSource, "unresolved");
});

test("cross-family ambiguity stays broad for later candidate retrieval", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "gas prices in the United States",
    confidence: 0.85,
    fields: {
      country: { rawValue: "United States", value: "USA", confidence: 0.95 },
      product: { rawValue: "gas", value: null, confidence: 0.42, ambiguityReason: "gas may mean gasoline or natural gas" },
      activity: { rawValue: "prices", value: "prices", confidence: 0.9 },
      frequency: { rawValue: null, value: "annual", confidence: 0.8 }
    }
  }, "gas prices in the United States");

  assert.equal(intent.product, null);
  assert.equal(intent.fields.product.validation, "ambiguous");
  assert.equal(intent.fields.product.breadth, "ambiguous");
  assert.deepEqual(intent.fields.product.alternatives, ["natural gas", "petroleum"]);
  assert.equal(intent.structuredIntent.productBreadth, "ambiguous");
  assert.deepEqual(intent.structuredIntent.productAlternatives, ["natural gas", "petroleum"]);
  assert.equal(intent.needsClarification, false);
  assert.equal(intent.clarificationMessage, null);
});

test("deterministic gas fallback is phrase-first and context-aware", () => {
  const exact = interpretQueryWithRules("natural gas production in USA");
  const storage = interpretQueryWithRules("gas storage withdrawals in the United States");
  const gasoline = interpretQueryWithRules("regular gas pump prices in the United States");

  assert.equal(exact.product, "natural gas");
  assert.equal(exact.fields.product.breadth, "specific");
  assert.equal(exact.structuredIntent.mentions.concepts.filter(item => item.value === "natural gas").length, 1);
  assert.equal(storage.product, "natural gas");
  assert.match(storage.fields.product.reason, /surrounding context/i);
  assert.equal(gasoline.product, "petroleum");
  assert.match(gasoline.fields.product.reason, /surrounding context/i);
});

test("broad approved product families retain narrower options without forced selection", () => {
  const intent = interpretQueryWithRules("USA renewable energy production");

  assert.equal(intent.product, "renewable");
  assert.equal(intent.fields.product.breadth, "broad");
  assert.deepEqual(intent.fields.product.alternatives, ["wind", "solar", "hydro", "geothermal", "biofuels"]);
  assert.equal(intent.structuredIntent.productBreadth, "broad");
  assert.deepEqual(intent.structuredIntent.productAlternatives, ["wind", "solar", "hydro", "geothermal", "biofuels"]);
  assert.equal(intent.needsClarification, false);
});

test("AI-provided ambiguity uses the same approved-alternatives model for any product term", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "United States energy source production",
    confidence: 0.84,
    fields: {
      country: { value: "USA", confidence: 0.95 },
      product: {
        rawValue: "energy source",
        value: null,
        confidence: 0.5,
        ambiguityReason: "The wording supports multiple product families.",
        alternatives: ["renewable", "nuclear"]
      },
      activity: { value: "production", confidence: 0.9 },
      frequency: { value: "annual", confidence: 0.9 }
    }
  }, "United States energy source production");

  assert.equal(intent.product, null);
  assert.equal(intent.fields.product.breadth, "ambiguous");
  assert.deepEqual(intent.fields.product.alternatives, ["renewable", "nuclear"]);
  assert.equal(intent.needsClarification, false);
});

test("AI timeout is configured for thirty seconds", () => {
  assert.equal(OPENAI_TIMEOUT_MS, 30000);
});

test("ordinary lowercase three-letter words are not accepted as country codes", () => {
  const intent = interpretQueryWithRules("can you show annual coal production");

  assert.equal(intent.country, null);
  assert.equal(intent.countryCode, null);
  assert.equal(intent.structuredIntent.geography, null);
});

test("AI receives only the exact raw query while cleaned text remains available locally", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  const raw = "   montly  nat gas prodction usa   ";
  let requestBody;
  process.env.OPENAI_API_KEY = "test-openai-key";
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          correctedQuery: "monthly natural gas production USA",
          confidence: 0.94,
          fields: {
            country: { rawValue: "usa", value: "USA", confidence: 0.98 },
            product: { rawValue: "nat gas", value: "natural gas", confidence: 0.93 },
            activity: { rawValue: "prodction", value: "production", confidence: 0.95 },
            frequency: { rawValue: "montly", value: "monthly", confidence: 0.95 }
          }
        })
      })
    };
  };

  try {
    const intent = await interpretQuery(raw);
    assert.equal(intent.interpreter, "openai");
    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.cleanedQuery, "montly nat gas prodction usa");
    assert.equal(intent.correctedQuery, "monthly natural gas production USA");
    assert.equal(intent.correctedQuerySource, "ai");
    assert.equal(intent.fields.product.fallbackUsed, false);
    assert.equal(intent.fallback.used, false);
    assert.match(requestBody.input, /Raw query: "   montly  nat gas prodction usa   "/);
    assert.doesNotMatch(requestBody.input, /Lightly cleaned query:/);
    assert.doesNotMatch(requestBody.input, /Known geographies:/);
    assert.doesNotMatch(requestBody.input, /Afghanistan=AFG/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("raw-only interpretation preserves exact raw and cleaned forms through staged normalization", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  let requestBody;
  process.env.OPENAI_API_KEY = "test-openai-key";
  globalThis.fetch = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        output_text: JSON.stringify({
          correctedQuery: "California monthly electricity generation",
          confidence: 0.96,
          fields: {
            country: { value: "CA", confidence: 0.98 },
            product: { value: "electricity", confidence: 0.98 },
            activity: { value: "generation", confidence: 0.98 },
            frequency: { value: "monthly", explicit: true, confidence: 0.98 }
          }
        })
      })
    };
  };

  try {
    const raw = "  California\u00a0  monthly electricity\n generation  ";
    const intent = await interpretQuery(raw);
    const staged = normalizeSubmittedIntent(intent, raw);
    assert.equal(intent.countryCode, "CA");
    assert.equal(intent.route.family, "domestic");
    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.cleanedQuery, "California monthly electricity generation");
    assert.equal(staged.originalQuery, raw);
    assert.equal(staged.cleanedQuery, "California monthly electricity generation");
    assert.match(requestBody.input, /Interpret the exact raw query supplied below/);
    assert.doesNotMatch(requestBody.input, /Lightly cleaned query:/);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("AI request failure uses deterministic fallback with provenance", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-openai-key";
  globalThis.fetch = async () => { throw new Error("network unavailable"); };

  try {
    const intent = await interpretQuery("USA energy prodction");
    assert.equal(intent.interpreter, "rules");
    assert.equal(intent.product, "total energy");
    assert.equal(intent.activity, "production");
    assert.ok(intent.fallback.reasons.includes("openai_request_failed"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});

test("unsupported AI category and invented series ID are rejected", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "USA energy production",
    confidence: 0.92,
    seriesId: "FAKE.SERIES.ID",
    fields: {
      country: { value: "USA", confidence: 0.95 },
      product: { value: "fusion", confidence: 0.95 },
      activity: { value: "production", confidence: 0.95 },
      frequency: { value: "annual", confidence: 0.95 }
    }
  }, "USA energy production");

  assert.equal(intent.product, "total energy");
  assert.equal(intent.fields.product.validation, "fallback");
  assert.equal("seriesId" in intent, false);
  assert.equal(JSON.stringify(intent).includes("FAKE.SERIES.ID"), false);
});

test("clean state request validates every AI field without fallback", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "monthly natural gas production in Texas",
    confidence: 0.96,
    fields: {
      country: { rawValue: "Texas", value: "TX", confidence: 0.98 },
      product: { rawValue: "natural gas", value: "natural gas", confidence: 0.98 },
      activity: { rawValue: "production", value: "production", confidence: 0.98 },
      frequency: { rawValue: "monthly", value: "monthly", confidence: 0.98 }
    }
  }, "monthly natural gas production in Texas");

  assert.equal(intent.countryCode, "TX");
  assert.equal(intent.route.family, "domestic");
  assert.equal(intent.frequency, "monthly");
  assert.equal(intent.needsClarification, false);
  assert.equal(Object.values(intent.fields).some(field => field.fallbackUsed), false);
});

test("AI-corrected concepts control routing instead of misspelled raw mentions", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "California monthly electricity generation",
    confidence: 0.95,
    fields: {
      country: { rawValue: "California", value: "CA", confidence: 0.98 },
      product: { rawValue: "electricty", value: "electricity", confidence: 0.95 },
      activity: { rawValue: "genration", value: "generation", confidence: 0.95 },
      frequency: { rawValue: "monthly", value: "monthly", confidence: 0.98 }
    }
  }, "California monthly electricty genration");

  assert.equal(intent.product, "electricity");
  assert.equal(intent.activity, "generation");
  assert.equal(intent.route.family, "domestic");
});

test("AI cannot replace an explicit local geography or infer an unmentioned sector", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Iowa monthly wind net generation",
    confidence: 0.98,
    geographies: [{ value: "USA", confidence: 0.98 }],
    conceptPairs: [
      { order: 0, product: "renewable", activity: "generation", confidence: 0.98 },
      { order: 1, product: "renewable", activity: "generation", confidence: 0.98 }
    ],
    fields: {
      country: { value: "USA", confidence: 0.98 },
      product: { value: "renewable", confidence: 0.98 },
      activity: { value: "generation", confidence: 0.98 },
      sector: { value: "electric power", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, "Iowa monthly wind net generation");

  assert.equal(intent.countryCode, "IA");
  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["IA"]);
  assert.equal(intent.fields.country.validation, "fallback");
  assert.equal(intent.product, "wind");
  assert.equal(intent.fields.product.validation, "fallback");
  assert.deepEqual(intent.validatedConceptPairs.map(pair => [pair.product, pair.activity]), [["wind", "generation"]]);
  assert.equal(intent.sector, null);
  assert.equal(intent.fields.sector.validation, "rejected");
});

test("an omitted optional sector does not trigger a clarification request", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "California monthly electricity generation",
    confidence: 0.96,
    fields: {
      country: { value: "CA", confidence: 0.98 },
      product: { value: "electricity", confidence: 0.98 },
      activity: { value: "generation", confidence: 0.98 },
      sector: { value: null, confidence: 0.9, ambiguityReason: "No sector was specified." },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, "California monthly electricity generation");

  assert.equal(intent.sector, null);
  assert.equal(intent.fields.sector.validation, "missing");
  assert.equal(intent.needsClarification, false);
  assert.equal(intent.clarificationMessage, null);
});

test("recognized broad products and ordered activities repair AI ambiguity without expansion", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Germany renewable energy production and consumption",
    confidence: 0.91,
    conceptPairs: [
      { order: 0, product: null, activity: "consumption", confidence: 0.9 }
    ],
    fields: {
      country: { value: "DEU", confidence: 0.98 },
      product: {
        value: null,
        confidence: 0.6,
        ambiguityReason: "Renewable energy contains several technologies.",
        alternatives: ["wind", "solar", "hydro"]
      },
      activity: { value: null, confidence: 0.7, ambiguityReason: "Two activities were requested." },
      frequency: { value: "annual", explicit: false, confidence: 0.9 }
    }
  }, "Germany renewable energy production and consumption");

  assert.equal(intent.product, "renewable");
  assert.equal(intent.fields.product.validation, "fallback");
  assert.deepEqual(intent.validatedConceptPairs.map(pair => [pair.product, pair.activity]), [
    ["renewable", "production"],
    ["renewable", "consumption"]
  ]);
});

test("an explicit query frequency cannot be weakened or changed by AI", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Brazil annual petroleum consumption",
    confidence: 0.96,
    fields: {
      country: { value: "BRA", confidence: 0.98 },
      product: { value: "petroleum", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 },
      frequency: { value: "monthly", explicit: false, confidence: 0.98 }
    }
  }, "Brazil annual petroleum consumption");

  assert.equal(intent.frequency, "annual");
  assert.equal(intent.requestedFrequency, "annual");
  assert.equal(intent.frequencyExplicit, true);
  assert.equal(intent.fields.frequency.validation, "fallback");
});

test("compound carrier wording produces one validated concept pair", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Japan monthly solar electricity generation",
    confidence: 0.97,
    conceptPairs: [
      { order: 0, product: "solar", activity: "generation", confidence: 0.97 },
      { order: 1, product: "electricity", activity: "generation", confidence: 0.97 }
    ],
    fields: {
      country: { value: "JPN", confidence: 0.98 },
      product: { value: "solar", confidence: 0.98 },
      activity: { value: "generation", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, "Japan monthly solar electricity generation");

  assert.deepEqual(intent.validatedConceptPairs.map(pair => [pair.product, pair.activity]), [["solar", "generation"]]);
  assert.deepEqual(intent.structuredIntent.conceptPairs.map(pair => [pair.product, pair.activity]), [["solar", "generation"]]);
  assert.equal(intent.structuredIntent.product, "solar");
});

test("AI U.S. aliases cannot create a second noncanonical national geography", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Texas and United States monthly natural gas production",
    confidence: 0.98,
    geographies: [
      { value: "Texas", confidence: 0.98 },
      { value: "US", confidence: 0.98 }
    ],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: null, confidence: 0.98 },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, "Texas and United States monthly natural gas production", [
    { name: "United States", code: "US" },
    { name: "United States", code: "USA" }
  ]);

  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["TX", "USA"]);
});

test("explicit deterministic geographies survive low AI confidence and omission", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Georgia and France natural gas production",
    confidence: 0.92,
    geographies: [
      { value: "Georgia", confidence: 0.55 },
      { value: "France", confidence: 0.98 }
    ],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.97 }],
    fields: {
      country: { rawValue: "Georgia and France", value: null, confidence: 0.2, ambiguityReason: "Multiple geographies." },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 },
      frequency: { value: "annual", explicit: false, confidence: 0.8 }
    }
  }, "Georgia and France natural gas production");

  assert.deepEqual(intent.validatedGeographies.map(geography => geography.code), ["GEO", "FRA"]);
  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["GEO", "FRA"]);
  assert.deepEqual(intent.geographyEvidence.map(item => item.source), ["raw_exact_deterministic", "raw_exact_deterministic"]);
  assert.equal(intent.geographyEvidence[0].resolutionRule, "contextual_state_country");
  assert.equal(intent.needsClarification, false);
});

test("context resolves Georgia as a state beside Texas", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Georgia and Texas natural gas production",
    confidence: 0.95,
    geographies: [
      { value: "Georgia", confidence: 0.55 },
      { value: "Texas", confidence: 0.98 }
    ],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: null, confidence: 0.4, ambiguityReason: "Multiple geographies." },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 }
    }
  }, "Georgia and Texas natural gas production");

  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["GA", "TX"]);
  assert.equal(intent.geographyEvidence[0].resolutionRule, "contextual_state_country");
});

test("AI geography corrections require bounded spelling evidence and official metadata", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Georgia France natural gas production",
    confidence: 0.96,
    geographies: [
      { value: "Georgia", confidence: 0.96 },
      { value: "France", confidence: 0.96 }
    ],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: null, confidence: 0.4, ambiguityReason: "Multiple geographies." },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 }
    }
  }, "gorgia frans natural gas production");

  assert.equal(intent.originalQuery, "gorgia frans natural gas production");
  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["GEO", "FRA"]);
  assert.deepEqual(intent.geographyEvidence.map(item => item.source), [
    "ai_proposed_deterministically_verified",
    "ai_proposed_deterministically_verified"
  ]);
  assert.deepEqual(intent.geographyEvidence.map(item => item.correction.from), ["gorgia", "frans"]);
  assert.equal(intent.needsClarification, false);
});

test("bounded metadata matching recovers a country typo omitted by AI", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "France natural gas production",
    confidence: 0.94,
    geographies: [{ value: "France", confidence: 0.98 }],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: "France", confidence: 0.98 },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 }
    }
  }, "gorgia frans natural gas production");

  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["GEO", "FRA"]);
  assert.equal(intent.geographyEvidence[0].source, "deterministic_metadata_spelling_match");
  assert.equal(intent.geographyEvidence[0].correction.from, "gorgia");
  assert.equal(intent.geographyEvidence[1].source, "ai_proposed_deterministically_verified");
  assert.equal(intent.needsClarification, false);
});

test("explicit deterministic geography wins and records an AI conflict", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Georgia and France natural gas production",
    confidence: 0.96,
    geographies: [
      { value: "GA", confidence: 0.96 },
      { value: "France", confidence: 0.98 }
    ],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: null, confidence: 0.4, ambiguityReason: "Multiple geographies." },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 }
    }
  }, "Georgia and France natural gas production");

  assert.deepEqual(intent.structuredIntent.geographies.map(geography => geography.code), ["GEO", "FRA"]);
  assert.equal(intent.geographyEvidence[0].conflictStatus, "conflict");
  assert.deepEqual(intent.geographyConflicts[0].aiClaims[0].candidateCodes, ["GA"]);
  assert.equal(intent.structuredIntent.validation.geographyConflicts.length, 1);
});

test("an unsupported geography-like token is not rescued by an unrelated AI claim", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "France natural gas production",
    confidence: 0.96,
    geographies: [{ value: "France", confidence: 0.98 }],
    conceptPairs: [{ product: "natural gas", activity: "production", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: "France", confidence: 0.98 },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 }
    }
  }, "dffdd natural gas production");

  assert.deepEqual(intent.validatedGeographies, []);
  assert.equal(intent.country, null);
  assert.equal(intent.needsClarification, true);
  assert.ok(intent.missingFields.includes("country"));
});

test("bounded AI product corrections validate against the approved product vocabulary", () => {
  const cases = [
    ["electrciity", "electricity"],
    ["petrolium", "petroleum"],
    ["nucelar", "nuclear"]
  ];

  for (const [rawProduct, product] of cases) {
    const raw = `Brazil ${rawProduct} consumption`;
    const intent = validateAiInterpretation({
      correctedQuery: `Brazil ${product} consumption`,
      confidence: 0.98,
      geographies: [{ value: "Brazil", confidence: 0.99 }],
      conceptPairs: [{ product, activity: "consumption", order: 0, confidence: 0.98 }],
      fields: {
        country: { value: "Brazil", confidence: 0.99 },
        product: { rawValue: rawProduct, value: product, confidence: 0.98 },
        activity: { value: "consumption", confidence: 0.98 }
      }
    }, raw);

    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.product, product);
    assert.equal(intent.fields.product.validation, "approved");
    assert.equal(intent.fields.product.validationEvidenceSource, "ai_proposed_deterministically_verified");
    assert.deepEqual(intent.fields.product.correction, {
      from: rawProduct,
      to: product,
      editDistance: rawProduct === "petrolium" ? 1 : 2
    });
    assert.equal(intent.needsClarification, false);
  }
});

test("bounded AI activity corrections validate against the approved activity vocabulary", () => {
  const cases = [
    ["consumtion", "consumption"],
    ["prodction", "production"],
    ["generaton", "generation"]
  ];

  for (const [rawActivity, activity] of cases) {
    const raw = `Brazil electricity ${rawActivity}`;
    const intent = validateAiInterpretation({
      correctedQuery: `Brazil electricity ${activity}`,
      confidence: 0.98,
      geographies: [{ value: "Brazil", confidence: 0.99 }],
      conceptPairs: [{ product: "electricity", activity, order: 0, confidence: 0.98 }],
      fields: {
        country: { value: "Brazil", confidence: 0.99 },
        product: { value: "electricity", confidence: 0.98 },
        activity: { rawValue: rawActivity, value: activity, confidence: 0.98 }
      }
    }, raw);

    assert.equal(intent.activity, activity);
    assert.equal(intent.fields.activity.validationEvidenceSource, "ai_proposed_deterministically_verified");
    assert.equal(intent.fields.activity.correction.from, rawActivity);
    assert.equal(intent.fields.activity.correction.to, activity);
    assert.equal(intent.needsClarification, false);
  }
});

test("bounded AI sector corrections validate against the approved sector vocabulary", () => {
  const cases = [
    ["residental", "residential"],
    ["commerical", "commercial"],
    ["industiral", "industrial"],
    ["transportaion", "transportation"],
    ["electric powre", "electric power"]
  ];

  for (const [rawSector, sector] of cases) {
    const raw = `Brazil electricity consumption ${rawSector} sector`;
    const intent = validateAiInterpretation({
      correctedQuery: `Brazil electricity consumption ${sector} sector`,
      confidence: 0.98,
      geographies: [{ value: "Brazil", confidence: 0.99 }],
      conceptPairs: [{ product: "electricity", activity: "consumption", order: 0, confidence: 0.98 }],
      fields: {
        country: { value: "Brazil", confidence: 0.99 },
        product: { value: "electricity", confidence: 0.98 },
        activity: { value: "consumption", confidence: 0.98 },
        sector: { rawValue: rawSector, value: sector, confidence: 0.98 }
      }
    }, raw);

    assert.equal(intent.sector, sector);
    assert.equal(intent.fields.sector.validationEvidenceSource, "ai_proposed_deterministically_verified");
    assert.equal(intent.fields.sector.correction.from, rawSector);
    assert.equal(intent.fields.sector.correction.to, sector);
  }
});

test("bounded AI frequency corrections validate against the approved frequency vocabulary", () => {
  const cases = [
    ["daly", "daily"],
    ["wekly", "weekly"],
    ["montly", "monthly"],
    ["quartely", "quarterly"],
    ["anual", "annual"]
  ];

  for (const [rawFrequency, frequency] of cases) {
    const raw = `Brazil ${rawFrequency} electricity consumption`;
    const intent = validateAiInterpretation({
      correctedQuery: `Brazil ${frequency} electricity consumption`,
      confidence: 0.98,
      geographies: [{ value: "Brazil", confidence: 0.99 }],
      conceptPairs: [{ product: "electricity", activity: "consumption", order: 0, confidence: 0.98 }],
      fields: {
        country: { value: "Brazil", confidence: 0.99 },
        product: { value: "electricity", confidence: 0.98 },
        activity: { value: "consumption", confidence: 0.98 },
        frequency: { rawValue: rawFrequency, value: frequency, explicit: true, confidence: 0.98 }
      }
    }, raw);

    assert.equal(intent.frequency, frequency);
    assert.equal(intent.requestedFrequency, frequency);
    assert.equal(intent.frequencyExplicit, true);
    assert.equal(intent.fields.frequency.validationEvidenceSource, "ai_proposed_deterministically_verified");
    assert.equal(intent.fields.frequency.correction.from, rawFrequency);
    assert.equal(intent.fields.frequency.correction.to, frequency);
  }
});

test("multiple approved vocabulary corrections can be validated in one raw query", () => {
  const raw = "Brazil montly electrciity consumtion residental sector";
  const intent = validateAiInterpretation({
    correctedQuery: "Brazil monthly electricity consumption residential sector",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    conceptPairs: [{ product: "electricity", activity: "consumption", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "electricity", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 },
      sector: { value: "residential", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    }
  }, raw);

  assert.equal(intent.originalQuery, raw);
  assert.equal(intent.product, "electricity");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.sector, "residential");
  assert.equal(intent.frequency, "monthly");
  assert.deepEqual(intent.validatedCorrections.map(item => [item.type, item.from, item.to]), [
    ["frequency", "montly", "monthly"],
    ["product", "electrciity", "electricity"],
    ["activity", "consumtion", "consumption"],
    ["sector", "residental", "residential"]
  ]);
  assert.equal(intent.needsClarification, false);
});

test("semantic typo validation rejects low-confidence, unsupported, and tied AI corrections", () => {
  const lowConfidence = validateAiInterpretation({
    correctedQuery: "Brazil electricity consumption",
    confidence: 0.95,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "electricity", confidence: 0.55 },
      activity: { value: "consumption", confidence: 0.98 }
    }
  }, "Brazil electrciity consumption");
  assert.equal(lowConfidence.product, null);
  assert.ok(lowConfidence.missingFields.includes("product"));

  const unsupported = validateAiInterpretation({
    correctedQuery: "Brazil electricity consumption",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "electricity", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 }
    }
  }, "Brazil moon consumption");
  assert.equal(unsupported.product, null);
  assert.ok(unsupported.missingFields.includes("product"));

  const tiedSector = validateAiInterpretation({
    correctedQuery: "Brazil electricity consumption electric power sector",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "electricity", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 },
      sector: { value: "electric power", confidence: 0.98 }
    }
  }, "Brazil electricity consumption utilty sector");
  assert.equal(tiedSector.sector, null);
  assert.equal(tiedSector.fields.sector.correction, undefined);
});

test("verified corrections preserve exact negations and corrected excluded products", () => {
  for (const marker of ["not", "without", "excluding"]) {
    const raw = `Brazil energy consumption ${marker} petrolium`;
    const intent = validateAiInterpretation({
      correctedQuery: `Brazil energy consumption ${marker} petroleum`,
      confidence: 0.98,
      geographies: [{ value: "Brazil", confidence: 0.99 }],
      conceptPairs: [{ product: "total energy", activity: "consumption", order: 0, confidence: 0.98 }],
      exclusions: [{ type: "product", value: "petroleum", confidence: 0.98 }],
      fields: {
        country: { value: "Brazil", confidence: 0.99 },
        product: { value: "total energy", confidence: 0.98 },
        activity: { value: "consumption", confidence: 0.98 }
      }
    }, raw);

    assert.equal(intent.originalQuery, raw);
    assert.equal(intent.product, "total energy");
    assert.ok(intent.normalizedQuery.includes(marker));
    assert.ok(intent.exclusions.some(item => item.type === "product" && item.value === "petroleum"));
    assert.ok(intent.exclusions.find(item => item.value === "petroleum").corrections.some(item => item.from === "petrolium"));
    assert.ok(intent.conceptPairs.every(pair => pair.product !== "petroleum"));
  }
});

test("AI correction cannot remove a raw negation or make its excluded product positive", () => {
  const raw = "Brazil energy consumption not petrolium";
  const intent = validateAiInterpretation({
    correctedQuery: "Brazil petroleum consumption",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    conceptPairs: [{ product: "petroleum", activity: "consumption", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "petroleum", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 }
    }
  }, raw);

  assert.equal(intent.originalQuery, raw);
  assert.ok(intent.normalizedQuery.includes("not petroleum"));
  assert.equal(intent.product, "total energy");
  assert.equal(intent.fields.product.normalizedValue, "total energy");
  assert.ok(intent.exclusions.some(item => item.type === "product" && item.value === "petroleum"));
  assert.ok(intent.conceptPairs.every(pair => pair.product !== "petroleum"));
});

test("broad energy and a corrected exclusion stay consistent before browser resubmission", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Brazil energy consumption not petroleum",
    confidence: 0.9,
    geographies: [{ value: "Brazil", confidence: 0.98 }],
    conceptPairs: [{ product: null, activity: "consumption", order: 0, confidence: 0.9 }],
    exclusions: [{ type: "product", value: "petroleum", confidence: 0.9 }],
    fields: {
      country: { value: "Brazil", confidence: 0.98 },
      product: {
        value: null,
        confidence: 0.7,
        ambiguityReason: "Energy is broad.",
        alternatives: ["natural gas", "petroleum", "electricity", "coal", "nuclear", "renewable"]
      },
      activity: { value: "consumption", confidence: 0.95 },
      frequency: { value: "annual", explicit: false, confidence: 0.8 }
    }
  }, "Brazil energy consumption not petrolium");

  assert.equal(intent.product, "total energy");
  assert.equal(intent.fields.product.validation, "fallback");
  assert.ok(intent.exclusions.some(item => item.type === "product" && item.value === "petroleum"));
  assert.equal(intent.needsClarification, false);
});

test("a bounded AI correction can repair a misspelled long negation marker without inventing an exclusion", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Brazil energy consumption without petroleum",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    conceptPairs: [{ product: "total energy", activity: "consumption", order: 0, confidence: 0.98 }],
    exclusions: [{ type: "product", value: "petroleum", confidence: 0.98 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "total energy", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 }
    }
  }, "Brazil energy consumption witout petroleum");

  assert.ok(intent.exclusions.some(item => item.type === "product" && item.value === "petroleum"));
  assert.ok(intent.validatedCorrections.some(item => item.type === "negation" && item.from === "witout" && item.to === "without"));

  const invented = validateAiInterpretation({
    correctedQuery: "Brazil energy consumption without petroleum",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.99 }],
    exclusions: [{ type: "product", value: "petroleum", confidence: 0.98 }],
    fields: {
      country: { value: "Brazil", confidence: 0.99 },
      product: { value: "total energy", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 }
    }
  }, "Brazil energy consumption petroleum");
  assert.deepEqual(invented.exclusions, []);
});

test("specific product context resolves AI ambiguity without broadening", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "United States weekly working gas in underground storage",
    confidence: 0.95,
    fields: {
      country: { value: "USA", confidence: 0.98 },
      product: {
        value: null,
        confidence: 0.7,
        ambiguityReason: "Gas could refer to more than one product.",
        alternatives: ["natural gas", "petroleum"]
      },
      activity: { value: "storage", confidence: 0.98 },
      frequency: { value: "weekly", explicit: true, confidence: 0.98 }
    }
  }, "United States weekly working gas in underground storage");

  assert.equal(intent.product, "natural gas");
  assert.equal(intent.fields.product.validation, "fallback");
  assert.equal(intent.fields.product.breadth, "specific");
  assert.equal(intent.needsClarification, false);
});

test("recognized query phrases cannot become unknown qualifiers", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "New Mexico monthly marketed natural gas production",
    confidence: 0.96,
    fields: {
      country: { value: "NM", confidence: 0.98 },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    },
    unknownQualifiers: [
      { value: "New Mexico", confidence: 0.95 },
      { value: "marketed", confidence: 0.95 }
    ]
  }, "New Mexico monthly marketed natural gas production");

  assert.deepEqual(intent.unknownQualifiers, []);
  assert.equal(intent.needsClarification, false);
});

test("AI cannot collapse an unresolved broad product into one interpretation", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Texas gas",
    confidence: 0.97,
    conceptPairs: [{ order: 0, product: "natural gas", activity: null, confidence: 0.97 }],
    fields: {
      country: { value: "TX", confidence: 0.98 },
      product: { value: "natural gas", confidence: 0.97 }
    }
  }, "Texas gas");

  assert.equal(intent.product, null);
  assert.deepEqual(intent.structuredIntent.productAlternatives, ["natural gas", "petroleum"]);
  assert.equal(intent.validatedConceptPairs[0].product, null);
  assert.equal(intent.needsClarification, true);
  assert.equal(intent.blockingClarification, true);
  assert.equal(intent.structuredIntent.blockingClarification, true);
  assert.ok(intent.missingFields.includes("activity"));
});

test("AI cannot resolve unsupported product and activity pairing scope", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Texas coal production and natural gas consumption",
    confidence: 0.98,
    conceptPairs: [
      { order: 0, product: "coal", activity: "production", confidence: 0.98 },
      { order: 1, product: "natural gas", activity: "consumption", confidence: 0.98 }
    ],
    fields: {
      country: { value: "TX", confidence: 0.98 },
      product: { value: "coal", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 }
    }
  }, "Texas coal and natural gas production and consumption");

  assert.deepEqual(intent.validatedConceptPairs, []);
  assert.deepEqual(intent.conceptPairs, []);
  assert.equal(intent.structuredIntent.conceptPairStatus, "unresolved");
  assert.equal(intent.blockingClarification, true);
  assert.match(intent.clarificationMessage, /which activity applies to each energy product/i);
});

test("genuinely unknown source terms remain blocking qualifiers", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "California monthly electricity from moon",
    confidence: 0.96,
    conceptPairs: [{ product: null, activity: "generation", order: 0, confidence: 0.96 }],
    fields: {
      country: { value: "CA", confidence: 0.98 },
      product: { value: "electricity", confidence: 0.98 },
      activity: { value: "generation", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    },
    unknownQualifiers: [{ value: "moon", confidence: 0.95 }]
  }, "California monthly electricity from moon");

  assert.equal(intent.activity, null);
  assert.deepEqual(intent.validatedConceptPairs.map(pair => [pair.product, pair.activity]), [["electricity", null]]);
  assert.deepEqual(intent.unknownQualifiers.map(item => item.value), ["moon"]);
  assert.equal(intent.needsClarification, true);
});

test("filler words and negated concepts do not become blocking qualifiers", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "show monthly natural gas production in Texas, not prices",
    confidence: 0.97,
    fields: {
      country: { value: "TX", confidence: 0.98 },
      product: { value: "natural gas", confidence: 0.98 },
      activity: { value: "production", confidence: 0.98 },
      frequency: { value: "monthly", explicit: true, confidence: 0.98 }
    },
    exclusions: [],
    unknownQualifiers: [
      { value: "plz", confidence: 0.98 },
      { value: "shwo", confidence: 0.98 },
      { value: "not prices", confidence: 0.98 }
    ]
  }, "plz shwo montly nat gas prodction in Texas, not prices");

  assert.deepEqual(intent.unknownQualifiers, []);
  assert.deepEqual(intent.exclusions.map(item => [item.type, item.value]), [["activity", "prices"]]);
  assert.equal(intent.blockingClarification, false);
});

test("an explicitly excluded product cannot become an approved positive AI field", () => {
  const intent = validateAiInterpretation({
    correctedQuery: "Brazil annual energy consumption excluding petroleum",
    confidence: 0.98,
    geographies: [{ value: "Brazil", confidence: 0.98 }],
    conceptPairs: [{ product: "total energy", activity: "consumption", order: 0, confidence: 0.98 }],
    fields: {
      country: { value: "Brazil", confidence: 0.98 },
      product: { value: "petroleum", confidence: 0.98 },
      activity: { value: "consumption", confidence: 0.98 },
      frequency: { value: "annual", explicit: true, confidence: 0.98 }
    }
  }, "Brazil annual energy consumption excluding petroleum");

  assert.equal(intent.fields.product.validation, "fallback");
  assert.equal(intent.fields.product.normalizedValue, "total energy");
  assert.equal(intent.structuredIntent.product, "total energy");
  assert.equal(intent.structuredIntent.productBreadth, "broad");
  assert.ok(intent.exclusions.some(item => item.type === "product" && item.value === "petroleum"));
});

test("long AI interpretation respects the selected activity and ignores invented selection fields", () => {
  const query = "I am preparing a report and would like monthly figures showing how much natural gas the United States produced over time, not prices.";
  const intent = validateAiInterpretation({
    correctedQuery: "monthly United States natural gas production",
    confidence: 0.94,
    seriesId: "INVENTED.ID",
    fields: {
      country: { rawValue: "United States", value: "USA", confidence: 0.98 },
      product: { rawValue: "natural gas", value: "natural gas", confidence: 0.98 },
      activity: { rawValue: "produced, not prices", value: "production", confidence: 0.94 },
      frequency: { rawValue: "monthly", value: "monthly", confidence: 0.98 }
    }
  }, query);

  assert.equal(intent.activity, "production");
  assert.equal(intent.frequency, "monthly");
  assert.equal(JSON.stringify(intent).includes("INVENTED.ID"), false);
});

test("unrelated natural wording near gasoline does not become natural gas", () => {
  const intent = interpretQueryWithRules("natural resources and gasoline prices in USA");

  assert.equal(intent.product, "petroleum");
  assert.notEqual(intent.product, "natural gas");
});

test("invalid AI JSON and timeout both fall back with distinct reasons", async () => {
  const originalKey = process.env.OPENAI_API_KEY;
  const originalFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = "test-openai-key";
  try {
    globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ output_text: "not-json" }) });
    const invalid = await interpretQuery("USA energy production");
    assert.ok(invalid.fallback.reasons.includes("openai_invalid_json"));

    globalThis.fetch = async () => { const error = new Error("aborted"); error.name = "AbortError"; throw error; };
    const timeout = await interpretQuery("USA energy production");
    assert.ok(timeout.fallback.reasons.includes("openai_timeout"));
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = originalKey;
  }
});
