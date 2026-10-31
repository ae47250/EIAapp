# Bounded follow-up, owner authorized 2026-10-30

Start 21:04:46 UTC; hard stop 2026-10-31 00:04:46 UTC. New ceiling $0.50. Base 94faffdc9b0943c8d1e49f18c076eb60804f7d54, branch codex/eia-coverage. Historical failed run and frozen files stay intact. No main/production changes.

## Expected corrections frozen before the new scored run
- Missing/non-numeric observations and latest metadata are blank, not zero; actual numeric zero remains numeric. Test null, undefined, whitespace, symbols, booleans and containers. Inspect every Number conversion; observation conversions corrected, ranking counters, dates, indexes and validated pagination are not observation values.
- Shared form: empty topics become one pair with null product and activity; its evidence quotes the original source query, satisfying the unchanged string-quote schema. Choice labels use approved values/qualifiers, not arbitrary model labels.
- Geography ambiguity defaults are data. Georgia preserves state/country context. Bare Korea uses KOR/South Korea and offers North Korea. Explicit full names, exclusions, ordered places and per-turn quote ownership survive updates and resubmission. Synthetic place data verifies the generic mechanism. Default resolution cannot add excluded or unresolved-negation places.
- Chart remains Job 3 top ten by latest numeric value, retaining every place in table/export. Mixed units remain separate. D6a needs a new frozen expectation and separately versioned scorer authority (pending when this note was written).
- Runner labels match case-insensitively. Missing execution steps stay harness errors and preserve the last actual application response; they cannot be presented as fabricated empty app screens.

## Established basis and limits
Continue the existing DESIGN.md methods: EIA/SDMX distinguish observation statuses; DataTone exposes ambiguity decisions; dialogue-state tracking updates stated slots. ECMAScript ToNumber defines null/blank coercion to zero: https://tc39.es/ecma262/multipage/abstract-operations.html#sec-tonumber . No directly applicable external EIA benchmark exists in the prior bounded source search; the owner's frozen sets measure this app, not MultiWOZ or OAEI.

## Harness defect
The historical runner matched `c.label === label`, missing the actual lowercase `coal` button when the frozen step said `Coal`. It then generated an empty result on execution failure and counted that as an app dead end. Preserve historical D8a scores and diagnostics; the follow-up matches normalized labels and records execution failures separately. Historical records are not rescored as untouched holdouts.

## Scope
Runtime files: xlsx.js, formatting.js, plant-metadata.js (observation values); locked-form-v2.js, lookup-context.js (canonical form/labels); lookup-geography.js, geography-ambiguities.json, locked-form-reply-update.js and both instruction sources (shared metadata defaults). New regression tests and versioned evaluation files only. No schema/vocabulary expansion, dependencies, coverage research or UI redesign.
