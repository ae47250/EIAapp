# Implementation checkpoint 28 — WIP, not ready to push

The owner authorized implementation at 18:42:54 UTC on 30 October 2026, with a four-hour stop at 22:42:54 UTC. This checkpoint stops dependent scoring for a frozen-expectation conflict, before spending or pushing. The clock is not silently extended.

## Completed and verified

- Native country codes take priority over same-country regional codes in the research selection. 170 place/frequency defaults across 22 cells changed; the cell list is in native-country-owner-change.json. D1 was re-frozen with BRA/type c in commit 294c8d309991b1bfe4a8b39e70bba53c2787097d.
- Generated 1,788 compact row definitions plus 53 exact original-key overlays, from 621 mapped cells. The original 28-row source file is unchanged. These overlays currently cause compatibility failures described below; they are unfinished work.
- All 32,690 complete saved observation replays pass the app row checker, including 219 documented US-only rows. There is no longer a research-only US bypass. These are replays of live EIA evidence, not new live requests.
- New app checks: 12/12. Independent generator checks: 2/2. New app plus frozen Set D/scorer checks: 108/108. Build passes. Generated gzip catalogue is included under Next's hashed server assets.
- Full offline cycle 1: 623/662. This precedes the two explicitly authorized test adjustments: replace the old 40-row cap with provenance/verification checks, and retain missing observation points with null values rather than dropping them. The suite is NOT passing. No repeated full cycle was spent on known unresolved expectations.
- Active Set D hashes and all 60 earlier frozen records remain intact except the already recorded owner-authorized D1 re-freeze. No scorer was edited.
- No EIA or OpenAI requests in this implementation window; spending $0. No push, deployment, model switch or environment-setting change.

## Required decision before dependent work

The existing 24-case exact data oracle requires legacy defaults, while new Set D freezes different defaults for overlapping meanings. Examples: country coal consumption TST versus MT; Texas electricity consumption from retail-sales versus SEDS. Keeping original rows in a file does not preserve behavior when new generated rows outrank them. Basis text overlays also break the exact old oracle even where the native selector is unchanged. implementation-default-comparison.json records the current selector and legacy alternative per expected entry.

Recommendation pending owner response: retain original eligible defaults where they already cover a request, use generated mappings to fill gaps, and record/re-freeze affected Set D selectors before any paid scoring. Frequency and native-country scope rules must still take priority; no query-specific switching.

A second conflict must be reconciled in the same decision: historical frozen question/absence expectations cannot stay exact where Job 5 explicitly changes coverage and restricts buttons. For example C6's old activity buttons conflict with D8's product-first, mapped-options requirement. Historical results and scorers must stay preserved. Do not silently rewrite their expected meaning or run paid tests against contradictory keys.

## Files and purpose

- generate-coverage.py, generated lookup-coverage.json.gz, lookup-list.js: verified selector definitions and guarded documented US routes.
- coverage-row-replay.mjs, row-replay-checks.json: exercise the actual app selector against saved complete observations.
- lookup-geography.js, lookup-context.js, lookup-search.js: metadata-derived place ambiguity, states/exclusions, coverage choices, checked retrieval and observation statuses.
- locked-form instructions/reply/update/v2, interpret-query.js, eia-intent-payload.js: all-mentioned-field replies, independent year endpoints, typed ambiguity corrections and quote provenance through resubmission.
- lookup-display.js, formatting.js, xlsx.js, SelectedComparison/SelectedSeries/ComparisonChart/RecentObservations/SearchWorkspace: no mixed-unit chart axis; distinguish missing from zero; preserve symbols/precision/units in Excel; plain labels/headlines and one choice list; EIA-only provider wording.
- New app/generator tests and two documented existing-test adjustments; no frozen scorer or answer key changes during implementation.

## Remaining work and boundaries

Resolve expected-default/question conflicts; complete selection and source-scope labels; verify current-year default-frequency fallback; complete generator/native-code and browser checks; full offline suite (two cycles remain under the three-cycle stop); freeze final request hashes and calculate maximum cost before paid calls; execute D/C/I once, independently check latest observations and rendered UI, then assess push gates. No paid evaluation settings or inputs have been newly frozen yet. Browser and scored runs are NOT RUN. No preview was created.

Coverage remains NOT MET: 576 cells are deferred, 537 due to unresolved metadata and 39 due to scope/default reconciliation. The owner's exception permits a preview only if every other pass mark passes. Those marks have not passed.

Durable copy: ~/Documents/EIAapp-Evidence/20261029/coverage/implementation-window/checkpoint-28/. 26 working files and nine logs copied and SHA-256 checked; originals untouched. Public test logs redact only local home/worktree paths. No key files were copied. Unrelated docs/eia-interpretation-audit.md and scripts/eia-lookup/__pycache__/ remain untouched/untracked; dependencies, .next and other ignored generated files stay in place and out of Git.

Reproduce: OPENAI_API_KEY= EIA_API_KEY= npm test -- --test-reporter=tap; OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap tests/eia-coverage-app.test.js tests/eia-score-d.test.js tests/eia-set-d-freeze.test.js; python3 -B scripts/eia-lookup/generate-coverage.test.py; OPENAI_API_KEY= EIA_API_KEY= npm run build. Row replay requires the recorded, hash-verified local EIA archives: node scripts/eia-lookup/coverage-row-replay.mjs.
