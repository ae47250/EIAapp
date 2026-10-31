Completed locally on 2026-10-28T21:05:47.348509-04:00. The app now fetches checked EIA measures automatically, or presents a normal clarification/unavailable message with explicit choices. No push, merge, deployment or Vercel setting change occurred.

**1. Fixed pass marks**

- PASS — Originals: 24/24, against a 23/24 minimum; zero unlabelled wrong data. expected-data.json was written by the agent that built the list; self-adjudicated until the owner or an independent reviewer checks item 2.
- PASS — Second set: 21/24, against a 21/24 minimum; zero unlabelled wrong data. expected-data.json was written by the agent that built the list; self-adjudicated until the owner or an independent reviewer checks item 2.
- PASS — All 27 required rows verified live without changing route or measure. One unsupported monthly frequency was removed. expected-data.json was written by the agent that built the list; self-adjudicated until the owner or an independent reviewer checks item 2.

**2. Originals: before and after**

[All 24 questions, exact displayed EIA names, units, coverage and received/numeric row counts](ORIGINAL-RESULTS.md). Job 1 was 18/24; this run was 24/24. The newer result accepts the explicitly approved not-available response plus an offered alternative where appropriate. Receipt completeness and missing numeric values are recorded separately.

**3. Second set and cost**

[All 24 responses, meanings, local checks, data names/units, clarifications and costs](MODEL-RESULTS.md). The three failed outcomes concern Iowa/biofuels twice and the USA-except-Alaska aggregation once. They remain recorded failures; no prompt repair was attempted. These questions independently test reading, but the list was built knowing them, so they do not independently test the list. They are now regression cases.

There were 26 evaluation generations (two validation re-asks) and four browser generations. Reconciled generation estimate: **$0.00612557**. A conservative upper amount including all-input premium pricing and the native token-counting reserve is **$0.17780525**. The pre-call maximum was **$0.65881**, under the $1 ceiling. This is a usage-based estimate, not an invoice. [Budget](budget.json), [usage reconciliation](cost-reconciliation.json). Current [Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) confirms low reasoning and Structured Outputs; [pricing](https://developers.openai.com/api/docs/pricing) supplies the rates.

**4. Checked list and live corrections**

27 required rows, zero optional rows, two not-available concepts. All checked combinations have verified observations, units, frequency, geography and filters. The three retail-electricity rows were checked across all declared sectors and frequencies. Other rows were checked at each declared frequency, using one sample geography as required. [Initial checks](row-checks-1.json) and [annual-only recheck](row-checks-2.json).

C.3 found no numeric monthly observations for the state natural-gas total-consumption selection. That row is annual-only, with labelled fallback for a monthly request. No route or measure changed and no row was removed. **No post-freeze expected-data edits.** Price/customer basis labels now include the chosen sector, matching the frozen oracle.

Some international annual codes are omitted by EIA’s default, monthly-limited facet catalogue. For those, the checker requires the route to declare the facet and every returned observation to match the exact requested code with EIA’s own name. This limitation is explicitly recorded; no fuzzy match substitutes a code.

**5. Screen, choices and export**

[Every catalogue description and observed basis, alternative, region, fallback and completeness label](LABELS.md). Four actual browser searches passed: Michigan gas prices and keyboard choice; New York excluding transportation and explicit alternative; U.S. total energy; German whole-coal production excluding Poland. Charts, units, definitions and buttons were visible. The Michigan Excel workbook passed ZIP integrity and retained its basis, units and 55-observation coverage. Browser console warnings/errors: zero.

[Browser evidence](browser/verification.json) and [six HTTP replays](browser/http-replay.json). The browser ran implementation c3abdd7; after the small serialization correction, its exact saved forms and two button choices were replayed against the final rebuilt code: six HTTP 200s, four correct base outcomes, all source forms unchanged. No new model calls were made for replay. No complete browser network trace was available; the HTTP replay is separately labelled. The evaluation/browser timer was 90 seconds and output allowance 16,000 tokens; the production code’s 30-second timer remains unchanged.

**6. Changes, tests and Audit**

- New list, lookup selection/search and paged EIA fetch modules replace ranking on the main path. The fetcher and period validation total 179 lines, use no new dependencies, and carry Apache attribution. Period validation/error classification came from cyanheads commit 2dcee105e54b44c1177e01d59a8e62512f8f5f26; pagination/pacing are local code. [NOTICE](../../NOTICE).
- The search route uses the new handler. Existing result cards show the new text and automatic charts; LookupChoices is the sole new component. Existing Excel export carries definitions and provenance. UI layout, auth and plant lookup were preserved.
- The local code default is gpt-6-luna with reasoning low, as authorized. Model, prompt, schema and settings were checked against the pre-call budget for all 30 generations.
- Main-path modules now unused but retained: candidate-search.js, candidate-pipeline.js, local-retrieval.js, local-ranking.js, hierarchy-ranking.js, multi-country-comparison.js and result-certainty.js. The old metadata cache is retained and absent from the main route’s import graph/build trace. Routing vocabulary and geography metadata remain in use.
- Old candidate-module assertions were retained unchanged by pointing their tests directly to the retained handler. New tests cover the replacement route. [Every changed test boundary and reason](test-boundary-changes.json). The default-reasoning assertion follows the explicit owner decision; rejection tests now check the equivalent empty lookup response. No expected meaning changed.
- **284/284 baseline → 391/391 final offline tests**. [Final log](offline-tests-closure.tap). No random generation/seed: cases are the frozen 36 questions, recorded EIA pages and explicit boundary counterexamples. [Build passed](build-final.log); 25 non-JSX JavaScript modules passed syntax checks, and Next.js compiled the React components/imports. Three build logs and the initial failure log preserve their original whitespace, which whitespace-only diff checking flags; code checks are clean.
- Audit found and fixed source-form serialization inconsistency without weakening the 12,000-character check. [Zero-call replay](serialization-replay.json) retains the old evidence and unchanged score. Cost reconciliation separately corrects the initial estimate’s omitted cache-write premium; original outputs/estimates were not overwritten. Initial offline failures are retained in offline-search-initial-failures.tap.

**7. Frozen files and remaining limitations**

All **123 frozen file hashes** and the mechanical-check fragment remain unchanged. [Complete SHA-256 record](freeze-verification-final.json). Metadata research redacted EIA’s credential-bearing request echoes before saving; the fetcher drops those echoes. No model answers were edited. No credentials were printed, copied or committed; both designated files stayed in Downloads and were read in memory. Proposed evidence was scanned against the actual keys and credential patterns.

Coverage is intentionally bounded to the checked list. Sample-geography checks do not prove every geography has data; runtime empty responses stay distinct from source errors. Annual/region fallbacks and missing values remain visible. All four browser outcomes passed, but comparison/multiple-pair display was covered by offline shape/export tests and real service responses, not an additional paid browser search. There was no independent final reviewer and no production test/deployment. Known-example success is not universal correctness.

**8. State, preservation and next decision**

Branch: **codex/eia-lookup-list**. Base: **9e6dda37443383fb2abce06a60f281c1bcd135a4**. Code/evidence checkpoint: **6d44adfffaa65a33df7934ade38f41172b1e7eae**. Local commits so far: c2630244c039f29ee6d26a885e20ab5f02d57ec6 (guardrails), dd2e799d25d19af80a1ad5af2238a1abda7f12da (frozen expectations), c3abdd711298e56b4caf8306aa37f02d482f06e9 (implementation), 6d44adfffaa65a33df7934ade38f41172b1e7eae (serialization and live evidence). A final report-only commit follows; its SHA is in the completion message and durable copy manifest.

Main remains 0d6d312a89aea9112efff559ba8fc969cafb2780; codex/eia-locked-form remains the base. Nothing was pushed. No remote production state was changed or verified. Local test servers were stopped. Outside the repository, the existing zsh-unverified-search-globs friction-log entry was incremented once and one raw-log whitespace-check detour was recorded; no AGENTS instruction was changed by that bookkeeping. The pre-existing untracked docs/eia-interpretation-audit.md is left untouched. Generated .next output, existing node_modules and caches remain in place and are excluded from evidence copies; no keys or .env files were copied.

Durable evidence: **~/Documents/EIAapp-Evidence/20261028/lookup-list/**, with hash-verified freeze, implementation and final checkpoints. Original temporary research/evaluation records remain in place. [File inventory and reasons](file-inventory.json) and [commands](REPRODUCE.md).

Next decision: have the owner or an independent reviewer check item 2’s exact measures and the frozen expectations before approving any rollout. No further model/prompt or deployment change is implied by this completion.
