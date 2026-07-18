import assert from "node:assert/strict";
import { test } from "node:test";

import {
  RESULT_CERTAINTY_VERSION,
  buildRankedResultCertainty
} from "../lib/sources/eia/result-certainty.js";

test("ranked certainty reports every result dimension independently", () => {
  const intent = { frequencyExplicit: true, structuredIntent: { conceptPairStatus: "validated" } };
  const certainty = buildRankedResultCertainty(intent, {
    ranking: {
      tier: "A",
      reasonCodes: ["frequency_exact", "requested_date_covered"],
      warnings: [],
      components: {
        unit: { maximum: 5, compatibility: 1 },
        requestedDateCoverage: { maximum: 4, compatibility: 1 }
      },
      signals: { semanticFloorPassed: true }
    }
  });

  assert.deepEqual(certainty, {
    schemaVersion: RESULT_CERTAINTY_VERSION,
    intentStatus: "resolved",
    semanticCompatibility: "compatible",
    conceptPairStatus: "validated",
    frequencyRelation: "exact",
    unitRelation: "exact",
    coverageRelation: "covered",
    aggregationRelation: "unknown",
    hierarchyEvidenceStatus: "none",
    presentationClass: "compatible_candidate",
    warnings: ["aggregation_relationship_not_verified"]
  });
});

test("fallback certainty never turns unknown aggregation into exactness", () => {
  const explicitIntent = { frequencyExplicit: true, structuredIntent: { conceptPairStatus: "validated" } };
  const fallback = buildRankedResultCertainty(explicitIntent, {
    ranking: {
      tier: "B",
      reasonCodes: ["frequency_fallback"],
      warnings: ["wrong_frequency_fallback"],
      components: { unit: { maximum: 0 }, requestedDateCoverage: { maximum: 0 } },
      signals: { semanticFloorPassed: true }
    }
  });

  assert.equal(fallback.frequencyRelation, "approved_fallback");
  assert.equal(fallback.presentationClass, "compatible_fallback");
  assert.equal(fallback.aggregationRelation, "unknown");
});
