# FAIL — EIAapp Job 9: frozen suite defect

The comparison was stopped before ON. Four Set I cases have empty expected lookup-row-key lists: **I-I1, I-I3, I-I8, I-I11**. Their supplemental historical selectors omit `countryRegionTypeId=c`; the current checked country rows correctly include it. The merge therefore found no expected row, and the scorer rejected valid country selectors. The smoke run exposed the I-I8 false failure, but the harness incorrectly reported a pass and wrote the freeze.

**This is a process failure.** The offline gate should have rejected empty expected row lists and reconciled historical selectors with the recorded country-type decision. Its passing result does not establish a valid scorer. The freeze was honored: no code, suite, scorer, runner, or tests changed afterward. Further paid/scored work stopped.

Preview: [branch preview](https://eiaappv3-git-codex-eia-measure-ea47243.vercel.app). The automatic preview for evidence commit `6f8df37` is READY; its [immutable URL](https://eiaappv3-2wjk4cui3-ea47243.vercel.app) redirects to the app login page (HTTP 200), and its unauthenticated search API returns the expected 401. Authenticated live search remains untested after the measurement stop. The preview uses the flag's existing **on** default; no Vercel setting or production model was changed.

| Work | Result |
|---|---|
| Start | `codex/eia-fix` confirmed at `23495ba`; created `codex/eia-measure` |
| Validator/switch tests | Passed; baseline failures preserved locally |
| Complete Node suite | 882/882 passed |
| Python tests | All 32 files passed, individually executed |
| Saved-response inventory | 833 distinct responses, 1,027 records; both flags; no code failures; 138 old-schema/non-structured records separately reported |
| Consolidated offline browser replay | 86 cases scheduled/executed per flag; missing responses are “no fixture”; accuracy is untrusted because of the suite defect |
| Build/UI/export | Build passed; offline browser rendering and Excel downloads had no blocking console errors |
| Smoke | Five live cases and their exact-prompt replays executed; the reported harness pass is **invalid** because of the scorer defect |
| ON, ON2, OFF, OFF2 | Not run |
| TERRA, SOL, LUNA-MED, LUNA-HIGH and opposite-flag replays | Not run |
| Spending | **$0.00479675** measured; smoke worst case **$0.076695**; $20 cap respected; zero transport retries |

The three model IDs were all present in the free models endpoint. Smoke call median was 3.114 seconds and nearest-rank p90 was 4.782 seconds. These are latency observations, not a model recommendation.

[Failure record](result.json), [smoke scorecard](SMOKE-scorecard.json), [offline gate](offline-gate.json), [on scorecard](gate-final-6-on-scorecard.json), [off scorecard](gate-final-6-off-scorecard.json), [freeze hashes](freeze.json).

## Changes and tests

- `locked-form-support.js` adds evidence validation using existing names, aliases and ambiguity words, plus the owner's restricted single-edit rule. `lookup-geography.js` enforces the place examples and distinguishes validation from value repair.
- `locked-form-v2.js`, `locked-form-reply-update.js`, and `locked-form-reply.js` check/drop unsupported topic components, sector and explicit frequency. Server-reconstructed field evidence preserves inherited components across replies.
- `lookup-context.js` builds sector choices and limits frequency choices to the mapped rows. `lookup-search.js` preserves evidence from checked buttons.
- `text-repair.js`, `lookup-ambiguity.js`, `locked-form-evidence.js`, and the paths below implement the server-side switch. Names, schemas, vocabulary, metadata and UI components were not changed.
- `tests/golden/eia-suite.json`, the merge/scorer/runner/check scripts, and `package.json` consolidate measurement. Three Job 9 test files cover validation, switch reachability, dialogue execution, case count, exact button sets, missing fixtures, retries, cost bounds, decision rules and latency accounting.
- Eight historical test files received narrowly scoped revisions for the stricter evidence rule or valid evidence in button/export tests. Their originals remain in `historical-tests/`; [every revision and reason is listed](test-revisions.json). Historical measurement runners and sets remain, marked superseded in [the verification inventory](verification-plan.json), and are not invoked by the consolidated test command.

The baseline validator run on `23495ba` had 10 failures out of 17 tests. It includes failing-then-passing initial and typed-reply tests for product, activity, sector and frequency. Existing Job 8b Q5 tests cover place validation and browser resubmission. Job 9 adds the required Arkansas/Ohio/Maine/Indiana/Alabama and natural-gas spelling examples. Both settings retain the validator, explicit buttons, owner defaults and lookup.

Possible effects: previously accepted short typos or unlisted semantic paraphrases can now ask for clarification. The off setting also replaces raw-text outage interpretation with clarification. Production was not tested or changed. `npm ci` reported six dependency audit findings in the existing dependency set; dependency remediation was outside this job.

## Suite sources and content

86 cases: C 10, D 30, E 14, F 8, I 12, Q1 9, Q4 3. D7q and duplicate queries are retained. Each case keeps its original ID behind the set prefix and its recorded dialogue steps.

| Set | Source |
|---|---|
| C | `evidence/eia-coverage/set-c-revision-2.json.gz` |
| D | `evidence/eia-polish/set-d-polish.json.gz`; D6a from `set-d-d6a-revision-2.json.gz`; D8a from Job 8b `set-d-d8a-revision.json` |
| E | `evidence/eia-finish/set-e.json`; existing selector/state policy from `evidence/eia-polish/set-e-policy.json` |
| F | `evidence/eia-job8b/set-f-revision.json` |
| I | `evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz`; supplemental selectors from `evidence/eia-finish/independent-data-revision.json.gz` |
| Q1 | `evidence/eia-job8/q1-freeze-revision-2.json` |
| Q4 | `evidence/eia-job8b/q4-freeze.json` |

Nulls remain unscored: places 8; product 9; activity 11; sector 83; frequency 33; years 44; question 23; buttons 63; lookup row keys 50. Partial button requirements remain separately recorded; no missing exact button set was invented.

The ordered content change is the natural-gasoline screen/lookup requirement and its exclusion from every joint total and flag decision. Other operations are normalization: prefixed IDs; recorded steps; one case per source entry instead of historical repetitions; row-key translation from existing selectors; the already versioned D6a/D8a replacements. The supplemental Set I row-key translation is defective as described above; it was not repaired after the freeze.

**Natural gasoline:** both offline settings asked a product question but lacked the required cannot-look-up notice, so both fail that separate line. No paid natural-gasoline measurement was run.

## On/off differences and deletion inventory

No scored paired runs exist; therefore there is no measured noise floor or valid model ranking. [The offline per-case differences](gate-final-6-differences.json) and [their causes](offline-difference-causes.json) are preserved. Offline fixtures with changed prompt dates or reply parents do not test the model's reading. No scored divergence/live-fallback table can be reported.

| Offline case | Difference caused by switching repairs off |
|---|---|
| D-D4b | No country/state reference selection from the typed reply |
| D-D6a | Extra United States suggestion; selected states agree |
| E-E13 | Different handling of the ambiguous Korea reference |
| E-E14 | No typed all-states expansion |
| F-F4 | Model-selected Namibia accepted instead of tied-spelling clarification |
| F-F6, I-I4, Q1-Q1-gas-prices-ohio | Place omitted by the model is no longer injected |
| Q1-Q1-national-gas-prices | Changed validation path needs an unsaved response: “no fixture” |

The owner's incomplete-live-run rule selects **off**, without evidence that off is more accurate. If Job 10 proceeds under that rule, its deletion inventory is [the full file/line list](repair-functions.json), plus `text-repair.js`:

- `lookup-geography.js:109` — exact/one-edit place injection; `:94` — ordinary-word acceptance; `:163` — excluded-place replacement.
- `lookup-ambiguity.js:37` — product near-miss repair; `:102` — ambiguity normalization; `:118` — linking-word normalization.
- `locked-form-evidence.js:8` — restoration from question text. The quoted-words path in `lookup-list.js:36` stays.
- `locked-form-v2.js:59` — initial state-group reset; `:180` — raw-text outage fallback.
- `locked-form-reply-update.js:65` — typed kind reference; `:72` — typed all-states expansion.

No hypothesis sentence was contradicted by a valid scored comparison.

## Closure

Implementation commit: `18d25e9060a0eb49a446f4fcbb16fe40a068a863`. Final evidence commits are recorded in Git history. Raw logs remain at `~/Documents/EIAapp-Evidence/20261031/job9/`; the repository contains the suite, scorecards and summaries. Main remains `0d6d312a89aea9112efff559ba8fc969cafb2780`. No merge, pull request, production deployment, Vercel setting change, or force push was performed.

Next necessary decision: authorize a new correction/measurement job. Recommended correction: reconcile the four historical selectors with the recorded country-type rule, reject empty expected row-key lists before freezing, then repeat the offline gate and smoke before scoring. This job's frozen files remain untouched.

Recommendation: **repair off; retain gpt-6-luna / low provisionally; no measured model choice is available.**
