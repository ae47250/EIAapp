# HoHo7 Technical Benchmark Report

## 1. Executive Summary

This benchmark compares the historical native legacy application at `8f2cb49`, the current candidate architecture with hierarchy ranking off and on, and the current production deployment. The post-fix production deployment is `dpl_Dmk429PgEW67i4WjaLPNaXnuBcxr` at commit `d5c65af`. Controlled and Production calls use `gpt-5.4-nano-2026-03-17`. The authenticated Production diagnostic and upstream OpenAI request both return HTTP 200; the 50-query pass returned 50/50 successful search responses with interpreter counts {"openai":49,"rules":1}.

The current architecture contains 52 reviewed SEDS targets, not zero hierarchy relationships. The hierarchy rule is limited to annual SEDS total-energy candidate series, including annual candidates reached through an approved frequency fallback, and only breaks same-tier/same-score ties. It cannot override semantic eligibility, tier, or score. Component controls must remain components. The candidate pipeline is the sole runtime path; the legacy feature flag is retired.

The repository differs from the benchmark prompt in two important ways: the candidate/legacy flag has already been retired, and result certainty does not contain an explicit `routeRelation` field. The separately reviewed 52-target registry also supersedes the older statement that all hierarchy relationships were zero; the raw Phase 1B selector metadata itself still contains zero embedded relationships.

Results are preliminary pending blinded human review. Recommendation: **DO NOT PROMOTE**.

## 2. Evaluation Manifest

- Benchmark: `hoho7-v1`
- Started: 2026-07-18T05:04:36.747Z
- Machine: `win32/x64`, Node `v24.18.0`
- Repository root: `C:\Users\eiriksson\Documents\EIA Version 2.5`
- Current branch: `codex/nextjs-eia-migration-login-toggle`
- Current HEAD: `d5c65af1ac8046e0c44dc6f64444a0f8d559449d`
- Working tree at benchmark start: `clean`
- Working tree at manifest refresh: `?? hoho7.md; ?? hoho7HR.md; ?? scripts/eia-benchmark/; ?? test-artifacts/; ?? tests/hoho7-benchmark.test.js`
- Baseline: `8f2cb495519db8d60072032a1dc8a2e93c65cef8` (Track corrected query provenance)
- Baseline execution: isolated detached snapshot from this branch's history; native candidate flag off; native International retrieval; build PASS in Section 5
- Production deployment: `dpl_Dmk429PgEW67i4WjaLPNaXnuBcxr`
- Production URL: https://eiaappv20.vercel.app
- Production commit: `d5c65af1ac8046e0c44dc6f64444a0f8d559449d`
- Production deployed at: 2026-07-18T04:29:10.312Z
- Production candidate mode: `sole-runtime-path`; retired flag has `retired-no-runtime-effect`
- Production hierarchy mode: `on-verified-by-production-response`
- Controlled model: `gpt-5.4-nano-2026-03-17`
- Endpoint: `https://api.openai.com/v1/responses`
- Model parameters: reasoning=omitted-application-does-not-set; temperature=omitted-application-does-not-set; max output=omitted-application-does-not-set; schema=none-json-instructions-validated-locally
- Feature flags: candidate=retired; hierarchy=off/on; semantic reranking=off; contribution calculation=disabled
- Versions: candidate=phase4a-v6; hierarchy=phase11-hierarchy-ranking-v1; ranking=phase4-v8; taxonomy=phase4-concepts-v2; semantic reranking=phase5-v2
- Query bank: `89d6e6506692043a60f8e615828cda0d9c1ea299f6c2c15514d895dbeee250a1` (50 development, 150 sealed holdout)
- Query bank version/date/source: `hoho7-v1`; 2026-07-17; 14 existing human-reviewed queries plus benchmark-authored EIA patterns; no private query logs were available
- Current metadata manifest hash: `ed34c7ab75d2a20fc22ae8c4a82039cbfd845c4f23caf4c6441211e9eaa26934`
- Baseline metadata manifest hash: `ed34c7ab75d2a20fc22ae8c4a82039cbfd845c4f23caf4c6441211e9eaa26934`
- Hierarchy registry hash: `a44188680ea441f15d097aa460f7d2ca82c1f732f633f018567b394bda8770c6`
- Current interpretation source hash: `25e684e3eb1c60607422c3cefa9bd099d20076e00d939525f22871c6aa7b821c`
- Baseline interpretation source hash: `d50af781da479269da4216fae51bdd5aa02f5cb14a95c8b11b8aaaf2c411a5db`
- Current routing metadata hash: `5b4d8f0a14bdf346ba4a3caebd1f25018aa5608012bde048cdef470ca3bae376`
- Generated hierarchy hash: `abeee636d73db0fb0c8159ca53c8f9df7eb89bba3d474a67240a8b16ea52f8b8`
- Benchmark runner hash: `b532d45f100d8a38e7e14dd3615512ded7b4752f1e6637006466173f4a341ccc`
- Benchmark corpus source hash: `7e0946e59f16ad2bd278f232789aefcf25e2f2958801fb7cf08e30094c4db9c9`
- Request evidence: current=150 calls/50 prompt hashes/50 request hashes; baseline=150/50/50
- Response models: current=gpt-5.4-nano-2026-03-17; baseline=gpt-5.4-nano-2026-03-17
- Captured request IDs: current=150; baseline=150
- Artifact root: `test-artifacts/hoho7/`; per-file hashes: `test-artifacts/hoho7/artifact-hashes.json`

No secrets are included in the manifest or artifacts.

### Preflight Answers

| # | Question | Answer |
|---:|---|---|
| 1 | Exact current HEAD | `d5c65af1ac8046e0c44dc6f64444a0f8d559449d` |
| 2 | Last trusted pre-change commit and why | `8f2cb495519db8d60072032a1dc8a2e93c65cef8`; last commit before the clarification, eligibility, certainty, legacy-retirement, and hierarchy sequence. |
| 3 | Is production running the baseline commit? | No. |
| 4 | Deployed commit | `d5c65af1ac8046e0c44dc6f64444a0f8d559449d`, the same commit as current HEAD. |
| 5 | Candidate mode in production | Candidate pipeline is the sole runtime path; the old flag is retired and has no runtime effect. |
| 6 | Deployed model and prompt | Model is `gpt-5.4-nano-2026-03-17` and is operational; prompt source is identifiable through the deployed commit, but the black-box request prompt hash is not exposed. |
| 7 | Can production configuration be identified reliably? | Yes for the benchmark-relevant deployment, commit, timestamp, pinned model, candidate runtime, hierarchy response, and semantic-reranking state; unrelated environment details remain outside scope. |
| 8 | Safe production per-request model override? | No supported test override was found or used. |
| 9 | Is isolated deployed-code reproduction feasible? | Yes and already represented by controlled Arm B because production and HEAD are the same commit; a separate Arm D adds no code isolation. |
| 10 | Are metadata snapshots comparable? | Yes for the hashed Phase 1B manifest; full-workflow baseline remains confounded by its native International-only retrieval architecture. |
| 11 | Can both rankers receive the same pool? | Yes for 39 non-clarification cases; all 39 adapters were compatible. |
| 12 | Does production expose stable candidate IDs? | Yes. |
| 13 | Does clarification stop ranking in every arm? | It stops ranking when raised, but H7-D041 fails earlier because required geography clarification is not raised. |
| 14 | Are all certainty dimensions available in every arm? | No. Baseline lacks the contract; current and production omit explicit `routeRelation`. |
| 15 | Does any arm use unverified hierarchy? | The 52-target registry is reviewed and formula-backed, but H7-D033 applies it to a misconstructed total-energy pair. All unrelated hierarchy remains unknown. |
| 16 | How many live calls were required? | 428: 300 controlled, 72 post-fix Production, and 56 preserved pre-fix Production observations. |
| 17 | Estimated and actual cost | Preflight estimate USD 1.01; actual controlled direct OpenAI estimate USD 0.175522. Production token usage/cost is not exposed by the black-box response. |
| 18 | Impossible or confounded portions | Human quality, sealed holdout performance, baseline native retrieval comparability, black-box prompt/request hashes, and Production token usage remain unavailable or confounded. |
| 19 | Production comparison status | Included as a passing operational gate and secondary same-code/model comparison, not as a replacement for the controlled baseline. |
| 20 | Remaining human decisions | Review all 50 blinded cases, adjudicate H7-D002/H7-D033/H7-D041, approve any repaired freeze, then decide whether to open the 150-query holdout. |

## 3. Why the Deployed Comparison Is Secondary

Production is useful for detecting user-visible behavior, packaging failures, authentication failures, stale flags, and deployment drift. It is not the controlled causal baseline. Its deployment, commit, candidate-only runtime, hierarchy response, and pinned model were identified, but black-box prompt hashes and unrelated environment values were not. Formal code claims therefore rely on controlled Arm A versus Arm B evidence. Arm C now passes the operational AI gate and provides a secondary same-code/model comparison. A separate Arm D was unnecessary because production and current HEAD are the same commit and controlled Arm B already reproduces that code with the same pinned model.

The pre-fix Production deployment used an invalid provider-prefixed model and returned upstream HTTP 400. That evidence is preserved under `*-pre-model-fix*` artifacts. The corrected deployment uses `gpt-5.4-nano-2026-03-17`; authenticated application and upstream diagnostics both return HTTP 200.

## 4. Benchmark Design

The query bank contains 50 difficult development queries and 150 sealed holdout queries. Fourteen development cases come from the existing human-reviewed Q01-Q14 cohort. The remaining records are benchmark-authored from EIA search patterns and carry objective draft judgments, not final human quality labels. No private query logs were available.

The query bank records version, creation source/date, category labels, partition, and structured gold fields. Fourteen records are previously human-reviewed; all other development and holdout judgments are objective drafts. Human review is blinded independently by query, with the key stored outside `hoho7HR.md`.

Layer 0 ran static tests, builds, audits, syntax checks, and the existing ranking benchmark. Layer 1 froze current structured intent and canonical candidate pools, tested clarification suppression, compared both rankers on the same pool where compatible, and ran the 52-target hierarchy sweep. Layer 2 ran three complete controlled repetitions for every development query in both baseline and current arms with the exact pinned model. Arm B-Off and Arm B-On reuse the same AI interpretation and candidate inputs; only hierarchy mode changes. Layer 3 ran corrected Production once for all 50 queries and repeated the union of changed and failed cases, 11 queries, twice. The deterministic Layer 1 also exercises the AI-unavailable rules-only path. Layer 4 was unnecessary because deployed code equals current HEAD.

Native full-workflow baseline tests retain baseline metadata and API behavior, so its International-only retrieval behavior is an architecture confound rather than automatic evidence that current ranking is better.

Initial estimate: 150 workflow calls and approximately USD 1.01. Final accepted evidence contains 372 workflow observations: 300 controlled and 72 post-fix Production. The 56 pre-fix Production observations are preserved separately, bringing total successful live workflow observations to 428, below the 500-call limit. During execution, 150 sandbox-blocked local attempts produced no successful live API calls and were overwritten rather than graded. Actual controlled direct OpenAI cost is approximately USD 0.175522, below the USD 10 limit, using the price snapshot recorded at https://openai.com/index/introducing-gpt-5-4-mini-and-nano/; Production token usage is not exposed. Semantic reranking remained disabled. The application sets no reasoning effort, temperature, or maximum output-token parameter, and uses no API-enforced structured-output schema; those values were omitted consistently rather than invented.

## 5. Static Verification Results

| Check | Result | Exit | Duration ms | Counts/detail | Command |
|---|---:|---:|---:|---|---|
| full-test-suite | PASS | 0 | 26801 | 202 tests | `node --test` |
| focused-eia-tests | PASS | 0 | 19680 | 186 tests | `node --test tests\eia-aggregation-hierarchy-proof.test.js tests\eia-aggregation-hierarchy-registry.test.js tests\eia-aggregation-hierarchy-shadow.test.js tests\eia-candidate-api.test.js tests\eia-candidate-pipeline.test.js tests\eia-contract.test.js tests\eia-hierarchy-ranking.test.js tests\eia-intent-routing.test.js tests\eia-live-model-comparison.test.js tests\eia-local-ranking.test.js tests\eia-local-retrieval.test.js tests\eia-metadata-build.test.js tests\eia-metadata-contract.test.js tests\eia-metadata-enumeration-proof.test.js tests\eia-phase4a-regression.test.js tests\eia-plant-hybrid.test.js tests\eia-query-interpretation.test.js tests\eia-ranking-benchmark.test.js tests\eia-result-certainty.test.js tests\eia-semantic-reranking.test.js tests\eia-vercel-packaging.test.js` |
| hierarchy-proof-test | PASS | 0 | 3381 | 6 tests | `node --test tests/eia-aggregation-hierarchy-proof.test.js` |
| existing-ranking-benchmark | PASS | 0 | 9013 | 2 tests | `node --test tests/eia-ranking-benchmark.test.js` |
| metadata-hierarchy-audit | PASS | 0 | 2449 | see artifact output | `node scripts/eia-metadata/audit-aggregation-hierarchy.js` |
| reviewed-registry-audit | PASS | 0 | 1733 | see artifact output | `node scripts/eia-metadata/audit-aggregation-hierarchy-registry.js` |
| production-build-current | PASS | 0 | 30034 | see artifact output | `C:\WINDOWS\system32\cmd.exe /d /s /c npm.cmd run build` |
| production-build-baseline | PASS | 0 | 28883 | see artifact output | `C:\WINDOWS\system32\cmd.exe /d /s /c npm.cmd run build` |
| git-status | PASS | 0 | 317 | see artifact output | `git status --short --branch` |
| javascript-syntax | PASS | 0 | 15090 | 0 syntax failures | `node --check (63 files)` |

All 10 required checks passed. The full suite, focused EIA suite, hierarchy proof, existing ranking benchmark, current build, frozen-baseline build, both hierarchy audits, 63-file syntax pass, and git-status capture are preserved with complete stdout/stderr in `static-verification.json`.

The Phase 1B selector audit scanned 254,499 records and found zero embedded aggregate/component relationships. The separately reviewed registry contains 52 formula-backed relationships, 259 verified component edges, and 311 exact candidate records. These are separate evidence layers: labels/facets still cannot invent hierarchy, while the approved registry can support its narrow post-ranker.

## 6. Deterministic Ranking Results

- Development queries: 50
- Repeatability: 100%
- Shared-pool compatible comparisons: 39
- Shared-pool ranking changes: 21
- Hierarchy sweep: 52/52 pass, 0 fail
- State/DC targets expected to apply: 51
- National route-limited control: 1

Clarification blocked ranking for all 11 deterministic cases where the current architecture raised clarification. The shared-pool adapter accepted the same current canonical candidate pool in all 39 eligible comparisons; 21 produced a changed ordering. Candidate-pool identities, structured intent, ranker outputs, and eligibility outputs are serialized separately so retrieval and ranking differences are not conflated.

Automated safety attribution found two critical current-query defects: H7-D033 at concept-pair construction/semantic eligibility and H7-D041 at clarification/geography resolution. H7-D002 is a material ranking/presentation question, not an automatically declared regression. The 52-target sweep passed all 51 state/DC applications and the expected U.S. route-limited control; renewable and fossil component controls remained components.

Objective draft grading is diagnostic only because most records have not yet received human approval. The rules-only current hierarchy-on draft result was 47/50 all-check pass; the three mismatches are H7-D002, H7-D033, and H7-D041.

## 7. Controlled Workflow Results

| Arm | Captured | Success | Clarification | Empty top five | p50 latency ms | p95 latency ms |
|---|---:|---:|---:|---:|---:|---:|
| Historical baseline | 50 | 50 | 10 | 38 | 3017.429 | 4786.86 |
| Current hierarchy off | 50 | 50 | 11 | 15 | 2955.309 | 4187.703 |
| Current hierarchy on | 50 | 50 | 11 | 15 | 2955.309 | 4187.703 |

Controlled API usage:

- Baseline: 150 calls, 74592 input tokens, 58545 output tokens, estimated USD 0.0881
- Current: 150 calls, 74592 input tokens, 58003 output tokens, estimated USD 0.087422

Three-repetition completeness and final-output stability:

- Historical baseline: 150/150 observations; 50/50 queries have all three; 49/50 stable final signatures; variable=H7-D041.
- Current hierarchy on: 150/150 observations; 50/50 queries have all three; 50/50 stable final signatures; variable=none.
- Production selective repetitions: 11/11 repeated queries have stable canonical intent and final-result signatures; unstable=none. Each has three observations.

Repeated samples are retained as repeated observations of the same query and are not counted as independent queries.

Objective draft checks, pending human approval:

| Arm | Cases | All checks passed | Cases with mismatch | Check pass rate |
|---|---:|---:|---:|---:|
| Historical baseline | 50 | 19 | 31 | 82.87% |
| Current hierarchy off | 50 | 39 | 11 | 93.36% |
| Current hierarchy on | 50 | 47 | 3 | 97.67% |
| Production | 50 | 47 | 3 | 97.67% |

Route counts: baseline={"international":48,"none":2}; current={"domestic":14,"seds":25,"international":11}; production={"domestic":13,"seds":26,"international":11}.

### Objective Checks By Stage

| Check | Historical baseline | Current off | Current on | Production |
|---|---:|---:|---:|---:|
| clarification | 48/50 pass | 49/50 pass | 49/50 pass | 49/50 pass |
| clarification-blocks-ranking | 4/4 pass | 3/4 pass | 3/4 pass | 3/4 pass |
| concept-pairs | 38/38 pass | 38/38 pass | 38/38 pass | 38/38 pass |
| forbidden-top-five | 3/3 pass | 3/3 pass | 2/3 pass | 2/3 pass |
| frequency | 16/16 pass | 16/16 pass | 16/16 pass | 16/16 pass |
| geography | 43/44 pass | 44/44 pass | 44/44 pass | 44/44 pass |
| hierarchy-preference | not graded | 41/50 pass | 48/50 pass | 48/50 pass |
| original-query-byte-preserved | 50/50 pass | 50/50 pass | 50/50 pass | 50/50 pass |
| required-top-five | 0/11 pass | 11/11 pass | 10/11 pass | 10/11 pass |
| required-top-one | 0/11 pass | 2/11 pass | 10/11 pass | 10/11 pass |
| route | 6/24 pass | 24/24 pass | 24/24 pass | 24/24 pass |

These checks cover authoritative raw preservation, clarification, geography, route, concept pairs, frequency, required/forbidden result families, clarification suppression, and hierarchy preference. They do not substitute for human semantic judgments.

### Current Results By Query Category

| Category | Historical baseline | Current on | Production |
|---|---:|---:|---:|
| adversarial | 0/2 cases; 5/7 checks | 1/2 cases; 7/9 checks | 1/2 cases; 7/9 checks |
| ambiguous-geography | 0/1 cases; 2/3 checks | 0/1 cases; 2/4 checks | 0/1 cases; 2/4 checks |
| ambiguous-product | 2/2 cases; 5/5 checks | 2/2 cases; 7/7 checks | 2/2 cases; 7/7 checks |
| clarification | 10/12 cases; 36/38 checks | 11/12 cases; 48/50 checks | 11/12 cases; 48/50 checks |
| clear | 3/3 cases; 15/15 checks | 3/3 cases; 18/18 checks | 3/3 cases; 18/18 checks |
| consumption | 0/1 cases; 4/5 checks | 1/1 cases; 6/6 checks | 1/1 cases; 6/6 checks |
| date-coverage | 0/1 cases; 4/5 checks | 1/1 cases; 6/6 checks | 1/1 cases; 6/6 checks |
| domestic | 3/11 cases; 43/52 checks | 11/11 cases; 63/63 checks | 11/11 cases; 63/63 checks |
| electricity | 2/7 cases; 29/34 checks | 7/7 cases; 41/41 checks | 7/7 cases; 41/41 checks |
| exact-identifier | 1/1 cases; 3/3 checks | 1/1 cases; 4/4 checks | 1/1 cases; 4/4 checks |
| exclusion | 2/3 cases; 12/13 checks | 3/3 cases; 16/16 checks | 3/3 cases; 16/16 checks |
| fossil-fuel | 0/1 cases; 6/8 checks | 1/1 cases; 9/9 checks | 1/1 cases; 9/9 checks |
| frequency | 2/4 cases; 17/20 checks | 4/4 cases; 24/24 checks | 4/4 cases; 24/24 checks |
| frequency-fallback | 0/2 cases; 8/10 checks | 1/2 cases; 10/12 checks | 1/2 cases; 10/12 checks |
| hierarchy-component-control | 0/3 cases; 18/24 checks | 2/3 cases; 24/27 checks | 2/3 cases; 24/27 checks |
| hierarchy-eligible | 0/8 cases; 40/56 checks | 8/8 cases; 64/64 checks | 8/8 cases; 64/64 checks |
| hierarchy-route-control | 0/1 cases; 3/4 checks | 1/1 cases; 5/5 checks | 1/1 cases; 5/5 checks |
| international | 6/10 cases; 46/50 checks | 10/10 cases; 60/60 checks | 10/10 cases; 60/60 checks |
| missing-activity | 4/4 cases; 12/12 checks | 4/4 cases; 16/16 checks | 4/4 cases; 16/16 checks |
| missing-geography | 1/1 cases; 4/4 checks | 1/1 cases; 5/5 checks | 1/1 cases; 5/5 checks |
| missing-product | 1/1 cases; 3/3 checks | 1/1 cases; 4/4 checks | 1/1 cases; 4/4 checks |
| misspelling | 0/2 cases; 8/10 checks | 2/2 cases; 12/12 checks | 2/2 cases; 12/12 checks |
| multiple-concept-pairs | 3/4 cases; 16/17 checks | 4/4 cases; 21/21 checks | 4/4 cases; 21/21 checks |
| multiple-geographies | 1/2 cases; 9/10 checks | 2/2 cases; 12/12 checks | 2/2 cases; 12/12 checks |
| natural-gas | 1/8 cases; 33/41 checks | 8/8 cases; 49/49 checks | 8/8 cases; 49/49 checks |
| no-result | 2/2 cases; 7/7 checks | 2/2 cases; 9/9 checks | 2/2 cases; 9/9 checks |
| nuclear | 0/1 cases; 6/8 checks | 0/1 cases; 6/9 checks | 0/1 cases; 6/9 checks |
| pair-scope | 1/1 cases; 4/4 checks | 1/1 cases; 5/5 checks | 1/1 cases; 5/5 checks |
| petroleum | 3/4 cases; 19/20 checks | 4/4 cases; 24/24 checks | 4/4 cases; 24/24 checks |
| production | 0/2 cases; 8/11 checks | 2/2 cases; 13/13 checks | 2/2 cases; 13/13 checks |
| renewable | 0/2 cases; 10/13 checks | 2/2 cases; 15/15 checks | 2/2 cases; 15/15 checks |
| sector | 0/2 cases; 8/10 checks | 2/2 cases; 12/12 checks | 2/2 cases; 12/12 checks |
| seds | 0/16 cases; 79/106 checks | 14/16 cases; 117/122 checks | 14/16 cases; 117/122 checks |
| shared-activity | 1/1 cases; 4/4 checks | 1/1 cases; 5/5 checks | 1/1 cases; 5/5 checks |
| shared-product | 1/1 cases; 4/4 checks | 1/1 cases; 5/5 checks | 1/1 cases; 5/5 checks |
| storage | 0/1 cases; 4/5 checks | 1/1 cases; 6/6 checks | 1/1 cases; 6/6 checks |
| total-energy | 0/9 cases; 44/60 checks | 8/9 cases; 67/69 checks | 8/9 cases; 67/69 checks |
| unit | 1/2 cases; 9/10 checks | 2/2 cases; 12/12 checks | 2/2 cases; 12/12 checks |
| unresolved-pair-scope | 0/1 cases; 3/4 checks | 1/1 cases; 5/5 checks | 1/1 cases; 5/5 checks |
| unsupported-qualifier | 3/4 cases; 14/15 checks | 4/4 cases; 19/19 checks | 4/4 cases; 19/19 checks |
| verified-relationship-route-limited | 0/1 cases; 5/6 checks | 1/1 cases; 7/7 checks | 1/1 cases; 7/7 checks |

Categories overlap, so totals must not be summed as independent queries.

### Results By Resolved Route

| Route | Historical baseline | Current on | Production |
|---|---:|---:|---:|
| domestic | 0 cases | 14 cases; 4 clarification; 7 empty | 13 cases; 4 clarification; 7 empty |
| international | 48 cases; 8 clarification; 36 empty | 11 cases; 1 clarification; 2 empty | 11 cases; 1 clarification; 2 empty |
| none | 2 cases; 2 clarification; 2 empty | 0 cases | 0 cases |
| seds | 0 cases | 25 cases; 6 clarification; 6 empty | 26 cases; 6 clarification; 6 empty |

### Result-Certainty Field Completeness

| Certainty field | Current on | Production |
|---|---:|---:|
| semanticCompatibility | 147/147 | 141/141 |
| routeRelation | 0/147 | 0/141 |
| frequencyRelation | 147/147 | 141/141 |
| unitRelation | 147/147 | 141/141 |
| coverageRelation | 147/147 | 141/141 |
| aggregationRelation | 147/147 | 141/141 |
| hierarchyEvidenceStatus | 147/147 | 141/141 |
| presentationClass | 147/147 | 141/141 |

The historical baseline did not implement the certainty contract. Current and production candidates expose route-family metadata but not an explicit `certainty.routeRelation`; therefore the claimed separate route-certainty dimension is incomplete. No missing value was silently inferred by the benchmark.

## 8. Deployed Comparison

| Arm | Captured | Success | Clarification | Empty top five | p50 latency ms | p95 latency ms |
|---|---:|---:|---:|---:|---:|---:|
| Production | 50 | 50 | 11 | 15 | 3654.219 | 5780.66 |

Production commit, deployment, and configured model were identified. The configured `gpt-5.4-nano-2026-03-17` is the exact controlled snapshot. Diagnostic application/upstream status is HTTP 200; the initial post-fix pass returned 50/50 successful search responses, with 49 OpenAI interpretations and 1 deterministic validation fallback.

Production p50/p95 are operational measurements only and are not compared directly with local latency. Stable candidate identifiers and certainty data were exposed. Production differs from controlled current on 8 final signatures: H7-D002, H7-D016, H7-D019, H7-D020, H7-D022, H7-D041, H7-D046, H7-D050. The 11 changed-or-failed cases were repeated twice; 11/11 retained stable canonical intent and final output. Response headers, timestamps, and repetitions are retained in `deployed-results-r*.jsonl` and `production-operational-evidence.json`.

Production and controlled current use the same commit and pinned model. Production is now valid as an operational gate and a secondary same-code/model comparison, but infrastructure and black-box prompt visibility still prevent treating it as the frozen causal baseline. The pre-fix invalid-model results remain preserved separately and are excluded from post-fix semantic metrics.

## 9. Per-Query Difference Register

| Query | Affected comparisons | Changed stage/dimension | Top-one by arm | Top-five IDs by arm | Clarification | Semantic-safety difference | Top hierarchy status | Human packet |
|---|---|---|---|---|---|---|---|---:|
| H7-D001 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=ELEC.GEN.ALL-CA-1.M<br>B_ON=ELEC.GEN.ALL-CA-1.M<br>C=ELEC.GEN.ALL-CA-1.M | A=none<br>B_OFF=ELEC.GEN.ALL-CA-1.M,ELEC.GEN.ALL-CA-2.M,ELEC.GEN.ALL-CA-3.M,ELEC.GEN.ALL-CA-4.M,ELEC.GEN.ALL-CA-5.M<br>B_ON=ELEC.GEN.ALL-CA-1.M,ELEC.GEN.ALL-CA-2.M,ELEC.GEN.ALL-CA-3.M,ELEC.GEN.ALL-CA-4.M,ELEC.GEN.ALL-CA-5.M<br>C=ELEC.GEN.ALL-CA-1.M,ELEC.GEN.ALL-CA-2.M,ELEC.GEN.ALL-CA-3.M,ELEC.GEN.ALL-CA-4.M,ELEC.GEN.ALL-CA-5.M | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D002 | A vs B_ON; B_OFF vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.TX.A<br>B_ON=SEDS.TETCB.TX.A<br>C=SEDS.TETCB.TX.A | A=none<br>B_OFF=SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A,SEDS.TEICB.TX.A<br>B_ON=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A<br>C=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D003 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=NG.N9050NM2.M<br>B_ON=NG.N9050NM2.M<br>C=NG.N9050NM2.M | A=none<br>B_OFF=NG.N9050NM2.M,NG.NA1160_SNM_2.M,NG.NA1150_SNM_2.M<br>B_ON=NG.N9050NM2.M,NG.NA1160_SNM_2.M,NG.NA1150_SNM_2.M<br>C=NG.N9050NM2.M,NG.NA1160_SNM_2.M,NG.NA1150_SNM_2.M | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D004 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=NG.N3010NY2.M<br>B_ON=NG.N3010NY2.M<br>C=NG.N3010NY2.M | A=none<br>B_OFF=NG.N3010NY2.M<br>B_ON=NG.N3010NY2.M<br>C=NG.N3010NY2.M | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D005 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=ELEC.GEN.WND-IA-1.M<br>B_ON=ELEC.GEN.WND-IA-1.M<br>C=ELEC.GEN.WND-IA-1.M | A=none<br>B_OFF=ELEC.GEN.WND-IA-1.M,ELEC.GEN.WND-IA-2.M,ELEC.GEN.WND-IA-4.M,ELEC.GEN.WND-IA-94.M,ELEC.GEN.WND-IA-96.M<br>B_ON=ELEC.GEN.WND-IA-1.M,ELEC.GEN.WND-IA-2.M,ELEC.GEN.WND-IA-4.M,ELEC.GEN.WND-IA-94.M,ELEC.GEN.WND-IA-96.M<br>C=ELEC.GEN.WND-IA-1.M,ELEC.GEN.WND-IA-2.M,ELEC.GEN.WND-IA-4.M,ELEC.GEN.WND-IA-94.M,ELEC.GEN.WND-IA-96.M | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D006 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D007 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D008 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=NG.NW2_EPG0_SWO_R48_BCF.W<br>B_ON=NG.NW2_EPG0_SWO_R48_BCF.W<br>C=NG.NW2_EPG0_SWO_R48_BCF.W | A=,,,,<br>B_OFF=NG.NW2_EPG0_SWO_R48_BCF.W<br>B_ON=NG.NW2_EPG0_SWO_R48_BCF.W<br>C=NG.NW2_EPG0_SWO_R48_BCF.W | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D009 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.5-2-BRA-MT.A<br>B_ON=INTL.5-2-BRA-MT.A<br>C=INTL.5-2-BRA-MT.A | A=,,,,<br>B_OFF=INTL.5-2-BRA-MT.A,INTL.54-2-BRA-MT.A,INTL.67-2-BRA-MT.A,INTL.65-13-BRA-TBPD.A,INTL.66-13-BRA-TBPD.A<br>B_ON=INTL.5-2-BRA-MT.A,INTL.54-2-BRA-MT.A,INTL.67-2-BRA-MT.A,INTL.65-13-BRA-TBPD.A,INTL.66-13-BRA-TBPD.A<br>C=INTL.5-2-BRA-MT.A,INTL.54-2-BRA-MT.A,INTL.67-2-BRA-MT.A,INTL.65-13-BRA-TBPD.A,INTL.66-13-BRA-TBPD.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D010 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.116-12-JPN-BKWH.A<br>B_ON=INTL.116-12-JPN-BKWH.A<br>C=INTL.116-12-JPN-BKWH.A | A=,,,,<br>B_OFF=INTL.116-12-JPN-BKWH.A,INTL.36-12-JPN-BKWH.A<br>B_ON=INTL.116-12-JPN-BKWH.A,INTL.36-12-JPN-BKWH.A<br>C=INTL.116-12-JPN-BKWH.A,INTL.36-12-JPN-BKWH.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D011 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.4418-1-DEU-QBTU.A<br>B_ON=INTL.4418-1-DEU-QBTU.A<br>C=INTL.4418-1-DEU-QBTU.A | A=,,,,<br>B_OFF=INTL.4418-1-DEU-QBTU.A,INTL.79-1-DEU-MT.A,INTL.4418-2-DEU-QBTU.A,INTL.79-2-DEU-MT.A<br>B_ON=INTL.4418-1-DEU-QBTU.A,INTL.79-1-DEU-MT.A,INTL.4418-2-DEU-QBTU.A,INTL.79-2-DEU-MT.A<br>C=INTL.4418-1-DEU-QBTU.A,INTL.79-1-DEU-MT.A,INTL.4418-2-DEU-QBTU.A,INTL.79-2-DEU-MT.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D012 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.2-12-BRA-BKWH.A<br>B_ON=INTL.2-12-BRA-BKWH.A<br>C=INTL.2-12-BRA-BKWH.A | A=,,,,<br>B_OFF=INTL.2-12-BRA-BKWH.A,INTL.116-12-BRA-BKWH.A,INTL.117-12-BRA-BKWH.A,INTL.27-12-BRA-BKWH.A,INTL.28-12-BRA-BKWH.A<br>B_ON=INTL.2-12-BRA-BKWH.A,INTL.116-12-BRA-BKWH.A,INTL.117-12-BRA-BKWH.A,INTL.27-12-BRA-BKWH.A,INTL.28-12-BRA-BKWH.A<br>C=INTL.2-12-BRA-BKWH.A,INTL.116-12-BRA-BKWH.A,INTL.117-12-BRA-BKWH.A,INTL.27-12-BRA-BKWH.A,INTL.28-12-BRA-BKWH.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D013 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=NG.N9050TX2.M<br>B_ON=NG.N9050TX2.M<br>C=NG.N9050TX2.M | A=none<br>B_OFF=NG.N9050TX2.M,NG.NA1160_STX_2.M,NG.NA1150_STX_2.M<br>B_ON=NG.N9050TX2.M,NG.NA1160_STX_2.M,NG.NA1150_STX_2.M<br>C=NG.N9050TX2.M,NG.NA1160_STX_2.M,NG.NA1150_STX_2.M | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D014 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D015 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D016 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.NGMPB.TX.A<br>B_ON=SEDS.NGMPB.TX.A<br>C=SEDS.NGMPB.TX.A | A=none<br>B_OFF=SEDS.NGMPB.TX.A,SEDS.NGMPK.TX.A<br>B_ON=SEDS.NGMPB.TX.A,SEDS.NGMPK.TX.A<br>C=SEDS.NGMPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D017 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D018 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D019 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.CLPRB.TX.A<br>B_ON=SEDS.CLPRB.TX.A<br>C=SEDS.CLPRB.TX.A | A=none<br>B_OFF=SEDS.CLPRB.TX.A,SEDS.CLPRK.TX.A,SEDS.NGCCB.TX.A,SEDS.NGRCB.TX.A,SEDS.NGTCB.TX.A<br>B_ON=SEDS.CLPRB.TX.A,SEDS.CLPRK.TX.A,SEDS.NGCCB.TX.A,SEDS.NGRCB.TX.A,SEDS.NGTCB.TX.A<br>C=SEDS.CLPRB.TX.A,SEDS.NGCCB.TX.A,SEDS.NGRCB.TX.A,SEDS.NGTCB.TX.A,SEDS.NGTPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D020 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.COPRK.TX.A<br>B_ON=SEDS.COPRK.TX.A<br>C=SEDS.PAPRB.TX.A | A=none<br>B_OFF=SEDS.COPRK.TX.A,SEDS.PAPRB.TX.A,SEDS.B1PRB.TX.A,SEDS.NGMPB.TX.A,SEDS.NGMPK.TX.A<br>B_ON=SEDS.COPRK.TX.A,SEDS.PAPRB.TX.A,SEDS.B1PRB.TX.A,SEDS.NGMPB.TX.A,SEDS.NGMPK.TX.A<br>C=SEDS.PAPRB.TX.A,SEDS.B1PRB.TX.A,SEDS.NGMPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D021 | A vs B_ON | clarification, route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=no; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D022 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.NGMPB.CA.A<br>B_ON=SEDS.NGMPB.CA.A<br>C=SEDS.NGMPB.CA.A | A=none<br>B_OFF=SEDS.NGMPB.CA.A,SEDS.NGMPK.CA.A<br>B_ON=SEDS.NGMPB.CA.A,SEDS.NGMPK.CA.A<br>C=SEDS.NGMPB.CA.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D023 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.TX.A<br>B_ON=SEDS.TETCB.TX.A<br>C=SEDS.TETCB.TX.A | A=none<br>B_OFF=SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A,SEDS.TEICB.TX.A<br>B_ON=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A<br>C=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D024 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.CA.A<br>B_ON=SEDS.TETCB.CA.A<br>C=SEDS.TETCB.CA.A | A=none<br>B_OFF=SEDS.TEACB.CA.A,SEDS.TEAPB.CA.A,SEDS.TECCB.CA.A,SEDS.TECPB.CA.A,SEDS.TEICB.CA.A<br>B_ON=SEDS.TETCB.CA.A,SEDS.TEACB.CA.A,SEDS.TEAPB.CA.A,SEDS.TECCB.CA.A,SEDS.TECPB.CA.A<br>C=SEDS.TETCB.CA.A,SEDS.TEACB.CA.A,SEDS.TEAPB.CA.A,SEDS.TECCB.CA.A,SEDS.TECPB.CA.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D025 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.DC.A<br>B_ON=SEDS.TETCB.DC.A<br>C=SEDS.TETCB.DC.A | A=none<br>B_OFF=SEDS.TEACB.DC.A,SEDS.TEAPB.DC.A,SEDS.TECCB.DC.A,SEDS.TECPB.DC.A,SEDS.TEICB.DC.A<br>B_ON=SEDS.TETCB.DC.A,SEDS.TEACB.DC.A,SEDS.TEAPB.DC.A,SEDS.TECCB.DC.A,SEDS.TECPB.DC.A<br>C=SEDS.TETCB.DC.A,SEDS.TEACB.DC.A,SEDS.TEAPB.DC.A,SEDS.TECCB.DC.A,SEDS.TECPB.DC.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D026 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.AK.A<br>B_ON=SEDS.TETCB.AK.A<br>C=SEDS.TETCB.AK.A | A=none<br>B_OFF=SEDS.TEACB.AK.A,SEDS.TEAPB.AK.A,SEDS.TECCB.AK.A,SEDS.TECPB.AK.A,SEDS.TEICB.AK.A<br>B_ON=SEDS.TETCB.AK.A,SEDS.TEACB.AK.A,SEDS.TEAPB.AK.A,SEDS.TECCB.AK.A,SEDS.TECPB.AK.A<br>C=SEDS.TETCB.AK.A,SEDS.TEACB.AK.A,SEDS.TEAPB.AK.A,SEDS.TECCB.AK.A,SEDS.TECPB.AK.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D027 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.HI.A<br>B_ON=SEDS.TETCB.HI.A<br>C=SEDS.TETCB.HI.A | A=none<br>B_OFF=SEDS.TEACB.HI.A,SEDS.TEAPB.HI.A,SEDS.TECCB.HI.A,SEDS.TECPB.HI.A,SEDS.TEICB.HI.A<br>B_ON=SEDS.TETCB.HI.A,SEDS.TEACB.HI.A,SEDS.TEAPB.HI.A,SEDS.TECCB.HI.A,SEDS.TECPB.HI.A<br>C=SEDS.TETCB.HI.A,SEDS.TEACB.HI.A,SEDS.TEAPB.HI.A,SEDS.TECCB.HI.A,SEDS.TECPB.HI.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D028 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.NY.A<br>B_ON=SEDS.TETCB.NY.A<br>C=SEDS.TETCB.NY.A | A=none<br>B_OFF=SEDS.TEACB.NY.A,SEDS.TEAPB.NY.A,SEDS.TECCB.NY.A,SEDS.TECPB.NY.A,SEDS.TEICB.NY.A<br>B_ON=SEDS.TETCB.NY.A,SEDS.TEACB.NY.A,SEDS.TEAPB.NY.A,SEDS.TECCB.NY.A,SEDS.TECPB.NY.A<br>C=SEDS.TETCB.NY.A,SEDS.TEACB.NY.A,SEDS.TEAPB.NY.A,SEDS.TECCB.NY.A,SEDS.TECPB.NY.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D029 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.WY.A<br>B_ON=SEDS.TETCB.WY.A<br>C=SEDS.TETCB.WY.A | A=none<br>B_OFF=SEDS.TEACB.WY.A,SEDS.TEAPB.WY.A,SEDS.TECCB.WY.A,SEDS.TECPB.WY.A,SEDS.TEICB.WY.A<br>B_ON=SEDS.TETCB.WY.A,SEDS.TEACB.WY.A,SEDS.TEAPB.WY.A,SEDS.TECCB.WY.A,SEDS.TECPB.WY.A<br>C=SEDS.TETCB.WY.A,SEDS.TEACB.WY.A,SEDS.TEAPB.WY.A,SEDS.TECCB.WY.A,SEDS.TECPB.WY.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D030 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=,,,,<br>B_OFF=none<br>B_ON=none<br>C=none | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D031 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.RETCB.TX.A<br>B_ON=SEDS.RETCB.TX.A<br>C=SEDS.RETCB.TX.A | A=none<br>B_OFF=SEDS.RETCB.TX.A,SEDS.REACB.TX.A,SEDS.RECCB.TX.A,SEDS.REICB.TX.A,SEDS.RERCB.TX.A<br>B_ON=SEDS.RETCB.TX.A,SEDS.REACB.TX.A,SEDS.RECCB.TX.A,SEDS.REICB.TX.A,SEDS.RERCB.TX.A<br>C=SEDS.RETCB.TX.A,SEDS.REACB.TX.A,SEDS.RECCB.TX.A,SEDS.REICB.TX.A,SEDS.RERCB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D032 | A vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.FFTCB.TX.A<br>B_ON=SEDS.FFTCB.TX.A<br>C=SEDS.FFTCB.TX.A | A=none<br>B_OFF=SEDS.FFTCB.TX.A,SEDS.BDSAB.TX.A,SEDS.CLSCB.TX.A,SEDS.CLISB.TX.A,SEDS.CLOSB.TX.A<br>B_ON=SEDS.FFTCB.TX.A,SEDS.BDSAB.TX.A,SEDS.CLSCB.TX.A,SEDS.CLISB.TX.A,SEDS.CLOSB.TX.A<br>C=SEDS.FFTCB.TX.A,SEDS.BDSAB.TX.A,SEDS.CLSCB.TX.A,SEDS.CLISB.TX.A,SEDS.CLOSB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D033 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.TX.A<br>B_ON=SEDS.TETCB.TX.A<br>C=SEDS.TETCB.TX.A | A=none<br>B_OFF=SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A,SEDS.TEICB.TX.A<br>B_ON=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A<br>C=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | concept-pair construction / semantic eligibility | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D034 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D035 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.TX.A<br>B_ON=SEDS.TETCB.TX.A<br>C=SEDS.TETCB.TX.A | A=none<br>B_OFF=SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A,SEDS.TEICB.TX.A<br>B_ON=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A<br>C=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D036 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D037 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=,,,,<br>B_OFF=none<br>B_ON=none<br>C=none | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D038 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.26-1-CAN-BCF.A<br>B_ON=INTL.26-1-CAN-BCF.A<br>C=INTL.26-1-CAN-BCF.A | A=,,,,<br>B_OFF=INTL.26-1-CAN-BCF.A,INTL.3-1-CAN-BCF.A,INTL.43-1-CAN-BCF.A,INTL.48-1-CAN-BCF.A,INTL.58-1-CAN-TBPD.M<br>B_ON=INTL.26-1-CAN-BCF.A,INTL.3-1-CAN-BCF.A,INTL.43-1-CAN-BCF.A,INTL.48-1-CAN-BCF.A,INTL.58-1-CAN-TBPD.M<br>C=INTL.26-1-CAN-BCF.A,INTL.3-1-CAN-BCF.A,INTL.43-1-CAN-BCF.A,INTL.48-1-CAN-BCF.A,INTL.58-1-CAN-TBPD.M | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D039 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.5-2-MEX-MT.A<br>B_ON=INTL.5-2-MEX-MT.A<br>C=INTL.5-2-MEX-MT.A | A=,,,,<br>B_OFF=INTL.5-2-MEX-MT.A,INTL.54-2-MEX-MT.A,INTL.67-2-MEX-MT.A,INTL.65-13-MEX-TBPD.A,INTL.66-13-MEX-MT.A<br>B_ON=INTL.5-2-MEX-MT.A,INTL.54-2-MEX-MT.A,INTL.67-2-MEX-MT.A,INTL.65-13-MEX-TBPD.A,INTL.66-13-MEX-MT.A<br>C=INTL.5-2-MEX-MT.A,INTL.54-2-MEX-MT.A,INTL.67-2-MEX-MT.A,INTL.65-13-MEX-TBPD.A,INTL.66-13-MEX-MT.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D040 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.2-12-FRA-BKWH.A<br>B_ON=INTL.2-12-FRA-BKWH.A<br>C=INTL.2-12-FRA-BKWH.A | A=,,,,<br>B_OFF=INTL.2-12-FRA-BKWH.A,INTL.116-12-FRA-BKWH.A,INTL.117-12-FRA-BKWH.A,INTL.27-12-FRA-BKWH.A,INTL.28-12-FRA-BKWH.A<br>B_ON=INTL.2-12-FRA-BKWH.A,INTL.116-12-FRA-BKWH.A,INTL.117-12-FRA-BKWH.A,INTL.27-12-FRA-BKWH.A,INTL.28-12-FRA-BKWH.A<br>C=INTL.2-12-FRA-BKWH.A,INTL.116-12-FRA-BKWH.A,INTL.117-12-FRA-BKWH.A,INTL.27-12-FRA-BKWH.A,INTL.28-12-FRA-BKWH.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D041 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.NGMPB.GA.A<br>B_ON=SEDS.NGMPB.GA.A<br>C=SEDS.NGMPB.GA.A | A=none<br>B_OFF=SEDS.NGMPB.GA.A,SEDS.NGMPK.GA.A<br>B_ON=SEDS.NGMPB.GA.A,SEDS.NGMPK.GA.A<br>C=SEDS.NGMPB.GA.A | A=no; B_OFF=no; B_ON=no; C=no | clarification / geography resolution | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D042 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D043 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D044 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=required; B_OFF=required; B_ON=required; C=required | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D045 | A vs B_ON | route | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=none<br>B_OFF=none<br>B_ON=none<br>C=none | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D046 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.NGMPB.TX.A<br>B_ON=SEDS.NGMPB.TX.A<br>C=SEDS.NGMPB.TX.A | A=none<br>B_OFF=SEDS.NGMPB.TX.A,SEDS.NGMPK.TX.A<br>B_ON=SEDS.NGMPB.TX.A,SEDS.NGMPK.TX.A<br>C=SEDS.NGMPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |
| H7-D047 | A vs B_ON; B_OFF vs B_ON | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.TEACB.TX.A<br>B_ON=SEDS.TETCB.TX.A<br>C=SEDS.TETCB.TX.A | A=none<br>B_OFF=SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A,SEDS.TEICB.TX.A<br>B_ON=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A<br>C=SEDS.TETCB.TX.A,SEDS.TEACB.TX.A,SEDS.TEAPB.TX.A,SEDS.TECCB.TX.A,SEDS.TECPB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=observation_validated; C=observation_validated | yes |
| H7-D048 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.5-2-BRA-MT.A<br>B_ON=INTL.5-2-BRA-MT.A<br>C=INTL.5-2-BRA-MT.A | A=,,,,<br>B_OFF=INTL.5-2-BRA-MT.A,INTL.54-2-BRA-MT.A,INTL.67-2-BRA-MT.A,INTL.65-13-BRA-TBPD.A,INTL.66-13-BRA-TBPD.A<br>B_ON=INTL.5-2-BRA-MT.A,INTL.54-2-BRA-MT.A,INTL.67-2-BRA-MT.A,INTL.65-13-BRA-TBPD.A,INTL.66-13-BRA-TBPD.A<br>C=INTL.5-2-BRA-MT.A,INTL.54-2-BRA-MT.A,INTL.67-2-BRA-MT.A,INTL.65-13-BRA-TBPD.A,INTL.66-13-BRA-TBPD.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D049 | A vs B_ON | top-one, top-five, certainty | A=none<br>B_OFF=INTL.2-12-JPN-BKWH.A<br>B_ON=INTL.2-12-JPN-BKWH.A<br>C=INTL.2-12-JPN-BKWH.A | A=,,,,<br>B_OFF=INTL.2-12-JPN-BKWH.A,INTL.116-12-JPN-BKWH.A,INTL.117-12-JPN-BKWH.A,INTL.27-12-JPN-BKWH.A,INTL.28-12-JPN-BKWH.A<br>B_ON=INTL.2-12-JPN-BKWH.A,INTL.116-12-JPN-BKWH.A,INTL.117-12-JPN-BKWH.A,INTL.27-12-JPN-BKWH.A,INTL.28-12-JPN-BKWH.A<br>C=INTL.2-12-JPN-BKWH.A,INTL.116-12-JPN-BKWH.A,INTL.117-12-JPN-BKWH.A,INTL.27-12-JPN-BKWH.A,INTL.28-12-JPN-BKWH.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=legacy-not-reported; B_OFF=none; B_ON=none; C=none | yes |
| H7-D050 | A vs B_ON; B_ON vs C | route, top-one, top-five, certainty | A=none<br>B_OFF=SEDS.CLTCB.TX.A<br>B_ON=SEDS.CLTCB.TX.A<br>C=SEDS.CLTCB.TX.A | A=none<br>B_OFF=SEDS.CLTCB.TX.A,SEDS.CLTXB.TX.A,SEDS.CLACB.TX.A,SEDS.CLACK.TX.A,SEDS.CLCCB.TX.A<br>B_ON=SEDS.CLTCB.TX.A,SEDS.CLTXB.TX.A,SEDS.CLACB.TX.A,SEDS.CLACK.TX.A,SEDS.CLCCB.TX.A<br>C=SEDS.CLTCB.TX.A,SEDS.CLTXB.TX.A,SEDS.CLACB.TX.A,SEDS.CLCCB.TX.A,SEDS.CLPRB.TX.A | A=no; B_OFF=no; B_ON=no; C=no | none detected by automated safety checks | A=none; B_OFF=none; B_ON=none; C=none | yes |

All 50 queries differ across at least one arm because the historical native baseline is International-only while the current architecture spans Domestic, International, and SEDS. This register records differences, not winners. Exact serialized outputs and the per-query unblinding map are in the artifacts.

## 10. Failure and Risk Register

| Query ID | Arm | Stage | Failure | Severity | Deterministic evidence | Likely cause | Promotion impact | Recommended follow-up |
|---|---|---|---|---|---|---|---|---|
| H7-D002 | B_ON | ranking | The verified annual aggregate displaced one member of the previously human-reviewed top five for a monthly request that fell back to annual SEDS. | material | top=SEDS.TETCB.TX.A; hierarchyApplied=true | The approved aggregate tie-break also applies to annual candidates reached through a frequency fallback. | Requires blinded human adjudication; do not label better or worse automatically. | Have humans adjudicate the monthly fallback presentation and add a regression expectation before any code change. |
| H7-D033 | B_ON | concept-pair construction / semantic eligibility | The overlapping phrase 'nuclear energy consumption' created an additional total-energy pair and ranked the total-energy aggregate ahead of the requested nuclear component. | critical | conceptPairs include nuclear/consumption and total energy/consumption; top series SEDS.TETCB.TX.A | Overlapping phrase extraction treated 'energy consumption' as an independent total-energy concept inside 'nuclear energy consumption'. | Blocks the semantic-safety gate until repaired and regression-tested. | Prevent contained generic phrases from creating unrelated concept pairs, then add adversarial parser and eligibility tests. |
| H7-D041 | B_ON | clarification / geography resolution | The ambiguous geography name Georgia was silently resolved to the U.S. state and ranked without clarification. | critical | route=seds; top=SEDS.NGMPB.GA.A | The deterministic geography resolver prefers the U.S. postal/state interpretation without preserving the country alternative. | Blocks the ambiguity-safety gate until a governed state/country clarification is added and tested. | Add governed state/country ambiguity evidence and require clarification when both interpretations are viable. |
| global | B_ON | result-certainty classification | Result certainty does not expose an explicit route-relation classification. | material | 0/147 displayed candidates contain certainty.routeRelation; candidate.route is present only as metadata | The certainty schema omits routeRelation even though the candidate retains a route-family value. | The completed-architecture claim that route certainty is reported separately is not currently true. | Add and test an explicit route-relation field without inferring equivalence across route families. |
| global | B_ON | rollback / architecture discrepancy | The prompt describes candidate mode as awaiting gradual promotion, but the repository has already retired the candidate/legacy feature flag and legacy runtime. | documentary | EIA_CANDIDATE_PIPELINE has no runtime effect; README and promotion signoff require deployment rollback | Legacy retirement intentionally replaced the feature-flag rollback path. | Not a code defect, but the benchmark must use deployment rollback rather than claim a flag off-switch exists. | Keep the discrepancy documented and verify rollback by restoring a previously approved deployment. |

## 11. Human Review Status

See `hoho7HR.md`. 50 changed or control cases await blinded human review. Codex did not label any result set better or worse. Promotion and retention judgment remain pending.

## 12. Promotion-Gate Table

| Gate | Status | Evidence |
|---|---:|---|
| Safety: zero unresolved critical semantic violations | FAIL | H7-D033 and H7-D041 |
| Safety: zero unsupported or mis-scoped hierarchy claims | FAIL | H7-D033 incorrectly activates total-energy hierarchy |
| Safety: zero cross-pair combinations | FAIL | H7-D033 |
| Safety: exclusions respected | PASS | No exclusion draft check failed in the 50-query development set; focused tests pass |
| Safety: no ordinary ranking when clarification is required | FAIL | H7-D041 missed required clarification |
| Safety: correctedQuery never becomes user evidence | PASS | Full suite and byte-preservation checks pass |
| Safety: soft scores never override semantic eligibility | PASS | Focused eligibility tests and shared-pool isolation pass |
| Safety: deterministic repeatability is 100% | PASS | 0 failures |
| Relevance: acceptable top one non-inferior | PENDING | Objective drafts favor current, but blinded human review and holdout remain required |
| Relevance: acceptable top five non-inferior | PENDING | Blinded human review and holdout remain required |
| Relevance: difficult-query safety benefit | PENDING | Three current mismatches require adjudication |
| Relevance: no unadjudicated regression | PENDING | 50 blinded cases await review |
| Clarification: canonical required cases correct | FAIL | Georgia ambiguity was not blocked |
| Clarification: missed clarification no worse | FAIL | At least one current objective-draft miss |
| Clarification: no material unnecessary regression | PENDING | Requires blinded review |
| Clarification: options governed and relevant | PENDING | Not fully graded by this corpus |
| Operational: full test suite passes | PASS | See Section 5 |
| Operational: production build passes | PASS | Current and frozen baseline builds pass |
| Operational: metadata audits pass | PASS | 52/52 hierarchy sweep; both audits pass |
| Operational: rollback is verified | PASS | Legacy flag is intentionally retired; documented rollback restores a verified deployment |
| Operational: development/preview steps documented | PASS | docs/eia-pipeline-promotion-signoff.md |
| Operational: rollback procedure documented | PASS | README and pipeline promotion signoff |
| Operational: deployment has no unexplained critical failure | PASS | Diagnostic and 50/50 searches passed with gpt-5.4-nano-2026-03-17 |
| Contract: all result-certainty dimensions present | FAIL | Missing: routeRelation |
| Hierarchy: 52 reviewed targets behave as approved | PASS | 52/52 passed; U.S. is route-limited |
| Human semantic review | PENDING | 50 blinded cases awaiting review |
| Untouched 150-query holdout | PENDING | Sealed and not executed |

## 13. Commands and Reproducibility

1. `node scripts/eia-benchmark/run-hoho7.js prepare`
2. Extract commit `8f2cb495519db8d60072032a1dc8a2e93c65cef8` to an isolated directory and link the current compatible `node_modules` only for build tooling.
3. `node scripts/eia-benchmark/run-hoho7.js static --baseline-root=<path>`
4. `node scripts/eia-benchmark/run-hoho7.js deterministic --baseline-root=<path>`
5. Run `node --env-file=.env.local scripts/eia-benchmark/run-hoho7.js live-current --repetition=<1|2|3>` for each repetition.
6. Run `node --env-file=.env.local scripts/eia-benchmark/run-hoho7.js live-baseline --baseline-root=<path> --repetition=<1|2|3>` for each repetition.
7. Run `node --env-file=.env.local scripts/eia-benchmark/run-hoho7.js production --repetition=1`, compute the union of changed and failed IDs, then repeat that frozen ID set with `--ids=<comma-separated IDs>` for repetitions 2 and 3.
8. `node scripts/eia-benchmark/run-hoho7.js normalize-artifacts`
9. `node scripts/eia-benchmark/run-hoho7.js report`

Environment assumptions: Node v24.18.0; Windows PowerShell; readable current and frozen metadata; `OPENAI_API_KEY` and `EIA_API_KEY` loaded only at process runtime; production-compatible local session configuration for authenticated black-box requests. The holdout remains sealed unless a later explicit decision opens it.

Primary scripts are `scripts/eia-benchmark/hoho7-corpus.js` and `scripts/eia-benchmark/run-hoho7.js`; contract tests are in `tests/hoho7-benchmark.test.js`. Artifacts and hashes are under `test-artifacts/hoho7/`; see `artifact-hashes.json`. Raw OpenAI response bodies, prompt/request hashes, model fields, usage, request IDs when returned, latency, errors, ranking inputs, ranking outputs, production responses, gold drafts, changed cases, and the private blinding key are preserved. Authorization headers and API keys are never written.

## 14. Final Technical Recommendation

**DO NOT PROMOTE**

The automated benchmark already finds critical blockers, so `DO NOT PROMOTE` is stronger than merely pending human review. Production AI is now operational, removing the deployment/configuration blocker. H7-D033 still violates concept integrity and hierarchy scope; H7-D041 still misses material geography ambiguity; and explicit route certainty remains absent. H7-D002 requires human adjudication rather than an automatic quality label.

The 50-query development phase is diagnostic and cannot support a final statistical superiority claim. Final retention or merge approval requires separately authorized repairs, complete regression tests, a newly frozen code state, completed blinded review, adjudication of every regression, and paired evaluation of the untouched 150-query holdout. If the holdout is opened later, use query-level paired confidence intervals, McNemar-style analysis for binary outcomes, and paired bootstrap intervals for top-five coverage. Repeated model samples must not be treated as independent queries.
