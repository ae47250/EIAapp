import assert from "node:assert/strict";
import { test } from "node:test";

import { interpretQueryWithRules } from "../lib/sources/eia/interpret-query.js";
import { retrieveLocalCandidates } from "../lib/sources/eia/local-retrieval.js";
import {
  RANKING_CONFIG_VERSION,
  RANKING_TAXONOMY_VERSION,
  rankLocalCandidates
} from "../lib/sources/eia/local-ranking.js";

test("deterministic ranking meets the graded baseline metrics on representative cases", () => {
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
            frequency: "monthly",
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
            frequency: "monthly",
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
        ["mention-only", 0],
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
      intent: { ...interpretQueryWithRules("Texas annual total energy consumption"), requestedPeriod: "2024" },
      retrieval: buildRetrieval({
        routeFamily: "seds",
        geography: { name: "Texas", code: "TX", type: "state" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "derived-intensity",
            series_id: "SEDS.TX.CARBON.INTENSITY.A",
            title: "Carbon intensity of energy supply (CO2 emissions divided by total energy consumption), Texas",
            description: "Derived formula divided by total energy consumption.",
            measure: "value",
            geography: { name: "Texas", code: "TX", type: "state" },
            unit: "metric tons per billion btu",
            date_start: "2010",
            date_end: "2024",
            selector: {
              route: "/seds",
              measure: "value",
              frequency: "annual",
              facets: { stateId: "TX", seriesId: "CDTCR" }
            }
          }),
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
        ],
        fallbackCandidates: []
      }),
      relevance: new Map([
        ["derived-intensity", 0],
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

  assert.equal(metricTop1(evaluated), 1, evaluated.map(item => item.topCandidates[0]?.candidate_id).join(","));
  assert.equal(metricHitRateAt5(evaluated), 1);
  assert.equal(metricMeanReciprocalRank(evaluated), 1);
  const ndcgAt10 = metricNdcgAt10(evaluated);
  assert.ok(ndcgAt10 >= 0.99, `NDCG@10=${ndcgAt10}; orders=${evaluated.map(item => item.topCandidates.map(candidate => candidate.candidate_id).join(">"))}`);
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

test("selector geography mismatches are excluded before scoring", () => {
  const intent = interpretQueryWithRules("Brazil renewable energy production");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [
      buildRetrieval({
        routeFamily: "international",
        geography: { name: "Brazil", code: "BRA", type: "country" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "regional-selector",
            title: "Renewable energy production, Brazil, Annual",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "WP13", productId: "REN" } }
          })
        ],
        fallbackCandidates: []
      })
    ],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.rankedCandidates.length, 0);
  assert.ok(retrieval.diagnostics.rankingWarnings.some(warning => warning.includes("selector_geography_mismatch")));
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

test("hierarchy-like labels receive no aggregation points or verified relationship claims", () => {
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
        primaryCandidates: [
          buildCandidate({
            candidate_id: "sector-total",
            series_id: "SEDS.TX.TRANSPORT.A",
            title: "Total energy consumption in the transportation sector, Texas",
            geography: { name: "Texas", code: "TX", type: "state" },
            selector: { route: "/seds", measure: "value", frequency: "annual", facets: { stateId: "TX", seriesId: "TEACB" } }
          }),
          buildCandidate({
            candidate_id: "derived-total",
            series_id: "SEDS.TX.INTENSITY.A",
            title: "Carbon intensity of energy supply (CO2 emissions divided by total energy consumption), Texas",
            geography: { name: "Texas", code: "TX", type: "state" },
            selector: { route: "/seds", measure: "value", frequency: "annual", facets: { stateId: "TX", seriesId: "CDTCR" } }
          }),
          buildCandidate({
            candidate_id: "unqualified-total",
            series_id: "SEDS.TX.TOTAL.A",
            title: "Total energy consumption, Texas",
            geography: { name: "Texas", code: "TX", type: "state" },
            selector: { route: "/seds", measure: "value", frequency: "annual", facets: { stateId: "TX", seriesId: "TETCB" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.diagnostics.hierarchyEvidenceStatus, "none");
  assert.equal(retrieval.diagnostics.verifiedHierarchyRelationshipCount, 0);
  assert.equal(retrieval.diagnostics.hierarchyPreferenceApplied, false);
  for (const candidate of retrieval.rankedCandidates) {
    assert.equal(candidate.ranking.components.measureOrAggregation.maximum, 0);
    assert.equal(candidate.ranking.components.measureOrAggregation.points, 0);
    assert.ok(candidate.ranking.reasonCodes.includes("aggregation_relation_unknown_no_verified_hierarchy"));
    assert.ok(!candidate.ranking.reasonCodes.some(reason => /official_(total|aggregate)|aggregate_metadata|equivalent_semantic/.test(reason)));
  }
});

test("unresolved qualifiers block ranking instead of inventing an activity", async () => {
  const intent = interpretQueryWithRules("California monthly electricity from moon");
  const retrieval = await retrieveLocalCandidates(intent);
  const ranked = rankLocalCandidates(intent, retrieval);

  assert.deepEqual(ranked.retrievals[0].diagnostics.blockedByUnresolvedQualifiers, ["moon"]);
  assert.equal(ranked.retrievals[0].primaryCandidates.length, 0);
  assert.equal(ranked.retrievals[0].fallbackCandidates.length, 0);
  assert.equal(ranked.retrievals[0].displayCandidates.length, 0);
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

test("assigns exact, approved-fallback, and related candidates to tiers A, B, and C", () => {
  const intent = interpretQueryWithRules("Brazil annual renewable energy production");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [
      buildRetrieval({
        routeFamily: "international",
        geography: { name: "Brazil", code: "BRA", type: "country" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "exact",
            title: "Renewable energy production, Brazil, Annual",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "REN" } }
          }),
          buildCandidate({
            candidate_id: "frequency-fallback",
            title: "Renewable energy production, Brazil, Monthly",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            frequency: "monthly",
            selector: { route: "/international", measure: "value", frequency: "monthly", facets: { countryRegionId: "BRA", productId: "REN-M" } }
          }),
          buildCandidate({
            candidate_id: "related",
            title: "Wind energy production, Brazil, Annual",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "WND" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  assert.deepEqual(ranked.retrievals[0].rankedCandidates.map(candidate => [candidate.candidate_id, candidate.ranking.tier]), [
    ["exact", "A"],
    ["frequency-fallback", "B"],
    ["related", "C"]
  ]);
  assert.deepEqual(ranked.retrievals[0].primaryCandidates.map(candidate => candidate.candidate_id), ["exact"]);
});

test("semantic floors reject mixed or contradictory concepts before display", () => {
  const intent = interpretQueryWithRules("Brazil annual renewable energy production");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [
      buildRetrieval({
        routeFamily: "international",
        geography: { name: "Brazil", code: "BRA", type: "country" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "renewable-only",
            title: "Renewable energy production, Brazil, Annual",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "REN" } }
          }),
          buildCandidate({
            candidate_id: "mixed-nuclear-renewable",
            title: "Nuclear and renewable energy production, Brazil, Annual",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "NUC-REN" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.deepEqual(retrieval.rankedCandidates.map(candidate => candidate.candidate_id), ["renewable-only"]);
  assert.deepEqual(retrieval.displayCandidates.map(candidate => candidate.candidate_id), ["renewable-only"]);
  assert.ok(retrieval.excludedCandidates.some(candidate =>
    candidate.candidateId === "mixed-nuclear-renewable" && candidate.reasonCodes.includes("product_or_scope_semantic_floor_failed")
  ));
});

test("an activity contradiction fails the activity floor even when query words appear in the title", () => {
  const intent = interpretQueryWithRules("California monthly electricity generation");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "domestic",
    retrievals: [buildRetrieval({
      routeFamily: "domestic",
      geography: { name: "California", code: "CA", type: "state" },
      frequency: { value: "monthly", requested: "monthly", mode: "exact" },
      primaryCandidates: [buildCandidate({
        candidate_id: "mixed-generation-consumption",
        title: "Electricity net generation and consumption, California, Monthly",
        geography: { name: "California", code: "CA", type: "state" },
        frequency: "monthly",
        selector: { route: "/seriesid", measure: "value", frequency: "monthly", facets: { series_id: "ELEC.CA.MIXED.M" } }
      })]
    })],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.rankedCandidates.length, 0);
  assert.ok(retrieval.excludedCandidates.some(candidate =>
    candidate.candidateId === "mixed-generation-consumption" && candidate.reasonCodes.includes("activity_semantic_floor_failed")
  ));
});

test("allows only the configured annual SEDS fallback for a nonannual state request", () => {
  const intent = interpretQueryWithRules("Texas monthly total energy consumption");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "domestic",
    retrievals: [
      buildRetrieval({
        routeFamily: "domestic",
        geography: { name: "Texas", code: "TX", type: "state" },
        frequency: { value: "monthly", requested: "monthly", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "approved-seds",
            title: "Total energy consumption, Texas, Annual",
            geography: { name: "Texas", code: "TX", type: "state" },
            frequency: "annual",
            selector: { route: "/seds", measure: "value", frequency: "annual", facets: { stateId: "TX", seriesId: "TETCB" } }
          }),
          buildCandidate({
            candidate_id: "unapproved-international",
            title: "Total energy consumption, Texas, Monthly",
            geography: { name: "Texas", code: "TX", type: "state" },
            frequency: "monthly",
            selector: { route: "/international", measure: "value", frequency: "monthly", facets: { countryRegionId: "TX", productId: "TOTAL" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.deepEqual(retrieval.rankedCandidates.map(candidate => candidate.candidate_id), ["approved-seds"]);
  assert.equal(retrieval.rankedCandidates[0].ranking.tier, "B");
  assert.equal(retrieval.rankedCandidates[0].ranking.signals.approvedFallback, "seds_annual_state_fallback");
  assert.ok(retrieval.excludedCandidates.some(candidate => candidate.candidateId === "unapproved-international"));
});

test("scores only requested constraints and exposes a reproducible 0-100 composition", () => {
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
            candidate_id: "all-sectors",
            title: "Net generation, California, all sectors, all fuels, Monthly",
            measure: "net generation",
            geography: { name: "California", code: "CA", type: "state" },
            frequency: "monthly",
            selector: { route: "/seriesid", measure: "net generation", frequency: "monthly", facets: { series_id: "ELEC.GEN.ALL-CA-99.M" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  const top = ranked.retrievals[0].rankedCandidates[0];
  const components = top.ranking.components;
  const points = Object.values(components).reduce((sum, value) => sum + value.points, 0);
  const maximum = Object.values(components).reduce((sum, value) => sum + value.maximum, 0);
  assert.equal(components.frequency.maximum, 5);
  assert.equal(components.sector.maximum, 0);
  assert.equal(components.unit.maximum, 0);
  assert.equal(top.ranking.score, Math.round((points / maximum) * 1000) / 10);
  assert.ok(top.ranking.score >= 0 && top.ranking.score <= 100);
  assert.equal(ranked.diagnostics.rankingTaxonomyVersion, RANKING_TAXONOMY_VERSION);
  assert.equal(ranked.diagnostics.rankingConfigVersion, RANKING_CONFIG_VERSION);
});

test("fielded IDF gives title matches more credit than normalized-field-only matches", () => {
  const intent = interpretQueryWithRules("Brazil annual petroleum consumption");
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [
      buildRetrieval({
        routeFamily: "international",
        geography: { name: "Brazil", code: "BRA", type: "country" },
        frequency: { value: "annual", requested: "annual", mode: "exact" },
        primaryCandidates: [
          buildCandidate({
            candidate_id: "title-match",
            title: "Petroleum consumption, Brazil, Annual",
            product_or_scope: "petroleum",
            activity: "consumption",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "PET-TITLE" } }
          }),
          buildCandidate({
            candidate_id: "normalized-fields-only",
            title: "Official balance, Brazil, Annual",
            product_or_scope: "petroleum",
            activity: "consumption",
            geography: { name: "Brazil", code: "BRA", type: "country" },
            selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "PET-FIELDS" } }
          })
        ]
      })
    ],
    diagnostics: {}
  });

  const [first, second] = ranked.retrievals[0].rankedCandidates;
  assert.equal(first.candidate_id, "title-match");
  assert.ok(first.ranking.components.fieldedLexical.points > second.ranking.components.fieldedLexical.points);
});

test("groups unit variants into one display family and can return fewer than five results", () => {
  const intent = interpretQueryWithRules("Brazil annual renewable energy production");
  const variants = [
    ["qbtu", "quadrillion btu", "REN-QBTU"],
    ["tj", "terajoules", "REN-TJ"]
  ].map(([candidate_id, unit, productId]) => buildCandidate({
    candidate_id,
    title: "Renewable energy production, Brazil, Annual",
    unit,
    geography: { name: "Brazil", code: "BRA", type: "country" },
    selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId } }
  }));
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [buildRetrieval({
      routeFamily: "international",
      geography: { name: "Brazil", code: "BRA", type: "country" },
      frequency: { value: "annual", requested: "annual", mode: "exact" },
      primaryCandidates: variants
    })],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.rankedCandidates.length, 2);
  assert.equal(retrieval.candidateFamilies.length, 1);
  assert.equal(retrieval.candidateFamilies[0].variantCount, 2);
  assert.equal(retrieval.displayCandidates.length, 1);
});

test("parses compact EIA year-month coverage and removes duplicate selectors deterministically", () => {
  const intent = { ...interpretQueryWithRules("Brazil annual petroleum consumption"), requestedPeriod: "2024" };
  const candidate = buildCandidate({
    candidate_id: "compact-date",
    title: "Petroleum consumption, Brazil, Annual",
    geography: { name: "Brazil", code: "BRA", type: "country" },
    date_start: "201001",
    date_end: "202412",
    selector: { route: "/international", measure: "value", frequency: "annual", facets: { countryRegionId: "BRA", productId: "PET" } }
  });
  const ranked = rankLocalCandidates(intent, {
    schemaVersion: "1.0.0",
    routeFamily: "international",
    retrievals: [buildRetrieval({
      routeFamily: "international",
      geography: { name: "Brazil", code: "BRA", type: "country" },
      frequency: { value: "annual", requested: "annual", mode: "exact" },
      primaryCandidates: [candidate, { ...candidate, candidate_id: "duplicate" }]
    })],
    diagnostics: {}
  });

  const retrieval = ranked.retrievals[0];
  assert.equal(retrieval.rankedCandidates.length, 1);
  assert.ok(retrieval.rankedCandidates[0].ranking.reasonCodes.includes("requested_date_covered"));
  assert.ok(retrieval.excludedCandidates.some(item => item.reasonCodes.includes("duplicate_canonical_selector")));
});

test("accepts official EIA coverage dates for every supported frequency", () => {
  const cases = [
    { frequency: "annual", dateStart: "2010", dateEnd: "2026", requestedPeriod: "2024" },
    { frequency: "quarterly", dateStart: "2010Q1", dateEnd: "2026Q2", requestedPeriod: "2024Q4" },
    { frequency: "monthly", dateStart: "201001", dateEnd: "202606", requestedPeriod: "202405" },
    { frequency: "weekly", dateStart: "20100101", dateEnd: "20260710", requestedPeriod: "2026-07-10" },
    { frequency: "daily", dateStart: "19970107", dateEnd: "20260713", requestedPeriod: "20260713" }
  ];

  for (const item of cases) {
    const intent = { ...interpretQueryWithRules(`United States ${item.frequency} natural gas storage`), requestedPeriod: item.requestedPeriod };
    const candidate = buildCandidate({
      candidate_id: `coverage-${item.frequency}`,
      title: `Natural gas storage, United States, ${item.frequency}`,
      description: "Natural gas working storage.",
      geography: { name: "United States", code: "USA", type: "national" },
      product_or_scope: "natural gas",
      activity: "storage",
      concept_type: "stock",
      frequency: item.frequency,
      date_start: item.dateStart,
      date_end: item.dateEnd,
      selector: { route: "/seriesid", measure: "storage", frequency: item.frequency, facets: { series_id: `NG.STORAGE.${item.frequency}` } }
    });
    const ranked = rankLocalCandidates(intent, {
      schemaVersion: "1.0.0",
      routeFamily: "domestic",
      retrievals: [buildRetrieval({
        routeFamily: "domestic",
        geography: candidate.geography,
        concept: { product: "natural gas", productBreadth: "specific", productAlternatives: [], activity: "storage" },
        frequency: { value: item.frequency, requested: item.frequency, mode: "exact" },
        primaryCandidates: [candidate]
      })],
      diagnostics: {}
    });
    const result = ranked.retrievals[0].rankedCandidates[0];

    assert.ok(result, `${item.frequency} candidate should remain rankable`);
    assert.ok(result.ranking.reasonCodes.includes("availability_present"));
    assert.ok(result.ranking.reasonCodes.includes("requested_date_covered"));
    assert.ok(!result.ranking.warnings.includes("date_end_missing"));
  }
});

function buildRetrieval(overrides) {
  return {
    geography: { name: "Unknown", code: "XX", type: "country" },
    concept: { product: null, productBreadth: "specific", productAlternatives: [], activity: null },
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
