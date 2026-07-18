import { readFileSync } from "node:fs";

const approvedFixture = JSON.parse(readFileSync(new URL("../../tests/fixtures/eia/top-five-benchmark.json", import.meta.url), "utf8"));

export const BENCHMARK_VERSION = "hoho7-v1";
export const BENCHMARK_CREATED_AT = "2026-07-17";

export const SEDS_TARGETS = Object.freeze([
  ["Alabama", "AL"], ["Alaska", "AK"], ["Arizona", "AZ"], ["Arkansas", "AR"],
  ["California", "CA"], ["Colorado", "CO"], ["Connecticut", "CT"], ["Delaware", "DE"],
  ["Florida", "FL"], ["Georgia", "GA"], ["Hawaii", "HI"], ["Idaho", "ID"],
  ["Illinois", "IL"], ["Indiana", "IN"], ["Iowa", "IA"], ["Kansas", "KS"],
  ["Kentucky", "KY"], ["Louisiana", "LA"], ["Maine", "ME"], ["Maryland", "MD"],
  ["Massachusetts", "MA"], ["Michigan", "MI"], ["Minnesota", "MN"], ["Mississippi", "MS"],
  ["Missouri", "MO"], ["Montana", "MT"], ["Nebraska", "NE"], ["Nevada", "NV"],
  ["New Hampshire", "NH"], ["New Jersey", "NJ"], ["New Mexico", "NM"], ["New York", "NY"],
  ["North Carolina", "NC"], ["North Dakota", "ND"], ["Ohio", "OH"], ["Oklahoma", "OK"],
  ["Oregon", "OR"], ["Pennsylvania", "PA"], ["Rhode Island", "RI"], ["South Carolina", "SC"],
  ["South Dakota", "SD"], ["Tennessee", "TN"], ["Texas", "TX"], ["Utah", "UT"],
  ["Vermont", "VT"], ["Virginia", "VA"], ["Washington", "WA"], ["West Virginia", "WV"],
  ["Wisconsin", "WI"], ["Wyoming", "WY"], ["District of Columbia", "DC"], ["United States", "USA"]
].map(([name, code]) => Object.freeze({ name, code, type: code === "USA" ? "national" : code === "DC" ? "district" : "state" })));

const EXISTING_CATEGORIES = [
  ["domestic", "electricity", "frequency"], ["seds", "frequency-fallback", "total-energy"],
  ["domestic", "natural-gas", "production"], ["domestic", "natural-gas", "sector"],
  ["domestic", "electricity", "renewable"], ["clarification", "missing-activity"],
  ["clarification", "ambiguous-product"], ["domestic", "natural-gas", "storage"],
  ["international", "petroleum", "consumption"], ["international", "electricity", "frequency-fallback"],
  ["international", "multiple-concept-pairs"], ["international", "multiple-geographies"],
  ["misspelling", "exclusion", "natural-gas"], ["clarification", "unsupported-qualifier", "no-result"]
];

const approvedDevelopment = approvedFixture.cases.map((item, index) => queryRecord({
  id: developmentId(index + 1),
  query: item.query,
  categories: EXISTING_CATEGORIES[index],
  source: "existing-human-reviewed-q01-q14",
  goldStatus: "human-reviewed",
  gold: {
    clarificationRequired: item.expected.clarificationRequired,
    clarificationReasons: item.expected.clarificationReasons || [],
    expectedGeographies: item.expected.groups.map(group => group.geography),
    expectedConceptPairs: item.expected.groups.map(group => ({ product: group.product, activity: group.activity })),
    requiredTopFiveSeriesIds: item.expected.groups.flatMap(group => group.topSeriesIds),
    hierarchy: { relation: "unknown-unless-current-registry-match", preferenceExpected: false }
  }
}));

const addedDevelopmentDefinitions = [
  ["Texas natural gas", ["clarification", "missing-activity", "ambiguous-product"], gold({ clarify: true, geographies: ["TX"], reasons: ["missing_activity"] })],
  ["Texas natural gas production", ["seds", "natural-gas", "production"], gold({ geographies: ["TX"], routes: ["seds"], pairs: [["natural gas", "production"]], frequency: "annual" })],
  ["Texas monthly natural gas", ["clarification", "frequency", "missing-activity"], gold({ clarify: true, geographies: ["TX"], reasons: ["missing_activity"], frequency: "monthly" })],
  ["Texas natural gas excluding production", ["clarification", "exclusion", "missing-activity"], gold({ clarify: true, geographies: ["TX"], exclusions: [["activity", "production"]] })],
  ["Texas coal production and natural gas consumption", ["multiple-concept-pairs", "pair-scope", "domestic"], gold({ geographies: ["TX"], pairs: [["coal", "production"], ["natural gas", "consumption"]] })],
  ["Texas oil and natural gas production", ["multiple-concept-pairs", "shared-activity", "domestic"], gold({ geographies: ["TX"], pairs: [["petroleum", "production"], ["natural gas", "production"]] })],
  ["Texas coal and natural gas production and consumption", ["clarification", "unresolved-pair-scope", "adversarial"], gold({ clarify: true, geographies: ["TX"], forbidOrdinaryRanking: true })],
  ["Califronia natural gas prodction", ["misspelling", "seds", "natural-gas"], gold({ geographies: ["CA"], routes: ["seds"], pairs: [["natural gas", "production"]] })],
  ["Texas total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("TX")],
  ["California total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("CA")],
  ["District of Columbia total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("DC")],
  ["Alaska total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("AK")],
  ["Hawaii total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("HI")],
  ["New York total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("NY")],
  ["Wyoming total energy consumption", ["seds", "hierarchy-eligible", "total-energy"], hierarchyGold("WY")],
  ["United States total energy consumption", ["domestic", "verified-relationship-route-limited", "total-energy"], hierarchyGold("USA")],
  ["Texas renewable energy consumption", ["seds", "hierarchy-component-control", "renewable"], componentGold("TX", "renewable", "RETCB")],
  ["Texas fossil fuel consumption", ["seds", "hierarchy-component-control", "fossil-fuel"], componentGold("TX", "fossil fuels", "FFTCB")],
  ["Texas nuclear energy consumption", ["seds", "hierarchy-component-control", "nuclear"], componentGold("TX", "nuclear", "NUETB")],
  ["Texas electricity net imports", ["domestic", "hierarchy-route-control", "electricity"], gold({ geographies: ["TX"], routes: ["domestic"], hierarchy: { relation: "verified_component_route_limited", preferenceExpected: false } })],
  ["Texas annual total energy consumption", ["seds", "hierarchy-eligible", "frequency"], hierarchyGold("TX")],
  ["SEDS.TETCB.TX.A", ["exact-identifier", "unsupported-qualifier", "clarification"], gold({ clarify: true, forbidOrdinaryRanking: true })],
  ["Brazil petroleum consumption per day", ["international", "petroleum", "unit"], gold({ geographies: ["BRA"], routes: ["international"], pairs: [["petroleum", "consumption"]], unit: "barrels per day" })],
  ["Canada natural gas production", ["international", "natural-gas", "clear"], gold({ geographies: ["CAN"], routes: ["international"], pairs: [["natural gas", "production"]] })],
  ["Mexico petroleum consumption", ["international", "petroleum", "clear"], gold({ geographies: ["MEX"], routes: ["international"], pairs: [["petroleum", "consumption"]] })],
  ["France electricity generation", ["international", "electricity", "clear"], gold({ geographies: ["FRA"], routes: ["international"], pairs: [["electricity", "generation"]] })],
  ["Georgia natural gas production", ["ambiguous-geography", "clarification", "adversarial"], gold({ clarify: true, forbidOrdinaryRanking: true })],
  ["monthly natural gas production", ["clarification", "missing-geography", "frequency"], gold({ clarify: true, reasons: ["missing_geography"], pairs: [["natural gas", "production"]], frequency: "monthly" })],
  ["Texas production", ["clarification", "missing-product"], gold({ clarify: true, geographies: ["TX"], reasons: ["missing_product"] })],
  ["California quarterly electricity from moon rock", ["clarification", "unsupported-qualifier", "no-result"], gold({ clarify: true, geographies: ["CA"], frequency: "quarterly", forbidOrdinaryRanking: true })],
  ["Texas electric power sector electricity consumption", ["domestic", "electricity", "sector"], gold({ geographies: ["TX"], routes: ["domestic"], pairs: [["electricity", "consumption"]], sector: "electric power" })],
  ["Texas natural gas production in billion cubic feet", ["seds", "natural-gas", "unit"], gold({ geographies: ["TX"], routes: ["seds"], pairs: [["natural gas", "production"]], unit: "billion cubic feet" })],
  ["Texas total energy consumption since 2000", ["seds", "date-coverage", "unsupported-qualifier"], gold({ geographies: ["TX"], routes: ["seds"], pairs: [["total energy", "consumption"]], unknownQualifiers: ["since 2000"], hierarchy: { relation: "verified_aggregate", preferenceExpected: true, aggregateSeriesId: "SEDS.TETCB.TX.A" }, humanReviewRequired: true })],
  ["Brazil petroleum consumption excluding production", ["international", "exclusion", "petroleum"], gold({ geographies: ["BRA"], routes: ["international"], pairs: [["petroleum", "consumption"]], exclusions: [["activity", "production"]] })],
  ["Japan and Brazil electricity generation", ["international", "multiple-geographies", "electricity"], gold({ geographies: ["JPN", "BRA"], routes: ["international"], pairs: [["electricity", "generation"]] })],
  ["Texas coal consumption and production", ["domestic", "multiple-concept-pairs", "shared-product"], gold({ geographies: ["TX"], pairs: [["coal", "consumption"], ["coal", "production"]] })]
];

const addedDevelopment = addedDevelopmentDefinitions.map(([query, categories, judgment], index) => queryRecord({
  id: developmentId(index + 15), query, categories, source: "benchmark-authored-eia-pattern", gold: judgment
}));

const internationalHoldout = [
  ["Australia", "AUS", "coal", "production"], ["Argentina", "ARG", "petroleum", "consumption"],
  ["Belgium", "BEL", "electricity", "generation"], ["Chile", "CHL", "renewable", "consumption"],
  ["China", "CHN", "coal", "consumption"], ["Colombia", "COL", "petroleum", "production"],
  ["Denmark", "DNK", "wind", "generation"], ["Egypt", "EGY", "natural gas", "production"],
  ["Finland", "FIN", "nuclear", "generation"], ["India", "IND", "electricity", "consumption"],
  ["Indonesia", "IDN", "coal", "production"], ["Italy", "ITA", "solar", "generation"],
  ["Jordan", "JOR", "electricity", "generation"], ["Norway", "NOR", "petroleum", "production"],
  ["Poland", "POL", "coal", "consumption"], ["Saudi Arabia", "SAU", "petroleum", "production"],
  ["South Africa", "ZAF", "coal", "production"], ["South Korea", "KOR", "electricity", "generation"],
  ["Spain", "ESP", "renewable", "consumption"], ["United Kingdom", "GBR", "natural gas", "consumption"]
];

const domesticHoldout = [
  ["Ohio monthly natural gas production", "OH", "natural gas", "production", "monthly"],
  ["Pennsylvania weekly natural gas storage", "PA", "natural gas", "storage", "weekly"],
  ["Florida monthly electricity generation", "FL", "electricity", "generation", "monthly"],
  ["Oregon monthly wind generation", "OR", "wind", "generation", "monthly"],
  ["Arizona monthly solar generation", "AZ", "solar", "generation", "monthly"],
  ["Michigan residential natural gas consumption", "MI", "natural gas", "consumption", "annual"],
  ["Louisiana natural gas production", "LA", "natural gas", "production", "annual"],
  ["North Dakota petroleum production", "ND", "petroleum", "production", "annual"],
  ["Nevada electricity generation", "NV", "electricity", "generation", "annual"],
  ["Maine renewable electricity generation", "ME", "renewable", "generation", "annual"]
];

const adversarialHoldout = [
  ["Texs natral gas prodction not prices", ["misspelling", "exclusion", "natural-gas"], gold({ geographies: ["TX"], pairs: [["natural gas", "production"]] })],
  ["California oil production excluding natural gas", ["exclusion", "pair-scope"], gold({ geographies: ["CA"], pairs: [["petroleum", "production"]], exclusions: [["product", "natural gas"]] })],
  ["Brazil coal and petroleum consumption", ["international", "shared-activity", "multiple-concept-pairs"], gold({ geographies: ["BRA"], pairs: [["coal", "consumption"], ["petroleum", "consumption"]] })],
  ["New York gas", ["clarification", "ambiguous-product", "missing-activity"], gold({ clarify: true, geographies: ["NY"] })],
  ["Congo electricity generation", ["ambiguous-geography", "clarification"], gold({ clarify: true, forbidOrdinaryRanking: true })],
  ["Texas natural gas production and electricity consumption", ["multiple-concept-pairs", "domestic"], gold({ geographies: ["TX"], pairs: [["natural gas", "production"], ["electricity", "consumption"]] })],
  ["California electricity generation not solar", ["exclusion", "electricity"], gold({ geographies: ["CA"], pairs: [["electricity", "generation"]], exclusions: [["product", "solar"]] })],
  ["monthly electricity generation", ["clarification", "missing-geography"], gold({ clarify: true, pairs: [["electricity", "generation"]], frequency: "monthly" })],
  ["Texas consumption", ["clarification", "missing-product"], gold({ clarify: true, geographies: ["TX"] })],
  ["Brazil energy", ["clarification", "missing-activity", "ambiguous-product"], gold({ clarify: true, geographies: ["BRA"] })],
  ["Mars annual petroleum consumption", ["unsupported-geography", "clarification", "no-result"], gold({ clarify: true, forbidOrdinaryRanking: true })],
  ["Texas quarterly total energy consumption", ["frequency-fallback", "seds", "total-energy"], gold({ geographies: ["TX"], pairs: [["total energy", "consumption"]], frequency: "quarterly", hierarchy: { relation: "verified_aggregate", preferenceExpected: false } })],
  ["United States renewable energy consumption", ["domestic", "hierarchy-route-control"], componentGold("USA", "renewable", "RETCB")],
  ["Germany coal production and consumption excluding exports", ["international", "multiple-concept-pairs", "exclusion"], gold({ geographies: ["DEU"], pairs: [["coal", "production"], ["coal", "consumption"]], exclusions: [["activity", "exports"]] })],
  ["California total component other energy consumption", ["hierarchy-trap", "unsupported-qualifier", "clarification"], gold({ clarify: true, geographies: ["CA"], forbidOrdinaryRanking: true, hierarchy: { relation: "unknown", preferenceExpected: false } })],
  ["Brazil domestic total electricity component", ["cross-route", "hierarchy-trap", "clarification"], gold({ clarify: true, geographies: ["BRA"], forbidOrdinaryRanking: true, hierarchy: { relation: "unknown", preferenceExpected: false } })]
];

export function buildQueryBank() {
  const development = [...approvedDevelopment, ...addedDevelopment];
  const holdout = [];

  for (const target of SEDS_TARGETS) {
    holdout.push(queryRecord({
      id: holdoutId(holdout.length + 1),
      query: `Annual total energy consumption for ${target.name}`,
      categories: [target.code === "USA" ? "domestic" : "seds", "hierarchy-eligible", "total-energy", "holdout"],
      source: "benchmark-authored-seds-template",
      gold: hierarchyGold(target.code)
    }));
  }

  for (const target of SEDS_TARGETS) {
    holdout.push(queryRecord({
      id: holdoutId(holdout.length + 1),
      query: `Annual renewable energy consumption for ${target.name}`,
      categories: [target.code === "USA" ? "domestic" : "seds", "hierarchy-component-control", "renewable", "holdout"],
      source: "benchmark-authored-seds-control-template",
      gold: componentGold(target.code, "renewable", "RETCB")
    }));
  }

  for (const [country, code, product, activity] of internationalHoldout) {
    holdout.push(queryRecord({
      id: holdoutId(holdout.length + 1), query: `${country} annual ${product} ${activity}`,
      categories: ["international", product, activity, "holdout"], source: "benchmark-authored-international-pattern",
      gold: gold({ geographies: [code], routes: ["international"], pairs: [[product, activity]], frequency: "annual" })
    }));
  }

  for (const [query, code, product, activity, frequency] of domesticHoldout) {
    holdout.push(queryRecord({
      id: holdoutId(holdout.length + 1), query,
      categories: ["domestic", product, activity, "holdout"], source: "benchmark-authored-domestic-pattern",
      gold: gold({ geographies: [code], routes: ["domestic"], pairs: [[product, activity]], frequency })
    }));
  }

  for (const [query, categories, judgment] of adversarialHoldout) {
    holdout.push(queryRecord({
      id: holdoutId(holdout.length + 1), query, categories: [...categories, "holdout"],
      source: "benchmark-authored-adversarial-pattern", gold: judgment
    }));
  }

  if (development.length !== 50 || holdout.length !== 150) {
    throw new Error(`Invalid query-bank size: development=${development.length}, holdout=${holdout.length}`);
  }

  return {
    schemaVersion: "1.0.0",
    benchmarkVersion: BENCHMARK_VERSION,
    createdAt: BENCHMARK_CREATED_AT,
    creationSource: "14 existing human-reviewed queries plus benchmark-authored EIA patterns; no private query logs were available",
    privacyReview: "contains no personal information, credentials, or customer free text",
    developmentStatus: "open-diagnostic-set",
    holdoutStatus: "sealed-not-executed",
    counts: { total: 200, development: 50, holdout: 150 },
    queries: [...development, ...holdout]
  };
}

function hierarchyGold(code) {
  if (code === "USA") {
    return gold({
      geographies: [code], routes: ["domestic"], pairs: [["total energy", "consumption"]], frequency: "annual",
      hierarchy: { relation: "verified_aggregate_route_limited", preferenceExpected: false, aggregateSeriesId: "SEDS.TETCB.US.A" }
    });
  }
  return gold({
    geographies: [code], routes: ["seds"], pairs: [["total energy", "consumption"]], frequency: "annual",
    requiredTopOneSeriesIds: [`SEDS.TETCB.${code}.A`],
    hierarchy: { relation: "verified_aggregate", preferenceExpected: true, aggregateSeriesId: `SEDS.TETCB.${code}.A` }
  });
}

function componentGold(code, product, seriesCode) {
  const national = code === "USA";
  return gold({
    geographies: [code], routes: [national ? "domestic" : "seds"], pairs: [[product, "consumption"]], frequency: "annual",
    requiredTopOneSeriesIds: national ? [] : [`SEDS.${seriesCode}.${code}.A`],
    forbiddenTopFiveSeriesIds: national ? [] : [`SEDS.TETCB.${code}.A`],
    hierarchy: { relation: national ? "verified_component_route_limited" : "verified_component", preferenceExpected: false }
  });
}

function gold({
  clarify = false, geographies = [], routes = [], pairs = [], exclusions = [], reasons = [], frequency = null,
  sector = null, unit = null, unknownQualifiers = [], requiredTopOneSeriesIds = [], requiredTopFiveSeriesIds = [],
  forbiddenTopFiveSeriesIds = [], forbidOrdinaryRanking = false, hierarchy = { relation: "unknown", preferenceExpected: false },
  humanReviewRequired = false
} = {}) {
  return {
    expectedClarification: clarify,
    blockingClarificationFields: reasons.map(reason => reason.replace(/^missing_/, "")),
    expectedGeographies: geographies,
    acceptableRoutes: routes,
    expectedConceptPairs: pairs.map(([product, activity]) => ({ product, activity })),
    expectedExclusions: exclusions.map(([type, value]) => ({ type, value })),
    expectedSector: sector,
    expectedFrequency: frequency,
    expectedUnit: unit,
    expectedUnknownQualifiers: unknownQualifiers,
    requiredTopOneSeriesIds,
    requiredTopFiveSeriesIds,
    forbiddenTopFiveSeriesIds,
    forbidOrdinaryRanking,
    expectedSemanticCompatibility: clarify ? "ranking_blocked" : "compatible",
    hierarchy,
    humanReviewRequired
  };
}

function queryRecord({ id, query, categories, source, gold: judgment, goldStatus = "objective-draft" }) {
  return {
    id,
    query,
    partition: id.includes("-D") ? "development" : "holdout",
    categories: [...new Set(categories)],
    source,
    goldStatus,
    gold: normalizeGold(judgment)
  };
}

function normalizeGold(judgment = {}) {
  return {
    expectedClarification: Boolean(judgment.expectedClarification ?? judgment.clarificationRequired),
    blockingClarificationFields: judgment.blockingClarificationFields || [],
    clarificationReasons: judgment.clarificationReasons || [],
    expectedGeographies: [...new Set(judgment.expectedGeographies || [])],
    acceptableRoutes: judgment.acceptableRoutes || [],
    expectedConceptPairs: judgment.expectedConceptPairs || [],
    expectedExclusions: judgment.expectedExclusions || [],
    expectedSector: judgment.expectedSector || null,
    expectedFrequency: judgment.expectedFrequency || null,
    expectedUnit: judgment.expectedUnit || null,
    expectedUnknownQualifiers: judgment.expectedUnknownQualifiers || [],
    acceptableTopOneFamilies: judgment.acceptableTopOneFamilies || [],
    requiredTopOneSeriesIds: judgment.requiredTopOneSeriesIds || [],
    requiredTopFiveSeriesIds: judgment.requiredTopFiveSeriesIds || [],
    permittedTopFiveFamilies: judgment.permittedTopFiveFamilies || [],
    forbiddenTopFiveSeriesIds: judgment.forbiddenTopFiveSeriesIds || [],
    forbidOrdinaryRanking: Boolean(judgment.forbidOrdinaryRanking),
    expectedSemanticCompatibility: judgment.expectedSemanticCompatibility || (judgment.expectedClarification ? "ranking_blocked" : "compatible"),
    hierarchy: judgment.hierarchy || { relation: "unknown", preferenceExpected: false },
    expectedCertaintyWarnings: judgment.expectedCertaintyWarnings || [],
    humanReviewRequired: Boolean(judgment.humanReviewRequired)
  };
}

function developmentId(index) {
  return `H7-D${String(index).padStart(3, "0")}`;
}

function holdoutId(index) {
  return `H7-H${String(index).padStart(3, "0")}`;
}
