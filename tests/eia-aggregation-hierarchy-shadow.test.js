import assert from "node:assert/strict";
import { test } from "node:test";

import {
  evaluateRelationshipObservations,
  fetchRelationshipObservations,
  runAggregationHierarchyShadow
} from "../scripts/eia-metadata/run-aggregation-hierarchy-shadow.js";

const relationship = {
  relationshipId: "test:TX",
  templateId: "test-template",
  aggregate: { seriesId: "SEDS.TETCB.TX.A" },
  components: [
    { seriesId: "SEDS.FFTCB.TX.A" },
    { seriesId: "SEDS.NUETB.TX.A" },
    { seriesId: "SEDS.RETCB.TX.A" },
    { seriesId: "SEDS.ELNIB.TX.A" },
    { seriesId: "SEDS.ELISB.TX.A" }
  ],
  compatibility: { routeFamily: "seds", sourceGeographyCode: "TX", geographyCode: "TX" }
};

test("common periods pass within a precision-derived rounding bound", () => {
  const rows = years(2000, 2011).flatMap(period => rowsForPeriod(period, {
    FFTCB: "10",
    NUETB: "20",
    RETCB: "30",
    ELNIB: "-2",
    ELISB: "3",
    TETCB: "62"
  }));
  const result = evaluateRelationshipObservations(relationship, rows);

  assert.equal(result.status, "passed");
  assert.equal(result.commonPeriodCount, 12);
  assert.equal(result.mismatchCount, 0);
  assert.equal(result.maximumAbsoluteDifference, 1);
  assert.equal(result.worstChecks[0].tolerance, 3);
  assert.equal(result.negativeComponentObservationCount, 12);
});

test("formula mismatches block the relationship", () => {
  const rows = years(2000, 2011).flatMap(period => rowsForPeriod(period, {
    FFTCB: "10",
    NUETB: "20",
    RETCB: "30",
    ELNIB: "0",
    ELISB: "0",
    TETCB: period === "2011" ? "70" : "60"
  }));
  const result = evaluateRelationshipObservations(relationship, rows);

  assert.equal(result.status, "blocked");
  assert.equal(result.mismatchCount, 1);
  assert.equal(result.maximumAbsoluteDifference, 10);
});

test("missing series, incomplete periods, and duplicate observations are explicit", () => {
  const rows = rowsForPeriod("2024", {
    FFTCB: "10",
    NUETB: "20",
    RETCB: "30",
    ELNIB: "0",
    TETCB: "60"
  });
  rows.push({ ...rows[0] });
  const result = evaluateRelationshipObservations(relationship, rows);

  assert.equal(result.status, "blocked");
  assert.deepEqual(result.missingSeries, ["ELISB"]);
  assert.equal(result.commonPeriodCount, 0);
  assert.equal(result.incompletePeriodCount, 1);
  assert.deepEqual(result.duplicateObservations, ["FFTCB:2024"]);
});

test("zero aggregates are recorded without dividing contributions", () => {
  const rows = years(2000, 2011).flatMap(period => rowsForPeriod(period, {
    FFTCB: "10",
    NUETB: "0",
    RETCB: "0",
    ELNIB: "-10",
    ELISB: "0",
    TETCB: "0"
  }));
  const result = evaluateRelationshipObservations(relationship, rows);

  assert.equal(result.status, "passed");
  assert.equal(result.zeroAggregatePeriods, 12);
  assert.equal(result.negativeComponentObservationCount, 12);
});

test("bounded fetch sends one six-series request and stores no API key", async () => {
  let requestedUrl;
  const fetched = await fetchRelationshipObservations(relationship, {
    apiKey: "secret-key",
    maximumAttempts: 1,
    fetchImpl: async url => {
      requestedUrl = url;
      return response({ response: { total: "1", data: rowsForPeriod("2024", { TETCB: "1" }) } });
    }
  });

  assert.equal(requestedUrl.searchParams.get("api_key"), "secret-key");
  assert.equal(requestedUrl.searchParams.getAll("facets[seriesId][]").length, 6);
  assert.equal(fetched.request.seriesCodes.length, 6);
  assert.doesNotMatch(JSON.stringify(fetched.request), /secret-key/);
});

test("API failures block activation and are redacted in a reproducible report", async () => {
  const artifact = {
    status: "shadow_ready_inactive",
    artifactHash: "a".repeat(64),
    relationshipHash: "b".repeat(64),
    sourceBuild: { buildVersion: "test", contentHash: "c".repeat(64) },
    relationships: [relationship]
  };
  const report = await runAggregationHierarchyShadow({
    artifact,
    apiKey: "secret-key",
    runAt: "2026-07-17T00:00:00.000Z",
    writeReports: false,
    maximumAttempts: 1,
    fetchImpl: async () => response({ error: "failed" }, 500)
  });

  assert.equal(report.summary.status, "blocked");
  assert.equal(report.summary.activationRecommended, false);
  assert.equal(report.summary.apiFailures, 1);
  assert.doesNotMatch(JSON.stringify(report), /secret-key/);

  const repeated = await runAggregationHierarchyShadow({
    artifact,
    apiKey: "different-secret",
    runAt: "2026-07-18T00:00:00.000Z",
    writeReports: false,
    maximumAttempts: 1,
    fetchImpl: async () => response({ error: "failed" }, 500)
  });
  assert.equal(report.evidenceHash, repeated.evidenceHash);
});

function rowsForPeriod(period, values) {
  return Object.entries(values).map(([seriesId, value]) => ({
    period,
    seriesId,
    stateId: "TX",
    value,
    unit: "Billion Btu"
  }));
}

function years(start, end) {
  return Array.from({ length: end - start + 1 }, (_, index) => String(start + index));
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body)
  };
}
