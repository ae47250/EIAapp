# Multi-field typed clarification follow-up

Base: `43f9f6335d25aae3fe234ecf5bf3069a8ad5647d`; branch: `codex/eia-no-dead-ends`. Main remains `0d6d312a89aea9112efff559ba8fc969cafb2780` before push. This follow-up replaces the owner's superseded asked-field-only rule. The original query is never concatenated with a typed answer.

## Change and rationale

- `lib/sources/eia/locked-form-reply-update.js` (new): strict nullable update schema and pure merge. Explicit fields replace existing values; null means preserve. Each changed component requires a quote from this reply. Years replace the complete interval. Multiple topic pairs and inherited components are retained; positive and excluded geographies remain separate. Unanswered questions and unrelated unsupported constraints remain. Vague wording can be resolved with reply evidence.
- `lib/sources/eia/locked-form-reply.js`: active model prompt/schema returns all mentioned fields; history entries use `reply-update`. The previous field-only parser/merger remains for existing `reply` histories.
- `lib/sources/eia/locked-form-v2.js`: year validation uses the checked reply source when that interval was updated. All existing Part C checks remain.
- `lib/sources/eia/lookup-search.js`: reconstructs both versions of reply history; accepts no client-supplied provenance. Original query and browser transport remain unchanged.
- `tests/eia-typed-clarification.test.js`: old frozen examples now explicitly test historical-history replay, with the same assertions. Current HTTP test uses the new schema. No old fixture, frozen contract, scorer or pass mark changed.
- New `tests/eia-typed-reply-updates.test.js`, `tests/fixtures/eia/typed-reply-updates.json`, `scripts/eia-lookup/verify-reply-updates.js`: owner expectations frozen before implementation, current behavior regressions, and a bounded one-run live harness.

Each topic has a historical shared quote in the existing form format. Updated topics show a changed-field quote from the reply; the versioned history keeps separate product/activity quotes and the origin form retains evidence for inherited components. No form-schema or UI redesign was required.

The design basis is tracking user needs across turns, as described in [Jacqmin et al., dialogue state tracking survey](https://arxiv.org/abs/2207.14627). The exact replacement rules are the owner's requirements, not a claim that the paper specifies this implementation. The strict schema uses required nullable fields per [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). [Luna documentation](https://developers.openai.com/api/docs/models/gpt-6-luna) confirms low reasoning and the pricing used for the bound.

## Checks and actual outcomes

- Full offline suite: **537/537 passed**, keys blank. Includes 14 new tests and 120 single-field preservation trials, seed **29102026**. No test skipped or assertion relaxed to get green.
- Initial new-test failures were test-harness defects: synthetic observations lacked the required unit, and the tampering test mutated a shared object. Assertions stayed intact. `initial-test-failures.tap` is retained.
- Syntax checks passed for all four affected application modules and the new live harness. Imports, async/error behavior, JSON validation, secret handling and server-side compatibility checked; `npm run build` passed.
- Frozen original files (158 hashes), previous typed fixture and new four-case fixture all match. Eight pre-live code hashes match after the live run. Request bodies were frozen before paid calls.
- **4/4 real Luna-low reply runs passed, one call each, no validation reasks or transient retries.** All used the effective response model `gpt-6-luna`. Initial forms were frozen inputs; these were not new full-query initial interpretation runs. Real official EIA retrieval followed each reply.

| Reply | Result | Official coverage | Unit |
|---|---|---|---|
| coal production in Australia | Australia coal production; no further question | 1980–2024, 45 annual points | thousand short tons |
| iceland and norway | both countries, total energy consumption | 2000–2019, 20 annual points each | quadrillion Btu |
| natural gas | U.S. natural gas consumption | 1949–2025, 77 annual points | Million cubic feet |
| Japan from 2005 | Japan total energy consumption; 2005–latest | 2005–2024, 20 annual points | quadrillion Btu |

The before/after record uses the retained legacy merger with injected old-schema outputs. Rich activity previously kept total energy and asked for geography; the new live reply gives coal production in Australia. Japan previously kept 2000–2019; the new live reply replaces it with 2005–latest. The other two behaviors remain correct.

- Four local browser workflows passed against the built application, using the saved live model responses and EIA observations. The initial interpretation was injected from frozen forms. Browser -> POST reply -> validation/replay -> search -> chart/table all worked. Original query stayed unchanged; warnings/errors: **0**. Screenshots, accessibility snapshots, server log and transport events are included. This was offline browser replay, not four additional live model calls.
- Latest observations are 2024 for the international rows; “latest” is not fabricated as the current calendar year. Existing source/unit/frequency checks remain active.

## Cost

Four scheduled calls plus at most one validation reask each; 16,000 output tokens including reasoning, and a conservative 50,000 input-token bound. Largest request bytes plus 8,192 framing reserve fit this bound. Conservative prices: $0.25/M input, $0.50/M output. Maximum additional cost **$0.164**; prior conservative spending $0.11084385; cumulative maximum $0.27484385 under the carried $1 ceiling. Recorded actual usage priced conservatively: **$0.00633725**, cumulative **$0.11718110**. The ceiling was not used as a target. Keys reused in place without copying them into records.

## Reproduction

From this branch:

```sh
OPENAI_API_KEY= EIA_API_KEY= OPENAI_MODEL= npm test
OPENAI_API_KEY= EIA_API_KEY= OPENAI_MODEL= npm run build
node --check lib/sources/eia/locked-form-reply-update.js
node --check lib/sources/eia/locked-form-reply.js
node --check lib/sources/eia/locked-form-v2.js
node --check lib/sources/eia/lookup-search.js
node --check scripts/eia-lookup/verify-reply-updates.js
```

The historical live run used `node scripts/eia-lookup/verify-reply-updates.js --prepare`, then `--live`. Both deliberately refuse to overwrite existing evidence; do not rerun paid checks merely to improve a result. The replay transport is `browser-replay-transport.mjs`; run the built app with it imported and placeholder keys, `OPENAI_MODEL=gpt-6-luna LOGIN_REQUIRED=off`, bound to localhost. Then enter the four frozen query/reply pairs in the browser. No real key is needed for replay.

## Audit and limits

Self-reviewed the complete source diff: no query-specific exceptions, new dependencies, model/default/configuration switch, UI/authentication change, frozen-file/scorer change, or retrieval relaxation. The already-matching search/diagnostic Luna defaults remain covered by tests. No new independent agent review was requested or performed for this follow-up.

The intended behavioral change is broader typed corrections: an explicitly mentioned field replaces its previous values. Model semantic mistakes are still possible; strict shape and quote checks do not prove meaning. Four exposed cases and 120 seeded bookkeeping checks are regressions, not a universal accuracy claim. Only the four requested cases received new live model calls; the typo path was checked offline.

The untracked `docs/eia-interpretation-audit.md` is unrelated and remains untouched. Generated dependencies and build output are excluded from Git. Evidence is also copied with SHA-256 verification under `~/Documents/EIAapp-Evidence/20261029/typed-reply-updates/`. A post-push record in that durable folder will record the final branch SHA, remote equality, preview and production checks without creating a commit/push loop.
