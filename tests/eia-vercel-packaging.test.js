import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { test } from "node:test";

import nextConfig from "../next.config.mjs";

const REQUIRED_SEARCH_FILES = [
  "./data/eia/phase4-concept-taxonomy.json",
  "./data/eia/phase4-ranking-config.json",
  "./data/eia/phase4-routing-config.json",
  "./data/eia/hierarchy-ranking-config.json",
  "./data/eia/routing-metadata.json",
  "./data/eia/builds/phase1b/manifest.json",
  "./data/eia/builds/phase1b/validation-report.json",
  "./data/eia/builds/phase1b/aggregation-hierarchy.generated.json",
  "./data/eia/reports/aggregation-hierarchy-shadow.json",
  "./data/eia/reports/aggregation-hierarchy-ranking-shadow.json",
  "./data/eia/builds/phase1b/domestic.jsonl.gz",
  "./data/eia/builds/phase1b/natural-gas.jsonl.gz",
  "./data/eia/builds/phase1b/international.jsonl.gz",
  "./data/eia/builds/phase1b/seds.jsonl.gz"
];

test("Vercel search function traces every runtime candidate-pipeline artifact", async () => {
  const traced = nextConfig.outputFileTracingIncludes?.["/api/search-eia"] || [];

  assert.deepEqual(traced, REQUIRED_SEARCH_FILES);
  await Promise.all(traced.map(path => access(new URL(`../${path.slice(2)}`, import.meta.url))));
});
