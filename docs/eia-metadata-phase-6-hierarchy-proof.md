# EIA metadata Phase 6 aggregation-hierarchy proof

Status: one official SEDS relationship is curated for shadow review. Public hierarchy ranking and contribution calculation remain disabled.

## Objective

Determine whether the validated local EIA metadata can prove which series are components of a requested aggregate before fetching observations or calculating contribution shares.

## Evidence standard

A usable relationship must explicitly provide:

1. A valid aggregate candidate ID.
2. One or more valid component candidate IDs.
3. Candidate IDs that exist in the same validated metadata cache.
4. An explicit `verified_component` relationship type.
5. Official EIA series or valid-combination provenance.
6. A reproducible metadata hash and safe official EIA reference.

Titles, descriptions, aliases, independent facet values, and Phase 4 semantic compatibility are not accepted as proof that one official series contributes to another.

## Audit scope

The proof reads only local schemas and Phase 1B metadata. It does not read observation values and makes no live EIA or OpenAI calls.

| Artifact | Records scanned | Relationship fields | Explicit hierarchy entries |
| --- | ---: | ---: | ---: |
| Domestic Electricity | 86,025 | 0 | 0 |
| Domestic Natural Gas | 16,021 | 0 | 0 |
| Domestic combined | 102,046 | 0 | 0 |
| International | 104,407 | 0 | 0 |
| SEDS | 48,046 | 0 | 0 |
| Total | 254,499 | 0 | 0 |

The normalized series schema, route schema, and three normalized route records also expose no parent, child, component, relationship, hierarchy, or aggregate-link field. The earlier 238,478 total omitted the separately built 16,021-record Natural Gas artifact; the current manifest and audit both report 254,499 records.

## Curated supplementary research

`data/eia/aggregation-hierarchy-registry.json` now records one inactive, source-backed SEDS relationship for Texas annual total energy consumption:

```text
TETCB = FFTCB + NUETB + RETCB + ELNIB + ELISB
```

The official [SEDS total-energy technical notes](https://www.eia.gov/state/seds/sep_use/notes/use_tot.pdf) explicitly publish this formula, and the [SEDS mnemonic appendix](https://www.eia.gov/state/seds/sep_fuel/notes/use_a.pdf) defines the series codes. The registry binds the formula to six exact Phase 1B candidate IDs, their metadata hashes, the same Texas geography, annual frequency, and Billion Btu unit. Both source PDFs are recorded with SHA-256 hashes and locators so a changed official document forces review.

This is research curation, not runtime activation. The registry explicitly keeps observation shadowing, public ranking, and contribution calculation off. Titles, facets, route trees, category membership, and matching values were not used as hierarchy evidence.

## Verification

- The original cache audit still returns `audit_valid: true` and `status: blocked` because normalized series records contain no hierarchy fields.
- The supplementary registry audit validates one relationship, five component edges, six exact cache records, and two official evidence documents.
- The registry reports `shadow_ready_inactive`; it is not activation-ready.
- Focused hierarchy tests: 10 passed, 0 failed.
- Full repository tests: 180 passed, 0 failed.
- JavaScript syntax, `git diff --check`, and the Next.js production build passed.

## Findings

1. The current cache identifies valid selectable series, but it does not itself identify aggregate-to-component edges.
2. Independent product, activity, geography, sector, and series facets cannot prove which components sum to a particular aggregate.
3. Words such as `total`, `renewable`, `wind`, or `consumption` can support relevance ranking but cannot prove an arithmetic hierarchy.
4. The Phase 4 concept taxonomy is an approved semantic-compatibility table, not official aggregation lineage.
5. One SEDS formula can now be researched safely through the supplementary registry, but contribution shares still require shadow validation and signed-component handling.

## Decision

Do not activate contribution scoring, latest-common-period observation retrieval, or contribution-based ordering yet. Ordinary deterministic metadata ranking remains unchanged.

This is the required safe rollback behavior: no unsupported component is promoted and no observation request is added.

## What would unblock Phase 6

The first governed supplementary relationship now exists. Activation still requires:

1. A bounded observation-shadow runner that fetches only the six registered series.
2. Tests for latest common periods, rounding tolerance, negative signed components, zero denominators, and missing observations.
3. A reviewed shadow report proving the official formula against representative periods.
4. Explicit owner approval for ranking activation.
5. Top-five regression and Preview verification before any production change.

## Gate result

The cache hierarchy proof remains blocked, while the supplementary registry is ready for observation shadowing. It remains disconnected from public ranking, observation retrieval, and the deployed search workflow.
