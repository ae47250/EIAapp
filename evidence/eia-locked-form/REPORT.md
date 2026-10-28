# EIA locked-form evaluation

**FAIL against the frozen first-run rule.** 45/48 responses passed both meaning and checks, but the rule also prohibited unexpected clarifications on O1–O9. The single tuned run passed 48/48; it is **tuned on the same queries, not independent** and cannot change the first-run FAIL.

**Data-picking ceiling: 18/24** with a perfect reading (15 data results, 3 required clarifications). The real converter reproduced every non-clarification first result from the hand-written-intent baseline. Both used cached metadata only.

| Run | Set | Meaning | Checks | Right data | Expected clarifications correct | Median model latency | Generation cost, including re-asks |
|---|---|---|---|---|---|---|---|
| First run | Original | 19/20 | 19/20 | 16/20 | 2/2 | 2.658s | $0.00370286 |
| First run | Fresh | 27/28 | 28/28 | 18/28 | 4/4 | 2.616s | $0.00412099 |
| Tuned, same queries | Original | 20/20 | 20/20 | 18/20 | 2/2 | 2.682s | $0.00298121 |
| Tuned, same queries | Fresh | 28/28 | 28/28 | 18/28 | 4/4 | 3.138s | $0.00432535 |

First run: 49 generation calls, including one unsuccessful re-ask. Tuned run: 48 calls, no re-asks. Browser: 4 calls, including one unsuccessful re-ask. Total **101 calls, calculated generation cost $0.01568702** from returned usage, including cache-write premiums and reasoning. First pre-call maximum: $1.831214; revised cumulative maximum: $1.10700828 after prior usage became known. Both are below $2. Token counting returns no billed-usage field; conservative counting-charge reserves were included in the maxima. See [usage reconciliation](usage-reconciliation.json) for corrected costs; original raw records are untouched.

## Interpretation failures

- Original O5, repeat 1 — “energy consumption icealnd”: model left geography empty, marked icealnd unsupported, and asked whether Iceland was meant. Fact checks passed; meaning and the no-unexpected-clarification rule failed.
- Original O7, repeat 1 — “natural gas production and consumption in Texas annually”: model kept both activities correctly but quoted “natural gas consumption”, which is not a contiguous source excerpt. Checks blocked retrieval. The one re-ask repeated the same error. The original-prompt browser check also repeated it twice and showed a validation clarification.
- Fresh F14, repeat 1 — “renewable generation in Texas except hydro”: model excluded both hydro and generation, instead of hydro alone. Schema/fact checks passed; meaning failed. This demonstrates that fact checks do not establish semantic correctness.

The sole E.6 revision added general instructions for unambiguous spelling errors, contiguous quotations, and exclusions limited to explicitly excluded fields. No query examples or per-query rules were added. All 48 tuned responses passed meaning and checks. Full forms, every failing attempt and retrieval result are in [failures.json](failures.json); raw/scored outputs are under live-first/ and live-tuned/.

## Retrieval failures, unchanged and parked

| Query | First result with a perfect reading | Why incorrect |
|---|---|---|
| O8: monthly electricity consumption in California | Carbon intensity of energy supply | Wrong measure; a labelled annual fallback cannot repair it. |
| F1: coal production in germany, not poland | Metallurgical coal production, Germany | Product subset. |
| F2: I'm not sure if Mexico or Canada exports more petroleum, show both | Crude oil including lease condensate exports, Mexico/Canada | Component of petroleum, not the aggregate. |
| F10: electricity consumption in Georgia and Florida | No candidates | No matching displayed data in the tested cache/routes. |
| F12: Texas electricity consumption annual | No candidates | No matching displayed data in the tested cache/routes. |
| F14: renewable generation in Texas except hydro | Other biomass, electric utility non-cogen | Fuel and sector slice; displayed geography name is also wrong despite TX code. |

Absence within these cached routes does not prove EIA lacks the data. No observation APIs were called. Marketed natural gas production (O7) and dry natural gas imports (F6) count under the owner's whole-product-basis decision and are labelled in the A0 tables. Annual fallback is accepted only when explicitly labelled; units were not silently substituted. F11 crude oil production is accepted by the work order.

## Changes and verification

- lib/sources/eia/locked-form.js: new strict request, mechanical checks, conversion, outcome handling and one re-ask; no second interpreter.
- lib/sources/eia/interpret-query.js: integrates the new path, rechecks submissions, exports existing clarification builder, removes the retired AI repair/offset path. Rules behavior remains unchanged.
- lib/eia-intent-payload.js and components/search/SearchWorkspace.js: share raw-form serialization and show the outage note in the existing status line.
- intent-routing.js and local-ranking.js: exactly the two authorized interpreter-label comparisons.
- locked-form-schema.js, locked-form-instructions.txt, tests/fixtures/eia/locked-form/* and score.js: frozen schema, short prompt, expected forms and independent meaning scorer; only the separately hashed E.6 prompt changed after freezing.
- tests/eia-locked-form*.test.js: 80 new tests, including all 24 forms, all 306 approved geography labels, mechanical checks, outage/blocking mappings, actual public search rejection, and no-rules dependency substitution.
- Scripts under scripts/eia-locked-form/: A0, real browser-to-search serialization replay, differential rules check, bounded cost calculation, live evaluation and local browser transport. The transport is never imported by application code.

Baseline: **621 tests, 620 passed, 1 skipped**. Final: **284 tests, all passed**. This is **204 retained tests plus 80 new tests**; **417 historical tests were retired** because they injected the removed free-text response/offset contract or asserted rules overriding model claims. This substantial count reduction is disclosed rather than presented as equivalent coverage. Exact names/files/reasons are in [retired-test-names.json](retired-test-names.json) and [test-migration.json](test-migration.json). Fixtures were not changed. Registration audit mapped every retired name with zero missing names. Existing non-retired tests keep their expectations. Separate differential check: all **332 distinct fixture queries** produce byte-identical rules intents at the base and final implementation. No meaning expectations were changed to obtain green results.

Build: **npm run build passed**. Syntax/import checks and git diff whitespace check passed. No new dependencies. Deleted functions are listed below. request-evidence.js remains for the rules fallback.

Known downstream rules intentionally remain: sector inference and getNegationScope in intent-routing.js; raw-query ranking keywords (including excluded words) in local-ranking.js. These are not repairs made by this task.

## Browser evidence

Original frozen prompt, local build a187941, Luna/low, 16000 tokens and 90 seconds only in the evaluation transport:
- F9: exact natural-gas/gasoline clarification, no candidates.
- O6: Iceland only; first total-energy consumption series in million metric tons of oil equivalent, annual 1980–2024.
- O7: validation clarification after the quotation error repeated; no retrieval.
- No browser console warnings/errors captured. Local server stopped after the check.

[Screenshots and DOM records](browser/observations.md). Revised-prompt browser behavior was not retested; no extra browser schedule was invented. Production defaults to **gpt-5.4-mini**, with its previous settings, and is **untested**. Luna results do not establish production-model performance. No EIA observations, graph downloads, or production workflow were tested or claimed.

## Reproduction and state

Branch: codex/eia-locked-form. Exact base: b7b119333dd111b9b2deea12acf1df68a1c2674d. Worktree is isolated; newer AGENTS guidance at 0dfab1b was read but the requested base was not changed. No push, merge or deployment, and no Vercel/environment setting changes. The existing key was read in memory from its existing location and was not copied into evidence, code or chat.

Offline commands:
```
OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap
OPENAI_API_KEY= EIA_API_KEY= node scripts/eia-locked-form/check-rules-preserved.js
OPENAI_API_KEY= EIA_API_KEY= node scripts/eia-locked-form/ceiling-converter.js
OPENAI_API_KEY= EIA_API_KEY= npm run build
```
Paid commands used: budget.js then evaluate.js at ac34411; budget-tuned.js then evaluate.js --tuned at 9ca7048. Existing result directories intentionally prevent accidental duplicate runs. Original-prompt replay requires its original commit; the current prompt is the one authorized revision. Replays would require new spending authorization.

## Frozen hashes

All frozen artifacts except the explicitly authorized prompt revision remain byte-identical. The original manifest is unchanged.

| File | Original SHA-256 | Final |
|---|---|---|
| lib/sources/eia/locked-form-schema.js | `57050d4596b5ef78a7084077d0c0c2e326aca8c08f658e15a1146ac96801cc85` | unchanged |
| lib/sources/eia/locked-form-instructions.txt | `f4824443c5caaa13f666a4d1b9f73c71eacdc0512fe1a26a967b58238a316a5f` | `5a00d81dd5062ff224903b13154254a7abb9c21bf21f2cc83ed6bb482a9cc8ae` (E.6) |
| scripts/eia-locked-form/score.js | `19eabd9d9fa749f806d7a7ba86065908f598bdca0f88f7355e823deb97df27c4` | unchanged |
| tests/eia-locked-form-freeze.test.js | `30573a346a34013d513154b086e8590fbf35a87b9b49dedec9b5155033ce5819` | unchanged |
| tests/fixtures/eia/locked-form/answer-key.json | `bb77aeb8642cd9040e5c59f5702a2afb762129d9d04e44c5729a513ed585e512` | unchanged |
| tests/fixtures/eia/locked-form/gold-forms.json | `05e7d607956bfe72e54c7f6c21fad4159545f29cc140ae399f3e5cf212b09cac` | unchanged |
| evidence/eia-locked-form/original-expectations.md | `70bbd90cd43cd6875526cf5a39155cba900c097700d735cff6d603b120209484` | unchanged |
| evidence/eia-locked-form/fresh-expectations.txt | `d36eb7c48072f4ec405f3f0cf55a7af48de0a62c7feddad0ca8726b4f976a217` | unchanged |
| evidence/eia-locked-form/work-order.txt | `30a2e641dc9e2205541633712471efb271e229eeaf880b6c90c8418d45a1e4f4` | unchanged |
| evidence/eia-locked-form/documentation-and-plan.md | `e54f06dc424651508094dec1f10e544f8b231a4221b2124e958b4433fe447e4b` | unchanged |
| evidence/eia-locked-form/schema-counts.json | `6b51b91acda926f9d0249da425acb072766db2176c65c74d3705e41fe8a40b9c` | unchanged |

## Deleted functions

`buildValueAliases`, `formatAllowedValues`, `interpretQueryWithOpenAI`, `validateAiInterpretation`, `extractResponseText`, `parseJsonObject`, `resolveAiCountryValue`, `readAiField`, `validateAiGeographies`, `isGeographySupportedByQuery`, `validateAiConceptPairs`, `validateAiExclusions`, `mergeExclusions`, `sameExclusion`, `validateUnknownQualifiers`, `isCategoryExplicit`, `validateExplicitCategory`, `preserveAmbiguousPairProducts`, `validateAiField`, `fieldConflictStatus`, `fieldResolutionSource`, `describeProductBreadth`, `normalizeCategory`, `collectVerifiedAiVocabularyCorrections`, `findUniqueApprovedVocabularyCorrection`, `vocabularyRules`, `vocabularyAliases`, `normalizeVocabularyClaim`, `isEligibleVocabularyCorrectionSpan`, `findVocabularyCorrection`, `collectVerifiedAiGeographyCorrections`, `collectBoundedMetadataGeographyCorrections`, `isEligibleGeographyCorrectionSpan`, `findBoundedSpellingMatch`, `describeAiGeographyAgreement`, `resolveAllAiGeographies`, `levenshteinDistance`.

## Audit and next decision

This is a local implementation/evaluation, not a deployment approval. The first result is FAIL; the tuned run is encouraging but not independent evidence. The owner should authorize a separate retrieval/ranking task for the six recorded failures before considering rollout. Production-model evaluation and a fresh untouched challenge set remain gaps. No independent reviewer was claimed for this task. Local commits, final inventory, durable-copy verification and exclusions are recorded in closure.json.

## Local commits before closure

- 07f57ffe4b982f5ac7ed7f7f409a8db03ab5734c test: freeze locked-form requirements schema and meaning scorer
- 3c93efb6c0e581c8ea427018b5cf19d179e87f57 test: record cached data-picking ceiling and approved measurement bases
- a187941ae39a7589b8329468025a264af46d451c feat: replace AI interpretation with enforced locked forms
- ac34411c90fc56adc2e8c8ddd015901f754ff197 test: record bounded Luna evaluation budget and runner
- 677c72ed884fb9c7795cd649476d5c98ea7d1c1b test: make the single general-rule prompt revision for E6
- 9ca704829767a895feb19a9014a28a10b8615215 test: record revised-run budget and cache-write accounting

The final closure commit is reported in the task response and in the durable copy’s FINAL-STATE.json. Nothing was pushed.
