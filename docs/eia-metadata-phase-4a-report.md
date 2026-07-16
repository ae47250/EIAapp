# EIA metadata Phase 4A candidate-orchestration report

Status: implemented locally. This module is not connected to `/api/search-eia`.

## Objective

Complete the deterministic candidate set before conditional semantic reranking. Phase 4A keeps the Phase 3 hard route gate intact and performs a second SEDS retrieval only when all of these conditions hold:

1. The primary route is Domestic.
2. The geography is a U.S. state.
3. The user explicitly requested monthly or quarterly frequency.
4. Phase 4 produced no displayable primary-route family.

The second retrieval is independently hard-filtered to SEDS, the same state, annual frequency, and the same requested concept. Its candidates are then passed through the existing Phase 4 approved-fallback eligibility rule.

## Safety behavior

- Annual SEDS candidates remain Tier B.
- The original requested frequency remains visible.
- The output explicitly warns that the requested frequency was unavailable.
- A fallback is never silently selected as an exact answer.
- If neither route provides a valid candidate, the output says that no validated candidate was found.
- Each combined geography-and-concept set remains capped at 50 candidates.
- Semantically rejected Domestic candidates are not retained merely to fill the pool.

## Public behavior

The orchestrator is internal and disconnected. Public search, observation fetching, exports, and login behavior are unchanged.

## Verification

- Focused Phase 4A suite: 5 tests passed, 0 failed.
- Full repository suite: 116 tests passed, 0 failed.
- Explicit `LOGIN_REQUIRED=off` test: passed.
- Module and test syntax checks: passed.
- Production Next.js build: passed.

Manual local-cache review:

- `Texas monthly total energy consumption` attempted the separate SEDS retrieval and displayed five annual Tier B families with `SEDS.TETCB.TX.A` first.
- The Texas result retained the monthly request and warned that annual SEDS alternatives were being shown.
- `California monthly electricity generation` stayed Domestic, did not call SEDS, and retained `ELEC.GEN.ALL-CA-99.M` first.
- `Brazil monthly total energy consumption` stayed International and did not call SEDS.
- An injected empty SEDS result produced an explicit no-candidate warning and selected no substitute.

## Gate

Verify representative primary, fallback, empty-result, repeatability, full-suite, build, and login-off behavior before Phase 5.
