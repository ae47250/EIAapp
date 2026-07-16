# EIA metadata Phase 1A.2 selector-enumeration proof

Status: review required. Phase 1B has not started.

Captured from official EIA sources on 2026-07-16. API responses reported version 2.1.13. API keys and measurement values are intentionally absent from the fixtures.

## Question

Can valid Domestic, International, and SEDS candidate selectors be enumerated without inventing Cartesian products or downloading complete historical observations?

## Findings

1. Independent facet endpoints are not a relationship index.

   Adding another facet as a filter did not narrow the returned facet list for any proof route. The Domestic sector count stayed 6 when filtered to Colorado, the International product count stayed 18 when filtered to Brazil, and the SEDS series count stayed 968 when filtered to Indiana.

2. A no-value `/data` request is an official valid-combination source.

   Omitting `data[]` returns period and facet identities without measurement values. Restricting the request to one period therefore enumerates valid observed combinations for that period.

3. One-period snapshots are not a complete historical catalog.

   A selector that existed only in an earlier period will not appear in a latest-period snapshot. Complete coverage would require period scanning and deduplication or a separate series catalog.

4. Full no-value scanning is still large.

| Family | Proof route | Frequencies | Rows | Rough uncompressed size | Minimum 5,000-row requests |
| --- | --- | ---: | ---: | ---: | ---: |
| Domestic | `/electricity/retail-sales` | 3 | 159,960 | 17,087,820 bytes | 33 |
| International | `/international` | 3 | 5,181,838 | 1,726,747,556 bytes | 1,038 |
| SEDS | `/seds` | 1 | 2,574,644 | 499,480,936 bytes | 515 |
| Total | 3 routes | 7 | 7,916,442 | 2,243,316,312 bytes | 1,586 |

These estimates cover only the three proof routes. They are based on EIA totals returned by one-row, no-value requests and the UTF-8 size of each representative row. JSON framing and HTTP overhead are not included.

5. Cartesian products are unsafe even when one route happens to match.

| Family | Independent facet product | Valid 2024 annual rows | Difference |
| --- | ---: | ---: | ---: |
| Domestic | 372 | 372 | 0 |
| International | 1,041,984 | 84,623 | 957,361 |
| SEDS | 52,272 | 48,046 | 4,226 |

The Domestic equality is evidence for this route and period only. It does not justify Cartesian generation on other routes. International also exposes nullable `dataFlagId`, which must be classified as an observation annotation or selector before candidate identity is finalized.

6. Official bulk series IDs are a viable candidate source, but adapters are family-specific.

Representative IDs round-tripped through the official API v2 `/seriesid/` route:

| Family | Series ID | Resolved v2 route |
| --- | --- | --- |
| Domestic | `ELEC.SALES.CO-RES.A` | `/electricity/retail-sales` |
| International | `INTL.44-1-BRA-QBTU.A` | `/international` |
| SEDS | `SEDS.TETCB.IN.A` | `/seds` |

The current official bulk files were not downloaded. Their compressed sizes were measured with HEAD requests:

| Bulk file | Compressed bytes | Route-native |
| --- | ---: | --- |
| `ELEC.zip` | 290,265,140 | No |
| `INTL.zip` | 25,297,221 | No |
| `SEDS.zip` | 9,467,055 | No |
| Total | 325,029,416 | No |

EIA documents that each bulk ZIP contains JSON lines for series followed by categories, and that series records include historical data. A Phase 1B builder could stream each file and discard the `data` arrays, but it must parse and validate a different series-ID shape for each family. The Electricity bulk file spans many routes, so its IDs cannot all be assigned to the retail-sales route.

## Recommendation

Do not generate candidates from independent facet lists and do not run a full no-value observation scan.

For Phase 1B, use streaming bulk series headers as the primary enumeration source, with family-specific ID adapters and sampled `/v2/seriesid/` validation. Use one-period no-value snapshots as an active-series check, not as the complete historical catalog.

## Decisions required before Phase 1B

1. Confirm comprehensive historical coverage rather than an active-only cache.
2. Approve downloading and streaming the three bulk files, currently about 325 MB compressed in total.
3. Approve separate Domestic, International, and SEDS series-ID adapters with no generic parser assumption.
4. Decide whether International `dataFlagId` belongs in candidate identity.
5. Set download, request, temporary-storage, and validation-sample limits.

## Official references

- EIA API v2 technical documentation: https://www.eia.gov/opendata/documentation.php
- EIA bulk download documentation: https://www.eia.gov/opendata/v1/bulkfiles.php
- EIA bulk manifest: https://api.eia.gov/bulk/manifest.txt
