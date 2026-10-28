# Negation-target prototype review: not accepted

## Decision

Reject this disposable prototype. The existing working source remains semantically unsound, and this review does not establish a successful correction. The prototype repairs several exposed uncertainty cases but still turns unproved scope into exclusions or positive requests. Achieving the user's full requirement requires a bounded representation change: scope-bearing interpretation evidence shared across validators, with model-proposed span relations and a conservative rules fallback. No model switch or new NLP dependency is required to make that design explicit.

The reviewer changed no repository source, tests, expectations, Git state, dependencies, or services. All reviewer artifacts are under `/private/tmp`. No paid or live API calls were made. The main agent reports production source stayed byte-identical to its starting state.

## Reviewed inputs and retained evidence

- Original source root: `<LOCAL_HOME>/.codex/worktrees/eia-interpretation-audit/EIAapp`.
- Disposable source root: `/private/tmp/eia-negation-design-probe`.
- Diff: `/private/tmp/eia-negation-probe-intent-routing.diff` (227 lines).
- Diff: `/private/tmp/eia-negation-probe-interpret-query.diff` (104 lines).
- Frozen semantic manifest: `/private/tmp/eia-negation-independent-cases.json`.
- Frozen manifest SHA-256: `5c911f9c2b7b47748f510eed4031cf1b49423ac1e39519764b8a691215c003ff`.
- Original runner: `/private/tmp/eia-negation-independent-runner.mjs`.
- Prototype runner: `/private/tmp/eia-negation-probe-runner.mjs`. Its only change from the original runner is the module root.
- Original-source evidence: `/private/tmp/eia-negation-independent-baseline-evidence.json`.
- Prototype evidence: `/private/tmp/eia-negation-independent-prototype-evidence.json`.
- Negative-command meaning adjudication, with verbatim original cases: `/private/tmp/eia-negation-command-adjudication.json`.
- Supplemental cases selected during static review and retained before execution: `/private/tmp/eia-negation-probe-supplemental-cases.json`.
- Supplemental cases SHA-256: `e5112cf50cd260dd1a936290d7b5aeb9516d7a61eecaa6a1b6f24af8e12e8fba`.
- Supplemental runner: `/private/tmp/eia-negation-probe-supplemental-runner.mjs`.
- Supplemental evidence: `/private/tmp/eia-negation-independent-prototype-supplemental-evidence.json`.

Reviewed source SHA-256 hashes:

| Root | File | SHA-256 |
|---|---|---|
| Original | intent-routing.js | ceb9bdbc057816de390efed53b88f031468506f4cb7b63500e69439f4d9a4518 |
| Original | interpret-query.js | 045dbc849d44095c5c0ac88916bb074e7832b795338f601d9478fca631c6967f |
| Prototype | intent-routing.js | 5a72a80dcf08d81429869454a0647fa0d344dea1e39d6a285fb409080388c1c3 |
| Prototype | interpret-query.js | 1cc651c4ae0dd696c42b79f9c6242268ced17e5a2c4e0d0a35b2242f58d19177 |

## Boundary validation

Both runs use the real exported `interpretQuery` with injected model JSON, the exact `SearchWorkspace.appendIntentParams` source, `normalizeSubmittedIntent`, and exported public `GET /api/search-eia`. Fetch is intercepted; every URL other than the injected OpenAI response fails. No series observation selection is requested. There are 32 simulated model responses in each frozen run, and eight in the supplemental run; these are not real model calls.

The existing source meets 21 of 32 frozen cases at all three observed boundaries. The prototype meets 28 of 32. These counts mean the recorded semantic assertions passed; they do not mean the user-visible workflow is correct. In particular, the frozen assertions require clarification where specified but do not universally prohibit unnecessary clarification.

The four remaining frozen assertion failures are:

1. `direct_sector`: the required industrial-sector exclusion is still absent. This is an existing representational/selection gap, not a new uncertainty-regex regression.
2. `negative_command_numeric_modifier`: the clear emphatic prohibition `do not, under any circumstances, show coal production` becomes unresolved rather than excluded. The behavior is conservative but does not meet the unchanged clear-command expectation.
3. `negative_command_no_need`: `No need to show coal production` becomes unresolved rather than excluded. This expectation is partly a meaning judgment: absence of need can permit omission without forbidding inclusion. Conservative clarification is defensible; do not rewrite the original expectation or call it an unqualified semantic defect.
4. `nested_negation`: `Do not exclude coal production` creates an added positive coal-production request. The frozen expected positive set contains only the established USA consumption request. This is genuinely disputed: do-not-exclude may be an instruction to include, or permission to keep something available rather than an affirmative request for another series. The incontrovertible invariant is that it must not generate the prohibited hard exclusion. Under the user's ambiguity rule, clarifying its requested status is safer than forcing either reading. This failure must not be counted as an undisputed proof that inclusion is always wrong.

The prototype also unnecessarily blocks `certainty_even`: `I'm not even sure what to call it; show USA total energy consumption.` All positive fields survive, so the frozen field assertions pass, but search is blocked. At `intent-routing.js:596`, `actions.has(tokens[next])` is evaluated after the knowledge scan without `next < end`, allowing the next-clause `show` to be misread as an action under uncertainty. This is a confirmed clause-boundary defect visible in the existing retained evidence.

For all seven prototype cases flagged as needing clarification, public GET returns a blocked pipeline and zero candidates. However, their returned intent says `blockingClarification: false` while `needsClarification: true`: `interpret-query.js:944` omits unresolved negation from its blocking expression. The current pipeline blocks through `needsClarification`; the intent contract is nevertheless inconsistent.

## Confirmed structural counterexamples

All eight separately retained supplemental cases fail their semantic assertions at interpretation, resubmission, and public GET. They were chosen from the code's mechanism and frozen before executing them; they do not replace or modify the original 32 cases.

| Construction | Prototype behavior | Why the behavior is unsupported |
|---|---|---|
| `do not include all coal production` | Hard-excludes coal and production; no clarification | Negating complete inclusion does not establish complete omission. Extent after the verb is ignored. |
| `do not include only coal production` | Hard-excludes coal and production; no clarification | Negation of exclusive inclusion is not an exclusion of coal production. |
| `I'm not sure whether coal production belongs here` | Adds coal-production pair; no clarification | An undecided request is promoted because no recognized action occurs before the data head. |
| `I'm not certain that Canada coal production is wanted` | Adds Canada and coal-production pair; no clarification | The proposition under uncertainty is mistaken for an established request. |
| `I'm not sure of the label, please show USA total energy consumption` | Loses all established request fields and asks clarification | An independently affirmative command is treated as the object of uncertainty. |
| `I'm not sure of the label — show USA total energy consumption` | Same loss and clarification | The relation between the certainty comment and fresh command is not represented. |
| `USA energy consumption, not coal production, and give Canada natural gas consumption` | Drops Canada/natural gas and hard-excludes natural gas | The exclusion remains open across a fresh request whose verb is outside the small action set. |
| `do not include coal production unless natural gas consumption is unavailable` | Hard-excludes coal, production, and natural gas; no clarification | A conditional policy is flattened into unconditional exclusions, including a condition's subject. |

These failures are about predicate, argument, extent, condition, and clause relations. Adding `all`, `only`, `whether`, `wanted`, `give`, or `unless` as isolated exceptions would restart the same exception cycle. No further challenge expansion was undertaken after identifying these structural failures.

## Diff assessment

The prototype removes the productive `-ly` modifier regex and introduces useful three-state mention filtering. It does not add country-specific exemptions or alter metadata in the reviewed diff. Its original text, decimal punctuation handling, and raw-query resubmission preservation are useful foundations.

It still is not purely evidence-based attachment:

- `intent-routing.js:578` explicitly exempts the tokens `only` and `just` after `not`, without recording an additive construction relation. This is a small phrase exemption, not a general attachment proof. The action and knowledge sets are legitimate bounded lexical classes, but the action set must not become an ever-growing list used to guess clause boundaries.
- At lines 590-596, recognizing a knowledge word makes the suffix positive unless a narrowly recognized action is encountered first. `non-excluding` is incorrectly equated with `affirmatively requested`.
- At lines 599-603, immediate request-action adjacency selects exclusion before the object's extent or conditional structure is examined. Direct adjacency is useful evidence but insufficient for the whole predicate.
- At lines 607-615, the chosen status is applied to a suffix until punctuation, a new negator, or one of a few action words. Unknown content after the first recognized head can therefore recreate the original blanket-suffix error.
- `positiveQuery` strips words and rejoins the remainder, while most output retains only flat type/value exclusions. This loses the span relations needed to explain and reconcile scope decisions. A query-level helper now centralizes some behavior, but callers repeatedly recompute it and still consume a flattened string rather than stable mention evidence.
- Sector/frequency/geography treatment is not yet uniform. Approved words are used as target evidence, but only concept mentions become explicit rule exclusions. The frozen country/frequency checks therefore use absence from positive fields rather than a fully represented exclusion constraint; the runner documents this weaker evidence.

## Meaning adjudication and the acceptance contract

The older fixture's four modified negative commands are not equally clear:

- `do not actually include`: ordinarily an emphatic prohibition; hard exclusion is reasonable.
- `do not particularly include`: can negate emphasis or singling out; full exclusion is not entailed.
- `do not really include`: ordinarily a softened prohibition, but degree/qualification remains plausible; conservative clarification is acceptable.
- `do not entirely include`: negates completeness and permits partial inclusion; unconditional complete exclusion is unsupported.

`not necessarily include` denies necessity, and `not always include` denies universal frequency. Neither establishes never-inclusion. The original assertions are retained verbatim in the adjudication artifact. Requiring all their hard-exclusion/no-clarification assertions to stay green would conflict with the user's instruction to clarify materially ambiguous scope.

The frozen `no need` and `do not exclude` cases also involve permission versus requirement. Preserve their records, distinguish the strong invariants from disputed requested-positive-set assertions, and resolve the acceptance policy explicitly. Never silently change meanings to match application output.

## Concrete next-scope decision

Do not copy this prototype into the working source. Keep the existing defect explicitly open and use the retained cases as evidence for a focused interpretation-evidence change.

The next implementation scope should be:

1. Represent approved mentions with stable IDs, canonical values, raw character spans, clause/request identity where known, and separate evidence for requested status and exclusion status. `Negation targets certainty` must not imply `every data mention in that clause is positively requested`.
2. Let the current model propose span-bound relations: which negator modifies which predicate/argument, whether a data mention is an asserted request, an excluded object, commentary, a condition, or unresolved. Validate raw span existence, metadata identity, ordering, and the allowed relation shape. Do not treat a rewritten query as evidence.
3. Use conservative deterministic rules for demonstrable direct constructions. Unsupported extent, modality, nested actions, unknown attachment, or conflicting evidence must remain unresolved. Preserve independently established positive fields and clarify only the unresolved decision. This does not require exhaustive natural-language coverage.
4. Build one validated evidence object and reuse it for geographies, ordered pairs, summaries, sectors, frequencies, exclusions, clarification, and resubmission. Retain a reproducible evidence trail across the actual browser/public GET boundary; do not let each field independently infer scope from a suffix.
5. Derive flat compatibility fields only when that projection preserves meaning. If the current retrieval contract cannot express a scoped exclusion or condition, clarify rather than invent global exclusions or redesign ranking in the same patch.
6. Keep the current model, approved metadata, country-name repair, and existing retrieval/ranking architecture. No model switch is necessary. No paid/live validation is needed to start: injected model span relations plus the retained public-boundary runner can test the contract before any separately authorized live evaluation.

This is broader than replacing an uncertainty regex, but it is a bounded change in interpretation evidence rather than a full NLP system. The current prototype cannot satisfy both arbitrary clear modified commands and degree/choice ambiguity without either additional lexical exceptions or this explicit scope representation.
