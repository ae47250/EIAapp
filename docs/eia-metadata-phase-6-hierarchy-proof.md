# EIA metadata Phase 6 aggregation-hierarchy proof

Status: all 52 generated relationships passed live observation shadowing, all 51 state/DC ranking cases passed non-visible ranking shadowing, and the deployed Preview passed API and runtime verification. Production hierarchy ranking is approved behind an immediate environment-variable rollback; contribution calculation remains disabled.

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

1. Observation shadowing is complete and recorded in a reproducible report.
2. Hierarchy ranking defaults to `off`; approved environments must explicitly set `EIA_HIERARCHY_RANKING=on`.
3. Contribution calculation is off.
4. Production activation requires hash-locked observation evidence, hash-locked ranking-shadow evidence, recorded Preview verification, and explicit production approval.
5. The base Phase 4 scorer remains unchanged; a governed post-ranking tie-break may move only a verified aggregate within an identical tier and score.
6. Unsupported adapters are rejected.
7. No live EIA or OpenAI call occurs during ordinary metadata generation or audit.
8. Signed components, common periods, missing values, API failures, zero aggregates, and precision-derived rounding are covered by the shadow runner and tests.

## Verification

- Supplementary hierarchy audit: valid, `preview_ready_production_inactive`, 52 relationships, 259 component edges, and 311 exact candidates.
- Original embedded-metadata audit: valid and still blocked with zero hierarchy relationships.
- Observation shadow: 52 passed, 0 blocked, 3,380 common periods, 0 formula mismatches, and 0 API failures.
- Ranking shadow: 51 of 51 state/DC aggregates promoted to shadow top-one, with 0 visible changes and 0 control-case changes.
- Vercel Preview `dpl_AvM6hiApYRdPcph5kDAuhnZFbiyo`: Texas aggregate and renewable/fossil controls passed; no Preview runtime errors were recorded.
- Full repository test suite: 199 passed, 0 failed.
- Next.js production build: passed.
- JavaScript syntax and `git diff --check`: passed.

## Implementation status: approved steps 1-10

1. **Registry template:** Complete. Texas-only materialization was replaced by reviewed formula templates.
2. **Deterministic expansion:** Complete. Every eligible state/DC and the separate U.S. scope are generated from exact normalized selectors.
3. **Identity and hash audit:** Complete. Every generated candidate ID, metadata hash, source-build hash, relationship hash, and artifact hash is reproducible.
4. **Regression coverage:** Complete. Tests cover Texas, all state/DC scopes, U.S. exclusion of `ELISB`, determinism, missing members, tampering, and disabled activation.
5. **Shadow target coverage:** Complete. Every generated relationship was tested across 65 common annual periods from 1960 through 2024.
6. **Build integration:** Complete. Phase 1B regeneration occurs after normalization and before staged activation.
7. **Ranking isolation:** Complete. Only the governed post-ranker consumes the hash-locked artifact and reports; base ranking and retrieval remain unchanged.
8. **Reviewability:** Complete. The template version, generated counts, and artifact hashes are recorded.
9. **Route-family framework:** Complete as a guardrail. Domestic and International require separate official templates/adapters rather than inheriting SEDS semantics.
10. **National exception:** Complete. The U.S. formula is generated separately from state/DC formulas.

## Observation-shadow result

The bounded runner made one request per relationship, with at most six series and concurrency capped at three. It tested 3,380 common periods, including 1,989 negative component observations. The largest absolute residual was 2 Billion Btu, below the state precision-derived rounding bound of 3.

```text
data/eia/reports/aggregation-hierarchy-shadow.json
evidence SHA-256: 0e1932494b18ef7e6dc4527d3c3bf63d251b6cc4d7fac15023c6e6830a00ee19
```

## Ranking-shadow result

The post-ranker applies only when route candidates are SEDS and the resolved concept is exactly `total energy` plus `consumption`. It does not add score, cross a semantic floor, change tier, or override a higher score. It promotes the verified aggregate only within an identical tier and score.

All 51 state/DC cases placed the verified aggregate at shadow top-one. Visible order remained unchanged during shadow, and renewable, fossil-fuel, and unrelated controls did not move.

```text
data/eia/reports/aggregation-hierarchy-ranking-shadow.json
evidence SHA-256: a4838e45b876f8c99ef9596daa0439c3703076e7800f509af5328ae107fb1f1d
```

The national U.S. relationship is observation-validated but is not ranking-active because current national total-energy intent routes to Domestic rather than SEDS. This pass does not change that route silently.

## Deployment gate

Preview deployment `dpl_AvM6hiApYRdPcph5kDAuhnZFbiyo` verified:

1. Texas total energy consumption returns `SEDS.TETCB.TX.A` first with `verified_aggregate` certainty.
2. Texas renewable consumption remains `SEDS.RETCB.TX.A` with no hierarchy preference applied.
3. Texas fossil-fuel consumption remains `SEDS.FFTCB.TX.A` with no hierarchy preference applied.
4. Preview runtime error and fatal logs are empty.

Production approval is now recorded. The rollback is immediate: remove or set `EIA_HIERARCHY_RANKING=off` and redeploy. This does not disable the candidate pipeline, change semantic eligibility, or revert metadata.

## Gate result

Template generation, identity auditing, observation shadow, ranking shadow, and Preview verification are complete. Production hierarchy ranking is approved for the narrow same-tier, same-score aggregate tie-break. Contribution calculation remains disabled, and the U.S. national route limitation remains explicit.
