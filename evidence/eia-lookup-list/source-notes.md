# Sources and expectation decisions

The list has not been written. Expected answers derive from query meaning and official EIA metadata, never current app results. The agent writing this file will also build the list; no independent adjudication is claimed.

- EIA v2 documentation: https://www.eia.gov/opendata/documentation.php
- EIA FAQ (paging, updates and rate guidance): https://www.eia.gov/opendata/faqs.php
- Electricity total consumption includes direct use in the broader definition: https://www.eia.gov/energyexplained/electricity/use-of-electricity.php
- SEDS electricity consumption notes define its own total by sales: https://www.eia.gov/state/seds/sep_fuel/notes/use_elec.pdf
- Owner accepts the explicitly labelled retail-sales basis; see owner-decisions.json. The inspected state source/disposition route publishes sales and direct use separately, not a combined consumption column. No separate state total including direct use was established, so do not claim it exists.
- EIA dry-reserves table: https://www.eia.gov/dnav/ng/ng_enr_dry_a_epg0_r11_bcf_a.htm . Its R11 series is titled Expected Future Production in current API metadata; the official table identifies it as dry proved reserves. The Lower 48 value equals the U.S. total minus Alaska, including federal offshore. API coverage ends in 2021; display coverage explicitly.
- AOR scope: cached official series description explicitly sums renewable sources other than hydroelectric dams, all sectors. The live facet says all renewables, while REN is a broader aggregate. Live 2024 TX REN equals AOR plus conventional hydro. Use the complete description, not the broad facet label alone; preserve this discrepancy.
- F2: all 2,126 export observations per country, all products/units, were retrieved for Mexico and Canada. Aggregate petroleum products 5/53 have no export rows. Crude exports are an alternative, never a silent total replacement.
- I6: the full SEDS series list has no total excluding transportation. Offer its all-sector total as an explicitly selected alternative; do not compute a new series.
- International annual facet requests with explicit frequency returned HTTP 500. Default metadata is frequency-limited. Live data responses carry authoritative product/activity/country names and codes for annual samples; those records supplement the route's facet definitions. Server errors are retained and never treated as evidence of no data.
- Research requests were paced one at a time with at least 1 second between requests, at most one retry. EIA echoed api_key fields were redacted before saving. No credentials were copied.

Baseline: 284 offline tests, 284 passed, 0 failed. The pre-existing untracked docs/eia-interpretation-audit.md is unrelated to this job and remains untouched.

The 12 second-set questions independently test reading, but the list is built knowing them. They are not independent tests of the lookup list; after this job they are regressions.
