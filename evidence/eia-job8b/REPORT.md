# FAIL — Job 8b

The one complete scored run finished with 77/78 correct outcomes. Q5 and Q4 passed their requested checks, but Q1 failed on **natural gasoline production in Texas**. No post-run code, prompt, scorer or expectation change and no second paid run were made. The failed result is preserved.

| Pass mark | Result |
| --- | --- |
| Set D, at least 53/58 | PASS, 58/58 |
| D1–D3 and D21, both repetitions | PASS |
| Set F, 8/8 | PASS, 8/8 |
| Q1, every query correct | FAIL, 8/9 |
| Q4, every query correct | PASS, 3/3 |
| Zero dead ends / zero unlabelled wrong data | PASS / PASS under the frozen checks |
| Complete offline suite, replay and build | PASS |
| Model, bounded calls and $0.40 ceiling | PASS |

Base: `db12e1cef63aefa391fffdcb2803d3f00f6061dd`, branch `codex/eia-fix`. App/test commit: `b68e74c07dbf4e6603a39f8cc560fb839370d713`. Offline/freeze commit: `25899c08d306b94365e6a6c12c4f3fc755b85a1a`. The subsequent results commit contains evidence only. Frozen code and all 350 recorded file hashes were unchanged after the run. Main was verified at `0d6d312a89aea9112efff559ba8fc969cafb2780` before push; push and preview verification are reported separately after the push.

The shared cause was trusting a valid model geography code without checking that its quote named that place. `lookup-geography.js:17,141` now rejects that association and resolves the words using the checked names, aliases, ambiguity policies and existing conservative spelling rules. `locked-form-v2.js:74` validates the association; its normalization, repair and resubmission paths share the correction. `locked-form-reply-update.js` applies it to reply exclusions and retains independently verified referential replies such as “the country.” Rejected codes cannot contaminate Georgia’s context. Existing collective state choices and documented national defaults remain supported.

No model prompt/schema, geography data, vocabulary, model default, retrieval selector, UI component, auth, dependency or deployment setting changed. Complete multiword spelling reconciliation and approved aliases were needed to preserve already supported requests after removing trust in the model code. Ambiguous spellings can now ask a question instead of silently trusting that code.

| Requirement | Test and outcome |
| --- | --- |
| AL quoted “georgia” must become Georgia state, never Alabama | `tests/eia-job8b.test.js`; baseline fails, final passes; D4 2/2 live passes with GA only |
| Preserve D4a country switch and D7 country context | Same tests and saved replay; live D4a 2/2 uses GEO, D7 2/2 uses GEO+ARM. D4a correctly reports “Not yet in our checked list” for country electricity prices |
| Shared exact-name and approved-alias support | All 307 approved names and 20 aliases checked; contained-name, partial-word, exclusion, repaired-context, fallback and resubmission regressions pass |
| Q4 full unsupported phrase allowed | Frozen `q4-freeze.json` and `score-q4.mjs` check required words with word boundaries and retain every actual unsupported phrase; 3/3 live pass |
| Unsupported measure without activity offers labelled consumption alternative | `lookup-context.js:96` relabels the existing checked choice; offline regression checks activity question, click, data and retained notice. Live ash returned consumption already, so the no-activity branch is verified offline, not independently exercised by this live response |
| Preserve screen/Excel dropped-detail notice | Offline regression plus live ash and reactor alternatives verify the notice and exports. Sulfur correctly remains a place question with its full unsupported phrase; no invented sulfur data |
| Full offline checks before paid run | 842/842 JavaScript tests; all 32 Python test files; build; 126 historical outcomes plus 3 injected Q4 cases; 78 previous-run outcomes |
| One complete scored schedule | 78 unique outcomes, 68 model turns; 71 actual calls including 3 normal validation re-asks; no button-only model calls, no transient retry or repeat run |
| Preserve Python test discovery rule | Approved individual `python3 -B` rule included in `AGENTS.md` |

Baseline targeted checks on unchanged db12e1c: 7 failed, 1 passed (the single Iceland spelling case already worked). Final targeted suite: 13 passed. The additional five checks were added after the initial baseline; they are not claimed to have failed on the base. Both D6a and D8a passed on both live repetitions. “nat gas production in Texas” still returns Texas natural-gas production, unchanged.

The new Q1 failure is a semantic model variation. Luna returned product=null, activity=production and a natural-gas/gasoline clarification. Its shape and quotation checks passed, so the normal validation re-ask did not run. The app rendered a product question, with no series shown. The unchanged Q1 scorer rejects that question for natural gasoline (`score-q1.mjs:32–34`). The saved response had selected petroleum and passed replay. The new response and expected result are retained in `failure-natural-gasoline.json` as an exposed regression for a separately authorized follow-up. All final offline gates passed; this is a replay coverage gap, not a waived known offline failure. It must not be described as universal product correctness.

Expectation changes were frozen before paid calls and are enumerated in `expectation-revisions.json`: Q4 accepts full unsupported phrases and the explicit consumption alternative; D8a changes only the consumption label when unsupported words remain; F4 “Nambia” now asks Namibia/Gambia/Zambia rather than trusting a model-selected code under Q5. Two older offline expectations were revised for these same owner rules, with original files archived. Other scorers and pass marks are unchanged; Q1 checks are byte-identical to the prior runner. All historical runs remain on record. Earlier unsuccessful offline attempts, including the corrected offline F3 button-path harness omission, remain local.

Saved replay used 115 historical model responses plus 71 prior-run responses, with external networking blocked. The model prompt and schema were unchanged. One D4b reply received a corrected parent form without Alabama; its saved replay does not test how the model reads that repaired context. The new live D4b run passed both repetitions. Injected Q4 data in the offline replay is labelled as injected; the scored run used actual EIA calls.

The model was explicitly `gpt-6-luna`, reasoning `low`, maximum 2048 output tokens including reasoning. All 71 responses reported `gpt-6-luna`; the maximum observed output was 429 tokens. Token usage: 486,176 input + 15,871 output. The pre-run maximum was **$0.324102125**, including 136 possible generation calls and the unused $0.000861125 input-count reserve. Conservative usage accounting was **$0.0687075**; adding that unused reserve gives $0.069568625. These are calculations, not a provider billing invoice. No new input-count call was made. Prior-job spending is separate. All 206 EIA calls returned HTTP 200. The run lasted 10:13:26–10:24:47 ET on 2026-10-31. No browser console errors were recorded.

The approach follows dictionary candidate generation followed by contextual entity disambiguation ([NAACL research](https://aclanthology.org/2024.naacl-short.11/)). This EIA form contract uses exact place-set accuracy and false-positive checks against approved metadata; no generic entity-linking benchmark score is claimed. Model/settings/prices were checked against [OpenAI’s Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) and [pricing](https://developers.openai.com/api/docs/pricing). Research references support the method, not the specific outcome.

Checks were run with keys blank where offline:

```sh
OPENAI_API_KEY= EIA_API_KEY= npm test
OPENAI_API_KEY= EIA_API_KEY= npm run build
OPENAI_API_KEY= EIA_API_KEY= node --test tests/eia-job8b.test.js
```

The Python command runs each file and reports the aggregate status:

```python
import glob, os, subprocess, sys
checks = [(p, subprocess.run(['python3', '-B', p], env={**os.environ, 'OPENAI_API_KEY':'', 'EIA_API_KEY':''}).returncode)
          for p in sorted(glob.glob('scripts/eia-lookup/*.test.py'))]
print(checks)
sys.exit(any(code for _, code in checks))
```

`replay-126.mjs`, `replay-78.mjs` and `run-scored.mjs` record the exact browser/model/data execution. Replays require the retained local responses, a built local app on port 3189 and the installed Playwright/Chrome paths. The archived runners intentionally refuse existing output directories: a fresh run requires a reviewed copy using a fresh destination. The paid runner must not be executed again under this one-run authorization. Final logs and summaries are in `checks/`, `live/`, `offline-checks.json` and `result.json`.

Files changed: four app modules listed above; the new Job 8b test plus the two narrowly revised historical tests; `AGENTS.md`; and `evidence/eia-job8b/` expectations, runners, scorers, logs, hashes and report. The app change is local bookkeeping and clarification labelling; it makes no new network call. Imports, syntax, JSON handling and the full build passed. No independent fresh reviewer was commissioned for this bounded follow-up.

Durable authoritative evidence: `~/Documents/EIAapp-Evidence/20261031/job8b/`. The live run has **642 files / 33,417,639 bytes**, including raw model/EIA records, 54 Excel workbooks and 17 screenshots; all are hashed in `live-manifest.json.gz`. Full raw responses and opaque encrypted reasoning remain local. Public summaries, usage, request hashes, failure form and replay reports are gzip copies verified against their sources. Any local-home-path redactions are disclosed in `check-artifacts.json` / `published-artifacts.json`; originals were not changed. No key was copied. Credentials, local configuration, dependencies, build output, caches and unrelated files are excluded.

`remaining-local-files.json` lists all 46 pre-existing untracked files retained outside these commits, including the original audit, old evidence/harness drafts and 33 Python cache files. This task does not claim those unrelated files are remotely backed up. Raw live evidence is durable locally; the public branch contains its compact records and hashes, not all raw bytes.

The bounded Job 8b run and reporting are complete. The all-pass acceptance target is not met because of Q1. Recommendation: keep production unchanged and address this saved natural-gasoline failure in a separately authorized task; do not relax the frozen scorer. Preview-specific authenticated workflows and production were not exercised with additional model calls.
