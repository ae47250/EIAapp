# PASS — EIAapp Job 9b: measurement completed

**Keep repair on; use gpt-6-luna at low effort.** ON/ON2 averaged **70.5/85**, versus **65/85** for OFF/OFF2. The **5.5-case gain** exceeds the **1-case noise floor**, with no ON wrong-value failure that passes in its paired OFF run. [Decision evidence](job9b-result.json).

PASS means the requested measurement completed without a harness defect. Application failures remain. This supersedes Job 9’s incomplete-run recommendation, while preserving its [FAIL report](REPORT.md).

| Run (linked scorecard) | Repair | Right/85 | New spend, USD | Median / p90, seconds |
|---|---|---:|---:|---:|
| [ON](job9b-ON-scorecard.json) | on | 70 | 0.09099000 | 3.049 / 4.964 |
| [ON2](job9b-ON2-scorecard.json) | on | 71 | 0.09103337 | 3.307 / 5.985 |
| [OFF](job9b-OFF-scorecard.json) | off | 64 | 0.00000000 | 3.014 / 4.964 † |
| [OFF2](job9b-OFF2-scorecard.json) | off | 66 | 0.00000000 | 3.304 / 5.985 † |
| [TERRA](job9b-TERRA-scorecard.json) | on | 71 | 0.69760300 | 3.015 / 3.991 |
| [TERRA-OFF](job9b-TERRA-OFF-scorecard.json) | off | 65 | 0.00000000 | 3.002 / 3.991 † |
| [LUNA-MED](job9b-LUNA-MED-scorecard.json) | on | 70 | 0.09369187 | 4.569 / 7.152 |
| [LUNA-MED-OFF](job9b-LUNA-MED-OFF-scorecard.json) | off | 64 | 0.00000000 | 4.488 / 7.152 † |
| [LUNA-HIGH](job9b-LUNA-HIGH-scorecard.json) | on | 69 | 0.09613650 | 4.102 / 7.309 |
| [LUNA-HIGH-OFF](job9b-LUNA-HIGH-OFF-scorecard.json) | off | 65 | 0.00000000 | 4.099 / 7.309 † |

† Replays made no live model calls: displayed latency is that of the reused source calls, not replay execution. Scorecards include every set, field, failure kind, prompt hash, cost and latency measure. All ten runs executed 86 cases; natural gasoline is excluded from the 85-case totals. All **451 replayed calls** matched byte-identical requests and their raw responses; **zero divergent cases, zero added replay cost, zero model retries**. [All scorecards](job9b-all-scorecards.json); [per-case differences and causes](job9b-differences.md).

**SOL: not run.** Its measured-token worst case was **$23.817248**, above the **$19.110798125** then remaining. Its ID was available; no paid call was made, and no paired replay was possible. [Budget record](job9b-SOL-scorecard.json).

**Total spend: $1.07903025 of $20**, including both smokes and Job 9’s prior spend. The new smoke executed/replayed all five cases without harness error; four answers passed. Every attempted run passed its measured-token budget check.

Luna low enters the model comparison as the arithmetic mean of ON and ON2: **70.5/85**, **$0.09101169**, mean per-run p90 **5.475 seconds**. It is the cheapest completed option within one case of the best (Terra, 71/85) and below eight seconds. Medium also qualifies but costs more; high is outside the accuracy tolerance. SOL is unmeasured.

**Defect and test:** commit `986568a8a69306abd5dd5034c95eb49b78a26b6b` changes only `tests/golden/eia-suite.json` and `tests/eia-suite-validation.test.js`. I-I1, I-I3, I-I8 and I-I11 now have valid country row keys and the owner-required type-c facet in their selector expectations, with no new scored field. Their meaning source is `evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz`; selector source is `evidence/eia-finish/independent-data-revision.json.gz`. The historical selectors omitted the facet; the recorded owner rule supplies it. No merge script was changed or rerun. [Exact corrections and baseline evidence](job9b-correction.json).

The standalone validation test failed on all nine empty key lists at starting tip `84acf18545322a7c91c6d10e1b6b4bc4a7fea553`, then passed. It checks the runner’s offline catalog: `data/eia/lookup-list.json`, `lookup-coverage.json.gz`, and `lookup-us-coverage.json.gz`. Unknown and empty keys fail; all 50 permitted nulls stay null. The existing test-command wildcard includes it; it ran before replays/live runs. This uses standard [referential integrity](https://www.sqlite.org/foreignkeys.html), with zero unresolved non-null expectations.

**Verification:** 883 Node tests, all 32 Python test files, both 86-case offline replays, saved-response validation, build, browser rendering and exports passed. Twelve completed offline gates used the frozen files. The historical inventory contains 833 distinct saved responses / 1,027 records; 138 old-schema/non-structured records remain unavailable, not failed. The initial offline dialogue replay has 8 missing fixtures on / 9 off. Historical dates/parent contexts do not test the model reading the current prompt; the new paired runs use exact prompts. [Gate audit](job9b-gate-audit.json); [validator/runner coverage and methods](verification-plan.json).

The freeze resumed after Job 9b smoke and every frozen hash still matches. The old freeze is preserved as `job9-original-freeze.json`. One preflight folder-name collision stopped before tests or paid calls; a distinct name preserved the prior evidence. No frozen file changed.

**Natural gasoline:** all ten completed scored runs fail this separate screen/lookup requirement. It never enters joint accuracy, the noise floor, or the flag decision. No fix was made after smoke.

The numbers contradict applying the hypothesis sentence “code never chooses or changes a value by scanning the raw question text” as a removal rule for this suite: removing those repairs loses more cases than the measured noise. This does not establish that every repair is necessary in every setting. Retain the [eleven flag-controlled paths](repair-functions.json), including place injection/ordinary-word/exclusion handling, product/ambiguity/linker handling, raw-question named-parts restoration, state-group reset, typed references/all-states expansion and outage interpretation. The validator, quoted-words path, defaults, buttons and lookup stay on.

Suite sources, unchanged null counts and the original natural-gasoline content correction remain documented in [the original report](REPORT.md#suite-sources-and-content). Job 9b changed no other cases, application code, vocabulary, schema, scorer or runner. Its only effect on results is correcting false failures in those four cases. Raw logs remain in `~/Documents/EIAapp-Evidence/20261031/job9/`; this directory contains summaries and scorecards.

[Preview](https://eiaappv3-git-codex-eia-measure-ea47243.vercel.app), at the existing **on** default. Final publication checks verify the pushed commit and login boundary; authenticated preview search remains untested. Local real-result browser/export checks passed. Main remains `0d6d312a89aea9112efff559ba8fc969cafb2780`; no merge, PR, production deployment or Vercel settings change is authorized or performed. Remaining application failures and any future repairs are parked for a separate work order.

**Recommendation: repair on; gpt-6-luna; low effort.**
