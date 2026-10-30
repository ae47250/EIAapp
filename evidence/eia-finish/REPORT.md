# FAIL — Job 6 scored run; corrections verified offline

Base: `2968dd7a1ac5089a7e9da3214a6ff17e5d92a63e`. Branch: `codex/eia-finish`. The first commit, `61251fb`, froze owner Set E before implementation. Commit `09bb0b2` preserves the exact implementation used for the paid run and its failures. The subsequent correction and report commits are listed in the delivery message and branch history.

**The original scored result remains FAIL.** No wrong answer was retried. The two exposed application issues were corrected afterward and checked offline; this is not a second live score or an untouched holdout result.

| Mark | Recorded result | Result |
|---|---:|---|
| D ≥53/58 | 50/58 | FAIL |
| D1–D3 both repetitions | 6/6 | PASS |
| C ≥18/20 | 20/20 | PASS |
| I1–I12 ≥21/24 | 24/24 | PASS |
| E all correct | 16/16, including E2 three times | PASS |
| Zero dead ends | 0 | PASS |
| Zero unlabelled wrong data | Original scorer flagged E9; whitespace-only label audit finds 0 | Original flag retained; harness defect documented |
| Final offline suite | 769/769 JavaScript; 446/446 Python | PASS |
| Final build | Next build completed | PASS |
| Requirements R1–R14 | At least one passing offline test each | PASS, with R3 reproduction limitation below |

The paid run used `gpt-6-luna`, explicit reasoning `low`: 107 generation calls (106 scheduled turns plus one bounded validation re-ask), two token-count requests, and 300 EIA retrieval calls. Maximum reserved cost was **$0.439310375**. Usage-based conservative upper cost, including the counting reserve, was **$0.108003**; this is not an invoice. A common 2,048 output-token allowance exceeded five times the previous observed maximum of 400, with all repetitions and low reasoning retained. Prices were checked against the [model documentation](https://developers.openai.com/api/docs/models/gpt-6-luna), [pricing](https://developers.openai.com/api/docs/pricing), and [cache pricing](https://developers.openai.com/api/docs/guides/prompt-caching). Existing keys were loaded in memory; no new keys or credentials were created or copied.

## What failed and what changed afterward

- **D18 twice — application defect.** The model correctly returned World only. The added one-edit geography repair treated the approved product `marine` as a misspelling of Maine, adding an unwanted place. The final shared repair gives exact approved product/activity/sector/frequency terms precedence over fuzzy geography, and leaves cross-domain spelling ties unresolved. It does not disable fuzzy geography. Exact Maine and misspelled Nebraska still resolve. A new regression tests both initial and typed turns and all 37 canonical non-geography vocabulary terms.
- **D4a/D4b twice — missed expectation conflicts.** Historical expectations retained the old unavailability wording; D4a also rejected the optional Indiana button required by the new ordinary-code policy. These should have been reconciled before the paid freeze. They were not; the failures remain recorded.
- **D14 twice — year representation.** The new current-calendar-year interpretation returned 2026–2026; the older frozen form expected 2026–latest. The actual selected monthly data, source observations and presentation passed. A separately versioned expectation now records the closed current-year interpretation under R13. It was frozen after exposure and was not used to replace the original score.
- **R7 display review — incomplete cleanup.** A status description still repeated its series name, and the draft card cleanup omitted the explicit alternative notice and some scope details. The final display helper removes duplicate text and retains sector, frequency and alternative information. The new test failed on `09bb0b2`, then passed after correction.
- **E9 label flag — scorer defect.** The API unit contained two spaces; rendered HTML collapsed them. A separately versioned E scorer normalizes whitespace only. It changed that single flag from true to false across the same 16 saved outcomes, changed no outcome scores, and still rejects a deliberately removed unit label. Original scorer, flags and summary remain untouched.

`post-run-expectation-revision.json` records the only D expectation changes: D4a, D4b and D14. `label-audit-freeze.json` and `label-audit-result.json` record the scorer correction. No pass mark was changed. The historical D scorer remains unchanged; `score-d-finish.js` versions only R6 headline formatting and verifies the actual Excel latest value and period.

## Requirement checks

All named tests are in `tests/eia-finish.test.js`. The final file has 40 passing tests. Against the exact base it has 36 failures and four passes. The baseline archive's 2,976 tracked blobs were verified byte-identical to the base. Two independent harness tests and two existing properties already passed; they are not claimed as corrected application failures. The two post-run regression tests separately failed on the preserved scored implementation before correction.

| Requirement | Test / observable check | Before → final |
|---|---|---|
| R1 | `R1 ignores model choices and derives checked products and coal activities`; live E2/E3 and browser Coal click | Fail → pass |
| R2 | Twelve `R2 initial/reply ordinary code` tests; actionable optional-US history test | Fail → pass |
| R3 | `R3 switches survive initial and reply defaults with broad quoted words`; live E4/E5 and Korea browser workflow | Injected baseline already passed; reported variant not independently reproduced. Final checks pass |
| R4 | `R4 all coverage statuses have distinct honest wording`; versioned missing-data fixtures | Fail → pass |
| R5 | `R5 US petroleum selects a verified national row and returns data`; guarded country-USA fallback test | Fail → pass |
| R6 | `R6 screen uses whole thousands or four significant digits; Excel keeps every full value`; scorer negative controls; both workbook layouts; actual D9 browser/export | Fail → pass; harness checks already pass on base |
| R7 | Card text for D2/D9/Korea, gasoline Metadata fields, status deduplication and retained alternative/scope test | Fail → pass; final browser checks pass |
| R8 | `R8 region Europe/europe/eurpoe` | Fail → pass |
| R9 | Omitted Iowa/transposed Nebraska test; exact-concept/fuzzy-place precedence regression | Fail → pass; D18 exposed regression also fixed |
| R10 | `R10 owner data decisions are recorded verbatim`, SHA-256 of the exact owner section | Fail → pass |
| R11 | All-state initial/reply path; national-total rejection; no-row browser clarification test; live E11/E14 | Fail → pass |
| R12 | Dropped gasoline restoration, nominal retail selector, activity-only reply/history preservation | Fail → pass; live E12 and Excel pass |
| R13 | Initial/reply relative-year validation and date prompts; labelled latest-available retrieval | Fail → pass; live D14 expectation mismatch retained |
| R14 | Unusable reply, model failure, and kind-only country ambiguity tests; actual Korea typed reply | Fail → pass |

The seeded exact-name/exclusion property runs 40 cases with seed **20261030**; it already passed on baseline and continues to pass. Exposed examples are regressions, not untouched challenges. The design follows task-oriented dialogue state tracking and DataTone visible ambiguity, with sources in `DESIGN.md`. No matching public EIA interpretation benchmark exists here; no MultiWOZ score or universal correctness is claimed.

## Set E

| Case | Observed result |
|---|---|
| E1 | Japan petroleum consumption; optional US button — pass |
| E2 ×3 | Coal included in product choices — all pass |
| E3 | Coal → checked coal activity choices — pass |
| E4 | South Korea with North Korea switch — pass |
| E5 | Georgia state with country switch — pass |
| E6 | US petroleum consumption data — pass |
| E7 | Japan and South Korea coal, 2005–latest, switch shown — pass |
| E8 | Europe region members — pass |
| E9 | Ohio and US electricity prices — pass; unit-label whitespace audit noted above |
| E10 | Ohio only for the all-capitals request — pass |
| E11 | All-US-states button reaches state coal generation — pass |
| E12 | Nominal US retail gasoline prices, dollars/gallon, 2025 — pass |
| E13 | Unusable country reply retains natural-gas consumption and offers South/North Korea — pass |
| E14 | Typed All U.S. states reaches all 51 state-level entries including DC — pass |

## R6 refinement specifically

Screen headline, table, chart and tooltip formatting share `formatNumber`: magnitude at least 1,000 uses whole numbers; smaller values use at most four significant digits. Tests include `185034.8743 → 185,035`, `153.3456 → 153.3`, `0.681696 → 0.6817`, `9.6 → 9.6`, zero, negatives, the threshold and small magnitudes. Actual workbook XML verifies unchanged numeric values in both All_Data and Metadata. The actual D9 chart/headline showed **185,035** while its downloaded Excel value remained **185034.87432294185**. Nulls and EIA symbols remain nonnumeric.

## Coverage and scope

R5 used 28 complete-page EIA checks, after five Set E availability probes: **333 new EIA calls total** including the scored run. Requests were sequential with a minimum 500 ms retrieval pace; no new upstream requests were made during offline replay. The R5 research window was 22:31:18–22:41:36 UTC, about 10.3 minutes, below its 90-minute cap.

| US coverage | Before | After |
|---|---:|---:|
| Base mapped / 168 | 66 | 73 |
| Base not checked | 35 | 28 |
| All US mapped / 522 | 257 | 285 |
| All US not checked | 161 | 133 |

Seven base cells and 21 sector cells were added. No non-US coverage status changed, no negative claim was newly created, and existing rows/defaults still win. `us-coverage-result.json` lists every changed cell and every remaining unchecked US cell with its reason. US routes without a place facet remain guarded against state/country use. A country-USA fallback is conditional and labelled; the offline guard test covers it, but no unchecked real cell in this bounded selection had a verified eligible USA fallback to exercise live. Remaining scope uncertainty and `EIA scope note not verified` labels are retained. OB2, OBW and sector 95 remain unresolved and cannot support results or absence claims.

## Files and verification boundaries

- `lookup-geography.js`, `locked-form-evidence.js`, the locked form/reply modules, `interpret-query.js` and `lookup-search.js`: shared place/part evidence, slot preservation, relative years, replayable clarification and bounded retrieval.
- `lookup-list.js`, `lookup-context.js`, and the two new compressed lookup metadata files: metadata-derived choices, honest status wording, checked US mappings and guarded fallback.
- `formatting.js`, `lookup-display.js`, `xlsx.js`, `SelectedSeries.js`, `SelectedComparison.js`: screen formatting, clear scope/alternatives and full-precision, nonduplicated export metadata.
- `AGENTS.md`: exact owner R10 section only.
- `tests/eia-finish.test.js`, three existing test files and separately retained historical fixtures: regressions and owner-required expectation revisions. Historical scorers and records remain.
- New `scripts/eia-lookup/*finish*` and US research scripts: bounded research, frozen-cost evaluation, independent export reader, scorers and offline route replay. No dependency, schema, vocabulary, authentication, environment, Vercel setting or production-model change.

The complete changed-file inventory is in `delivery-inventory.json`. `traces-before.md` records the requested baseline file/line traces for R2/R9/R11/R12/R13/R14; `traces-after.md` maps the final corrections and observed boundaries.

The paid run used actual OpenAI and EIA responses, rendered them in the built local UI, downloaded actual workbooks, and compared D observations with independently fetched official EIA selectors. The final browser replay then used the real local API handlers with exact saved upstream responses: 11 model replays, 58 EIA replays, zero unmatched requests, nine workflows and no browser errors. It is offline verification, not a fresh live-model result. Replaying all 101 recorded initial model responses changed only D18's two erroneous Maine additions.

## Reproduce offline checks

```sh
OPENAI_API_KEY= EIA_API_KEY= npm test
for f in scripts/eia-lookup/*.test.py; do OPENAI_API_KEY= EIA_API_KEY= python3 -B "$f" || exit; done
OPENAI_API_KEY= EIA_API_KEY= npm run build
git diff --check
```

`syntax-checks.json` lists plain-JavaScript syntax checks; the build checks JSX/imports/serverless compilation. For the base comparison, make a separate `git archive 2968dd7` checkout, add only `tests/eia-finish.test.js`, `score-d-finish.js` and `read-finish-export.py`, then run the new tests from that checkout. Do not overwrite a working tree. The final browser replay commands and required local raw-evidence paths are in `scripts/eia-lookup/replay-finish-upstreams.mjs` and `scripts/eia-lookup/verify-finish-browser.mjs`. It uses installed Playwright/Chrome, not a new dependency. Raw responses and browser files are required; absence must stop replay. Do not rerun the paid evaluator without new authorization and a new freeze/budget.

## Audit and delivery limitations

The original scored implementation and failures are committed separately from the final corrections. I missed the D4 and D14 expectation reconciliation before paid testing; the later revision is explicitly post-run. No scores were silently raised, no scorer was weakened to hide a data error, and no fresh independent reviewer/holdout is claimed for Job 6. The final result remains FAIL even though the final offline tests and browser replay pass.

Evidence is retained under `~/Documents/EIAapp-Evidence/20261030/finish/`; the local manifest records hashes. Public copies omit actual credentials. Three diagnostic logs containing local home paths have separately labelled redacted copies; originals remain locally and untracked in the worktree. `redactions.json` records original hashes and locations. The historical run freeze includes their original hashes even though only redacted copies are published; these logs are not execution inputs. Unrelated `docs/eia-interpretation-audit.md` and existing Python cache files remain untouched and untracked. Generated dependencies/build output remain local and are excluded from Git.

Only `codex/eia-finish` is authorized for push. The final delivery message and durable local receipt record its remote SHA, preview URL/state and production verification after pushing. No main update, merge, explicit deployment, promotion or Vercel/environment setting change is authorized or performed. The next useful step is owner review of the preview and the separately versioned expectations before authorizing another scored run.
