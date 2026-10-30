# Partial coverage checkpoint

Recorded 2026-10-30T15:50:21.167367+00:00. The formal coverage/Set D checkpoint is **not reached**. Implementation remains gated.

Coverage: **312 mapped; 1776 not checked**, retaining all 2,088 frozen cells. No absence or subset-only certification has been inferred from unfinished work.

| Place kind | Base mapped / total | All mapped / total |
|---|---:|---:|
| country | 29 / 168 | 34 / 522 |
| World | 39 / 168 | 44 / 522 |
| US | 19 / 168 | 83 / 522 |
| state | 50 / 168 | 151 / 522 |

Calls: 5,660 total reserved (1,464 earlier + 4,196 coverage), against the 20,000 estimate threshold / 25,000 cap. Paid calls: zero. Recorded peak: 2/second and 2,269/hour.

Retrieval: 258/262 complete groups, 19,166,874 saved rows. Stop reason: still running at report snapshot. The approved deadline is 16:12:35 UTC (12:12:35 p.m. ET), 30 October 2026.

Census: 242 nodes; 27 branches; 154 eligible and 61 excluded leaves, plus AEO/IEO release families. All 61 exclusions reviewed; seed 20261029; no quote mismatch. OB2, OBW and sector 95 remain explicit unresolved exceptions, never usable for results or nonpublication.

Validation: 258/258 audited groups pass. Existing row checker: 18,275 passed, 0 failed, 151 unsupported in offline replay of fully saved live responses. Research tests: 396; app tests: 537/537; local build passed, keys blank. These do not establish unfinished coverage or live application behavior.

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

## Where the unchecked cells stand

These categories are disjoint; they do not certify absence or subset-only status.

- No eligible metadata candidate; absence not certified: 706.
- Whole-product groups await complete retrieval or audit: 333.
- Whole-product scope/default reconciliation pending: 64.
- mapped: 312.
- Whole groups audited with no numeric whole-product observation; negative proof pending: 226.
- Only subset candidates; absence of whole product not certified: 364.
- Defaults selected but existing app row checker cannot verify every selection: 83.

## Numeric zero check

Bermuda, Greenland and Saint Pierre and Miquelon each returned 45 annual coal-production values for 1980–2024, all numeric text `0`, with no missing-value symbols. EIA call 243 and the response hash are in `coal-zero-check.json`. Their eventual screen status must be “Reported as zero every year”; the app change is still gated.

## Compatibility decision for the next phase

`check-rows.js` calls the app selector in `lib/sources/eia/lookup-list.js`, which always adds a geography facet. Documented US-only routes without that facet cannot pass it. Supporting them requires a narrowly guarded US-only selector path with explicit source-scope evidence and tests rejecting state/country use. No such app change was made during the research gate. Resolve this sequencing issue before requiring all mapped cells to pass the app checker at the formal checkpoint.

## Excluded route census

The 61 excluded leaves below remain separately accounted for from the AEO and IEO release families. Full source quotes and call IDs are in `route-census.json` and `exclusion-review.json`.

- `co2-emissions/co2-emissions-aggregates`: no measure in our 14 products
- `co2-emissions/co2-emissions-and-carbon-coefficients`: no measure in our 14 products
- `coal/mine-production`: plant/facility-level
- `coal/shipments/by-mine-by-plant`: plant/facility-level
- `coal/shipments/mine-aggregates`: plant/facility-level
- `coal/shipments/plant-aggregates`: plant/facility-level
- `coal/shipments/receipts`: plant/facility-level
- `densified-biomass/characteristics-by-region`: no measure in our 14 products
- `densified-biomass/wood-pellet-plants`: plant/facility-level
- `electricity/facility-fuel`: plant/facility-level
- `electricity/operating-generator-capacity`: plant/facility-level
- `electricity/rto/daily-fuel-type-data`: no place facet at country, US or state level
- `electricity/rto/daily-interchange-data`: no place facet at country, US or state level
- `electricity/rto/daily-region-data`: no place facet at country, US or state level
- `electricity/rto/daily-region-sub-ba-data`: no place facet at country, US or state level
- `electricity/rto/fuel-type-data`: sub-daily/hourly
- `electricity/rto/interchange-data`: sub-daily/hourly
- `electricity/rto/region-data`: sub-daily/hourly
- `electricity/rto/region-sub-ba-data`: sub-daily/hourly
- `electricity/state-electricity-profiles/emissions-by-state-by-fuel`: no measure in our 14 products
- `electricity/state-electricity-profiles/energy-efficiency`: no measure in our 14 products
- `electricity/state-electricity-profiles/meters`: no measure in our 14 products
- `natural-gas/cons/heat`: no measure in our 14 products
- `natural-gas/cons/pns`: no measure in our 14 products
- `natural-gas/enr/deep`: no place facet at country, US or state level
- `natural-gas/enr/drill`: no measure in our 14 products
- `natural-gas/enr/seis`: no measure in our 14 products
- `natural-gas/enr/wellcost`: no measure in our 14 products
- `natural-gas/enr/welldep`: no measure in our 14 products
- `natural-gas/enr/wellend`: no measure in our 14 products
- `natural-gas/enr/wellfoot`: no measure in our 14 products
- `natural-gas/pri/fut`: trading-hub/spot (excluded by owner)
- `natural-gas/prod/deep`: no place facet at country, US or state level
- `natural-gas/prod/off`: no place facet at country, US or state level
- `natural-gas/prod/oilwells`: no measure in our 14 products
- `natural-gas/prod/wells`: no measure in our 14 products
- `nuclear-outages/facility-nuclear-outages`: outages
- `nuclear-outages/generator-nuclear-outages`: outages
- `nuclear-outages/us-nuclear-outages`: outages
- `petroleum/crd/drill`: no measure in our 14 products
- `petroleum/crd/gom`: no place facet at country, US or state level
- `petroleum/crd/seis`: no measure in our 14 products
- `petroleum/crd/wellcost`: no measure in our 14 products
- `petroleum/crd/welldep`: no measure in our 14 products
- `petroleum/crd/wellend`: no measure in our 14 products
- `petroleum/crd/wellfoot`: no measure in our 14 products
- `petroleum/move/expcp`: no place facet at country, US or state level
- `petroleum/move/imp2`: no place facet at country, US or state level
- `petroleum/move/impcp`: no place facet at country, US or state level
- `petroleum/move/ipct`: no measure in our 14 products
- `petroleum/move/netr`: no place facet at country, US or state level
- `petroleum/move/pipe`: no place facet at country, US or state level
- `petroleum/move/ptb`: no place facet at country, US or state level
- `petroleum/move/rail`: no place facet at country, US or state level
- `petroleum/move/tb`: no place facet at country, US or state level
- `petroleum/pnp/crq`: no measure in our 14 products
- `petroleum/pnp/pct`: no measure in our 14 products
- `petroleum/pri/fut`: trading-hub/spot (excluded by owner)
- `petroleum/pri/ipct`: no measure in our 14 products
- `petroleum/pri/spt`: trading-hub/spot (excluded by owner)
- `steo`: forecast (STEO/AEO/IEO)

## Front-page evidence found

`front-page-evidence-partial.json` contains audited annual candidates for all three examples: Brazil primary-energy production, Japan petroleum consumption, US nuclear generation and US nuclear consumption. These are candidate observations only: not final defaults, frozen Set D expectations, scored model results, or live application outcomes.

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
