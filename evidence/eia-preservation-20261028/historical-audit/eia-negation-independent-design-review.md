# Independent negation-target design review

Case manifest frozen before implementation/developer-test/output inspection:
`/private/tmp/eia-negation-independent-cases.json`
SHA-256: `5c911f9c2b7b47748f510eed4031cf1b49423ac1e39519764b8a691215c003ff`

## Proposed rule under review

Attach each negator to the first evidence-bearing head in its clause: a knowledge/certainty predicate, request action, or approved data entity/concept. Do not enumerate modifiers. Exclude data only when affirmative evidence attaches negation to data or a request action. Unknown bridges remain unresolved and prompt clarification.

## Assessment before code inspection

The positive-evidence requirement is the essential improvement. Its correct implementation requires distinguishing an *eligible head* from a merely *recognized token later in the clause*. Scanning through arbitrary unknown words until a known data term appears recreates blanket exclusion with a different mechanism.

A first-head rule by itself is not a sound natural-language parser. Use it as bounded evidence, with a conservative unresolved outcome when the relation is not established. Avoid presenting that uncertainty as a confident repaired request.

Concrete risks:

1. Unknown predicates such as `not sold on coal production` and `not related to coal production` must not be skipped as modifiers. They change what the negator asserts.
2. Additive `not only/just X but also Y` constructions do not negate X. Ignoring modifiers and choosing X as the first data head makes a false exclusion. A generic unresolved outcome is safer than an endless modifier list; explicit construction handling, if added, must be grammatical rather than domain/country-specific.
3. A negative request action can itself operate on polarity: `do not exclude X` cannot exclude X. Negator scope needs composition or a conservative unresolved outcome.
4. Unknown numeric/modifier content before a recognized certainty predicate must not open a data exclusion. `not 99.5% sure` also tests a decimal point, and `not—even now—certain` tests punctuation that belongs inside the certainty phrase.
5. Clause boundaries cannot be all punctuation. `do not, under any circumstances, show X` remains a negative command. Conversely `not X — show Y` has a new affirmative command and must preserve Y.
6. Certainty predicates can introduce an undecided data choice. In `Show X; I'm not sure whether to include Y`, preserving X is mandatory, but treating Y as positively requested is unjustified. Clarify Y.
7. Approved data tokens may be polysemous (`use`, `show`, `supply`, `demand`, `reserve`) or parts of a longer metadata name. Longest matched metadata names and existing country repair must survive target recognition.

The frozen manifest intentionally uses existing approved concepts and geography codes. Assertions concern semantic constraints and scope, not arbitrary confidence numbers or result counts. Cases whose meanings could reasonably be disputed should be discussed without changing the frozen file; any adjudication belongs in a separate recorded note.

## Code-informed assessment

Inspected the implementation only after freezing the manifest.

A narrow conservative correction is feasible inside the existing retrieval contract, but not as a changed uncertainty regular expression or a different `getNegationScope` nullable return. Today `null` means positive and any non-null scope means excluded in several consumers. A genuinely unresolved target needs a third state, or either choice will fabricate a semantic claim.

Smallest coherent design:

- Resolve query mention polarity once from raw text plus approved, longest metadata matches and verified spelling corrections. Retain token/span references and an attachment reason alongside `positive`, `excluded`, or `unresolved`.
- Use the same result in geography evidence, concept/frequency/sector selection, deterministic fallback summaries, AI positive-field checks, and AI pair checks. Avoid rescanning the entire unfiltered query to fill a missing field.
- Derive the current flat exclusions only from affirmative attachment evidence. Unknown bridges must never become flat exclusions.
- Add a distinct unresolved-negation clarification reason; preserve independently established positive geography/concept/frequency/sector values. The existing whole-search clarification gate can remain. Supporting partial results would be separate product behavior.
- Recompute on resubmission using original raw `q`, already preserved by the browser serializer. New client-supplied scope decisions are unnecessary and must not become authoritative.
- Keep country repair and ordering on the existing metadata path. Do not add country or phrase-specific exemptions.

Required seams in current code:

- `interpretQueryWithRules` chooses product/activity/sector from all raw mentions minus flat exclusions; those summaries would reintroduce unresolved mentions unless changed to positive-evidence selection.
- `findRuleExclusions` scans concept mentions, while frequency and sector are outside that scan and geography is treated separately. A three-state result must cover these requested dimensions consistently.
- `validateAiConceptPairs` accepts presence anywhere in the query and falls back by pair position; scope filtering is required there, not only in singular fields.
- `addClarificationState` presently knows missing fields, broad product ambiguity, unknown qualifiers, and unresolved pairs, but not unresolved polarity. Reusing an unsupported qualifier label would conceal a distinct problem.
- `normalizeSubmittedIntent` repeats validation. Fixes limited to initial model output do not survive the public search path.

Bounded limitation: a flat type/value exclusion cannot express pair-specific or geography-specific attachment when the same value is also positively requested elsewhere. Positive pairs may already fully express an allowed subset, in which case no additional exclusion is needed. When they cannot, preserve the expressible positive facts and clarify the unrepresentable constraint; do not claim that global exclusions solved it. Full compositional natural-language handling or a scoped exclusion/ranking contract is broader work.

## Offline independent baseline

Runner: `/private/tmp/eia-negation-independent-runner.mjs`.
Evidence: `/private/tmp/eia-negation-independent-baseline-evidence.json`.

All 32 cases were run through the real exported `interpretQuery` with an injected semantically intended model response, the exact browser `appendIntentParams` implementation, `normalizeSubmittedIntent`, and exported public route `GET`. Network was blocked except for the injected response. No paid or live API calls were made. There were 32 model injections, one per case, not 32 real model calls.

21 cases meet the current semantic checks at all boundaries; 11 fail. Failures include false data exclusions after numeric/dash certainty modifiers, negative contractions, unknown bridge predicates, additive `not just`, negation of exclusion, unresolved whether-to-include requests promoted to positive requests, and missing sector exclusion representation. The cases are bounded challenges, not an exhaustive certification. Some failures exceed the narrow uncertainty-target correction and must be classified rather than automatically implemented.

The runner's independent semantic assertions are separate from the frozen manifest. Required country/frequency exclusions are currently observed by exclusion from positive fields because the public flat-exclusion schema lacks those dimensions. That weaker evidence is explicitly recorded in the output.
