# PASS — Set D ×2 on b783401

Authorized new Set D-only run. Tested application commit: `b7834018e49be0f6c505a57e43e304df79213712`, branch `codex/eia-finish`. No application, metadata, scorer or existing expectation file changed. The earlier FAIL run and its 50/58 score remain unchanged in `evidence/eia-finish/live/`.

| Mark | Result |
|---|---|
| Set D at least 53/58 | **57/58 — PASS** |
| D1–D3 both repetitions | **6/6 — PASS** |
| Zero dead ends | **0 — PASS** |
| Zero unlabelled wrong data | **0 — PASS** |
| Complete scheduled run | **58/58 outcomes — PASS** |
| Model / reasoning | **gpt-6-luna / explicit low — PASS** |
| Cost below $0.10 | **$0.04493475 conservative usage upper bound — PASS** |
| Browser errors | **0** |

Finished October 30, 2026, 8:37:55 PM EDT. This is a fresh live run with 48 OpenAI generation calls, no validation re-asks, no transient retries, no new token-count calls, and 144 EIA calls. The browser rendered the returned results in the unchanged built local app and downloaded actual Excel files. Official source observations were checked independently against frozen selectors. It was not a new authenticated preview search. Sets C, I and E were not rerun; their earlier results are not new evidence from this run.

## Recorded expectation revisions used

The existing `set-d-finish-revision-5.json.gz` was used without modification. A structural comparison confirmed that only these three cases differ from revision 4:

- **D4a:** unchecked Georgia-country electricity prices use “Not yet in our checked list”; the optional “Did you also mean Indiana?” button is included under the ordinary-word/code ambiguity rule.
- **D4b:** the same status-specific wording; no added Indiana button.
- **D14:** “this year” ends in **2026**, replacing `latest`; selected series and source data requirements are unchanged.

These changes were recorded before this new run. The prior exposed results remain on record. `score-d-finish.js` and all pass marks were unchanged. D7q remains the existing unscored intermediate step, leaving 29 scored outcomes per repetition.

## One retained failure

**D15, repetition 2:** “petroleum consumption ni Burma” retained Burma, petroleum and consumption, but treated `ni` as unsupported and asked “I couldn't use: ni. What should I look up?” instead of returning data. Buttons and free text remained available. This is a scored interpretation/clarification failure, not a dead end or an unlabelled number. No retry, repair, expectation change or exclusion was made. D15 repetition 1 passed.

## Cost and reproducibility

The frozen 2,048-output-token allowance includes reasoning; it was not reduced to fit. Existing measured input bounds and unchanged template hashes were reused. At the verified conservative default cache-write rate of $0.125/M input and $0.50/M output, the 48 scheduled calls reserved **$0.098869**. The runner reserved each request before sending, retained full reservation for unknown usage, and allowed a validation re-ask only from realized savings while retaining the maximum for remaining scheduled calls. Thus the enforced maximum was **$0.10**. The counterfactual maximum if every turn used a full-cost re-ask would have been $0.197738; that spending was not authorized and the guard forbids it. No re-asks were needed. Usage cost is a conservative calculation, not an invoice.

Pricing/settings sources: [Luna model](https://developers.openai.com/api/docs/models/gpt-6-luna), [prompt caching](https://developers.openai.com/api/docs/guides/prompt-caching). `freeze.json.gz` records settings, bounds, code hashes, request hashes, revisions and the pre-call budget. Offline guard checks verified that all scheduled maximum-cost calls fit, an unfunded re-ask is denied, and only measured savings release funds.

The reproducible runner is `run.mjs`; it imports application and scorer code from the tested commit. Syntax check: `node --check evidence/eia-finish/set-d-rerun-20261030/run.mjs`. The existing built app was started locally on port 3189 with `OPENAI_API_KEY= EIA_API_KEY= LOGIN_REQUIRED=off npm run start -- --hostname 127.0.0.1 --port 3189`. The browser helper used the already installed Playwright and Chrome. The runner reads the previously authorized keys in memory from their existing Downloads files. **Do not execute it again without a new authorization, fresh folder and budget freeze.** It refuses to overwrite this run.

All 213 frozen source/harness/expectation hashes remained unchanged after execution. The previous 769 JavaScript tests, 446 Python tests and build apply to the same application code; they were not rerun for this evidence-only change. Run outputs, requests, budget ledger and EIA request records are compressed here. Raw responses, screenshots, workbooks and the full hash manifest remain under `~/Documents/EIAapp-Evidence/20261030/finish/set-d-rerun-20261030/`. They are summarized and hashed rather than added as bulky research files. No credentials were copied. Public evidence was scanned for both actual key values and credential patterns before staging.

Only this new evidence folder is committed. Unrelated audit notes, original private logs and caches remain untouched. The delivery message and local receipt record the evidence commit, remote verification and automatic preview. Main and production are not changed by this task. This PASS is scoped to the authorized Set D repeat; it does not erase the prior failed run or establish universal correctness.
