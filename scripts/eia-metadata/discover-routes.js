import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PHASE1A_FIXTURES = Object.freeze([
  new URL("../../tests/fixtures/eia/metadata/domestic-route.json", import.meta.url),
  new URL("../../tests/fixtures/eia/metadata/international-route.json", import.meta.url),
  new URL("../../tests/fixtures/eia/metadata/seds-route.json", import.meta.url)
]);

export async function loadPhase1aFixtures() {
  return Promise.all(PHASE1A_FIXTURES.map(async url => {
    const fixture = JSON.parse(await readFile(url, "utf8"));
    return { fixture, fixturePath: fileURLToPath(url) };
  }));
}

export function summarizeRouteFixture(fixture) {
  const response = fixture?.response || {};
  const frequencies = Array.isArray(response.frequency) ? response.frequency : [];
  const facets = Array.isArray(response.facets) ? response.facets : [];
  const measures = response.data && typeof response.data === "object" && !Array.isArray(response.data)
    ? Object.keys(response.data)
    : [];

  return {
    route_family: fixture?.route_family || null,
    route: fixture?.route || null,
    api_version: fixture?.api_version || null,
    frequencies: frequencies.map(item => item?.id).filter(Boolean),
    facets: facets.map(item => item?.id).filter(Boolean),
    measures,
    date_start: response.startPeriod ?? null,
    date_end: response.endPeriod ?? null,
    enumerates_valid_series_combinations: hasExplicitSeriesEnumeration(response)
  };
}

export function buildCapabilityReport(entries) {
  const routes = entries.map(entry => summarizeRouteFixture(entry.fixture || entry));
  return {
    phase: "1A",
    route_families: routes.map(route => route.route_family),
    api_versions: [...new Set(routes.map(route => route.api_version).filter(Boolean))],
    routes,
    findings: {
      route_metadata_exposes_frequencies: routes.every(route => route.frequencies.length > 0),
      route_metadata_exposes_facets: routes.every(route => route.facets.length > 0),
      route_metadata_exposes_measures: routes.every(route => route.measures.length > 0),
      route_metadata_exposes_route_coverage: routes.every(route => route.date_start && route.date_end),
      route_metadata_enumerates_valid_series_combinations: routes.every(route => route.enumerates_valid_series_combinations),
      candidate_generation_allowed_from_route_metadata_alone: false
    }
  };
}

function hasExplicitSeriesEnumeration(response) {
  return Array.isArray(response?.series) ||
    Array.isArray(response?.validCombinations) ||
    Array.isArray(response?.facetCombinations);
}

if (isMainModule()) {
  const entries = await loadPhase1aFixtures();
  process.stdout.write(`${JSON.stringify(buildCapabilityReport(entries), null, 2)}\n`);
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}
