# B1 bounded execution — in progress

Owner approved the reduced plan and at most three more hours. This window began 2026-10-30 13:12:35 UTC and ends **16:12:35 UTC (12:12:35 p.m. ET)**. Do not extend it. Save partial coverage and report remaining not-checked cells. Four requests share one limiter; starts are at least 0.55 seconds apart, with a 7,900/hour safety guard and the 25,000 total-job cap.

Branch: `codex/eia-coverage`, starting this window at `ba7f23cfcbac7bac44b39d5a8c2e6b36091b359a`. Job base `bbff3bf4edf76935b5700b6ca702fa93071d624e`; local main `0d6d312a89aea9112efff559ba8fc969cafb2780`. No app changes, paid calls, push or deployment. Implementation remains gated until coverage and Set D are completed and the owner gives a separate go.

## Evidence and methods

All native requests, responses, start reservations and terminal call records are in `~/Documents/EIAapp-Evidence/20261029/coverage/retrieval/`. Raw pages are compressed and immutable by call ID; request definitions and response hashes contain no key. The existing EIA key remains in its original Downloads location and is read in memory only. No credentials belong in Git or evidence backups.

`coverage-fetch.py` downloads the approved groups and fully pages them. `coverage-observations.py` joins exact original filter combinations, preserves native place aliases and units, checks duplicates and missing values, and treats EIA flags as observation attributes. `coverage-selection.py` leaves explicit unresolved broader/historical scopes pending. `coverage-row-replay.py` and `.mjs` feed exact saved observations into the unchanged existing row checker. `coverage-table.py` preserves every frozen cell and requires all selected defaults to pass those checks before marking a cell mapped. No negative claim is inferred from a partial fetch.

Commands (network command only within an authorized window):
```sh
python3 -B scripts/eia-lookup/coverage-fetch.py run
python3 -B scripts/eia-lookup/coverage-observations.py
python3 -B scripts/eia-lookup/coverage-observations.py --partial
python3 -B scripts/eia-lookup/coverage-selection.py
python3 -B scripts/eia-lookup/coverage-row-replay.py
OPENAI_API_KEY= EIA_API_KEY= node scripts/eia-lookup/coverage-row-replay.mjs
python3 -B scripts/eia-lookup/coverage-table.py
```

## Known limitations to preserve

- Crude-imports calls 1782 (annual) and 2771 (monthly) return short final pages relative to EIA's advertised totals. Both groups remain incomplete; their pages cannot certify absence or final coverage. See `retrieval-anomalies.json`.
- Parallel-run startup replay counted five already completed, empty pages twice in the state manifest. Actual requests, raw rows and raw response files are unchanged. The source fix and regression pass. Repaired after the downloader stopped at 14:52:50 UTC: the original state was hash-preserved and only those five identical zero-row references were removed. See retrieval-anomalies.json.
- The earlier running download began before the resume-bookkeeping fixes. Subsequent runs use the corrected, tested source; both source versions are archived under `retrieval/programs/`.
- Monthly natural-gas consumption changed its reported total from 106,856 to 107,171 between pages (calls 2773 and 3437–3440). This group remains incomplete; preserved pages cannot certify coverage or absence.
- EIA international flag 5 can accompany a small nonzero numeric download. It is not zero. `international-flag-review.json` records a 1,540,000-row prefix and source calls. Unknown flags and numeric/no-value flag conflicts fail certification.
- The existing app selector requires a separate geography facet. Documented US-only routes lacking one remain unsupported by the unchanged app row checker; no app fix has been made behind the implementation gate.
- `metadata-absence-decision.json` records 706 cells with no eligible native candidate. Owner approved catalogue evidence only with the separate label not in EIA's catalogue, source-code-list citations and a broad-call 5% live re-check. See absence-proof-amendment.json. These cells remain not checked pending gap assessment and verification.
- Scope comparisons still pending include state solar capacity (a broader all-size total is published outside the currently verified API mapping) and crude-only versus crude-plus-condensate reserves. No additional PDF research.
- `docs/eia-interpretation-audit.md` and `scripts/eia-lookup/__pycache__/` are unrelated pre-existing untracked items; preserve and do not stage them.

The full application suite passed 537/537 with keys blank, and the local build passed. These do not certify the unfinished coverage or the user-visible application workflow. Research tests and all frozen hashes must be checked again before the checkpoint commit.

Research unit ranking correction: EIA unitName establishes TJ as terajoules and MTOE as million metric tons of oil equivalent. The former Btu-only test misranked them as physical units. The corrected selector keeps all candidates and prefers conventional physical product units where available, retaining energy-equivalent fallbacks and original labels. See unit-preference-review.json; no app change.

A fresh-attempt replay boundary is now tested: old pages cannot enter a new attempt after an EIA source revision. A guarded local helper can preserve the original state and restart changed-total parts once, only after the downloader stops and with seven minutes remaining. It has not been run while the current downloader is active. See checkpoint-tooling.json; short-page anomalies are not retried by this helper.

## Time-limited closeout

Downloader stopped; exact timing, rate peaks, reservations and resume-state hash are recorded in execution-closeout.json. The partial coverage table retains all frozen cells; unresolved cells remain not checked. No app implementation, paid call, push or deployment. The fresh-attempt helper was not run within this window.
