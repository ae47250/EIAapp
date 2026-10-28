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

The prototype's 31/34 is not evidence of an acceptable repair. It incorrectly clarifies “do not ever include” and “do not, under any circumstances, show.” The third primary failure exposes a separate cached candidate label, `Texas Dry` for a TX series where approved routing metadata says `Texas`; the interpretation itself passes that case in the prototype. No geography-name rewrite or metadata repair was added for this new observation. Independent failures also include missing sector exclusion and promotion of “do not exclude” into an additional positive request. The latter has a disputed positive-request expectation between the two matrices: permitting inclusion does not necessarily demand it. Original expectations remain frozen, with disagreement disclosed rather than changed to obtain green results.

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
