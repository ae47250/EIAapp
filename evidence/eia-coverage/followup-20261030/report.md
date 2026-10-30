# Job 5 bounded follow-up checkpoint

## 1. Decision and pass marks

Owner authorized **push preview under unchanged pass marks** after reviewing the extra harness gate. Main/production are not authorized targets. No application repairs or paid reruns occurred after the scored run began. The original `live/summary.json` remains `pass:false` because of the unauthorized extra completion gate; **release-assessment.json** records the owner's decision, not a rewritten score.

| Required mark | Result |
|---|---|
| Set D >=90% | PASS **56/58 (96.55%)** |
| Three front-page examples | PASS **6/6** |
| Set C >=18/20 | PASS **19/20** |
| Independent set >=21/24 | PASS **23/24** |
| Zero dead ends | PASS under frozen definition: data or useful question/buttons/free text |
| Zero incorrect Available labels | PASS |
| Zero unlabelled wrong data | PASS under frozen scorer |
| Original gold / full offline suite | PASS; original gold tests retained; **729/729** full suite |
| Research/generator tests | PASS **446/446** |
| Build, syntax, imports and serverless metadata | PASS |
| Required local browser workflow | PASS **11/11**, actual API handlers with exact recorded upstream replay |
| Coverage | **NOT MET**, expressly permitted for this preview |

A passed numerical mark does not mean every case is correct. The failed cases below remain failures. This is a repeated run of exposed cases, not an untouched holdout or proof of universal correctness.

## 2. Changes and causes

- `lib/client/xlsx.js`: latest Metadata uses a missing-aware numeric conversion, so null/non-numeric latest stays blank.
- `lib/client/formatting.js`: number labels and recent-observation filtering reject null, blank strings, booleans and containers before conversion. Real numeric zero is preserved.
- `lib/sources/eia/plant-metadata.js`: nullable observation parser also rejects whitespace/bools/containers. Existing null handling was already safe.
- `locked-form-v2.js`, `lookup-context.js`: canonical empty-topic pair with null product/activity and valid original quote; code-defined display labels retain approved qualifiers. Existing model-supplied choice **values** are still accepted (KNOWN DEFECT below).
- `data/eia/geography-ambiguities.json`, `lookup-geography.js`, both instruction sources and `locked-form-reply-update.js`: shared data-driven defaults, full names and switches. Bare Korea uses KOR/South Korea and offers North Korea. Explicit names, exclusions and ordered places survive; Georgia context stays intact. New defaults apply to new interpretations/replies, never re-decide validated browser resubmissions.
- New regression tests, versioned run/scorer/browser/export readers, new evidence only. No UI/auth/schema expansion, new dependency, model switch, coverage rewrite or production setting change.

The Number audit records **79 runtime sites** in lib/components/app. Observation paths are corrected or already guarded. Intent source offsets/edit distances can still coerce optional nulls to zero; those legacy diagnostic/order fields are separately recorded, not claimed fixed as observation values. Ranking counters, date/index controls and positive-only unit scales are not missing EIA observations.

**KNOWN DEFECT — D8/D8a, repeat 2:** for “energy stuff,” the model supplied only Natural Gas and Gasoline. `lookup-context.js` still starts with `form.clarification.options` and uses them whenever nonempty. Label normalization fixes casing, but cannot create the missing Coal choice. D8 is wrong; D8a cannot perform its Coal click and is wrong. The next job fixes this shared choice-source contract; no query-specific patch was added here.

Other retained failures: C4 repeat 2 chose Western Europe instead of Europe, omitting SCG/YUG; I12 repeat 2 failed to resolve Iowa/Nebraska and asked for place clarification. Neither produced unlabelled wrong numeric data under the frozen scorer. No post-run repairs or reruns.

## 3. Visible outcomes and exports

- D1: Brazil: total energy production, 12.0134 quadrillion Btu in 2024 (EIA).
- D2: Japan: petroleum consumption, 3,094.1068 thousand barrels per day in 2025 (EIA).
- D3: United States (country): nuclear generation, 781.8653 billion kilowatthours in 2024 (EIA). / United States (country): nuclear consumption, 8,195.465 Trillion Btu in 2025 (EIA).

D6a uses **10 chart places**, with **all 50 places in the table and actual Excel file** in both repetitions. Frozen chart membership: TX, PA, WV, LA, OK, NM, OH, CO, WY, ND, independently derived from saved EIA observations. The versioned scorer also rejects missing table/Excel entries. Mixed units remain separate.

D12a shows Japan and South Korea, total energy consumption, **2005–2019**, annual default, and **Did you mean North Korea?** Browser replay confirmed this using the historical unresolved-Korea model response through actual API handlers.

The real browser download D5b contains **270 observations across six places**, matching full values and units, with Metadata present. All-nonnumeric single-series Metadata is independently checked as blank in the offline workbook regression. Bermuda, Greenland and Saint Pierre and Miquelon each returned **45 numeric zeroes**, no symbols, in this run's coal-production observations.

## 4. Evaluation, cost and evidence

Before the single new run: frozen inputs/request hashes/code hashes, 3,072 common output tokens including reasoning (over seven times the prior measured maximum of 400), same **gpt-6-luna / low**, all 88 scheduled model turns retained. New actual maximum output: **368**. No retries or re-asks.

Worst-case authorized maximum **$0.45300475**; measured generation upper bound **$0.08165975**, plus conservative counting reservation **$0.00574775**, total upper bound **$0.08740750**, under the new **$0.50** ceiling. 88 generation calls; 584,830 input and 17,112 output tokens. This is conservative usage accounting, not an independently obtained billing invoice. Current official pricing/default cache TTL are cited in run-freeze/budget.json.

190 new EIA calls, **6,532 cumulative Job 5 calls**, under 25,000. Sequential 500ms pacing stays below 4 requests/second and 8,000/hour. Local browser checks added no API calls.

Historical run: D50/58, C18/20, I22/24; preserved in `../live/`. New run: D56/58, C19/20, I23/24; all **102 outcome records** preserved in this folder. D6a chart expectation was separately versioned; D12a now requires the owner-requested switch. C revision 2 and the already recorded I7 revision 2 were used; old files/scores/scorers remain intact. The historical D scorer is unchanged; revision 2 changes only chart membership and Excel-presence checking. Pass marks unchanged.

Harness defects: (a) old exact-case matching missed an existing lowercase Coal button and fabricated an empty app response; new matching is case-insensitive and preserves actual responses on failed steps; (b) the new runner incorrectly added an every-click-completes release gate. The owner explicitly removed that *additional gate* from release assessment, without changing D8a's failure or its score. All frozen run files remain unchanged.

Raw new responses, screenshots, Excel and route-replay logs: `~/Documents/EIAapp-Evidence/20261030/coverage/followup-20261030/scored-live/`. Historical evidence stays in its original 20261029 location. Durable final-copy verification and exact committed size are recorded at closure. Public evidence contains compact summaries/hashes; local home paths in validation logs are redacted, originals retained locally. Credentials remain in Downloads and were never copied or printed.

## 5. State, limits and reproduction

Follow-up base **94faffdc9b0943c8d1e49f18c076eb60804f7d54**; tested implementation/freeze commit **6a9644e** on **codex/eia-coverage**. Full Job 5 base remains bbff3bf4edf76935b5700b6ca702fa93071d624e. Main/production before push: **0d6d312a89aea9112efff559ba8fc969cafb2780**. The final evidence commit, remote equality and automatic preview identity are verified after commit/push and reported in the closure receipt. No force, merge, promotion or deployment-setting change.

Coverage unchanged: **215/672 base cells; 621/2,088 total mapped; 576 not checked** (537 metadata gaps, 39 scope uncertainty). Other statuses: 659 not in catalogue, 146 EIA returns no data, 86 subset-only. OB2, OBW and sector 95 remain unresolved exceptions, never used for results or absence claims. Previous approved scope/default decisions remain recorded in the parent checkpoint.

Commands:
```sh
OPENAI_API_KEY= EIA_API_KEY= npm test
OPENAI_API_KEY= EIA_API_KEY= npm run build
for f in scripts/eia-lookup/*.test.py; do OPENAI_API_KEY= EIA_API_KEY= python3 -B "$f" || exit; done
node --check lib/sources/eia/lookup-geography.js
```
The one-shot freeze/evaluation commands were `node scripts/eia-lookup/freeze-coverage-followup.js` and `node scripts/eia-lookup/evaluate-coverage-followup.js`, with existing Playwright/Chrome runtime paths supplied. **Do not rerun into existing folders or make paid calls without a new owner-approved run.**

## 6. Audit and next job

Preserve the four incorrect outcomes and the primary runner summary. Next job: make clarification choice values as well as display labels come from the shared checked contract/metadata, while preserving genuine product ambiguities and explicit qualifiers. Keep the other two interpretation misses visible; do not silently redefine expectations.

No code was changed after the frozen run. No model change or production change. No fresh independent reviewer was launched in this bounded follow-up; existing independent requirements/keys were reused with recorded owner revisions. The implementation had one full-suite regression in validated Georgia resubmission; that was fixed before freeze, with the historical test unchanged. Final suite and build pass.

Remaining unrelated files: `docs/eia-interpretation-audit.md` and existing `scripts/eia-lookup/__pycache__/`; ignored dependencies/build/cache remain untouched. Do not claim every search is correct: the four failures are KNOWN/recorded, and coverage still does not meet its pass mark.
