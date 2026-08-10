# EIA metadata Phase 1B staging-cache report

Status: valid partial staging build. Production activation is false. Stop for review before any later phase.

Build time: 2026-07-16T11:51:42.502Z
Official API version retained from Phase 1A: 2.1.13

## Scope

Phase 1B implemented the approved streamed bulk-series approach for:

- Electricity (`ELEC.zip`) as the current Domestic seed;
- International (`INTL.zip`);
- State Energy Data System (`SEDS.zip`).

This is not comprehensive Domestic EIA coverage. Natural gas, petroleum, coal, total energy, carbon dioxide, and other Domestic bulk datasets have not been normalized. The manifest is therefore `partial`, and the generated cache is under `data/eia/builds/phase1b` rather than the active production metadata path.

## Facility-level handling

`ELEC.PLANT.*` contains facility-level series that would overwhelm ordinary state/national retrieval. The approved design excludes those full series from `domestic.jsonl.gz`, retains one compact row per plant locally, and defers detailed plant metadata retrieval to the official EIA API v2 when a later query explicitly identifies a plant or facility.

| Electricity source records | Count |
| --- | ---: |
| Total `ELEC` series | 765,244 |
| Full `ELEC.PLANT.*` series kept out of the main cache | 679,219 |
| Retained Domestic Electricity series | 86,025 |
| Unique compact plant-directory entries | 15,539 |

Every excluded plant series contributes to exactly one directory entry's `series_count`. The directory is deterministic, tested, counted in `validation-report.json`, and never hides the exclusion.

The directory contains plant ID, current canonical name, alternate names found in the official bulk source, state code, coordinates when available, source-series count, and provenance. It contains no series payload and no observations.

## Generated staging artifacts

| Artifact | Records | Compressed bytes | Normalized content hash |
| --- | ---: | ---: | --- |
| `domestic.jsonl.gz` | 86,025 | 9,089,833 | `196c040c82214b3e7ae13a088350922fb17780f4c569aa369e4cb38e5ca890fd` |
| `international.jsonl.gz` | 104,407 | 12,216,335 | `9a8aa41092fee18d29d4be1b7f524aeb46d5de68e718ea7c58c4218fdd355b05` |
| `seds.jsonl.gz` | 48,046 | 5,322,539 | `02f85d917fc82f3394429f8a3cc438257a143f018124290ed919a2876c179d66` |
| `plants.jsonl.gz` | 15,539 directory rows | 1,042,940 | `d41e5f66fa9b030c1e491a38ff54e2a2b734635139c9a7cb245decd0aee99c88` |
| Total | 238,478 selectable series plus 15,539 plant rows | 27,671,647 | See `manifest.json` |

Each gzip expands to newline-delimited records conforming to `series.schema.json` or `plant-directory.schema.json`. Historical observation arrays are removed before JSON parsing and are not present in any artifact.

Supporting files:

- `routes.json`: the three normalized Phase 1A route records;
- `plants.jsonl.gz`: the compact plant-name/ID directory for explicit on-demand requests;
- `manifest.json`: hashes, counts, warnings, and partial status;
- `validation-report.json`: artifact-level validation results and scope.

## Build behavior

1. Read each official ZIP through `tar -xOf` without extracting its full text file to disk.
2. Cut each JSON line at the official `data` array boundary before parsing.
3. Apply family-specific selectors:
   - Domestic Electricity uses the official API v2 `/seriesid` compatibility route;
   - International uses product, activity, geography, and unit facets;
   - SEDS uses series and state facets.
4. Exclude full `ELEC.PLANT.*` series from the main cache, count every exclusion, and collapse them into one compact row per plant ID.
5. Select canonical plant names, states, and coordinates deterministically by their most frequent official source value; retain alternate plant names as aliases.
6. Normalize and validate every retained series and plant-directory record.
7. Reject duplicate series IDs, candidate IDs, or plant IDs.
8. Write gzip-compressed JSONL while hashing the uncompressed normalized content.
9. Decompress and independently validate every generated record a second time.
10. Replace only the Phase 1B staging directory atomically after complete validation.
11. Restore the prior staging directory if activation fails.

## Validation results

- 238,478 normalized selectable-series records and 15,539 plant-directory records validated twice.
- The plant-directory `series_count` total is exactly 679,219, matching the full-series exclusion count.
- The plant directory is 1,042,940 compressed bytes, below the 10 MiB Phase 1B safety limit.
- 31 directory entries lack a state code and 291 lack coordinates; none lack plant ID or name.
- Zero duplicate series IDs.
- Zero duplicate candidate IDs.
- Zero duplicate plant IDs.
- Zero missing geography records after the SEDS offshore-code fallback.
- Zero historical measurement arrays in generated records.
- All generated files are below GitHub's 100 MiB per-file limit.
- Independent repeat build produced identical record counts, normalized content hashes, and compressed file hashes.
- Simulated activation failure restored the previous cache in automated tests.

## Schema adjustment

Fields that are unknown or empty may now be omitted from compact bulk records. Core identity, selector, title, frequency, source, active status, provenance, and hashes remain required. This avoids serializing repeated null fields across 238,478 records.

## Side effects

- One authenticated server-only plant metadata API route and its Vercel file-tracing configuration were added.
- No login behavior, UI, package, scheduler, or environment file changed.
- No new dependency was added.
- No production metadata was activated.
- Temporary source archives are not repository artifacts.

## Review decisions before proceeding

1. Plant handling is resolved: retain the compact local directory and perform detailed official EIA metadata lookup only for explicit plant/facility requests.
2. Decide which additional Domestic bulk datasets are required before the cache can be comprehensive.
3. Accept gzip-compressed JSONL as the stable cache artifact format.
4. Decide whether the 27.7 MB staging cache should be committed to Git or generated in external storage.
5. Do not activate production metadata until the Domestic scope decision is resolved.

## Implemented hybrid boundary

Phase 1B now provides the authenticated server-only `/api/plant-metadata` route:

1. `q=<plant name>&state=<optional state>` searches only the compact local directory and performs no EIA request.
2. `plantId=<exact EIA plant ID>` verifies the ID locally, then calls the official `/v2/electricity/operating-generator-capacity/data/` route with the verified `plantid` facet.
3. The live request is limited to 250 rows, sorted newest first, and the public response retains only generator rows from the newest returned period.
4. Successful live responses are cached per plant ID for 30 minutes, with at most 100 entries per function instance.
5. The live timeout defaults to five seconds and may be configured from one to ten seconds with `EIA_PLANT_LOOKUP_TIMEOUT_MS`.
6. If EIA is slow or unavailable, the API still returns the successful local plant match with a warning and no live metadata.

A production-server smoke test found plant `10026` locally in 702 ms with no EIA call. Its first live enrichment returned four generator rows for period `2026-04` in 3,286 ms, and the cached repeat returned in 510 ms. Therefore the local match meets the fast path, while a cold live enrichment cannot guarantee two seconds.

Automatic detection of plant intent in the main user-query pipeline remains deferred to the routing phase. The current search screen and International search behavior are unchanged.
