# Partial coverage checkpoint

Recorded 2026-10-30T15:09:08.397577+00:00. The formal coverage/Set D checkpoint is **not reached**. Implementation remains gated.

Coverage: **298 mapped; 1790 not checked**, retaining all 2,088 frozen cells. No absence or subset-only certification has been inferred from unfinished work.

| Place kind | Base mapped / total | All mapped / total |
|---|---:|---:|
| country | 27 / 168 | 31 / 522 |
| World | 37 / 168 | 41 / 522 |
| US | 16 / 168 | 77 / 522 |
| state | 50 / 168 | 149 / 522 |

Calls: 4,391 total reserved (1,464 earlier + 2,927 coverage), against the 20,000 estimate threshold / 25,000 cap. Paid calls: zero. Recorded peak: 2/second and 1,652/hour.

Retrieval: 248/262 complete groups, 13,025,726 saved rows. Stop reason: still running at report snapshot. The approved deadline is 16:12:35 UTC (12:12:35 p.m. ET), 30 October 2026.

Census: 242 nodes; 27 branches; 154 eligible and 61 excluded leaves, plus AEO/IEO release families. All 61 exclusions reviewed; seed 20261029; no quote mismatch. OB2, OBW and sector 95 remain explicit unresolved exceptions, never usable for results or nonpublication.

Validation: 247/247 audited groups pass. Existing row checker: 17,117 passed, 0 failed, 145 unsupported in offline replay of fully saved live responses. Research tests: 393; app tests: 537/537; local build passed, keys blank. These do not establish unfinished coverage or live application behavior.

## Unfinished work and source issues

- Finish retrieval and observation audits, retaining source anomalies as incomplete until reconciled.
- Owner decision pending on metadata-only absence evidence for 706 cells without eligible series; all remain not checked.
- Finish whole-product scope/default comparisons and any unsupported row-check mappings.
- Complete seeded 5% negative-cell live rechecks only after negative evidence is established.
- Write and freeze Set D and scorer after coverage, then stop for owner implementation go.

Crude-import final pages are shorter than EIA’s totals; monthly gas consumption changed its reported total between pages. Those groups stay incomplete. Details and immutable call references: `retrieval-anomalies.json`. Five duplicate empty-page bookkeeping references were removed only after preserving the original state; no source response was changed.

All-size versus utility-scale scope, natural-gas sector sales prices, whole-product measurement bases, and separate crude/gasoline qualifiers follow the recorded owner rules. Unverified scope notes are labelled; no further PDF footnote research. Detailed scope exceptions remain in the research registers.

## Preservation and boundary

Authoritative raw evidence and resume state: `~/Documents/EIAapp-Evidence/20261029/coverage/`. Exact checkpoint copies and SHA-256 manifests live there; raw responses are excluded from Git. Repository files contain summaries, call logs, hashes and reproducible research scripts. Three older research records include local home paths; no credentials were found in the last scan. Checkpoint verification records give the current scan and size.

Application source, earlier frozen inputs, main and the no-dead-ends branch are unchanged. No push, paid model call, deployment or settings change. Unrelated untracked `docs/eia-interpretation-audit.md` and `scripts/eia-lookup/__pycache__/` are preserved.

Commands and prior test records: `execution-notes.md`, `execution-test-records.json`. Resume downloading only after authorization for a new time window; do not silently change the expired deadline.

## Standing-scope decisions for owner review

Each case is listed below; the cited source records and current limitations are in `scope-review-register.json`.

- **gas-sector-sales-price**: whole product within named sector; still a sector subset of all-sector requests Remaining: B1 observations and broader candidate selection; SEDS historical source definitions retained.
- **biomass-component**: wood-fuel component of biofuels; headline rule does not make it whole biofuels
- **crude-import-components**: Crude is a petroleum component; individual grades are crude components; prefer published aggregate imports including estimates over company-level sums.
- **power-sector-receipt-prices**: Whole-product price only in the electric-power sector, with whole fuel/sector facets and labelled EIA-923 receipt population; never all-sector economy price. Coal mine-origin series is not destination-state consumer price. Remaining: MER unqualified generating-plant series includes mixed consuming sectors; does not automatically become electric-power sector. Reconcile those separately.
- **utility-scale-capacity**: Use broader all-size total where published; otherwise accept EIA headline net summer capacity with utility-scale label. Ownership and fuel components remain narrower. Remaining: Broader API candidate selection and observations in B1; known solar total exists in EPM 6.2.B.
- **petroleum-gasoline-retail-survey**: all grades/all formulations with tax label; narrower grades or sales populations remain components; preserve alternate seller-stage bases
- **petroleum-crude-first-purchase-refiner-import-prices**: different transaction bases labelled separately; composite preferred to domestic/imported acquisition components; imports totals cover all origins, not one origin
- **petroleum-refiner-only-product-prices**: broader all-seller series exist as metadata candidates; keep refiner-only prices narrower pending period-compatible B1 comparison
- **crude-production-bases**: Prefer official field-production estimates over reserve-survey estimates where compatible; preserve rate and period-total units and crude-plus-lease-condensate basis. Gravity bands, streams and partial geographies remain components.
- **petroleum-consumption-supplied-basis**: Accept labelled EIA all-product supplied headline; retain direct-use crude limitation and liquid-biofuel supplied omission of blending inputs.
- **petroleum-stock-reporting-population**: Broader inclusive SPR total preferred; preserve end-period, regional reserve exclusions and post-2004 lease exclusion labels. Component stocks remain narrower.
- **gasoline-sales-population**: Prime-supplier all-grade total conditionally accepted for sales with source label; refiner/channel and grade components remain narrower.
- **trade-subject-and-partner**: Only all-partner totals qualify for whole subject trade. Regional/bilateral/modal flows remain components; net trade stays outside fixed activities.
- **weekly-export-estimates**: Keep official weekly estimates with explicit basis label and compare compatible monthly/annual source totals before default selection.
- **gasoline-trade-total**: EIA total includes blending components; finished-only and blendstock-only remain product components; no invented sum.
- **fuel-versus-manufacturing-input**: Feedstocks are not finished fuel; count/stock-change/input measurements cannot fill output/customer/storage levels.
- **fuel-and-facility-components**: Biodiesel/ethanol/LPG components and refinery/biofuel-plant fuel use stay narrower. Headline rule does not turn one fuel or industry subsector into the whole requested product/sector.
- **refinery-operable-capacity**: Headline operable atmospheric crude oil distillation capacity qualifies as a labelled petroleum refining-capacity basis. Operating/idle components do not replace operable. Downstream charge capacities are separate unit components, never summed as total. Remaining: Compare compatible refining bases across remaining weekly/monthly/annual routes; generating MW and storage volume are different bases, not broader refinery totals.
- **refinery-capacity-calendar-stream**: Calendar-day usual operation and stream-day maximum continuous operation remain separate labelled units; January 1 reference dates are not annual sums. Facility counts cannot become capacity or customers.
- **refinery-storage-capacity-population**: Refinery-only working/shell storage capacities are narrower facility populations than broader EIA storage reporting. Product components remain components. Capacity volume never becomes observed stocks or refining throughput. Remaining: Keep historical 1982-2010 refinery series and 2011-2024 successor separate; report coverage and any broader-source API gap rather than fetching off-API data.
- **refinery-receipts-and-feed**: Domestic/foreign refinery receipts are facility deliveries, not customs trade. Downstream fresh-feed input is actual transformation throughput, even where short YDR process name says Capacity. Neither activity is in the fixed vocabulary.
- **crude-refinery-demand-proxy**: EIA explicitly uses crude refinery inputs as proxy for demand. Accept only for explicitly named crude oil, with proxy label. Never use as whole petroleum consumption. Generic gross/intermediate inputs do not become consumption. Biofuel blending inputs are a component of broader MER consumption. Remaining: Compare any broader compatible published crude demand total and preserve source population; no sum of processing flows.
- **refinery-secondary-output**: Combined refinery/blender EP00 total is a labelled secondary-production basis. Refinery-only and blender-only are narrower populations; field extraction and secondary net output are different bases, never added or silently interchanged. Broader compatible all-plant totals take precedence. Remaining: Default selection must preserve requested production meaning, physical units and broader-total preference; do not pick secondary output simply because its history is longer.
- **gasoline-production-populations**: Finished motor gasoline is the whole finished-fuel production basis. Grades/blendstocks and plant-only, refinery-only or blender-only outputs remain narrower. Prefer combined and any broader all-plant published total; net values may be negative.
- **petroleum-balance-nonactivities**: Stock changes, supply adjustments, transfers, net receipts, days of supply, utilization percentages and processing gain remain accounting/ratio measures, not whole stock, production, trade or capacity.
- **international-import-subject-partner**: Whole petroleum and other liquids product; fixed importer must be preserved separately from countryRegionId supplier. This product classification does not establish whole import flow coverage. All-source aggregate required. OECD/OECD Europe do not map to the four place kinds. Remaining: Verify eligible all-source aggregates and compare broader EIA import totals; no summing supplier groups or substituting partner geography.
