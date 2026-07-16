# EIA metadata Phase 6 aggregation-hierarchy proof

Status: blocked safely. Contribution ranking was not implemented.

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
| Domestic | 86,025 | 0 | 0 |
| International | 104,407 | 0 | 0 |
| SEDS | 48,046 | 0 | 0 |
| Total | 238,478 | 0 | 0 |

The normalized series schema, route schema, and three normalized route records also expose no parent, child, component, relationship, hierarchy, or aggregate-link field.

## Verification

- Standalone audit completed successfully with `audit_valid: true` and `status: blocked` in about 2.6 seconds.
- Phase 6 focused tests: 6 passed, 0 failed.
- Full repository tests: 133 passed, 0 failed.
- Authentication tests: 13 passed, including `LOGIN_REQUIRED=off` bypass behavior.
- JavaScript syntax and `git diff --check` passed.
- `next build` completed successfully.

## Findings

1. The current cache identifies valid selectable series, but it does not identify aggregate-to-component edges.
2. Independent product, activity, geography, sector, and series facets cannot prove which components sum to a particular aggregate.
3. Words such as `total`, `renewable`, `wind`, or `consumption` can support relevance ranking but cannot prove an arithmetic hierarchy.
4. The Phase 4 concept taxonomy is an approved semantic-compatibility table, not official aggregation lineage.
5. Contribution shares cannot satisfy the requirement that every calculation use a verified relationship.

## Decision

Do not implement contribution scoring, latest-common-period observation retrieval, or contribution-based ordering in this phase. Ordinary deterministic metadata ranking remains unchanged.

This is the required safe rollback behavior: no unsupported component is promoted and no observation request is added.

## What would unblock Phase 6

One of the following must be approved and versioned first:

1. Official EIA metadata that explicitly maps aggregates to component series.
2. A carefully governed supplementary hierarchy with exact candidate IDs, official source citations, definitions, unit/frequency compatibility rules, review ownership, tests, and refresh behavior.

After that evidence exists, contribution calculation still requires separate tests for latest common periods, compatible units and frequencies, zero denominators, missing observations, provenance, and bounded latest-observation calls.

## Gate result

The hierarchy proof is valid, but the hierarchy itself is unavailable. Phase 6 implementation therefore stops before observation retrieval and remains disconnected from the public search workflow.
