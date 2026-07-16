# EIA metadata Phase 1B staging-cache report

Status: valid partial staging build. Production activation is false. Stop for review before any later phase.

Build time: 2026-07-16T05:22:57.264Z
Official API version retained from Phase 1A: 2.1.13

## Scope

Phase 1B implemented the approved streamed bulk-series approach for:

- Electricity (`ELEC.zip`) as the current Domestic seed;
- International (`INTL.zip`);
- State Energy Data System (`SEDS.zip`).

This is not comprehensive Domestic EIA coverage. Natural gas, petroleum, coal, total energy, carbon dioxide, and other Domestic bulk datasets have not been normalized. The manifest is therefore `partial`, and the generated cache is under `data/eia/builds/phase1b` rather than the active production metadata path.

## Explicit exclusion

`ELEC.PLANT.*` contains facility-level records outside the approved state/national query scope.

| Electricity source records | Count |
| --- | ---: |
| Total `ELEC` series | 765,244 |
| Excluded `ELEC.PLANT.*` series | 679,219 |
| Retained Domestic Electricity series | 86,025 |

The exclusion is deterministic, tested, counted in `validation-report.json`, and never applied silently.

## Generated staging artifacts

| Artifact | Records | Compressed bytes | Normalized content hash |
| --- | ---: | ---: | --- |
| `domestic.jsonl.gz` | 86,025 | 9,089,833 | `196c040c82214b3e7ae13a088350922fb17780f4c569aa369e4cb38e5ca890fd` |
| `international.jsonl.gz` | 104,407 | 12,216,335 | `9a8aa41092fee18d29d4be1b7f524aeb46d5de68e718ea7c58c4218fdd355b05` |
| `seds.jsonl.gz` | 48,046 | 5,322,539 | `02f85d917fc82f3394429f8a3cc438257a143f018124290ed919a2876c179d66` |
| Total | 238,478 | 26,628,707 | See `manifest.json` |

Each gzip expands to newline-delimited records conforming to `series.schema.json`. Historical observation arrays are removed before JSON parsing and are not present in any artifact.

Supporting files:

- `routes.json`: the three normalized Phase 1A route records;
- `manifest.json`: hashes, counts, warnings, and partial status;
- `validation-report.json`: artifact-level validation results and scope.

## Build behavior

1. Read each official ZIP through `tar -xOf` without extracting its full text file to disk.
2. Cut each JSON line at the official `data` array boundary before parsing.
3. Apply family-specific selectors:
   - Domestic Electricity uses the official API v2 `/seriesid` compatibility route;
   - International uses product, activity, geography, and unit facets;
   - SEDS uses series and state facets.
4. Exclude `ELEC.PLANT.*` and count every exclusion.
5. Normalize and validate every retained record.
6. Reject duplicate series IDs or candidate IDs.
7. Write gzip-compressed JSONL while hashing the uncompressed normalized content.
8. Decompress and independently validate every generated record a second time.
9. Replace only the Phase 1B staging directory atomically after complete validation.
10. Restore the prior staging directory if activation fails.

## Validation results

- 238,478 normalized records validated twice.
- Zero duplicate series IDs.
- Zero duplicate candidate IDs.
- Zero missing geography records after the SEDS offshore-code fallback.
- Zero historical measurement arrays in generated records.
- All generated files are below GitHub's 100 MiB per-file limit.
- Independent repeat build produced identical record counts, normalized content hashes, and compressed file hashes.
- Simulated activation failure restored the previous cache in automated tests.

## Schema adjustment

Fields that are unknown or empty may now be omitted from compact bulk records. Core identity, selector, title, frequency, source, active status, provenance, and hashes remain required. This avoids serializing repeated null fields across 238,478 records.

## Side effects

- No application, login, API route, UI, package, deployment, scheduler, or environment file changed.
- No new dependency was added.
- No production metadata was activated.
- Temporary source archives are not repository artifacts.

## Review decisions before proceeding

1. Accept or revise the `ELEC.PLANT.*` exclusion.
2. Decide which additional Domestic bulk datasets are required before the cache can be comprehensive.
3. Accept gzip-compressed JSONL as the stable cache artifact format.
4. Decide whether the 26.6 MB staging cache should be committed to Git or generated in external storage.
5. Do not activate production metadata until the Domestic scope decision is resolved.
