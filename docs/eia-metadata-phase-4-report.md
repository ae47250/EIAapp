# EIA metadata Phase 4 deterministic-ranking report

Status: implemented, calibrated, and locally verified. Review required before Phase 5. Phase 4 ranking is not connected to the public search workflow.

## Scope

Phase 4 adds deterministic ranking on top of the Phase 3 candidate sets. It does not change retrieval, does not use semantic reranking, and does not connect the ranked output into the public search route yet.

Ranking weights live in the versioned configuration file `data/eia/phase4-ranking-config.json`.

Route profiles and controlled vocabulary live in `data/eia/phase4-routing-config.json`. That file records the Phase 1B manifest hash and is regenerated only when the local EIA metadata cache is intentionally rebuilt.

## Routing cleanup

The route decision now uses route profiles instead of hidden term-specific shortcuts:

1. Country and world-region requests route to International.
2. U.S. state nonannual requests route to Domestic first because SEDS is annual-only.
3. U.S. state annual energy-system requests can route to SEDS.
4. U.S. state electricity-specific requests route to Domestic.

The previous code-level shortcut for state-level `total energy` was removed. `total energy` is now a configured broad product/scope like the other product families.

Products, activities, scopes, sectors, units, frequencies, aliases, and ambiguity groups are now controlled vocabulary in configuration rather than scattered JavaScript constants. The interpreter, router, retriever, and ranker all read the shared config.

## Ranking behavior

The ranker applies hard eligibility checks before scoring:

1. Route family must match the Phase 3 retrieval family.
2. Geography must match the validated retrieval geography exactly.
3. Selector geography must match the validated geography when the selector exposes a geography facet.
4. Wrong-frequency candidates are moved to the fallback pool instead of being scored as primary.
5. Candidates missing key eligibility data are excluded or downgraded with warnings.

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

Broad-product alternatives are fallback suggestions unless they directly match the requested product. Derived metrics such as intensity, ratios, shares, per-capita, and per-dollar series are penalized unless the user asks for that derived metric. If no sector is requested, unqualified totals are preferred over sector-specific totals.

When activity is missing but a weak source hint is present, such as `from`, the hint can guide fallback ranking but does not clear the missing-activity ambiguity. The ranked result keeps a warning explaining that the activity was inferred only for ranking. For example, `California monthly electricity from moon` keeps `activity` missing, treats `from` as a weak generation/source hint, returns no primary candidates, and ranks all-fuels net-generation suggestions first.

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

Reviewed representative routing/retrieval/ranking behavior:

- `California monthly electricity generation` ranked real `Net generation` records first.
- `Brazil renewable energy production` surfaced Brazil renewable aggregate records first, with biofuels and other renewable-family matches as fallback suggestions; regional selectors such as `WP13` are excluded.
- `Texas annual total energy consumption` uses SEDS and ranks `Total energy consumption, Texas` first instead of carbon-intensity or sector-specific series.
- `Texas monthly total energy consumption` now routes to Domestic first and returns only fallback suggestions, instead of silently using annual SEDS fallback as an exact answer.

If Domestic metadata cannot find the requested nonannual state variable, Phase 5 wiring should present ranked fallback/suggestion candidates from local metadata rather than inventing them with AI.

## Review gate

Approve the deterministic weight configuration and ranking behavior before connecting Phase 4 into any public search path or starting Phase 5.
