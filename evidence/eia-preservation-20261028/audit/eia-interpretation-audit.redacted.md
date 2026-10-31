# Interpretation and retrieval Audit

Status: **authorized scope-evidence correction implemented and verified offline**. Final full suite: 621 tests, 620 passed, 0 failed, 1 pre-existing disputed skip; production build passes. See the final authorized-contract section for current scope, independent review, explicit adjudications and known model/fallback limits. Earlier incomplete-negation and rejected-prototype sections are historical. No commit, push, merge or deployment was performed.

## Base and final state

- Requested base and final branch HEAD: `5b60a094ecd10e1ca80492bc8558652768d93366` (`codex/nextjs-eia-migration-login-toggle` baseline).
- Isolated working branch: `codex/eia-interpretation-audit`.
- Worktree: `<LOCAL_HOME>/.codex/worktrees/eia-interpretation-audit/EIAapp`.
- Original checkout: `<LOCAL_HOME>/Developer/Projects/EIAapp`, clean `main` at `0d6d312a89aea9112efff559ba8fc969cafb2780`. It is one merge commit ahead of the requested base but has an identical tree. It remains unchanged.
- Current work is uncommitted: 11 modified tracked files, 22 new files, nothing staged, and zero new/unpushed commits beyond the base. The worktree is retained for review.
- Deployed commit: unknown. No deployment was inspected or used as evidence.
- Original reviewed production-diff SHA-256: `176eb4e9fd390e77ad5d0ae50f79592b80df7d92ee021e68809af80698615499`. The follow-up review and hash are recorded below.
- Visual UI and authentication, model choice, dependencies, lockfile, source observations, compressed metadata artifacts and their provenance hashes are unchanged. The browser component adds one serialization field for the authorized interpretation contract.

## Frozen expectations and test boundary

Before production edits, `tests/fixtures/eia/interpretation-audit.json` fixed 56 cases and the property matrix. Expectations were derived from query meaning, the user's requirements, the approved vocabulary and preserved official metadata, not current interpreter output.

The matrix covers complete names and aliases; colliding names; spelling edits and ties; negation; harmless request wording; Georgia/state/country context; ordered countries and activities; ambiguous products; explicit and default frequencies; valid requests; and correct clarification or unavailable results. `Iland` has disputed meaning and is explicitly skipped rather than assigned a country.

The property tests use seed **47250**:

- All 308 frozen geography-name entries are considered; 303 unambiguous distinct names are checked with both plain and filler wording. Same-name state/country ambiguity has separate context tests.
- All 20 supported aliases are checked.
- 80 seeded geography/exclusion/filler combinations check that exact positives survive and excluded entities never become positives.
- 80 seeded deletions/transpositions check exact-name precedence and unique edit evidence. A typo may remain unresolved; resolving every typo is not required.
- Actual `appendIntentParams` code is extracted from the browser component and exercised through `normalizeSubmittedIntent`, including fields, ordering, frequency explicitness, sector and exclusions.
- Rules and injected model outputs are exercised separately. API-boundary tests deny external fetches and assert that none occurred.

### Independent challenges and review

A fresh challenge author was denied the production diff, development cases and audit output. It inspected requirements and approved metadata, then froze **45 cases** before execution. Its first run had 30 passes and 15 failures. Ten were route-only expectation disagreements, independently adjudicated from metadata: nine annual state requests also had valid SEDS coverage, and the unavailable daily coal request did not require one unique route. Five were genuine interpretation failures and led to corrections. The original challenge file was not rewritten; the separate adjudication file records acceptable routes, units and coverage.

For example, marketed natural-gas production has an annual SEDS heat-unit series and an annual domestic volume series with different coverage. An unstated period does not establish that only the domestic route is correct. These alternatives remain distinct; no unit equivalence is invented.

A separate reviewer examined the final diff and froze further counterexamples before running them. **30 retained review cases** cover 29 interpretation/submission boundaries plus the multiple-country, multiple-activity display boundary. Findings included repeated Georgia, negated commands and adverbs, punctuation after typo correction, repeated products/activities, source/carrier scope, bounded retrieval, and both public display limits. Each exposed case became a regression; there is **no untouched holdout claim**.

The reviewer's final verdict was **no remaining actionable findings in the reviewed production diff**. Its independent focused run reported 298 tests: 297 passed and one disputed-case skip. The original production-diff hash above matches that earlier reviewed tree; its verdict does not cover the subsequent external-review follow-up. No query/geography-specific exception, new dependency, model switch, UI/auth change, relaxed semantic threshold or raw archive rewrite was found.

### Frozen artifact hashes

| File under `tests/fixtures/eia/` | SHA-256 |
| --- | --- |
| `interpretation-audit.json` | `8d35ff3775ddbc89916035b512eb26f9a7ac19ed10255f49cf4dfd16404c115d` |
| `independent-challenges.json` | `1caf5edccda8e4e9a81fb3f79f5cb5df584ff04ac7dcc8f9942db91d189d8a30` |
| `challenge-route-adjudication.json` | `da51d7ee620516520490c09c8521a0c644714e7da67f56522e7561569dd3756b` |
| `review-regressions.json` | `2994d714bc27b4b63901de6a115d9a951e08803517f7c64fdabfa1b01057b991` |

## Confirmed failures and corrections

| Boundary / cause | Baseline evidence | Corrected observable result |
| --- | --- | --- |
| Exact names versus spelling correction | Correct Iceland-only injected output became Ireland. | Complete exact names, aliases and codes protect their spans from competing fuzzy corrections. Iceland remains ISL. |
| Exclusions and duplicate geography scanners | Iceland not Ireland retained both; excluded or contained names were re-added. | Shared ordered matching removes excluded spans before context resolution and prevents an additive fallback from reintroducing them. Iceland only remains. |
| Reported typo | `icealnd` already resolved to Iceland with validated model evidence. | That result is preserved. The user's reported Ireland result was not reproduced for this typo offline. Rules may leave it unresolved. |
| Upstream labels | Comma splitting turned Gambia, The into The, Germany, East into East, and Germany, West into West. | Approved complete labels are restored; the normalizer matches code plus full title suffix, including embedded commas. Candidate labels use verified complete names without rewriting archive hashes or narrower geography coverage. |
| Harmless wording | The created GMB; would could become World; request pronoun us could become USA. | Complete metadata labels, closed-class-word protection and grammatical pronoun context prevent these additions while preserving explicit country names/codes. |
| Gas ambiguity | U.S. gas consumption acquired GMB and later threw `CLARIFICATION_REQUIRED`. | USA only; a normal clarification response asks for natural gas versus petroleum/gasoline before retrieval. |
| National routing | U.S. total-energy consumption selected domestic and displayed no candidates. | Product/scope evidence, rather than generic activity words, selects international coverage; candidates are displayed with their source units and coverage. |
| Repeated and compound requests | Repeated products/activities or global carrier collapse lost legitimate pairs. | Mentions retain repetitions until ordered pairs are formed; carrier collapse is local to the relevant phrase or explicit shared source activity. |
| Default and resubmitted fields | An unstated model frequency could replace annual; normalized field values could be lost on browser submission. | Unstated frequency remains annual with explicit=false; explicit frequency and stated sector survive the actual serializer and validation. |
| Negation scope | Negative commands with intervening adverbs could add an excluded country; punctuation loss during correction extended exclusions. | Scope follows clause boundaries and completed excluded subjects rather than a short token-distance rule; token corrections preserve punctuation. |
| Bounded retrieval and source evidence | The 50-item pool could be filled before exact natural-gas consumption records reached ranking; scoring omitted source evidence used by retrieval. | Exact concepts receive priority within the same cap. Official descriptions and the already-supported domestic ELEC namespace consistently supply scope evidence. Related candidates and all validation thresholds remain. The cached Texas total reaches display. |
| Public limits | Ten cards could all come from the first two activities; five comparison definitions could omit generation. | Existing limits are shared across requests before extra variants. Ordered countries remain in every comparison definition; requests beyond capacity remain in intent and receive an explicit overflow warning. |

The cached national candidates are distinct: `INTL.44-2-USA-QBTU.A` is annual **quadrillion Btu, 1980–2024**, while `SEDS.TETCB.US.A` is annual **Billion Btu, 1960–2024**. The corrected national route does not substitute one for the other. The existing family representative may display an international oil-equivalent variant; its actual unit is shown. QBTU remains in the raw retrieved pool. No conversion or relabeling was added.

## Files changed and why

| File | Minimal purpose |
| --- | --- |
| `lib/sources/eia/interpret-query.js` | Protect exact geography spans, validate raw evidence/default frequency, preserve resubmitted normalized values and punctuation, and clarify ambiguous products. |
| `lib/sources/eia/intent-routing.js` | Share geography/context/negation rules, preserve ordered concept requests, and route from product/scope evidence. |
| `data/eia/routing-metadata.json` | Correct three truncated official names; codes remain unchanged. |
| `scripts/eia-metadata/normalize.js` | Prevent the same embedded-comma name defect during regeneration using approved code/name/title evidence. |
| `data/eia/phase4-routing-config.json` | Add sales and customers as activities using terms already supported as scopes; legitimate retrieval requests need an activity. |
| `lib/sources/eia/local-retrieval.js` | Prefer exact concepts before the existing pool cap and show verified complete labels while preserving source records and provenance. |
| `lib/sources/eia/local-ranking.js` | Reuse existing semantic matching for pool priority and consistently include official description/namespace scope evidence. |
| `lib/sources/eia/candidate-search.js` | Fairly allocate the existing ten public cards and disclose complete request omissions through the existing warnings field. |
| `lib/sources/eia/multi-country-comparison.js` | Fairly allocate the existing five definitions across requested concepts, preserving country lists, definition IDs and validation. |
| `tests/eia-query-interpretation.test.js` | Replace two assertions contradicted by this task's explicit requirements, with stronger annual/default and gas-clarification assertions. All other existing tests remain unchanged. |
| `tests/eia-interpretation-audit.test.js` (new) | Frozen matrix, seeded properties, metadata normalizer and source-evidence checks. |
| `tests/eia-independent-challenges.test.js` (new) | Independent cases, retained counterexamples, serializer/API checks, source-unit fidelity, frequency fallback and public cap checks. |
| Four `tests/fixtures/eia/*` files listed above (new) | Preserve frozen expectations, independent adjudication and exposed regressions. |
| `docs/eia-interpretation-audit.md` (new) | Reproducible evidence, scope, review, side effects and gaps. |

The two changed legacy assertions previously allowed model-supplied weekly frequency when the user stated none, and allowed unresolved cross-family gas ambiguity to proceed. The new assertions require annual/explicit=false/requestedFrequency=null and blocking clarification while retaining alternatives. This is a requirements correction, not removal of failure coverage. Existing exact ranking benchmarks, fallback tests, authentication tests and API validation tests still pass.

## Commands and results

Commands run in the isolated worktree unless identified as baseline. API keys were unset/empty for offline runs. The exact locked dependencies were restored with `npm ci --ignore-scripts --no-audit --no-fund`; no dependency or lockfile changed. The offline npm attempt could not find locked PostCSS 8.5.10, so installation used the normal package registry. No model or EIA data requests were made.

| Check | Result |
| --- | --- |
| Original unchanged baseline: `OPENAI_API_KEY= EIA_API_KEY= node --test` in an archive of the exact base | 243 passed. The initial missing-Next prerequisite was resolved before this result. |
| Final 142 new audit tests copied into a separate exact-base archive: `node --test tests/eia-interpretation-audit.test.js tests/eia-independent-challenges.test.js` | 54 passed, **87 failed**, 1 disputed skip. Only test files/fixtures were added to the baseline copy. |
| Final tree: `OPENAI_API_KEY= EIA_API_KEY= node --test` | **385 tests: 384 passed, 0 failed, 1 disputed skip**; about 11.3 seconds. Includes 243 existing tests, 64 audit tests and 78 independent/review/API tests. |
| Final new audit tests within that run | 141 passed, 0 failed, 1 disputed skip. The 87 baseline failures are failing tests, not 87 separate root causes. |
| `node --check` on every changed JavaScript file and both new test files | Passed. |
| `OPENAI_API_KEY= EIA_API_KEY= NEXT_TELEMETRY_DISABLED=1 npm run build` | Production build passed; all app/API routes compiled. |
| Existing runtime-artifact tracing and API integration tests | Passed; serverless metadata imports and mocked observation selection remain covered. |
| `git diff --check`, staged/untracked inventory, baseline/HEAD comparison and production-diff hash | Passed; only the documented local patch is present. No secrets added. |
| Browser against loopback-only dev server, with API keys absent | Search → interpretation → browser resubmission → API → cached ranking → rendered results verified. No warning/error console entries. |

Browser checks showed Iceland-only negation results, U.S. total-energy candidates with units/coverage, gas clarification, all three Texas activities including total consumption, and all three Canada/Mexico activities with both countries retained. Source-unit alternatives and unavailable-frequency warnings were also checked through the public API. Existing mocked tests cover verified series selection, observation retrieval, country failures and unit/coverage handling. Live observation downloads were not attempted.

Logs retained for inspection: `/tmp/eia-original-suite.log`, `/tmp/eia-baseline-final-audit.log`, `/tmp/eia-final-tests.log`, and `/tmp/eia-build-final.log`. Earlier failing counterexamples remain in fixtures; intermediate logs are diagnostic history rather than final pass evidence.

## Side effects and limits

- Corrected geography, frequency and routing can change results that previously came from an unintended interpretation. Exclusions and explicit sector/frequency requirements continue to constrain retrieval.
- Shared display limits can show fewer variants for one request so another requested activity is represented. Neither limit was raised. Overflow is disclosed, not silently treated as an unavailable series.
- Source evidence can lower the rank of narrower electricity-sector fuel-input records for general consumption. Generation carrier behavior remains tested; no aggregate/total hierarchy preference was invented.
- Annual defaults are not a claim that every displayed alternative is annual. Existing approved fallbacks remain visibly labeled and do not overwrite an explicit requested frequency.
- Unit requests do not gain a new conversion engine. Offered alternatives retain their official unit labels; cents are not relabeled as dollars, and gas-volume data are not relabeled as megawatts. Ambiguous conversion meaning remains unresolved.
- Natural-language heuristics and a finite seeded sample cannot prove correctness for all wording or typos. Independent challenge exposure removes holdout status. Remaining related candidate choices require the user's explicit selection as before.

## Unperformed checks and next decision

Full source-cache regeneration was not attempted: the required `.tmp/eia-phase1b/ELEC.zip`, `NG.zip`, `INTL.zip`, and `SEDS.zip` are absent from both the worktree and original checkout. Existing validated compressed caches were readable and unchanged. Focused normalizer tests demonstrate the corrected comma-bearing names; a future authorized rebuild must supply those exact source archives and validate its outputs before activation.

Live model behavior, live EIA observations/exports, deployed authentication and deployed commit/workflow remain untested under the offline/no-deployment constraints. No new credentials were requested or used. There is no blocked coding check remaining in the bounded offline work.

Recommended next decision: review this isolated uncommitted patch. Any commit, push or deployment requires a separate explicit instruction. Before a future deployment, identify the actual deployed commit and rerun the live query/selection/export workflow against that version.

## Workflow Audit

The mandatory friction log was updated once for this task under the existing global `zsh-unverified-search-globs` key (count 22, `AGENTS_CANDIDATE`). Guessed route/test/builder paths failed; `rg --files` and directory-scoped searches provided the reliable replacement. Three recorded examples are the October 24 evaluation-scoring task, October 24 free-account-arms task and this October 27 EIAapp audit. The existing proposed global instruction is: “Discover uncertain artifact paths with rg --files before reading them; use quoted rg --glob filters instead of shell globs for unverified paths.” Owner approval remains pending; no working agreement was edited.

Temporary verification servers were stopped after checks. The managed worktree, audit fixtures, logs and browser evidence are retained for review. The separate original checkout remains clean.

## External review follow-up (2026-10-27)

The external reviewer tested the previous ZIP, SHA-256 `8098735a20af1d33d961c22d96a8499b751eada790551b2f5c56fd1c4bb0b446`, and exposed two failures in that reviewed tree. This section supersedes the earlier completion claim for those two failure classes; the earlier records remain historical evidence. HEAD and branch are unchanged. No commit, push, merge, deployment, model switch, dependency change or live API call was made.

### Reproduction and frozen expectations

- With a correct GMB-only injected model response, “energy consumption in The Gambia” returned ZMB and Zambia candidates, without clarification. The canonical “Gambia, The” remained valid.
- With a correct USA / total energy / consumption injected response, “I'm not sure what's available for USA energy consumption” lost the geography and treated product/activity as exclusions.
- Both failures were reproduced through the exported `interpretQuery`, the actual `SearchWorkspace.appendIntentParams` browser serializer, `normalizeSubmittedIntent`, and the public `GET /api/search-eia` route adapter. Tests record each boundary, not just the initial parser result.
- Before production edits, `tests/fixtures/eia/followup-regressions.json` froze 37 cases from query meaning and approved metadata. Final pre-edit SHA-256: `0f803a903f73313fc21a5e1f54600bacc8baf19423672327698b52da87d2c643`. The initial freeze and a correction record are retained: the new harness was corrected to compare display names with approved routing metadata, not a known truncated raw cache label, and to retain explicit consumption when gas is ambiguous. Neither change removes a legitimate requested field or weakens an existing test.
- The 37-case matrix covers article and comma-name forms, complete qualifiers, exact collisions, ordering, uncertainty with and without later explicit exclusions, actual product/activity/country exclusions, explicit/default frequency, stated sector and gas clarification. It is enumerated, not random; the earlier seeded tests still use 47250. Historical East/West Germany cases test meaning without assuming present-day data availability.

### Minimal corrections and affected files

| File | Follow-up change |
| --- | --- |
| `lib/sources/eia/intent-routing.js` | Derive ordinary input forms from complete metadata names for exact matching and approved-name resolution. Reorder comma qualifiers without dropping them; only the grammatical article is optional. Recognize negated knowledge/certainty predicates and their degree/adverb modifiers so they do not open a data-exclusion scope; approved data vocabulary takes precedence over modifier-shaped words, and later genuine exclusions still do. |
| `lib/sources/eia/interpret-query.js` | Protect the same derived exact-name forms before bounded spelling correction. Fuzzy matching remains enabled and validation thresholds are unchanged. |
| `tests/eia-followup-regressions.test.js` (new) | Inject correct responses through interpretQuery, exercise rules and actual serializer/public route, preserve all expected fields, and verify cached candidate codes, units, canonical names and source coverage. The transport is fully intercepted, so no network/model/data call can escape. |
| `tests/fixtures/eia/followup-regressions.json` (new) | Preserve the frozen 37-case semantic expectations, including valid exclusions and correct clarification. |
| `tests/fixtures/eia/followup-review-regressions.json` (new) | Retain 42 independent, supplemental and collision/guard cases, their frozen source hashes, and the explicit unresolved-pairing adjudication. |
| `docs/eia-interpretation-audit.md` | Record external failures, bounded corrections, new evidence and remaining limits. |

All other production files in the prior bundle are byte-identical. Metadata configuration, routing metadata, normalizer and compressed source caches were not edited in this follow-up. Canonical source names, series identifiers, units, dates and provenance hashes are retained; input aliases do not rewrite source records. The article/comma rule applies to metadata labels, not a country or query-specific exception. The uncertainty rule applies to linguistic predicates, not the reported sentence.

### Follow-up checks

| Command / boundary | Result |
| --- | --- |
| Pre-edit `OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap tests/eia-followup-regressions.test.js` | 37 cases: 13 passed, 24 failed. Both reported failures fail at interpretation, serialization and public-search boundaries. |
| Same command after the first correction | 37 passed, 0 failed. Correct GMB and USA requests reach cached candidates; actual exclusions remain effective. |
| Same command after independent findings and retained regressions | **79 passed, 0 failed**: 37 initial cases plus 42 independent/review cases. |
| `OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap` | **464 tests: 463 passed, 0 failed, 1 pre-existing disputed skip**. |
| `node --check` on the two affected production modules and new test; `git diff --check` | Passed. Imported modules and async public-route/JSON paths also execute in integration tests. |
| `OPENAI_API_KEY= EIA_API_KEY= NEXT_TELEMETRY_DISABLED=1 npm run build` | Passed; Next.js production app and API routes compiled. |

Evidence files under `/private/tmp`: `eia-followup-before-final.log`, `eia-followup-after.log`, `eia-followup-final-focused-tests.log`, `eia-followup-final-tests.log`, `eia-followup-final-build.log`, `eia-followup-final-static-checks.json`, `eia-followup-freeze-final.json`, and `eia-followup-state-check.json`. The updated review bundle includes these records and the independent review below.

### Independent final review

A fresh reviewer froze 20 cases from requirements and approved metadata before viewing the follow-up diff or development tests. Its frozen file is `/private/tmp/eia-followup-independent-challenges.json`, SHA-256 `c60cf4a533abb90b78bd5acb3700eb25d4d0fc4ce7d59994304b2b46ff0bec46`. It records 19 literal passes and one ambiguous pairing expectation, not an unqualified 20/20. The untouched original failure remains; the separate adjudication preserves the existing contract that two products and two activities without explicit pairing require clarification. The retained test also asserts that all geography and concept mentions survive.

Independent review exposed two additional mechanisms within the same uncertainty class:

1. Six ordinary certainty modifiers (“at all”, “very”, “so”, “particularly”, “exactly”, “actually”) still opened exclusion scope. The fix recognizes degree words, productive -ly adverbs and the “at all” construction rather than enumerating those sentences.
2. Productive -ly matching could consume approved content: “Canada energy consumption, not Italy, sure?” incorrectly added Italy, and “USA energy consumption, not supply, sure?” incorrectly added production. Approved geography forms/aliases and concept/frequency/sector vocabulary now take precedence over an adverb-shaped spelling. No Italy, supply or other entity-specific exception was added.

Final independent results: 19 literal original passes plus the transparently adjudicated ambiguity; 8 supplemental cases, 7 negative-command/context guards, 4 content-collision cases and 3 additional collision cases pass through all four boundaries. The reviewer also verified 13 geography-form/name-resolution checks and 19 modifier/content-precedence checks (8 known content terms and 11 genuine modifier forms). All 42 original/supplemental/guard/collision query cases are retained in `followup-review-regressions.json`, SHA-256 `ec6e7863daa27e4887d0d9655d9bd228884af3d6b6a7824aba342c5efb4e04a5`. Exposed cases are regressions, not untouched holdouts.

The final independent verdict is **no remaining actionable findings in this bounded review**. The reviewer examined the full production diff against the base and the incremental changes against the previous ZIP, including special cases, regressions and excess scope. Its report, frozen inputs, original failures, reruns and reproducible probe scripts are included in the updated bundle under `evidence/followup/`.

Final reviewed production-diff SHA-256: `47f033d852c9dd9edb60465870342db7808b8a6fa37e844007b8b79c3c7eadee`, from `git diff --binary 5b60a094ecd10e1ca80492bc8558652768d93366 -- lib scripts data | shasum -a 256`. No production edits followed the final independent review.

Completion audit: both external failures and the additional review findings have general corrections and retained regressions; correct injected meaning survives interpretation, actual browser serialization and public search; cached candidates retain source geography/unit/coverage; genuine exclusions and ambiguity safeguards remain; affected/full tests, syntax/import execution and production build pass. The worktree retains 10 tracked modifications and 10 untracked files, nothing staged, no new commits. The updated ZIP includes the complete base diff, all 20 changed/new files, current and historical evidence, a manifest, secret-scan/redaction disclosure and reproduction commands. Packaging verifies the actual reopened archive and copies the same bytes to Downloads. The ZIP checksum is reported alongside the delivered ZIP, outside the self-referential archive.

### Follow-up limits

Checks are offline and exercise the real browser serializer and public route handler, not a newly rendered browser session or a live deployment. Existing browser evidence is retained as historical evidence only. Live model accuracy, live EIA observations/exports, deployed commit identity and full source-cache regeneration remain unverified for the reasons recorded above. Correctness on a bounded linguistic matrix does not prove universal natural-language interpretation.

## Negation-target reassessment — correction not accepted (2026-10-27)

This section supersedes the earlier completion claims for negation. The existing mechanism remains unsound. No production correction from this reassessment was applied. The validated complete-country-name repair and every other starting production file remain byte-for-byte unchanged. The proposed first-recognized-head rule was evaluated only in `/private/tmp/eia-negation-design-probe` and rejected. It is evidence, not the final app implementation.

### Starting state and reproduced cause

Base and HEAD remain `5b60a094ecd10e1ca80492bc8558652768d93366`; branch remains `codex/eia-interpretation-audit`. The starting snapshot had 10 tracked modifications and 10 untracked additions. Current state has the same 10 tracked modifications and 14 untracked additions, nothing staged and no new commits. Four additions in this phase are the two regression harnesses and their two frozen fixtures; this existing audit is updated. No model/dependency/UI/auth changes, commit, push, merge, deployment or paid call occurred.

`getNegationScope` opens a suffix-wide exclusion unless `isUncertaintyPredicate` recognizes the intervening wording. Unrecognized modifiers therefore negate geography and concepts even with a correct injected model response. `findGeographyMentions` and `findRuleExclusions` create the constraints; `validateAiInterpretation` treats them as authoritative. The browser preserves raw `q`, so `normalizeSubmittedIntent` repeats the same mistake before the public search handler. The failure is in application interpretation/validation, not demonstrated model failure or unavailable EIA observations.

The unchanged application still fails “not even sure” and “not 100% sure.” “Not sure” itself passes because the earlier correction covered it. Unknown predicates such as “not related to” and undecided requests such as “not sure whether to include” demonstrate why simply skipping more words is unsafe.

### Frozen expectations and results

The primary matrix was frozen before the prototype: 34 enumerated cases, SHA-256 `e36b72f26bde670855b9c246919726926c4849798bb21c1b1d3aae9617cf52ae`, retained verbatim as `tests/fixtures/eia/negation-target.json`. It covers certainty/knowledge, modifiers/numbers/punctuation, negative commands, direct exclusions, multiple ordered countries/pairs, context collisions, default/explicit frequency, stated sector and genuinely uncertain attachment. `tests/eia-negation-target.test.js` checks rules, injected `interpretQuery`, the actual browser serializer, normalization and public GET, including candidate identity, unit and coverage. No missing-candidate result is treated as proof of a retrieval defect without checking metadata.

A fresh reviewer froze 32 independent cases from requirements and approved metadata before inspecting development cases or implementation. Manifest SHA-256 `5c911f9c2b7b47748f510eed4031cf1b49423ac1e39519764b8a691215c003ff`, retained verbatim as `tests/fixtures/eia/negation-independent.json`, with portable `tests/eia-negation-independent.test.js`. Its assertions test interpretation, real browser serialization/resubmission and public GET. Geography/frequency exclusions are observed by absence from positive fields because the existing flat exclusion schema lacks those dimensions; this is weaker than a scoped exclusion assertion and is disclosed. Both matrices are enumerated, not randomly generated; the earlier property seed remains 47250. Exposed independent cases are now regressions, not untouched holdouts.

| Check | Existing app | Rejected disposable prototype |
| --- | --- | --- |
| Primary 34, all four boundaries plus candidates | 16 pass / 18 fail | 31 pass / 3 fail |
| Independent frozen 32, three boundaries | 21 pass / 11 fail | 28 pass / 4 fail |
| Current complete suite, including both retained matrices | **530 tests: 500 pass / 29 fail / 1 pre-existing disputed skip** | Not claimed as a final production check |
| Previous 464 tests within current full run | 463 pass / 0 fail / 1 disputed skip | No all-green claim |
| Current syntax/import execution and `git diff --check` | Pass | Prototype modules also passed syntax only |
| Current Next.js production build | Pass | Not built or accepted as production |

The independent 28/32 score checks its frozen semantic assertions, which do not forbid every unnecessary clarification; it therefore overstates usability. Review of the already-recorded outputs found a knowledge clause leaking into the next clause's fresh command. Unresolved cases also set `needsClarification=true` while leaving `blockingClarification=false`; retrieval still blocks via the former flag. The prototype's 31/34 is not evidence of an acceptable repair. It incorrectly clarifies “do not ever include” and “do not, under any circumstances, show.” The third primary failure exposes a separate cached candidate label, `Texas Dry` for a TX series where approved routing metadata says `Texas`; the interpretation itself passes that case in the prototype. No geography-name rewrite or metadata repair was added for this new observation. Independent failures also include missing sector exclusion and promotion of “do not exclude” into an additional positive request. The latter has a disputed positive-request expectation between the two matrices: permitting inclusion does not necessarily demand it. Original expectations remain frozen, with disagreement disclosed rather than changed to obtain green results.

The reviewer additionally found that a direct action head still mishandles object-side scope: “do not include all coal production” does not entail excluding all coal production. “Not sure whether coal production belongs here” can become a positive request merely because no recognized action appears first. Conversely “I'm not sure of the label, please show USA consumption” can incorrectly mark a fresh command unresolved. These retained supplemental counterexamples concern predicate/argument scope, not missing successful phrases.

The earlier fixture's unconditional hard exclusions for “not particularly/really/entirely include” are not an unquestioned semantic oracle. The independent adjudication preserves the original cases and explains that extent or emphasis may be negated instead of inclusion. In particular, “not entirely” permits partial inclusion and does not entail full exclusion. No existing test or expectation was weakened or skipped to manufacture a passing result.

### Design boundary and concrete next decision

A nullable suffix scope conflates three distinct states: positively requested, excluded, and unresolved. A third state is necessary but a scan to the next recognized keyword is insufficient: predicate attachment, action polarity, extent and request boundaries still matter. Flat type/value exclusions also cannot express every geography- or pair-specific constraint. This does not establish that all small corrections are impossible; it establishes that the tested bounded rule does not satisfy these requirements and must not be presented as a completed fix.

Recommended next scope: represent each interpreted mention/request with its source span, requested/excluded/unresolved status, and the predicate or request to which it attaches. Have the existing model propose these relations; validate source spans and approved metadata locally, rather than override them with suffix heuristics. Use a conservative controlled grammar for the rules-only fallback and clarify unsupported attachment. Recompute/validate the same evidence on resubmission. Keep the current whole-search clarification gate, retrieval contracts, units and candidate selection; no partial-results UI, new model or dependency is proposed.

This requires an explicit decision to broaden the interpretation schema/prompt and its validation contract, and to permit rules-only clarification for unsupported grammatical structures. It also requires adjudicating the genuinely disputed expectations. That is broader than another modifier regex and is not authorized implicitly by the successful country-name repair. Under the instruction to stop before broader changes, no such implementation was made. The user can authorize that bounded design change, or leave this correction parked with the confirmed failures disclosed.

Cyanheads' useful principle here is to keep validated request data separate from unresolved interpretation and expose uncertainty. No MCP server code/framework or live metadata retrieval was introduced. Other MCP-related ideas are deferred as requested.

### Reproduction, records and audit

Run from this worktree, with credentials empty:

```sh
OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap tests/eia-negation-target.test.js
OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap tests/eia-negation-independent.test.js
OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap
OPENAI_API_KEY= EIA_API_KEY= NEXT_TELEMETRY_DISABLED=1 npm run build
node --check lib/sources/eia/intent-routing.js
node --check lib/sources/eia/interpret-query.js
node --check tests/eia-negation-target.test.js
node --check tests/eia-negation-independent.test.js
git diff --check
```

The failing tests are deliberately retained. Injected transports intercept every model request; no EIA observations are fetched. Import/async/JSON paths execute in the boundary tests. No new rendered-browser, live model, observation/export, deployment or full metadata-regeneration check was performed. Their earlier prerequisite/authorization gaps remain. The latest full-suite failure is a failed check, not a missing check. The current successful build does not prove language correctness.

The review bundle includes the current complete diff and all final changed/new files; starting-state hashes; frozen inputs; before/current and prototype results; independent design, adjudication and final reviews; prototype-only diffs; current build/static checks; and historical audit records. Rejected prototype files are marked as evidence and are not under `files/` or the applied final patch. Packaging reopens the actual ZIP and verifies inventory, source-copy hashes, patch replay and a bounded secret-pattern scan. Redactions and unavailable records are disclosed in its inventory. The work is **not complete as a negation correction**, and the known-example improvements in the rejected copy do not establish a general solution.

## Authorized scope-evidence contract — final correction (2026-10-27)

This section supersedes the preceding incomplete-negation status and rejected prototype. The user explicitly authorized the bounded interpretation contract change. The old suffix/recognised-modifier mechanism is replaced; the country-name repair is preserved byte for byte. The selected model remains `OPENAI_MODEL` or `gpt-5.4-mini`. No dependency, credential, authentication, visual UI, commit, push, merge or deployment change was made.

### What changed and why

The old application could turn a correctly interpreted request into exclusions simply because an intervening certainty modifier was not recognised. Both initial validation and browser resubmission rescanned the raw sentence using that rule. The new model response carries `requestEvidence`: the exact original query and ordered UTF-16 source spans, each identified as requested, excluded, unresolved or context, with a target (data/action/knowledge/condition/unknown). Exclusions also carry the original operator span. The existing model proposes these relationships; locally approved metadata still determines canonical codes and concepts.

| File | Change in this authorized phase |
| --- | --- |
| `lib/sources/eia/request-evidence.js` (new) | Validate exact source bounds/text, token boundaries, complete coverage, nonoverlap, disposition and operator placement. Prevent metadata hidden as context. Provide conservative direct-negation grammar and preserve unsupported text as unresolved. Mask other spans while preserving positions and punctuation. |
| `lib/sources/eia/interpret-query.js` | Request evidence from the same model, validate it against raw text, build the intent only from positively established text, preserve verified spelling corrections, and clarify incompatible or unrepresentable scopes. Revalidate evidence and derived values on submission; stale, corrupt and unsupported contracts cannot silently execute. |
| `lib/sources/eia/intent-routing.js` | Expose metadata mentions with raw-source positions; build from the validated positive projection. Replace suffix/modifier negation logic with evidence dispositions while retaining complete country-name matching and actual Georgia context rules. |
| `components/search/SearchWorkspace.js` | One serialization field carries `requestEvidence` through the existing browser workflow. No UI/layout change. |
| `scripts/eia-metadata/normalize.js`, `lib/sources/eia/local-retrieval.js` | Fix a separately reproduced state-label extraction error at regeneration and display. Require the simple `NG.<identifier>_S<state>_<unit>.<frequency>` form, agreeing state code, and approved full-state-name title prefix. Preserve series/selector, units, coverage, title and source provenance. |
| `tests/eia-scope-evidence.test.js`, `tests/eia-scope-independent.test.js`, `tests/eia-scope-metadata-labels.test.js` (new) | Exercise injected interpretation, actual browser serialization, normalization, public search, evidence tampering, candidate scope and metadata regeneration. All transports are intercepted or remain local. |
| Existing follow-up, independent, negation-target and negation-independent harnesses | Add literal companion model evidence and explicit fallback/adjudication expectations for the approved new contract. Original frozen fixture files remain unchanged. |
| Four `scope-*` fixture files and this audit | Retain independently specified meanings, source spans, provenance, explicit disputed-meaning decisions, and reproducible evidence. |

The state-label check found 2,655 simple state-series records. There are 138 pre-existing noncanonical names; 130 satisfy the title-prefix check and are corrected, while eight inconsistent titles are deliberately preserved. Regeneration tests examine all 2,655; display tests exercise 33 states with monthly production records. The first test setup incorrectly included longer multi-component identifiers; the failed run is retained. Tightening the identifier guard prevents accidental relabelling of regional/offshore records. Raw compressed caches are not rewritten. A complete source regeneration is still unavailable without the original source archives.

### Frozen expectations, independent review and results

The primary 34 and earlier independent 32 semantic matrices were frozen before the rejected prototype and are unchanged. Companion evidence is literal, not generated by calling the production parser. The newly authorized fallback can clarify unsupported grammar; these are explicit mode expectations, not claims of exact rules-only understanding. Disputed negative-action readings (`not entirely include`, `no need`, `do not exclude`) retain original expectations and independent adjudications. Permission to include does not necessarily request inclusion. Bare Georgia retains the user's established state/country context rule; the new review's original unresolved annotation remains recorded separately.

A fresh reviewer saw requirements and approved metadata before implementation, development fixtures or diff. It froze 28 meaning and 16 integrity cases (SHA-256 `7de8a72f7b5634420c4bccee70b47412c5c15d24509161c5d4c73ec7c6f3a7e0`), then supplied literal model annotations. Review exposed and drove general corrections for shared trailing-country attachment, incompatible per-clause frequencies, unknown exclusion targets, operator ordering, negative-looking approved metadata phrases, scope-count overflow and scope-only exclusions. All 44 cases, six exposed follow-up cases, and four supplemental contract checks are now runnable regressions. They are no longer untouched holdouts. Three additional tests cover state-label regeneration and display. The cases are enumerated; the original general-property seed remains **47250**.

| Check | Result |
| --- | --- |
| Starting complete suite before authorized contract | 530 tests: 500 passed, 29 failed, 1 disputed skip. |
| Primary 34 before this change | 16 passed, 18 failed across interpretation/resubmission/public search and candidates. |
| Earlier independent 32 before this change | 21 passed, 11 failed. |
| Migrated suite before state-label correction | 564 tests: 561 passed, 2 failed, 1 disputed skip; both failures were the `Texas Dry` display label. |
| Final primary and earlier independent matrices, with explicit contract/adjudication companions | All 66 pass; original frozen meanings are retained for external review. |
| Fresh independent contract review | 28/28 model-boundary outcomes (18 requested results, 10 appropriate clarifications); 16/16 safe integrity outcomes; 6/6 targeted follow-up checks. Forty-five mocked model responses, zero actual external calls in its standalone run. |
| Newly retained regression command | 57 passed, 0 failed: 54 scope cases and 3 metadata-label tests. |
| Final full suite | **621 tests: 620 passed, 0 failed, 1 pre-existing disputed `Iland` skip.** |
| Syntax / imports / whitespace / JSX | All changed non-JSX JavaScript passes `node --check`; both staged and working diff checks pass. Real imports/async/JSON/public routes execute in tests; Next.js compiles JSX and routes. |
| Production build | Passed, Next.js 16.2.10. No deployment. |

No existing test was removed or newly skipped. Eight original frozen fixture files are hash-identical to the authorized phase's start. The additional schema-aware assertions preserve default annual/explicit=false, explicit frequency, stated-only sector, ordered geographies and requested concept pairs, and test correct clarification as well as valid results. Earlier positive/exclusion/property and routing tests continue to pass. The complete country-name helper is byte-identical to the start of this phase. Package/lockfile, authentication and all compressed metadata artifacts checked against the base are unchanged.

The independent final diff review is recorded in `eia-scope-contract-final-diff-review.json`; its status and exact source hashes are authoritative for the reviewed snapshot. No source edits followed the final production check except any explicitly recorded review repairs. Historical failures and rejected-prototype evidence remain labelled by phase, not counted as current successes.

### Limits and remaining risks

- Rules-only operation is intentionally degraded for unsupported language. In eight independent cases it clarifies; some data remain only in literal unresolved spans rather than normalized fields. In the shared trailing-country case, rules alone still attach Canada to the excluded clause and block for missing positive geography; correct model evidence preserves Canada. Do not claim exact fallback field preservation.
- Source-span/metadata validation does **not** prove arbitrary semantic scope. The reviewer retained a deliberately wrong, structurally valid `not convinced` model proposal that still produces a CAN-only request and hard exclusions instead of the intended broader request. This is a known model-semantic dependency, reproduced in `eia-scope-contract-independent-semantic-limit.json`, not fixed by adding another predicate word. Correct injected proposals are protected from the former suffix heuristic; live model accuracy has not been measured.
- Per-country/per-clause frequencies and exclusions that the existing flat retrieval contract cannot represent require whole-search clarification. No partial-result UI or retrieval redesign was authorized.
- No live model call, live EIA observations/exports, rendered-browser session, deployed-commit verification or full source-cache regeneration was performed. These checks are unperformed, not passing. Actual browser serialization and public route handling are exercised offline. Deployed commit remains unknown.
- Independent examples, all-green tests and a successful build are bounded evidence, not universal natural-language correctness. The original ambiguous typo stays unresolved. No unavailable result is reclassified as an error without metadata/frequency/unit/coverage evidence.

### Reproduce and Audit

From the exact baseline plus `diff/complete-changes.patch` in the review bundle, using the locked dependencies:

```sh
OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap tests/eia-scope-independent.test.js tests/eia-scope-metadata-labels.test.js
OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap
OPENAI_API_KEY= EIA_API_KEY= NEXT_TELEMETRY_DISABLED=1 npm run build
git diff --check
git diff --cached --check
```

The bundle inventory provides per-file syntax commands and dependency/bootstrap steps. Relevant current records are `eia-scope-contract-start.json`, `eia-scope-contract-spec.json`, `eia-scope-contract-migrated-full-v1.log`, `eia-scope-contract-retained-tests.log`, `eia-scope-contract-final-tests.log`, `eia-scope-contract-final-build.log`, `eia-scope-contract-final-static-checks.json`, the frozen matrices/payloads and independent review/run/semantic-limit records. Earlier exact-base comparisons are also retained. Final source hashes, complete base diff and exact copies of all 33 changed/new files are included. There are 11 tracked modifications, 22 untracked additions, no staged files and no commits beyond the base. The original checkout remains clean `main` at `0d6d312a89aea9112efff559ba8fc969cafb2780`, with a tree identical to the requested base.

The final ZIP is reopened and its actual inventory, payload hashes, exact final file copies, complete patch replay and bounded secret-pattern scan are checked. Redactions are confined to disclosed evidence/log sharing content; final source copies and patches stay exact. Credentials, `.env`, dependencies, generated builds and unrelated files are excluded. The external SHA-256 accompanies the delivered ZIP to avoid a self-referential checksum. The earlier unresolved bundle is retained as historical evidence, not overwritten.

Cyanheads' useful principle here remains explicit validated request data separated from unresolved interpretation. No MCP framework/server code or new live metadata path was introduced; further MCP ideas remain parked. The recurring guessed-path detour is already counted in the global friction log for this EIA audit; no additional agent occurrence or AGENTS rule was added.
