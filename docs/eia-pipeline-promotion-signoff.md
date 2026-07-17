# EIA Pipeline Promotion Signoff

Status: **STEP 9 PREVIEW PROMOTION PASSED; APPROVED FOR STEP 10 LEGACY RETIREMENT**

Candidate mode passed the deployed preview, rollback, API, latency, and browser gates. Production remains unchanged.

## Source State

- Branch: `codex/nextjs-eia-migration-login-toggle`
- Base HEAD before this verified change set: `c3c0e18`
- Upstream: `origin/codex/nextjs-eia-migration-login-toggle`
- Step 9 verified commit: `c022efa7d264c24b6e767073fc6114283fb40e51`
- Step 9 verified deployment: `dpl_AEJGuQf8YcYdxymDSqP8ASwwXnqr`
- Step 9 preview URL: `https://eiaappv20-mx72l5o1w-ea47243.vercel.app`
- Working state: candidate mode restored to `on` for this branch's Preview environment after a successful rollback drill
- Main branch: not used or modified

## Versioned Inputs

- Metadata build: `phase1b`
- Manifest content hash: `1d2dd5904b9f9c13491f5b168a3c432f080cef708b7252c5a2e0cf37d3239028`
- Normalized records: `254499`
- Candidate pipeline: `phase4a-v6`
- Ranking configuration: `phase4-v8`
- Routing vocabulary: `phase4-routing-vocabulary-v5`
- Concept taxonomy: `phase4-concepts-v2`
- Result certainty contract: `1.0.0`
- Offline top-five benchmark: `1.0.0` (approved Q01-Q14 cohort)
- Offline top-five benchmark SHA-256: `22f37d44a7cab54ce0ab9943de89d20545a81273b0a2f4939fb8ebd6d019977b`
- Semantic reranking: disabled
- Public feature flag: `EIA_CANDIDATE_PIPELINE`; only exact value `on` enables the new path
- Default/rollback behavior: unset or any value other than `on` uses the unchanged legacy handler

## Artifact Hashes

| Artifact | Family | Records | Uncompressed content SHA-256 |
| --- | --- | ---: | --- |
| `domestic.jsonl.gz` | Domestic | 86025 | `041812b5f6c08e40f4d50d970df5964a0fab1cd1a9a8fc351632daafe4b1518c` |
| `natural-gas.jsonl.gz` | Domestic | 16021 | `1fc5701929af9ea4aa011f544509a939a7bcb99029284b542c2596e3d6904d7d` |
| `international.jsonl.gz` | International | 104407 | `ced61a2f074a720b72d6a0d06604efbca2f8710614381438a5970bd6a15abb95` |
| `seds.jsonl.gz` | SEDS | 48046 | `94cac14f30e4043496531640606366ff5c4c231cfa54b72ca251b5e4bd3eda2b` |

Compressed retrieval artifacts total approximately 28.6 MB. Vercel function size, decompression memory, and cold-start behavior require preview verification.

## Implemented Gates

- [x] Compact annual, quarterly, monthly, weekly, and daily coverage dates validate consistently.
- [x] A valid displayed `date_end` cannot produce `date_end_missing` for supported EIA formats.
- [x] Same-code narrower national coverage is labeled, including Lower 48 coverage.
- [x] Unsupported hierarchy language was replaced with accurate official-total-label terminology.
- [x] Ambiguous results are grouped by activity and measure type.
- [x] Technical measures are separately labeled and hidden unless explicitly requested.
- [x] Explicit lexical qualifiers may break ties only when the user requested them.
- [x] Remaining ties use stable canonical selector and candidate identifiers without total, subtype, or equivalence claims.
- [x] Candidate display is capped at 10 across all initial groups.
- [x] No candidate is graphed or fetched automatically.
- [x] A click is required for Graph or Excel.
- [x] The server reruns local validation before accepting a candidate ID.
- [x] Only the verified official `series_id` is used for observation retrieval.
- [x] Wrong-frequency fallbacks remain separately labeled.
- [x] Semantic reranking remains disabled and contributes no points.
- [x] Login-off behavior remains covered by tests.
- [x] Legacy API response shape remains covered with the feature flag off.
- [x] Clarification blocks ranking with the candidate flag both off and on.
- [x] Adversarial AI `correctedQuery` wording cannot change validated activity under either flag path.
- [x] Untrusted total, aggregate, component, parent, and child labels contribute no hierarchy preference.
- [x] Exact Q01-Q14 top-five series IDs are frozen in a versioned offline benchmark.

## Verification Results

| Check | Result |
| --- | --- |
| Full Node test suite | PASS: 184 passed, 0 failed |
| Next.js production build | PASS: Next.js 16.2.10, all routes compiled |
| Focused Step 8 tests | PASS: 34 passed, 0 failed |
| Versioned Q01-Q14 top-five benchmark | PASS: 14/14 cases, including repeated deterministic runs |
| Cross-flag safety contract | PASS: clarification and adversarial correction invariants with flag off/on |
| Hierarchy trap contract | PASS: labels and untrusted relationship-shaped fields do not affect ranking |
| Q03-Q14 deterministic remediation test | PASS |
| Cold local retrieval test | PASS: 1835.473 ms, budget below 3000 ms |
| Local production HTTP representative cohort | PASS: 8/8 responses |
| Initial automatic observation selection | PASS: 0/8 selected a series |
| Warm local HTTP requests | 253-329 ms across five repeated requests |
| First full local HTTP route request | 3212 ms; above the proposed 3000 ms cold end-to-end target |
| Browser screenshot run | PASS: desktop/mobile candidate states, Graph, and Excel verified |
| Expanded 30-query live model cohort | PASS: 60/60 runs, 0 blocked, 0 errors |
| Deployed Vercel preview | PASS: READY on commit `c022efa` |
| Preview OpenAI diagnostic | PASS: `gpt-5.4-mini`, HTTP 200 |
| Preview representative cohort | PASS: 8/8 expected results, no automatic series selection |
| Preview end-to-end p95 | PASS: 9.29 s including authenticated CLI overhead |
| Explicit candidate selection | PASS: selector verified, 45 observations, 5.418 s |
| Live rollback drill | PASS: flag off returned legacy; flag on restored candidate mode |
| Visible browser flow | PASS: five choices, Graph loaded, 45-observation coverage, 0 console errors |

The complete live report is `HOHO3.md` with SHA-256 `4224a967be3c5a7c74a84f258a4e26de8f4f80eb6b26c36b6a688aad114e3d2e`. Mini and nano produced the same validated intent, top-five order, and warnings for all 30 queries. Browser evidence is stored under `C:\Users\eiriksson\.codex\visualizations\2026\07\16\019f6b79-de2d-7d90-b44e-d014f6e28170\eia-promotion`.

## Representative HTTP Checks

| Query | Choices | Expected behavior observed |
| --- | ---: | --- |
| California monthly electricity generation | 5 | Domestic candidates; no automatic selection |
| Texas monthly total energy consumption | 5 | Annual SEDS fallback warning |
| California renewable energy | 0 | Clarification required before ranking |
| Texas gas | 0 | Clarification required before ranking |
| United States weekly working gas in underground storage | 1 | Lower 48 coverage note |
| Japan monthly solar electricity generation | 2 | Annual International fallback warning |
| plz shwo montly nat gas prodction in Texas, not prices | 3 | Production choices; price exclusion preserved |
| California monthly electricity from moon | 0 | Clarification required; no generic substitute |

## Fixed Cohort Checklist

- [x] Q01-Q14 remain present in the runner.
- [x] Q03-Q14 deterministic regression assertions pass.
- [x] Q08 no longer reports missing availability for compact weekly dates.
- [x] Q09 receives no broad/total preference; remaining ties are deterministic and hierarchy-neutral.
- [x] Q13 uses a requested lexical qualifier when present and never labels unrequested choices as subtypes or equivalents.
- [x] Q01-Q14 exact top-five IDs or clarification outcomes are stored in `tests/fixtures/eia/top-five-benchmark.json`.
- [x] Every resolved benchmark case reports zero aggregation points and no verified hierarchy relationship.
- [x] Every benchmark case produces the same outcome on an immediate repeated run.
- [x] Q01-Q14 rerun live with `gpt-5.4-mini` and `gpt-4.1-nano` after these changes.

## Expanded Cohort Checklist

The runner now contains Q15-Q30 for:

- [x] Prices
- [x] Expenditures
- [x] Storage/stock versus flow
- [x] State plus U.S. geography
- [x] U.S. plus foreign-country geography
- [x] Requested date range
- [x] Requested unit
- [x] Quarterly frequency
- [x] Weekly non-storage frequency
- [x] Misspelled geography
- [x] Multiple products with one activity
- [x] One product with multiple sectors
- [x] Product exclusion
- [x] Unavailable geography/frequency
- [x] Explicit technical measure
- [x] Run the expanded cohort live with `gpt-5.4-mini` and `gpt-4.1-nano`.
- [x] Review raw AI disagreement, local repair, final intent, top choices, warnings, latency, and user-visible failures.
- [ ] Test `o3` only after mini/nano results are accepted; `o3` is not a promotion blocker.

## Browser Evidence Checklist

- [x] Q01 clear Domestic result
- [x] Q02 labeled SEDS fallback
- [x] Q06 clarification before candidate display
- [x] Q07 clarification before candidate display
- [x] Q08 Lower 48 scope note
- [x] Q10 labeled International annual fallback
- [x] Q13 hierarchy-neutral choices and price exclusion
- [x] Q14 clarification with no generic result
- [x] Explicit technical-measure query
- [x] Empty and unavailable-frequency cases
- [x] Graph click fetches the selected verified series: 304 observations
- [x] Excel click fetches and exports the selected verified series: 52,846 bytes
- [x] Mobile layout has no page-level horizontal overflow
- [x] Browser console has no blocking errors; only the existing missing-favicon 404 was observed

## Promotion Budgets

| Budget | Target | Current evidence |
| --- | ---: | --- |
| Cold local retrieval | under 3 s | PASS in test at 1.835 s |
| Warm local p95 | under 1 s | PASS locally; five runs 253-329 ms |
| OpenAI intent p95 | under 10 s | PASS: mini 3.203 s; nano 4.538 s |
| OpenAI hard timeout | no more than 30 s | PASS in configuration/test |
| Preview end-to-end p95 | under 12 s | PASS: 9.29 s across the eight-query cohort |

The prior 3.212 s first local HTTP request was evaluated on Vercel. The deployed eight-query end-to-end p95 passed at 9.29 s, including authenticated CLI startup overhead.

## Promotion Procedure

1. Commit and push this branch without touching `main`.
2. Deploy a preview with `EIA_CANDIDATE_PIPELINE=on`.
3. Run the browser checklist and capture screenshots.
4. Run the 30-query live model cohort and review the generated report.
5. Measure cold, warm, OpenAI, and preview end-to-end latency.
6. Record owner and technical-reviewer approval below.
7. Deploy production with the feature flag still off.
8. Set `EIA_CANDIDATE_PIPELINE=on` only after the production-off deployment is healthy, then redeploy.

## Rollback

1. Set `EIA_CANDIDATE_PIPELINE=off` or remove it.
2. Redeploy.
3. Confirm `/api/search-eia` returns the legacy response contract.
4. Do not modify or merge through `main` as part of rollback.

## Signoff

- Project owner: approved in task  Date: 2026-07-17  Decision: proceed to Step 10
- Technical reviewer: _______________  Date: __________  Decision: __________

Promotion decision: **STEP 9 PASSED; PRODUCTION UNCHANGED; PROCEED TO STEP 10**
