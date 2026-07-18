# HoHo8 Release-Candidate Development Comparison

## Scope

- Candidate: working tree at HEAD `d5c65af1ac8046e0c44dc6f64444a0f8d559449d`, diff `cb3c153481eacd4a5acf02d6a3f95cb949fb890022849a9ce80785e5e9bc2ab0`
- Production: commit `d5c65af1ac8046e0c44dc6f64444a0f8d559449d`, deployment `dpl_Dmk429PgEW67i4WjaLPNaXnuBcxr`
- Model: `gpt-5.4-nano-2026-03-17`
- Development queries: 53
- Sealed holdout queries executed: **0**

## Results

- Human-review-relevant differences: 12 (H7-D002, H7-D016, H7-D019, H7-D020, H7-D021, H7-D022, H7-D033, H7-D041, H7-D046, H7-D050, H8-X001, H8-X003)
- Semantic-intent differences: 4 (H7-D002, H7-D021, H7-D033, H8-X001)
- Visible-ranking differences: 9 (H7-D016, H7-D019, H7-D020, H7-D022, H7-D033, H7-D041, H7-D046, H7-D050, H8-X003)
- Operational differences: 0 (none)
- Blinded review cases: 18
- Selective repetitions complete: 13/13
- Repeated cases stable in both arms: 13/13
- Candidate workflow calls: 79
- Production workflow calls: 79
- Candidate direct OpenAI estimated cost: USD 0.046614
- Repeated-set Production transport failures: 2; both failed first-pass queries returned HTTP 200 in repetitions 2 and 3

Certainty-only differences, including the new explicit `routeRelation`, are machine-contract changes and do not by themselves create a human-review case.

## Objective Safety Findings

- **H8-X002 blocks promotion:** expected geographies GEO, FRA; both arms omitted GEO (candidate returned FRA; Production returned FRA).
- **H7-D033 requires review:** the candidate avoids the deployed result but returns no candidates; this may be safer without yet being useful.

Comparative parity does not make a shared safety failure acceptable. Objective checks remain independent of candidate-versus-Production differences.

## Review Rule

Review every case in `hoho8HR.md`. Promotion quality is comparative: the candidate may have bounded noncritical losses, but it must introduce no critical semantic, hierarchy, or unsupported-route regressions.

## Status

**DO NOT PROMOTE YET**

Human review is pending, and the shared explicit-geography omission must be fixed and rerun before promotion.
