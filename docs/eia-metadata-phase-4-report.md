# EIA metadata Phase 4 deterministic-ranking report

Status: implemented and locally verified. Review required before Phase 5. Phase 4 ranking is not connected to the public search workflow.

## Scope

Phase 4 adds deterministic ranking on top of the Phase 3 candidate sets. It does not change retrieval, does not use semantic reranking, and does not connect the ranked output into the public search route yet.

Ranking weights live in the versioned configuration file `data/eia/phase4-ranking-config.json`.

## Ranking behavior

The ranker applies hard eligibility checks before scoring:

1. Route family must match the Phase 3 retrieval family.
2. Geography must match the validated retrieval geography exactly.
3. Wrong-frequency candidates are moved to the fallback pool instead of being scored as primary.
4. Candidates missing key eligibility data are excluded or downgraded with warnings.

After eligibility, the ranker scores candidates using configured weights for:

- route appropriateness;
- activity match;
- product or scope match;
- sector match;
- frequency preference;
- unit match;
- lexical metadata match;
- requested-date coverage when a request period is present;
- aggregation role;
- currentness and availability.

Exact verified aggregates receive the highest priority within the relevant pool. Fallback candidates never outrank primary candidates. Ties resolve deterministically using selector identity and candidate ID.

Ranking outputs retain:

- reason codes;
- warnings;
- score values;
- ranking configuration version;
- stable diagnostics for repeatability review.

## Verification results

- Full repository suite: 98 tests passed, 0 failed.
- Focused ranking suite: 5 tests passed, 0 failed.
- Production Next.js build: passed.
- Syntax checks on the new ranking module and tests: passed.

The focused ranking suite covers:

- top-1 accuracy;
- hit rate at 5;
- mean reciprocal rank;
- NDCG at 10;
- explicit-frequency violation handling;
- requested-date coverage;
- currentness and availability;
- exact aggregate priority;
- stable repeated ranking;
- fallback separation.

## Manual review

Reviewed the top 10 ranked results for representative queries:

- `California monthly electricity generation` ranked real `Net generation` records first.
- `Brazil renewable energy production` surfaced the expected renewable-family series and biofuels in the leading results.
- `Texas monthly total energy consumption` kept annual SEDS results in the fallback pool as intended.

## Review gate

Approve the deterministic weight configuration and ranking behavior before connecting Phase 4 into any public search path or starting Phase 5.
