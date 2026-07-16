import assert from "node:assert/strict";
import { test } from "node:test";

import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";
import { retrieveLocalCandidates } from "../lib/sources/eia/local-retrieval.js";
import { RANKING_CONFIG_VERSION, rankLocalCandidates } from "../lib/sources/eia/local-ranking.js";

test("deterministic ranking meets the baseline metrics on representative cases", () => {
  const cases = [
    {
      intent: { ...interpretQueryWithRules("California monthly electricity generation"), requestedPeriod: "2024" },
      retrieval: buildRetrieval({
        routeFamily: "domestic",
        geography: { name: "California", code: "CA", type: "state" },
        frequency: { value: "monthly", requested: "monthly", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "exact-aggregate",
            series_id: "ELEC.CA.GEN.NG.M",
            title: "Net generation, California, Monthly",
            description: "Verified monthly aggregate electricity generation.",
            measure: "net generation",
            geography: { name: "California", code: "CA", type: "state" },
            unit: "million kilowatthours",
            date_end: "2024",
            selector: {
              route: "/seriesid",
              measure: "net generation",
              frequency: "monthly",
              facets: { series_id: "ELEC.CA.GEN.NG.M" }
            }
          }),
          buildCandidate({
            candidate_id: "mention-only",
            series_id: "ELEC.CA.GEN.NOTES.M",
            title: "California electricity notes",
            description: "This note mentions generation in passing.",
            measure: "value",
            geography: { name: "California", code: "CA", type: "state" },
            unit: "million kilowatthours",
            date_end: "2024",
            selector: {
              route: "/seriesid",
              measure: "value",
              frequency: "monthly",
              facets: { series_id: "ELEC.CA.GEN.NOTES.M" }
            }
          })
        ],
        fallbackCandidates: [
          buildCandidate({
            candidate_id: "wrong-frequency",
            series_id: "ELEC.CA.GEN.NG.A",
            title: "Net generation, California, Annual",
            description: "Verified annual aggregate electricity generation.",
            measure: "net generation",
            geography: { name: "California", code: "CA", type: "state" },
            frequency: "annual",
            unit: "million kilowatthours",
            date_end: "2024",
            selector: {
              route: "/seriesid",
              measure: "net generation",
              frequency: "annual",
              facets: { series_id: "ELEC.CA.GEN.NG.A" }
            }
          })
        ]
      }),
      relevance: new Map([
        ["exact-aggregate", 3],
        ["mention-only", 1],
        ["wrong-frequency", 0]
      ])
    },
    {
      intent: { ...interpretQueryWithRules("Brazil renewable energy production"), requestedPeriod: "2024" },
      retrieval: buildRetrieval({
        routeFamily: "international",
        geography: { name: "Brazil", code: "BRA", type: "country" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "renewable",
            series_id: "INTL.BRA.REN.A",
            title: "Renewable energy production, Brazil, Annual",
            description: "Official renewable aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: {
              route: "/international",
              measure: "value",
              frequency: "annual",
              facets: { countryRegionId: "BRA", productId: "REN" }
            }
          }),
          buildCandidate({
            candidate_id: "wind",
            series_id: "INTL.BRA.WIND.A",
            title: "Wind energy production, Brazil, Annual",
            description: "Official wind aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: {
              route: "/international",
              measure: "value",
              frequency: "annual",
              facets: { countryRegionId: "BRA", productId: "WND" }
            }
          }),
          buildCandidate({
            candidate_id: "solar",
            series_id: "INTL.BRA.SOLAR.A",
            title: "Solar energy production, Brazil, Annual",
            description: "Official solar aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: {
              route: "/international",
              measure: "value",
              frequency: "annual",
              facets: { countryRegionId: "BRA", productId: "SOL" }
            }
          }),
          buildCandidate({
            candidate_id: "hydro",
            series_id: "INTL.BRA.HYDRO.A",
            title: "Hydroelectric energy production, Brazil, Annual",
            description: "Official hydro aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: {
              route: "/international",
              measure: "value",
              frequency: "annual",
              facets: { countryRegionId: "BRA", productId: "HYD" }
            }
          })
        ],
        fallbackCandidates: []
      }),
      relevance: new Map([
        ["renewable", 1],
        ["wind", 1],
        ["solar", 1],
        ["hydro", 1]
      ])
    },
    {
      intent: { ...interpretQueryWithRules("Texas monthly total energy consumption"), requestedPeriod: "2024" },
      retrieval: buildRetrieval({
        routeFamily: "seds",
        geography: { name: "Texas", code: "TX", type: "state" },
        frequency: { value: "annual", requested: "monthly", mode: "fallback" },
        primaryCandidates: [],
        fallbackCandidates: [
          buildCandidate({
            candidate_id: "coverage-hit",
            series_id: "SEDS.TX.TEC.A",
            title: "Total energy consumption, Texas, Annual",
            description: "Official annual aggregate that covers the requested period.",
            measure: "value",
            geography: { name: "Texas", code: "TX", type: "state" },
            unit: "quadrillion btu",
            date_start: "2010",
            date_end: "2024",
            selector: {
              route: "/seds",
              measure: "value",
              frequency: "annual",
              facets: { stateId: "TX", seriesId: "TEC" }
            }
          }),
          buildCandidate({
            candidate_id: "coverage-miss",
            series_id: "SEDS.TX.TEC.OLD",
            title: "Total energy consumption, Texas, Annual",
            description: "Older annual aggregate that does not cover the requested period as well.",
            measure: "value",
            geography: { name: "Texas", code: "TX", type: "state" },
            unit: "quadrillion btu",
            date_start: "1970",
            date_end: "1980",
            selector: {
              route: "/seds",
              measure: "value",
              frequency: "annual",
              facets: { stateId: "TX", seriesId: "TEC_OLD" }
            }
          })
        ]
      }),
      relevance: new Map([
        ["coverage-hit", 2],
        ["coverage-miss", 1]
      ])
    }
  ];

  const evaluated = cases.map(({ intent, retrieval, relevance }) => {
    const ranked = rankLocalCandidates(intent, { schemaVersion: "1.0.0", routeFamily: retrieval.routeFamily, retrievals: [retrieval], diagnostics: {} });
    const topCandidates = ranked.retrievals[0].rankedCandidates.slice(0, 10);
    return {
      ranked,
      topCandidates,
      relevance
    };
  });

  assert.equal(metricTop1(evaluated), 1);
  assert.equal(metricHitRateAt5(evaluated), 1);
  assert.equal(metricMeanReciprocalRank(evaluated), 1);
  assert.ok(metricNdcgAt10(evaluated) >= 0.99);
  assert.ok(evaluated.every(item => item.ranked.diagnostics.rankingConfigVersion === RANKING_CONFIG_VERSION));
});

test("wrong-frequency candidates stay in fallback and are still auditable", () => {
  const intent = interpretQueryWithRules("California monthly electricity generation");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "domestic",
    retrievals: [
      buildRetrieval({
        routeFamily: "domestic",
        geography: { name: "California", code: "CA", type: "state" },
        frequency: { value: "monthly", requested: "monthly", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "wrong-frequency",
            series_id: "ELEC.CA.GEN.NG.A",
            title: "Net generation, California, Annual",
            description: "Annual aggregate.",
            measure: "net generation",
            geography: { name: "California", code: "CA", type: "state" },
            frequency: "annual",
            unit: "million kilowatthours",
            date_end: "2024",
            selector: {
              route: "/seriesid",
              measure: "net generation",
              frequency: "annual",
              facets: { series_id: "ELEC.CA.GEN.NG.A" }
            }
          })
        ],
        fallbackCandidates: []
      })
    ],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.primaryCandidates.length, 0);
  assert.equal(retrieval.fallbackCandidates.length, 1);
  assert.ok(retrieval.diagnostics.rankingWarnings.some(warning => warning.includes("wrong_frequency_fallback")));
  assert.ok(retrieval.fallbackCandidates[0].ranking.reasonCodes.includes("frequency_mismatch_fallback"));
});

test("broad renewable queries keep several options in the top ranks and stay deterministic", () => {
  const intent = interpretQueryWithRules("Brazil renewable energy production");
  const input = {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [
      buildRetrieval({
        routeFamily: "international",
        geography: { name: "Brazil", code: "BRA", type: "country" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "renewable",
            series_id: "INTL.BRA.REN.A",
            title: "Renewable energy production, Brazil, Annual",
            description: "Official renewable aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "REN" } }
          }),
          buildCandidate({
            candidate_id: "wind",
            series_id: "INTL.BRA.WIND.A",
            title: "Wind energy production, Brazil, Annual",
            description: "Official wind aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "WND" } }
          }),
          buildCandidate({
            candidate_id: "solar",
            series_id: "INTL.BRA.SOLAR.A",
            title: "Solar energy production, Brazil, Annual",
            description: "Official solar aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "SOL" } }
          }),
          buildCandidate({
            candidate_id: "hydro",
            series_id: "INTL.BRA.HYDRO.A",
            title: "Hydroelectric energy production, Brazil, Annual",
            description: "Official hydro aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "HYD" } }
          }),
          buildCandidate({
            candidate_id: "biofuels",
            series_id: "INTL.BRA.BIO.A",
            title: "Biofuels production, Brazil, Annual",
            description: "Official biofuels aggregate.",
            measure: "production",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            unit: "quadrillion btu",
            date_end: "2024",
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "BIO" } }
          })
        ],
        fallbackCandidates: []
      })
    ],
    diagnostics: {}
  };

  const first = rankLocalCandidates(intent, input);
  const second = rankLocalCandidates(intent, input);
  const firstTop10 = first.retrievals[0].rankedCandidates.slice(0, 10).map(candidate => candidate.candidate_id);
  const secondTop10 = second.retrievals[0].rankedCandidates.slice(0, 10).map(candidate => candidate.candidate_id);

  assert.deepEqual(firstTop10, secondTop10);
  assert.ok(new Set(firstTop10.slice(0, 5)).size >= 3);
});

test("requested-date coverage and currentness outrank stale non-covering records", () => {
  const intent = {
    ...interpretQueryWithRules("Texas annual total energy consumption"),
    requestedPeriod: "2024"
  };
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "seds",
    retrievals: [
      buildRetrieval({
        routeFamily: "seds",
        geography: { name: "Texas", code: "TX", type: "state" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [],
        fallbackCandidates: [
          buildCandidate({
            candidate_id: "current-hit",
            series_id: "SEDS.TX.TEC.A",
            title: "Total energy consumption, Texas, Annual",
            description: "Current series that covers the requested period.",
            measure: "value",
            geography: { name: "Texas", code: "TX", type: "state" },
            unit: "quadrillion btu",
            is_active: true,
            date_start: "2010",
            date_end: "2024",
            selector: { route: "/seds", measure: "value", frequency: "annual", facets: { stateId: "TX", seriesId: "TEC" } }
          }),
          buildCandidate({
            candidate_id: "stale-miss",
            series_id: "SEDS.TX.TEC.OLD",
            title: "Total energy consumption, Texas, Annual",
            description: "Older series that does not cover the requested period as well.",
            measure: "value",
            geography: { name: "Texas", code: "TX", type: "state" },
            unit: "quadrillion btu",
            is_active: false,
            date_start: "1970",
            date_end: "1980",
            selector: { route: "/seds", measure: "value", frequency: "annual", facets: { stateId: "TX", seriesId: "TEC_OLD" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.rankedCandidates[0].candidate_id, "current-hit");
  assert.ok(retrieval.rankedCandidates[0].ranking.reasonCodes.includes("requested_date_covered"));
  assert.ok(retrieval.rankedCandidates[0].ranking.reasonCodes.includes("current_active"));
});

test("the Phase 3 output shape remains compatible with the ranker", async () => {
  const intent = interpretQueryWithRules("Brazil annual petroleum consumption");
  const retrieval = await retrieveLocalCandidates(intent);
  const ranked = rankLocalCandidates(intent, retrieval);
  const top = ranked.retrievals[0].rankedCandidates[0];

  assert.equal(ranked.diagnostics.rankingConfigVersion, RANKING_CONFIG_VERSION);
  assert.equal(ranked.diagnostics.rankingApplied, true);
  assert.ok(top.title.match(/petroleum|consumption/i));
  assert.ok(top.ranking.reasonCodes.length > 0);
});

function buildRetrieval(overrides) {
  return {
    geography: { name: "Unknown", code: "XX", type: "country" },
    concept: { product: "electricity", productBreadth: "specific", productAlternatives: [], activity: "generation" },
    frequency: { value: "annual", requested: "annual", mode: "exact" },
    routeFamily: "international",
    primaryCandidates: [],
    fallbackCandidates: [],
    diagnostics: {},
    ...overrides
  };
}

function buildCandidate(overrides) {
  const selectorRoute = overrides.selector?.route || "/international";
  const inferredRouteFamily = selectorRoute === "/seriesid"
    ? "domestic"
    : selectorRoute === "/seds"
      ? "seds"
      : "international";
  return {
    candidate_id: "candidate",
    series_id: "SERIES.CANDIDATE",
    route_family: inferredRouteFamily,
    selector: {
      route: selectorRoute,
      measure: "value",
      frequency: "annual",
      facets: { countryRegionId: "XX" }
    },
    selector_source: "official_series_metadata",
    title: "Electricity generation, Unknown, Annual",
    description: "Official aggregate.",
    geography: { name: "Unknown", code: "XX", type: "country" },
    concept_type: "other",
    frequency: "annual",
    unit: "btu",
    date_start: "2010",
    date_end: "2024",
    is_active: true,
    retrieval: { pool: "primary", tier: "exact_phrase", reasonCodes: ["route_family_international"] },
    ...overrides
  };
}

function metricTop1(evaluated) {
  return evaluated.filter(item => isRelevant(item.topCandidates[0], item.relevance)).length / evaluated.length;
}

function metricHitRateAt5(evaluated) {
  return evaluated.filter(item => item.topCandidates.slice(0, 5).some(candidate => isRelevant(candidate, item.relevance))).length / evaluated.length;
}

function metricMeanReciprocalRank(evaluated) {
  return evaluated.reduce((sum, item) => sum + reciprocalRank(item.topCandidates, item.relevance), 0) / evaluated.length;
}

function metricNdcgAt10(evaluated) {
  return evaluated.reduce((sum, item) => sum + ndcgAt(item.topCandidates, item.relevance, 10), 0) / evaluated.length;
}

function reciprocalRank(candidates, relevance) {
  const rank = candidates.findIndex(candidate => isRelevant(candidate, relevance));
  return rank === -1 ? 0 : 1 / (rank + 1);
}

function ndcgAt(candidates, relevance, limit) {
  const gains = candidates.slice(0, limit).map(candidate => relevance.get(candidate.candidate_id) || 0);
  const ideal = [...relevance.values()].sort((left, right) => right - left).slice(0, limit);
  return dcg(gains) / (dcg(ideal) || 1);
}

function dcg(values) {
  return values.reduce((sum, value, index) => sum + ((2 ** value) - 1) / Math.log2(index + 2), 0);
}

function isRelevant(candidate, relevance) {
  return Boolean(candidate) && (relevance.get(candidate.candidate_id) || 0) > 0;
}
