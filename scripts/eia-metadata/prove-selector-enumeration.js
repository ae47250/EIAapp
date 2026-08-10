import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const PHASE1A2_FIXTURES = Object.freeze([
  new URL("../../tests/fixtures/eia/metadata/domestic-enumeration-proof.json", import.meta.url),
  new URL("../../tests/fixtures/eia/metadata/international-enumeration-proof.json", import.meta.url),
  new URL("../../tests/fixtures/eia/metadata/seds-enumeration-proof.json", import.meta.url)
]);

const MAX_EIA_PAGE_LENGTH = 5000;

export async function loadPhase1a2Fixtures() {
  return Promise.all(PHASE1A2_FIXTURES.map(async url => ({
    fixture: JSON.parse(await readFile(url, "utf8")),
    fixturePath: fileURLToPath(url)
  })));
}

export function summarizeEnumerationFixture(fixture) {
  const facets = fixture?.evidence?.facet_endpoints || [];
  const scans = fixture?.evidence?.observation_index_scans || [];
  const snapshot = fixture?.evidence?.active_snapshot || {};
  const conditionalProbe = fixture?.evidence?.conditional_facet_probe || {};
  const seriesProbe = fixture?.evidence?.series_id_probe || {};
  const bulk = fixture?.evidence?.bulk_file || {};

  const facetCartesianCount = facets.reduce(
    (product, facet) => product * Number(facet.total_facets || 0),
    facets.length ? 1 : 0
  );
  const scanRows = scans.reduce((sum, scan) => sum + Number(scan.total_rows || 0), 0);
  const roughScanBytes = scans.reduce(
    (sum, scan) => sum + Number(scan.rough_uncompressed_bytes || 0),
    0
  );
  const scanRequests = scans.reduce(
    (sum, scan) => sum + Math.ceil(Number(scan.total_rows || 0) / MAX_EIA_PAGE_LENGTH),
    0
  );

  return {
    route_family: fixture.route_family,
    route: fixture.route,
    api_version: fixture.api_version,
    facet_counts: Object.fromEntries(facets.map(facet => [facet.facet, facet.total_facets])),
    facet_cartesian_count: facetCartesianCount,
    active_snapshot: {
      frequency: snapshot.frequency,
      period: snapshot.period,
      valid_combination_rows: snapshot.total_rows
    },
    cartesian_overgeneration_rows: Math.max(
      0,
      facetCartesianCount - Number(snapshot.total_rows || 0)
    ),
    conditional_facet_filter_reduced_values:
      Number(conditionalProbe.filtered_total_facets) < Number(conditionalProbe.unfiltered_total_facets),
    series_id_round_trip_confirmed:
      seriesProbe.resolved_route === fixture.route &&
      seriesProbe.api_version === fixture.api_version,
    observation_index_scan: {
      rows: scanRows,
      rough_uncompressed_bytes: roughScanBytes,
      minimum_requests_at_5000_rows: scanRequests
    },
    bulk_file: {
      data_set: bulk.data_set,
      compressed_bytes: bulk.content_length_bytes,
      route_native: bulk.route_native
    }
  };
}

export function buildPhase1a2Proof(entries) {
  const routes = entries.map(entry => summarizeEnumerationFixture(entry.fixture || entry));
  const totals = routes.reduce((result, route) => ({
    observation_index_rows: result.observation_index_rows + route.observation_index_scan.rows,
    rough_uncompressed_bytes:
      result.rough_uncompressed_bytes + route.observation_index_scan.rough_uncompressed_bytes,
    minimum_requests_at_5000_rows:
      result.minimum_requests_at_5000_rows + route.observation_index_scan.minimum_requests_at_5000_rows,
    bulk_compressed_bytes: result.bulk_compressed_bytes + route.bulk_file.compressed_bytes
  }), {
    observation_index_rows: 0,
    rough_uncompressed_bytes: 0,
    minimum_requests_at_5000_rows: 0,
    bulk_compressed_bytes: 0
  });

  return {
    phase: "1A.2",
    status: "review_required",
    routes,
    totals,
    findings: {
      independent_facet_values_enumerate_valid_combinations: false,
      current_period_no_value_rows_enumerate_observed_combinations: true,
      current_period_snapshot_is_historically_complete: false,
      representative_series_ids_round_trip_to_v2_routes:
        routes.every(route => route.series_id_round_trip_confirmed),
      bulk_files_are_route_native: routes.every(route => route.bulk_file.route_native),
      full_no_value_observation_scan_recommended: false,
      phase_1b_ready_without_review: false
    },
    review_decisions: [
      "Choose active-only snapshots or comprehensive historical coverage.",
      "Approve family-specific bulk series-ID adapters before using bulk files.",
      "Define whether nullable dataFlagId is an observation annotation or a candidate selector.",
      "Approve download and storage limits before any Phase 1B cache build."
    ]
  };
}

if (isMainModule()) {
  const entries = await loadPhase1a2Fixtures();
  process.stdout.write(`${JSON.stringify(buildPhase1a2Proof(entries), null, 2)}\n`);
}

function isMainModule() {
  return Boolean(process.argv[1]) && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}
