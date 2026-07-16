# EIA metadata Phase 4 deterministic-ranking report

Status: implemented, recalibrated, and locally verified. Review is required before Phase 5. Phase 4 remains disconnected from the public search workflow.

## Scope

Phase 4 ranks the local candidates produced by Phase 3. It does not fetch observations, add semantic reranking, or change the public `/api/search-eia` workflow.

Versioned inputs:

- `data/eia/phase4-ranking-config.json` defines the score scale, weights, tier order, semantic floors, and display limits.
- `data/eia/phase4-routing-config.json` contains the route profiles and shared controlled vocabulary used by interpretation, retrieval, and ranking.
- `data/eia/phase4-concept-taxonomy.json` contains approved concept relationships, contradiction caps, and route/frequency fallback rules.

The taxonomy records the Phase 1B manifest hash. It must be reviewed when the local metadata build or controlled vocabulary is intentionally rebuilt. No live EIA lookup changes the taxonomy during a query.

## Eligibility before scoring

A candidate is removed before scoring when:

1. Its route family does not match the validated route and no configured route fallback applies.
2. Its normalized geography does not exactly match the requested geography.
3. Its selector geography conflicts with the requested geography.
4. Its canonical selector duplicates an earlier candidate.

A wrong-frequency candidate cannot remain primary. It moves to fallback Tier B. The taxonomy also permits an annual SEDS state candidate as Tier B for a monthly or quarterly Domestic state request, but only when such a candidate is supplied to the ranker. Phase 3 does not currently perform that cross-route retrieval.

## Semantic validation

The ranker detects candidate products, scopes, activities, sectors, and units from normalized metadata and the shared controlled vocabulary. It then applies versioned relationships rather than query-specific JavaScript rules.

Examples:

- Wind, solar, hydro, geothermal, and biofuels are related renewable concepts.
- Electricity generation implies the electricity product family.
- A mixed renewable-and-nuclear candidate is too broad for a renewable-only request.
- A generation-and-consumption candidate is contradictory when the requested activity is only generation or only consumption.
- Specialized scopes such as process fuel do not outrank an unqualified total-energy series when that scope was not requested.

The configured minimum compatibility is `0.65` for product or scope and `0.80` for an explicitly requested activity. Candidates below either active floor are excluded before display.

## Tiers

The previous 1000-point primary-pool bonus is removed. Candidates now use an explicit deterministic order:

1. Tier A: exact requested concept and frequency.
2. Tier B: approved frequency or route fallback.
3. Tier C: related concept that clears the semantic floors.

Tier order is applied before score order. Ties use canonical selector identity and candidate ID, so identical inputs and metadata produce identical results.

## Score composition

The relevance score is normalized to `0-100` and retains the points for every component:

| Component | Maximum points |
| --- | ---: |
| Product or scope | 22 |
| Activity | 18 |
| Measure or aggregation role | 15 |
| Fielded lexical IDF | 20 |
| Sector | 5 |
| Frequency | 5 |
| Unit | 5 |
| Requested-date coverage | 4 |
| Currentness | 3 |
| Availability | 3 |

Sector, frequency, unit, date coverage, and similar constraints are active only when the user requested them. Route and geography are hard eligibility facts and do not receive score points a second time.

Lexical scoring uses deterministic fielded inverse-document-frequency weighting over the retrieved candidate set. Title matches receive more credit than measure, normalized field, facet, or description matches. Full BM25F, MMR, neural reranking, and reciprocal-rank fusion remain deferred.

## Aggregates and ambiguity

Verified exact aggregates receive priority. When no sector is requested, an all-sector total ranks ahead of sector-specific totals. Derived measures such as intensity, per-capita values, ratios, and shares do not receive aggregate credit unless requested.

If activity is missing, a weak wording hint may influence ranking at half activity weight, but the result remains Tier C and retains a warning. The hint does not silently become validated user intent.

## Families and display set

Canonical selectors are deduplicated before scoring. Unit and frequency variants with the same semantic title are grouped into one family. The ranker retains all accepted candidates for auditing but recommends at most one representative per family.

The display set contains at most five family representatives with a score of at least `60`. It may contain fewer than five, including zero, rather than padding the result with misleading candidates.

## Verification results

- Full repository suite: 111 tests passed, 0 failed.
- Focused ranking suite: 16 tests passed, 0 failed.
- Query-interpretation suite: 22 tests passed, 0 failed.
- Local-retrieval suite: 13 tests passed, 0 failed.
- Explicit `LOGIN_REQUIRED=off` test: passed.
- Ranking module and test syntax checks: passed.
- Ranking, routing, and taxonomy JSON parsing: passed.
- Production Next.js build: passed.

The ranking tests cover graded Top-1 accuracy, Hit Rate@5, mean reciprocal rank, NDCG@10, tiers, semantic floors, explicit-frequency handling, approved SEDS fallback, geography gating, exact aggregate priority, active score components, fielded IDF, compact EIA dates, family grouping, duplicate removal, score bounds, and stable repeated ranking.

## Manual review

Real Phase 1B metadata produced these representative results:

- `California monthly electricity generation`: `ELEC.GEN.ALL-CA-99.M`, the all-sector/all-fuels monthly net-generation series, ranked first.
- `Texas annual total energy consumption`: `SEDS.TETCB.TX.A`, the unqualified total-energy-consumption series, ranked first.
- `Texas monthly total energy consumption`: all 50 retrieved Domestic electricity-input candidates failed the activity floor; no misleading display result was returned.
- `Brazil renewable energy production`: the renewable-production aggregate ranked first; unit variants were grouped and related renewable concepts remained available.
- `California monthly electricity from moon`: the all-sector/all-fuels monthly net-generation series ranked first in Tier C, with the missing-activity warning retained.

## Remaining limitation

The Phase 1B Domestic cache is Electricity-only. The ranker can score a configured annual SEDS fallback, but Phase 3 intentionally does not retrieve across route families. Phase 4A supplies a separately hard-filtered SEDS fallback pool when the primary Domestic ranking is empty. It must not invent or silently substitute a series.

Observation-level quality is also unavailable in the Phase 1B metadata cache, so Phase 4 quality scoring uses metadata coverage, active status, and availability only.

## Review gate

Approve the versioned taxonomy, A/B/C tiers, normalized score composition, semantic floors, family grouping, and representative results before connecting ranking to a public search path or starting Phase 5.
