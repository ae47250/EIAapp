import assert from "node:assert/strict";
import { test } from "node:test";

import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";
import {
  LocalRetrievalError,
  RETRIEVAL_LIMIT,
  RETRIEVAL_TARGET,
  clearLocalRetrievalCache,
  retrieveLocalCandidates
} from "../lib/sources/eia/local-retrieval.js";

const INDEX_HASH = "1d2dd5904b9f9c13491f5b168a3c432f080cef708b7252c5a2e0cf37d3239028";

test("retrieves relevant International candidates from the local Phase 1b index", async () => {
  const result = await retrieveLocalCandidates(interpretQueryWithRules("Brazil annual petroleum consumption"));
  const retrieval = result.retrievals[0];

  assert.equal(result.routeFamily, "international");
  assert.ok(retrieval.primaryCandidates.some(candidate => /petroleum.*consumption|consumption.*petroleum/i.test(candidate.title)));
  assert.ok(retrieval.diagnostics.totalCount >= RETRIEVAL_TARGET);
  assert.ok(retrieval.diagnostics.totalCount <= RETRIEVAL_LIMIT);
  assert.equal(result.diagnostics.rankingApplied, false);
});

test("hard-gates route family, geography, and explicit frequency", async () => {
  const result = await retrieveLocalCandidates(interpretQueryWithRules("California monthly electricity generation"));
  const candidates = allCandidates(result.retrievals[0]);

  assert.ok(candidates.length >= RETRIEVAL_TARGET);
  assert.ok(candidates.some(candidate => /net generation/i.test(candidate.title)));
  assert.ok(candidates.every(candidate => candidate.route_family === "domestic"));
  assert.ok(candidates.every(candidate => candidate.geography.code === "CA"));
  assert.ok(candidates.every(candidate => candidate.frequency === "monthly"));
  assert.ok(result.retrievals[0].diagnostics.explicitFrequencyMismatchesExcluded > 0);
});

test("retrieves SEDS total-energy candidates for the requested state", async () => {
  const result = await retrieveLocalCandidates(interpretQueryWithRules("Texas annual total energy consumption"));
  const candidates = allCandidates(result.retrievals[0]);

  assert.ok(candidates.some(candidate => /total energy.*consumption/i.test(candidate.title)));
  assert.ok(candidates.every(candidate => candidate.route_family === "seds"));
  assert.ok(candidates.every(candidate => candidate.geography.code === "TX"));
});

test("broad renewable intent retrieves several approved product options", async () => {
  const result = await retrieveLocalCandidates(interpretQueryWithRules("Brazil renewable energy production"));
  const candidates = allCandidates(result.retrievals[0]);
  const titles = candidates.map(candidate => candidate.title.toLowerCase());

  assert.ok(titles.some(title => title.includes("renewable")));
  assert.ok(titles.some(title => /wind|solar|hydro|geothermal|biofuel|biomass/.test(title)));
  assert.ok(titles.every(title => /renewable|wind|solar|hydro|geothermal|biofuel|biomass/.test(title)));
  assert.ok(candidates.every(candidate => candidate.selector.facets.countryRegionId === "BRA"));
  assert.deepEqual(result.retrievals[0].concept.productAlternatives, ["wind", "solar", "hydro", "geothermal", "biofuels"]);
});

test("nonannual state total-energy requests do not fall into SEDS annual candidates", async () => {
  const result = await retrieveLocalCandidates(interpretQueryWithRules("Texas monthly total energy consumption"));
  const retrieval = result.retrievals[0];

  assert.equal(result.routeFamily, "domestic");
  assert.equal(retrieval.frequency.mode, "exact");
  assert.equal(retrieval.frequency.value, "monthly");
  assert.equal(retrieval.primaryCandidates.length, 0);
  assert.ok(retrieval.fallbackCandidates.length > 0);
  assert.ok(retrieval.fallbackCandidates.every(candidate => candidate.retrieval.reasonCodes.includes("product_alternative_fallback")));
  assert.ok(allCandidates(retrieval).every(candidate => candidate.route_family === "domestic"));
  assert.ok(allCandidates(retrieval).every(candidate => candidate.frequency === "monthly"));
});

test("unresolved qualifiers block retrieval instead of using weak activity inference", async () => {
  const result = await retrieveLocalCandidates(interpretQueryWithRules("California monthly electricity from moon"));
  const retrieval = result.retrievals[0];

  assert.equal(retrieval.concept.activity, null);
  assert.equal(retrieval.concept.activitySource, "missing");
  assert.deepEqual(retrieval.diagnostics.blockedByUnresolvedQualifiers, ["moon"]);
  assert.equal(retrieval.primaryCandidates.length, 0);
  assert.equal(retrieval.fallbackCandidates.length, 0);
});

test("deduplicates canonical selectors and excludes explicit activity mismatches", async () => {
  const intent = fixtureIntent();
  const strong = fixtureRecord("one", "Solar electricity production", "A");
  const duplicate = { ...strong, candidate_id: "duplicate" };
  const weak = fixtureRecord("two", "Solar use", "B");
  const result = await retrieveLocalCandidates(intent, {
    records: [strong, duplicate, weak],
    indexMetadata: { manifestContentHash: "test-hash" }
  });
  const retrieval = result.retrievals[0];

  assert.equal(retrieval.primaryCandidates.length, 1);
  assert.equal(retrieval.fallbackCandidates.length, 0);
  assert.equal(new Set(allCandidates(retrieval).map(candidate => JSON.stringify(candidate.selector))).size, 1);
});

test("stops at the hard 50-candidate limit without padding or ranking", async () => {
  const records = Array.from({ length: 75 }, (_, index) =>
    fixtureRecord(`series-${index}`, "Solar production", String(index).padStart(3, "0"))
  );
  const result = await retrieveLocalCandidates(fixtureIntent(), {
    records,
    indexMetadata: { manifestContentHash: "test-hash" }
  });
  const retrieval = result.retrievals[0];

  assert.equal(retrieval.primaryCandidates.length, RETRIEVAL_LIMIT);
  assert.equal(retrieval.fallbackCandidates.length, 0);
  assert.equal(retrieval.diagnostics.totalCount, RETRIEVAL_LIMIT);
  assert.deepEqual(retrieval.diagnostics.tiersApplied, ["exact_phrase"]);
});

test("preserves geography and concept request order", async () => {
  const intent = fixtureIntent();
  intent.geographies = [
    { name: "Alpha", code: "AA", type: "country", routeFamilies: ["international"] },
    { name: "Beta", code: "BB", type: "country", routeFamilies: ["international"] }
  ];
  intent.mentions.concepts = [
    { index: 1, type: "product", value: "solar" },
    { index: 2, type: "activity", value: "production" },
    { index: 3, type: "product", value: "wind" },
    { index: 4, type: "activity", value: "consumption" }
  ];
  const records = [
    fixtureRecord("aa-solar", "Solar production", "A", "AA"),
    fixtureRecord("aa-wind", "Wind consumption", "B", "AA"),
    fixtureRecord("bb-solar", "Solar production", "C", "BB"),
    fixtureRecord("bb-wind", "Wind consumption", "D", "BB")
  ];
  const result = await retrieveLocalCandidates(intent, {
    records,
    indexMetadata: { manifestContentHash: "test-hash" }
  });

  assert.deepEqual(result.retrievals.map(item => `${item.geography.code}:${item.concept.product}:${item.concept.activity}`), [
    "AA:solar:production",
    "AA:wind:consumption",
    "BB:solar:production",
    "BB:wind:consumption"
  ]);
});

test("returns repeatable candidate identities and retrieval reasons", async () => {
  const intent = interpretQueryWithRules("Brazil annual petroleum consumption");
  const first = await retrieveLocalCandidates(intent);
  const second = await retrieveLocalCandidates(intent);

  assert.deepEqual(stableRetrieval(first), stableRetrieval(second));
});

test("reports the validated index version and rejects a mismatched intent version", async () => {
  const valid = await retrieveLocalCandidates(interpretQueryWithRules("Brazil annual petroleum consumption"));
  assert.equal(valid.diagnostics.index.manifestContentHash, INDEX_HASH);
  assert.equal(valid.diagnostics.index.versionStatus, "match");

  const mismatched = fixtureIntent();
  mismatched.validation.metadataSource.manifestContentHash = "wrong-hash";
  await assert.rejects(
    retrieveLocalCandidates(mismatched, { records: [fixtureRecord("one", "Solar production", "A")] }),
    error => error instanceof LocalRetrievalError && error.code === "INDEX_VERSION_MISMATCH"
  );
});

test("rejects missing geography and route-family mismatch", async () => {
  const missing = fixtureIntent();
  missing.geography = null;
  missing.geographies = [];
  await assert.rejects(retrieveLocalCandidates(missing, { records: [] }), error => error.code === "GEOGRAPHY_REQUIRED");

  const mismatch = fixtureIntent();
  mismatch.geography.routeFamilies = ["domestic"];
  await assert.rejects(
    retrieveLocalCandidates(mismatch, { records: [], indexMetadata: { manifestContentHash: "test-hash" } }),
    error => error.code === "GEOGRAPHY_ROUTE_MISMATCH"
  );
});

test("cold local retrieval stays within the Phase 3 latency budget", async () => {
  clearLocalRetrievalCache();
  const startedAt = performance.now();
  const result = await retrieveLocalCandidates(interpretQueryWithRules("Brazil annual petroleum consumption"));
  const elapsedMs = performance.now() - startedAt;

  assert.ok(result.retrievals[0].diagnostics.totalCount > 0);
  assert.ok(elapsedMs < 3000, `Cold retrieval took ${elapsedMs.toFixed(1)} ms.`);
});

function allCandidates(retrieval) {
  return [...retrieval.primaryCandidates, ...retrieval.fallbackCandidates];
}

function stableRetrieval(result) {
  return result.retrievals.map(retrieval => ({
    geography: retrieval.geography.code,
    concept: retrieval.concept,
    primary: retrieval.primaryCandidates.map(candidate => [candidate.candidate_id, candidate.retrieval]),
    fallback: retrieval.fallbackCandidates.map(candidate => [candidate.candidate_id, candidate.retrieval])
  }));
}

function fixtureIntent() {
  return {
    route: { family: "international" },
    geography: { name: "Alpha", code: "AA", type: "country", routeFamilies: ["international"] },
    geographies: [],
    product: "solar",
    productBreadth: "specific",
    productAlternatives: [],
    activity: "production",
    frequency: "annual",
    mentions: {
      concepts: [
        { index: 1, type: "product", value: "solar" },
        { index: 2, type: "activity", value: "production" }
      ],
      frequencies: [{ index: 3, type: "frequency", value: "annual" }]
    },
    validation: {
      frequency: "valid",
      metadataSource: { manifestContentHash: "test-hash" }
    }
  };
}

function fixtureRecord(id, title, selectorSuffix, geographyCode = "AA") {
  return {
    candidate_id: id,
    series_id: `INTL.${id}`,
    route_family: "international",
    selector: {
      route: "/international",
      measure: "value",
      frequency: "annual",
      facets: { countryRegionId: geographyCode, productId: selectorSuffix }
    },
    title,
    description: "",
    geography: { name: geographyCode, code: geographyCode, type: "country" },
    frequency: "annual"
  };
}
