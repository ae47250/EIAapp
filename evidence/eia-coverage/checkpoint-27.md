# Coverage and Set D checkpoint — 30 October 2026

**Checkpoint reached; implementation is stopped at the owner gate. Final coverage pass mark is NOT MET.** Set D and score-d.js are frozen before implementation. No live model score is claimed.

## Coverage

| Place kind | Mapped base cells / 168 | Mapped including sectors/qualifiers / 522 |
|---|---:|---:|
| country | 42 / 168 | 77 / 522 |
| World | 42 / 168 | 47 / 522 |
| US | 66 / 168 | 257 / 522 |
| state | 65 / 168 | 240 / 522 |

**Total: 215/672 base cells mapped; 621/2,088 including sectors and separate qualifiers.** Remaining statuses: 659 not in EIA’s catalogue, 146 EIA returns no data, 86 subset only, 576 not checked. All 2,088 frozen cells are retained. These are counts of mapped vocabulary combinations, not percentages of all EIA observations.

Unchecked reasons: 537 unresolved-metadata cases and 39 scope/default-reconciliation cases. [Every unchecked cell, grouped by reason](unchecked-cells-27.json). OB2, OBW and sector 95 remain explicit exceptions and cannot supply results or establish absence. [Per-place, per-route and sector/qualifier counts](checkpoint-27.json).

## Evidence and limits

Census: 242 nodes, 27 branches, 215 leaves: 154 FITS and 61 DOES NOT FIT. AEO (13 releases) and IEO (4 releases) are excluded families. Census metadata calls: 242; facet calls: 1160. [Complete exclusion list with reasons and quotes](excluded-routes-27.json). All 61 exclusions rechecked; no mismatch.

EIA calls: **6,154** total, including 292 in this window; 20,000 estimate threshold / 25,000 cap. Recorded coverage-request peak: 2/second, 2271/hour. Four-worker limiter remained in force. No paid calls.

260/262 retrieval groups completed and audited. Monthly electricity and the single fresh natural-gas-consumption retry completed. Two crude-import final pages remain shorter than the reported totals; those groups stay incomplete. Raw pages, failed attempts and original state remain local, unchanged.

32,690 selected histories pass offline replay of complete live EIA responses, including 219 documented-US research checks. This does not establish current app support. The guarded US selector is unchanged. Seeded 5% negative recheck: 45/45 passed (seed 20261030). Thirty-nine catalogue absences, four data absences and two subset cases were sampled. Some broad probes are truncated; complete catalogue/paginated evidence, not those probes alone, supplies absence proof.

## Set D and findings

[Readable Set D table: queries, steps, understood meanings, series, facets, units, periods and buttons](set-d-table.md). [Frozen JSON and exact observations](set-d.json). [Freeze hashes](set-d-freeze.json). There are 30 cases, 29 later live outcomes × 2 runs, plus one offline activity-null alternative. No unresolved expectation; no live model or browser outcome has been scored.

The three front-page examples now have research mappings: Brazil total energy production; Japan total petroleum-and-other-liquids consumption; US nuclear generation and consumption as separate native series. D3’s Btu values agree in all 45 overlapping years at EIA’s published rounding precision, not as exact unrounded numbers. The displayed consumption label must say so. Bermuda, Greenland and Saint Pierre and Miquelon each return 45 numeric zero coal-production observations, not symbols.

A shared crosswalk error mapped EIA’s domestic South Dakota code to South Sudan. Research now follows the route’s explicit definition; the app is untouched. All-size totals take precedence where verified; an explicit US scope restriction no longer blocks state series. Exact source equivalences permit owner-approved whole natural-gas bases without fuzzy query exceptions. The replay fixture is chunked to avoid Node’s string-size limit, preserving all jobs.

[DESIGN.md](DESIGN.md) records the established correspondence-table, SKOS, EIA/SDMX observation-status, visible-ambiguity, constrained-choice and dialogue-state methods. cyanheads was used only for discovery, checked against EIA; no code copied. No directly applicable public EIA correspondence benchmark was found; no OAEI/MultiWOZ score is claimed.

D8 and the independent year-slot rule are recorded owner amendments. Earlier C6/year-replacement keys and scorers remain unchanged; any later disagreement must be reported. The no-prior-end offline regression verifies 2005–latest. Other app changes, UI/Excel symbol behavior and live scores await implementation go.

## Reproduction and preservation

Run from this checkout, with existing local evidence available and no network needed:
```sh
OPENAI_API_KEY= EIA_API_KEY= npm test
OPENAI_API_KEY= EIA_API_KEY= npm run build
for f in scripts/eia-lookup/coverage*.test.py; do OPENAI_API_KEY= EIA_API_KEY= python3 -B "$f" || exit; done
node --check scripts/eia-lookup/score-d.js
python3 -B scripts/eia-lookup/coverage-nuclear-comparison.py
```
The nuclear command reproduces research evidence and its timestamp; do not stage regenerated frozen evidence. Set D regeneration is deliberately blocked after freeze. Replaying every research row is possible with `OPENAI_API_KEY= EIA_API_KEY= node scripts/eia-lookup/coverage-row-replay.mjs`; it writes a fresh research check record and requires all hash-verified local chunks. Preserve the frozen snapshot first.

Current test/build/hash/secret/copy counts and exact job size are in `research-checks-27.json` and the final local preservation manifest. Authoritative raw evidence and checkpoint copies are under `~/Documents/EIAapp-Evidence/20261029/coverage/`. Raw responses, credentials, dependencies, build output and caches are not committed. Unrelated `docs/eia-interpretation-audit.md` and existing `scripts/eia-lookup/__pycache__/` remain untouched. No push or deployment; production was not contacted or inspected.

Next decision: owner implementation go. Recommendation: keep the implementation gate and final coverage failure visible; do not treat this partial checkpoint as a release approval.
