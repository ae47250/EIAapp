# EIA metadata Phase 6 aggregation-hierarchy proof

Status: two official SEDS formula templates deterministically generate 52 inactive relationships for shadow review. Public hierarchy ranking and contribution calculation remain disabled.

## Objective

Determine whether reviewed official formulas can be bound to exact candidates across every eligible geography without inferring hierarchy from titles, facets, or route structure.

## Evidence standard

A usable relationship must provide:

1. A reviewed official formula template.
2. An exact aggregate candidate and every required component candidate.
3. Matching route family, geography, frequency, and unit.
4. Active candidates from official series metadata.
5. Reproducible candidate metadata hashes and official evidence hashes.
6. Deterministic generation with no partial relationships.

Titles, descriptions, aliases, independent facet values, and Phase 4 semantic compatibility are not accepted as proof that one official series contributes to another.

## Embedded metadata audit

The original read-only cache audit still finds no hierarchy fields or embedded relationships:

| Artifact | Records scanned | Relationship fields | Explicit hierarchy entries |
| --- | ---: | ---: | ---: |
| Domestic Electricity | 86,025 | 0 | 0 |
| Domestic Natural Gas | 16,021 | 0 | 0 |
| Domestic combined | 102,046 | 0 | 0 |
| International | 104,407 | 0 | 0 |
| SEDS | 48,046 | 0 | 0 |
| Total | 254,499 | 0 | 0 |

The supplementary generated registry does not change those normalized records. It is a separate reviewed artifact and is not imported by retrieval or ranking.

## Formula templates

`data/eia/aggregation-hierarchy-registry.json` stores two inactive templates.

For every eligible state and the District of Columbia:

```text
TETCBZZ = FFTCBZZ + NUETBZZ + RETCBZZ + ELNIBZZ + ELISBZZ
```

For the United States national series:

```text
TETCBUS = FFTCBUS + NUETBUS + RETCBUS + ELNIBUS
```

The national formula is deliberately separate and does not include `ELISB`. The official [SEDS total-energy technical notes](https://www.eia.gov/state/seds/sep_use/notes/use_tot.pdf) publish both formulas, and the [SEDS mnemonic appendix](https://www.eia.gov/state/seds/sep_fuel/notes/use_a.pdf) defines the series codes. Both documents are recorded with SHA-256 hashes, byte counts, and locators.

Domestic and International do not inherit the SEDS formula. Each route family requires its own approved official template and route-specific adapter before generation is allowed.

## Deterministic generation

`scripts/eia-metadata/generate-aggregation-hierarchy.js` expands the reviewed templates only after normalized metadata exists. For each source geography, it requires exactly one aggregate and every required component with matching annual frequency, Billion Btu units, active status, and official series provenance.

The current Phase 1B build produces:

| Scope | Relationships | Component edges | Selected candidates |
| --- | ---: | ---: | ---: |
| 50 states plus District of Columbia | 51 | 255 | 306 |
| United States national | 1 | 4 | 5 |
| Total | 52 | 259 | 311 |

Incomplete or duplicate member sets are recorded as exclusions and never materialized as partial relationships. Texas remains an exact regression canary, not a manually maintained source relationship.

Generated artifact:

```text
data/eia/builds/phase1b/aggregation-hierarchy.generated.json
artifact SHA-256: 35e04fcb1201668e8a97ef99b43037ec28e82a44c1e2761951dcf90a51b79367
relationship SHA-256: 1b9390f38f0153b96c44ef5e46ff5104b36ef5a60de12bc98b59c369197d2fdf
```

The Phase 1B build regenerates this derived artifact after normalizing and validating source records and before activating the staged build directory. The validation report records its hash and counts. A metadata rebuild therefore refreshes all exact candidate IDs and metadata hashes; a stale or tampered generated artifact fails the supplementary audit.

## Safeguards

1. Observation shadowing is off.
2. Public hierarchy ranking is off.
3. Contribution calculation is off.
4. Phase 4 ranking still reports zero verified hierarchy relationships and a zero hierarchy weight.
5. Local retrieval and ranking do not import the generated artifact.
6. Unsupported adapters are rejected.
7. No live EIA or OpenAI call occurs during generation or audit.
8. Signed components and rounding tolerance are recorded as requirements, not assumed to have passed.

## Verification

- Supplementary hierarchy audit: valid, `shadow_ready_inactive`, 52 relationships, 259 component edges, and 311 exact candidates.
- Original embedded-metadata audit: valid and still blocked with zero hierarchy relationships.
- Full repository test suite: 186 passed, 0 failed.
- Next.js production build: passed.
- JavaScript syntax and `git diff --check`: passed.

## Implementation status: approved steps 1-10

1. **Registry template:** Complete. Texas-only materialization was replaced by reviewed formula templates.
2. **Deterministic expansion:** Complete. Every eligible state/DC and the separate U.S. scope are generated from exact normalized selectors.
3. **Identity and hash audit:** Complete. Every generated candidate ID, metadata hash, source-build hash, relationship hash, and artifact hash is reproducible.
4. **Regression coverage:** Complete. Tests cover Texas, all state/DC scopes, U.S. exclusion of `ELISB`, determinism, missing members, tampering, and disabled activation.
5. **Shadow target coverage:** Complete as target preparation only. Every generated relationship is available to a future runner; no observations are fetched yet.
6. **Build integration:** Complete. Phase 1B regeneration occurs after normalization and before staged activation.
7. **Ranking isolation:** Complete. Ranking can eventually consume only an explicitly approved generated artifact; it currently consumes none of it.
8. **Reviewability:** Complete. The template version, generated counts, and artifact hashes are recorded.
9. **Route-family framework:** Complete as a guardrail. Domestic and International require separate official templates/adapters rather than inheriting SEDS semantics.
10. **National exception:** Complete. The U.S. formula is generated separately from state/DC formulas.

## Next phase

Build a bounded observation-shadow runner over the generated targets, then compare each official formula across common periods with explicit rounding tolerance and signed/negative-component handling. It should fetch six series per state/DC relationship and five series for the separate U.S. relationship, not treat all targets as one unbounded request.

The runner must also test missing observations, zero denominators, latest common periods, API failures, and reproducible shadow reports. After review of those reports, request explicit owner approval before connecting hierarchy evidence to ranking or contribution calculation.

## Gate result

Template generation and identity auditing are complete and inactive. Observation validity, ranking activation, and contribution calculation remain blocked pending the bounded shadow phase and explicit approval.
