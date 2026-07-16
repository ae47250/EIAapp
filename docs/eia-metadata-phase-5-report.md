# EIA metadata Phase 5 conditional semantic-reranking report

Status: shadow-only implementation. Disabled by default and disconnected from `/api/search-eia`.

## Objective

Permit a second OpenAI review only when deterministic ranking leaves unresolved ambiguity among several credible, same-tier, closely scored family representatives.

## Trigger

Conditional review requires all of the following:

1. At least two display-qualified family representatives.
2. Both leading representatives are in the same deterministic tier.
3. Both have deterministic scores of at least 60.
4. Their score gap is no more than five points.
5. Structured intent or candidate metadata retains unresolved ambiguity.
6. The top result is not a protected exact verified aggregate. An exact verified aggregate remains protected when a requested-frequency mismatch correctly places it in Tier B; the weaker all-sectors aggregate signal is protected only in Tier A.

Clear or decisive results do not invoke AI.

## Safety

- AI receives raw query text, lightly cleaned text, validated structured intent, and only known display-family metadata.
- AI may return only a complete ordering of the supplied family IDs, confidence, and short reason codes.
- Unknown, duplicate, missing, or incomplete family orders are rejected.
- AI cannot restore candidates rejected by route, geography, frequency, duplication, or semantic floors.
- Tier order and deterministic scores cannot change.
- Shadow output is recorded separately and never changes `displayCandidates`.
- Timeout, request failure, invalid JSON, and low confidence preserve deterministic output.
- `EIA_SEMANTIC_RERANKING=off` is the immediate rollback and the default.

## Evaluation

`triggerPolicy=always` exists only to compare always-AI invocation behavior with conditional invocation behavior. Production modes are `off` and `shadow`.

The output records invocation count and rate, elapsed time, model, confidence, reason codes, and OpenAI token usage when available. No cost is invented; cost can be calculated later from recorded usage and the deployed model's current pricing.

## Verification

- Phase 5 focused tests: 11 passed, 0 failed.
- Full repository tests: 127 passed, 0 failed.
- Authentication tests: 13 passed, including `LOGIN_REQUIRED=off` bypass behavior.
- JavaScript syntax checks and configuration JSON parsing passed.
- `next build` completed successfully.
- `git diff --check` passed.

Local metadata samples confirmed these trigger outcomes:

| Input | Deterministic outcome | Semantic shadow decision |
| --- | --- | --- |
| `California monthly electricity generation` | Tier A exact aggregate first | Not eligible: decisive exact aggregate |
| `Texas monthly total energy consumption` | Clearly labeled annual SEDS Tier B exact aggregate first | Not eligible: decisive exact aggregate |
| `Texas annual total energy consumption` | Tier A exact aggregate first | Not eligible: decisive exact aggregate |
| `Brazil renewable energy production` | Leading score gap is decisive | Not eligible: decisive deterministic gap |
| `California monthly electricity from moon` | Weak activity inference retained | Eligible: unresolved ambiguity among close same-tier families |
| `Japan oil use` | Explicit petroleum consumption interpretation | Not eligible: no unresolved ambiguity |
| `Japan energy supply` | Tier A exact aggregate first | Not eligible: decisive exact aggregate |
| `Japan energy output` | Tier A exact aggregate first | Not eligible: decisive exact aggregate |
| `Japan natural gas demand` | Explicit natural-gas consumption interpretation | Not eligible: no unresolved ambiguity |
| `montly nat gas prodction usa` | Corrected but frequency/route ambiguity remains | Eligible: unresolved ambiguity among close same-tier families |

No live OpenAI reranking call was made during this gate. `OPENAI_API_KEY` was not present in the test shell, and production behavior remains disabled by default. Live shadow quality, latency, invocation rate, and token usage therefore remain Phase 7 pre-promotion evidence rather than a claimed Phase 5 result.

## Public behavior

There is no public behavior change. Phase 7 decides whether a measured shadow improvement justifies any user-visible semantic ordering.

## Gate

Approve only if live shadow evidence shows meaningful ambiguous-query improvement without clear-query regressions and with acceptable invocation rate, latency, and token usage. Otherwise leave the feature off and continue with deterministic ordering.
