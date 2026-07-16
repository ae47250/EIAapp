# EIA metadata Phase 3 local-retrieval report

Status: implemented and locally verified. Review required before Phase 4. Phase 4 ranking is not connected.

## Scope

Phase 3 retrieves deterministic, unranked metadata candidates from the validated Phase 1b gzip indexes. It does not call EIA, retrieve observations, score candidates, use embeddings, or alter the public search workflow.

## Retrieval order

1. Select only the deterministic route family from Phase 2.
2. Require a validated geography and match its local metadata code exactly.
3. Hard-filter an explicit supported frequency.
4. Match exact concept phrases.
5. Expand to approved aliases and broad or ambiguous product alternatives.
6. Expand to all-token matches.
7. If fewer than 20 candidates exist, keep partial-token and trigram matches in a separate fallback pool.
8. Stop after a completed tier reaches 20 candidates and never return more than 50.
9. Deduplicate canonical selectors and sort by selector identity for repeatability.

An explicit frequency that Phase 2 marked as a fallback never enters the primary pool. For example, annual SEDS candidates offered for an explicit monthly request remain clearly labeled fallback candidates.

## Index safety

The loader reads only the selected route-family artifact and keeps at most one family cached per server instance. Before retrieval it verifies:

- the uncompressed artifact hash against `validation-report.json`;
- the parsed record count against both the manifest and validation report;
- the Phase 2 intent manifest hash against the Phase 3 manifest hash.

The output reports build version, manifest and artifact hashes, record count, partial-cache warnings, elapsed time, and explicit confirmation that ranking and semantic reranking were not applied.

## Known scope limit

The Phase 1b manifest is partial. Domestic retrieval currently covers Electricity only. International and SEDS use their complete Phase 1b artifacts. Phase 3 exposes this warning rather than implying comprehensive Domestic coverage.

## Verification results

- Complete repository suite: 93 tests passed, 0 failed.
- Phase 3 focused suite: 12 tests passed, 0 failed, repeated successfully three consecutive times.
- Production Next.js build, TypeScript check, module syntax check, and import check passed.
- Login-off behavior remained covered and passed in the complete suite.
- Cold family loads measured about 1.1 to 1.9 seconds in the local test process.
- Warm retrieval measured about 0.1 to 0.2 seconds.
- The sampled Domestic cold load increased JavaScript heap use by about 110 MiB. Only one family is retained in the module cache so later family loads can release the prior family.

Manual raw-set review confirmed:

- Brazil annual petroleum consumption returned 32 exact primary candidates.
- California monthly electricity generation returned actual monthly `Net generation` series after excluding fuel-quality records that merely mentioned generation.
- Texas annual total energy consumption reached the 50-candidate cap across the approved broad product family.
- Brazil renewable production returned 14 primary renewable or biofuel candidates and separate relevant solar, wind, or hydro fallback candidates; unrelated fossil production was not used to pad the pool.
- Texas monthly total energy consumption returned annual SEDS options only in the fallback pool because Phase 2 had explicitly marked the frequency substitution.

## Review gate

Review raw candidate sets, recall, cold and warm latency, memory behavior, fallback separation, and the 20-to-50 expansion rule before connecting retrieval to the public search workflow or beginning Phase 4.
