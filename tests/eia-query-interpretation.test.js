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
});

test("rules recover the requested country, product, activity, and annual default from messy input", () => {
  const intent = interpretQueryWithRules("looking for data on ergy consn for usa");

  assert.equal(intent.correctedQuery, "looking for data on energy consumption for usa");
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
  assert.equal(intent.countryCode, "USA");
  assert.equal(intent.product, "total energy");
  assert.equal(intent.activity, "consumption");
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, false);
});

test("unsupported AI values are discarded and an invented country code is never accepted", () => {
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
  assert.equal(intent.frequency, "annual");
  assert.equal(intent.needsClarification, true);
  assert.deepEqual(intent.missingFields, ["country"]);
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

test("validated AI fields remain authoritative when deterministic rules disagree", () => {
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

  assert.equal(intent.product, "natural gas");
  assert.equal(intent.fields.product.validation, "approved");
  assert.equal(intent.fields.product.fallbackUsed, false);
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
  assert.deepEqual(intent.fields.product.alternatives, ["wind", "solar", "hydro", "biofuels"]);
  assert.equal(intent.structuredIntent.productBreadth, "broad");
  assert.deepEqual(intent.structuredIntent.productAlternatives, ["wind", "solar", "hydro", "biofuels"]);
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

test("AI receives both exact raw and lightly cleaned query forms", async () => {
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
    assert.equal(intent.fields.product.fallbackUsed, false);
    assert.equal(intent.fallback.used, false);
    assert.match(requestBody.input, /Raw query: "   montly  nat gas prodction usa   "/);
    assert.match(requestBody.input, /Lightly cleaned query: "montly nat gas prodction usa"/);
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
