# Job 5 final report — 30 October 2026

**Stopped after the single scored run failed. No push, preview, merge or production change.**

Tested code: `1098cbf9dfe4ba5f4d570015caf8400b7ec32fb3` on `codex/eia-coverage`. Job base: `bbff3bf4edf76935b5700b6ca702fa93071d624e`. The original interpretation-audit base was `5b60a094ecd10e1ca80492bc8558652768d93366`; Job 5 correctly continues the owner-approved later branch, rather than mixing that older version into current work. Main was read remotely and remains `0d6d312a89aea9112efff559ba8fc969cafb2780`.

## 1. Pass marks

| Check | Result | Evidence/limit |
|---|---|---|
| Route census | PASS under owner amendments | 242 nodes; 27 branches; 215 leaves; 154 FITS, 61 excluded; all 61 exclusions reviewed, zero quote mismatches. OB2, OBW and sector 95 remain prohibited unresolved exceptions. |
| Coverage | NOT MET, explicitly parked | 576 of 2,088 cells still not checked; owner allowed a push only if every other mark passed. |
| Negative recheck | PASS | 45/45, seed 20261030; 33 truncated broad probes do not independently prove absence. |
| Mapped-row validation | PASS | 32,690 complete histories replayed through the actual app row checker from recorded live EIA responses; includes 219 guarded US checks, zero research-only bypasses. Not 32,690 new network calls this window. |
| Set D | **FAIL: 50/58 (86.2%)** | Requires at least 90%; no scored reruns. |
| Three front-page examples | PASS: 6/6 | All three pass both model repetitions, native retrieval and rendered presentation. |
| Set C | PASS: 18/20 | Separate owner-approved C4/C6 revision; previous Job 3 was 19/20 on its older expectations. |
| Independent set | PASS: 22/24 historical score | I7 conflicts with Job 5; separate retrospective I7 revision gives 24/24 on the same outputs, not a new independent score. Earlier Job 3 was 21/24. |
| Original gold forms | PASS: 24/24 offline | Full lookup path with injected recorded EIA samples; original keys/scorers unchanged. |
| Zero dead ends | NOT ESTABLISHED by the primary run | Two D8a failed-step placeholders trigger this flag. Actual lowercase coal click reaches the activity question with choices/free text. Preserve the original flags and disclose the harness defect. |
| Zero unlabelled wrong data | PASS in scored results | No selected series flagged as unlabelled wrong data by unchanged scorers. |
| No zero/missing place labelled Available | PASS in scored display | Numeric zeros excluded from charts and retained in tables/Excel. |
| Offline suite / research / build | PASS | 690/690 app tests; 446/446 research/generator tests; build and 19 changed JS syntax checks pass. |
| Required browser workflows | PASS, recorded-response replay | 11 steps through actual local API handlers; 36 recorded upstream responses, zero unmatched calls, zero console errors. No new paid/EIA calls. |
| Excel | PARTIAL | Actual six-place download: all 270 values/units/original values match. Additional all-nonnumeric single-series counterexample wrongly writes Metadata Latest value = 0. Data sheet preserves symbol/meaning. |

The 70 pre-run code/scorer hashes still match. Browser screenshots and Excel files are local evidence. [Primary scores](live/summary.json), [audit qualifications](evaluation-audit.json), [browser checks](browser-workflow-verification.json), [all-value Excel check](excel-all-values-verification.json).

## 2. Census and coverage

Census exclusions: forecast (STEO/AEO/IEO): 1; plant/facility-level: 8; outages: 3; no measure in our 14 products: 26; sub-daily/hourly: 4; no place facet at country, US or state level: 16; trading-hub/spot (excluded by owner): 3. AEO has 13 release subtrees and IEO 4; these remain excluded families. [Complete exclusion list](excluded-routes-27.json).

| Place kind | Base cells mapped / 168 | All mapped / 522 |
|---|---:|---:|
| country | 42/168 | 77/522 |
| World | 42/168 | 47/522 |
| US | 66/168 | 257/522 |
| state | 65/168 | 240/522 |

Total **215/672 base cells**, **621/2,088 all cells**. Other statuses: 659 not in EIA’s catalogue; 146 EIA returns no data; 86 subset only; 576 not checked. Qualifiers remain separate from the 672 base cells: only crude oil and gasoline, never substituted for whole petroleum. Mapped qualifier cells: 24, plus 20 qualifier-sector cells.

The 576 parked cells comprise 537 unresolved-metadata cases and 39 scope/default-reconciliation cases. [Every unchecked cell](unchecked-cells-27.json). [Per-place code and per-route counts](checkpoint-27.json) are unchanged. Two crude-import download groups remain incomplete; no absence claims use them.

Ten likely requested gaps (priority judgment, not a measured popularity ranking):

| Combination | Status / reason |
|---|---|
| Foreign-country electricity prices | Not checked: unresolved metadata could fit |
| Foreign-country natural-gas prices | Not checked: unresolved metadata could fit |
| Foreign-country coal prices | Not checked: unresolved metadata could fit |
| Foreign-country petroleum prices | Not checked: unresolved metadata could fit |
| Foreign-country natural-gas reserves | EIA returns no data in checked routes |
| State petroleum production | Not checked: unresolved metadata could fit |
| State petroleum storage | Not checked: unresolved metadata could fit |
| State coal reserves | Subset only |
| U.S. electricity capacity | Whole observations exist; scope/default reconciliation pending |
| U.S. natural-gas storage | Not checked: unresolved metadata could fit |

EIA calls: **6,342 total** = 6,154 research calls + 188 implementation-run calls; below the 20,000 planning threshold and 25,000 cap. Live runner is serial with a 500 ms start limiter (at most 2 requests/second, 7,200/hour); browser replay makes no external calls.

## 3. Front-page results

**Brazil erngy production**

Brazil; total energy / production; all sectors (default); all available years (default); annual (default)

> Brazil: total energy production, 12.0134 quadrillion Btu in 2024 (EIA).

**how much oil does Japan us**

Japan; petroleum / consumption; all sectors (default); all available years (default); annual (default)

> Japan: petroleum consumption, 3,094.1068 thousand barrels per day in 2025 (EIA).

**Looking for data USA prdouction and consumption of nuclear energy**

United States (country); nuclear / generation; nuclear / consumption; all sectors (default); all available years (default); annual (default)

> United States (country): nuclear generation, 781.8653 billion kilowatthours in 2024 (EIA).
> United States (country): nuclear consumption, 8,195.465 Trillion Btu in 2025 (EIA).

D3 consumption is labelled “EIA nuclear consumption is the same as generation expressed in Btu, within published rounding.” The physical generation and thermal consumption series remain distinct. Other bases are disclosed.

Bermuda, Greenland and Saint Pierre and Miquelon each returned **45 numeric zeros**, not symbols, for coal production. Their screen label is “Reported as zero every year”; all three remain in the table and Excel and out of the chart.

## 4. Set D outcomes

| Case / question or step | Understood line (run 1) | Outcome / run 1, run 2 |
|---|---|---|
| D1 — Brazil erngy production | Brazil; total energy / production; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D2 — how much oil does Japan us | Japan; petroleum / consumption; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D3 — Looking for data USA prdouction and consumption of nuclear energy | United States (country); nuclear / generation; nuclear / consumption; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D4 — electricity prices in georgia | Georgia (US state); electricity / prices; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D4a — Did you mean Georgia the country? | Georgia (country); electricity / prices; all sectors (default); all available years (default); annual (default) | EIA has no checked electricity prices data for Georgia (country).; yes, yes |
| D4b — no, I meant the country | Georgia (country); electricity / prices; all sectors (default); all available years (default); annual (default) | EIA has no checked electricity prices data for Georgia (country).; yes, yes |
| D5 — coal production for some countries | place not chosen; coal / production; all sectors (default); all available years (default); annual (default) | Which place should I look up?; yes, yes |
| D5a — All countries in a region | place not chosen; coal / production; all sectors (default); all available years (default); annual (default) | Which region should I look up?; yes, yes |
| D5b — North America | North America (Bermuda, Canada, Greenland, Mexico, Saint Pierre and Miquelon, United States (country)); coal / production; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D6 — natural gas reserves for all the US states except alaska | place not chosen; natural gas / reserves; all sectors (default); all available years (default); annual (default) | Which place should I look up?; yes, yes |
| D6a — All US states | Alabama, Arkansas, Arizona, California, Colorado, Connecticut, District of Columbia, Delaware, Florida, Georgia (US state), Hawaii, Iowa, Idaho, Illinois, Indiana, Kansas, Kentucky, Louisiana, Massachusetts, Maryland, Maine, Michigan, Minnesota, Missouri, Mississippi, Montana, North Carolina, North Dakota, Nebraska, New Hampshire, New Jersey, New Mexico, Nevada, New York, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Virginia, Vermont, Washington, Wisconsin, West Virginia, Wyoming; natural gas / reserves; all sectors (default); all available years (default); annual (default) | Correct data/table; only 10 of 22 available states charted; NO, NO |
| D7 — compare georgia and armenia natural gas imports | Georgia (country), Armenia; natural gas / imports; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D8 — energy stuff | place not chosen; product and activity not chosen; all sectors (default); all available years (default); annual (default) | Which product should I look up?; NO, NO |
| D8a — Coal | place not chosen; product and activity not chosen; all sectors (default); all available years (default); annual (default) | Runner exact-label mismatch; actual lowercase button works (separate diagnostic); NO, NO |
| D9 — coal consumption in Japan and Ohio since 2010 | Japan, Ohio; coal / consumption; all sectors (default); 2010–latest; annual (default) | Data; yes, yes |
| D10 — natural gas consumption in Georgia and Armenia | Georgia (country), Armenia; natural gas / consumption; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D11 — Texas, residential electricity consumption, 2015 to 2020 | Texas; electricity / consumption; residential; 2015–2020; annual (default) | Data; yes, yes |
| D12 — Looking for data on energy consumption for many countries from 2000-2019 | place not chosen; total energy / consumption; all sectors (default); 2000–2019; annual (default) | Which place should I look up?; yes, yes |
| D12a — Japan and Korea, only from 2005 | Japan; total energy / consumption; all sectors (default); 2005–2019; annual (default) | Which place should I look up?; NO, NO |
| D13 — monthly natural gas prices in Pennsylvania | Pennsylvania; natural gas / prices; all sectors (default); all available years (default); monthly | Data; yes, yes |
| D14 — gasoline prices this year | United States (country) (default); petroleum / prices; all sectors (default); 2026–latest; annual (default) | Data; yes, yes |
| D15 — petroleum consumption ni Burma | Burma; petroleum / consumption; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D16 — solar production in United Sattes | United States (country); solar / production; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D17 — renweable generation in Faroe Islands | Faroe Islands; renewable / generation; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D18 — marine capaicty in World | World; marine / capacity; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D19 — total neergy production in World | World; total energy / production; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D20 — coal imoprts in United States | United States (country); coal / imports; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D21 — antural gas reserves in Arkansas | Arkansas; natural gas / reserves; all sectors (default); all available years (default); annual (default) | Data; yes, yes |
| D22 — solar ocnsumption in Louisiana | Louisiana; solar / consumption; all sectors (default); all available years (default); annual (default) | Data; yes, yes |

D7q is the injected activity-null offline case; it passed and is not a paid outcome.

Failure causes and proposed next work (not implemented):

- D6a: the preserved top-ten chart rule conflicts with Set D’s expectation that every available state is charted. Decide the chart rule before changing either contract; do not silently relax the scorer.
- D8/C6: model returned an empty topic list and lowercase option labels. The strict frozen form expects a null-product/null-activity row and code-defined display labels. Normalize the shared form/choice contract rather than adding query exceptions.
- D8a: the runner requires exact “Coal” and rejects the actual “coal” button. Its synthetic failed-step records should not be treated as actual UI dead ends. A separately recorded browser click reaches the expected activity choices.
- D12a: both model replies retain Japan and mark “Korea” unresolved. Years correctly become 2005–2019. Review how approved geography aliases are supplied consistently to initial and reply interpretation; no country-specific query exception.
- Export audit: `buildXlsx` converts a null latest value through `Number(null)` in Metadata. Preserve a blank/nonnumeric latest value there too. No patch made after scored failure.

## 5. Frozen expectation changes

- D1: native BRA/type c replaces the region alias, by owner instruction.
- Existing defaults preserved: D3, D4, D5b, D7, D9, D11 and D12a changed before paid calls. D9 remains short tons; D11 remains Texas residential retail sales. [Exact before/after record](existing-default-owner-change.json).
- Separate D revision 3: numeric-point projection for D6a/FL, D7/GEO and ARM, D10/GEO and ARM, D13/PA. Full original observations and symbol meanings remain in snapshotObservations and are independently checked. This preserves the historical numeric-series interface, not an erasure of missing observations.
- Separate C revision 2: C4 now expects mapped European natural-gas consumption data; C6 expects the owner-required product-first question. C1b’s historical numeric-points expectation remains compatible and unchanged.
- Separate I revision 2: **I7 only**, recorded after the run under the owner’s standing rule. Historical files and 22/24 score remain unchanged; retrospective grading of saved outputs gives 24/24. This missed pre-run reconciliation is an evaluation gap, not an untouched holdout success.
- All earlier-job answer keys, gold forms and scorers remain intact. Historical Set D versions remain recoverable in Git and the durable versioned-freeze snapshots. The explicitly permitted row-cap test and its related fixture/hash guards changed with reasons in [test amendments](test-amendments.json). Scorers and pass marks did not change.

Native-country preference changed **170 place/frequency defaults across 22 cells** for BRA, CAN, CHN, IND, JPN, MEX, RUS. [Every changed selector](native-country-owner-change.json).

- `country|biofuels|consumption||`
- `country|coal|generation||`
- `country|coal|imports||`
- `country|coal|reserves||`
- `country|electricity|capacity||`
- `country|electricity|consumption||`
- `country|electricity|exports||`
- `country|electricity|generation||`
- `country|electricity|imports||`
- `country|geothermal|capacity||`
- `country|natural gas|generation||`
- `country|natural gas|imports||`
- `country|natural gas|production||`
- `country|nuclear|consumption||`
- `country|petroleum|consumption||gasoline`
- `country|petroleum|imports||crude oil`
- `country|petroleum|production||`
- `country|petroleum|production||crude oil`
- `country|renewable|capacity||`
- `country|total energy|production||`
- `country|wind|capacity||`
- `country|wind|generation||`

## 6. Files, verification, cost and preservation

The application keeps the original 28 lookup rows byte-for-byte and adds 1,788 generated verified rows; 53 overlay definitions are retained in the generated asset but do not override original defaults. The compressed generated catalogue is about 126 KB; no new dependencies or model switch.

Changed source groups: generator/research selectors and guarded US scope; lookup list/search/context/geography; initial/reply year-slot validation; display/status/chart/Excel; source-based regression tests and evidence runners. [Complete file inventory and reasons](final-file-inventory.json).

Offline progression: first full cycle 623/662; second 663/664 (duplicate historical test-hash guard); third 688/688; after two browser-discovered display corrections, final **690/690**. Research/generator **446/446**. Final build passed. [Logs and redactions](final-log-manifest.json). No failing scored answer was repaired or rerun.

Paid evaluation: **89 calls**, including one validation re-ask, all returned model `gpt-6-luna`, effort explicitly `low`. Frozen maximum **$1.081189**; conservative usage cost **$0.154930**, plus token-count reserve **$0.011250**, total upper estimate **$0.166180** against $1.50. Input 581,812 tokens; output 18,955 including 6,466 reasoning tokens; maximum response 400 output tokens versus the common 8,192 allowance. This is an upper estimate, not an invoice. [Budget](run-freeze/budget.json), [usage](live/model-attempts.jsonl).

Durable evidence: `~/Documents/EIAapp-Evidence/20261029/coverage/`. This run’s raw sanitized EIA responses, model attempts, UI screenshots and downloads are under `implementation-window/scored-live/`; final logs/helpers and injected-browser evidence are under `implementation-window/final-validation/`. Ninety preparation/verification copies were hash-verified; final checkpoint manifest records the later records too. API key files stay in their existing Downloads locations and are never copied.

No secrets found in 1,218 new historical Git blobs (245,637,185 expanded bytes) plus current evidence. Two pattern matches are dummy credential-scrubbing tests. Three committed research-source records contain local home-path references; these are disclosed, not credential values. [Safety audit](public-safety-audit.json).

Remaining outside the commits: unrelated `docs/eia-interpretation-audit.md`, existing `scripts/eia-lookup/__pycache__/`, ignored dependencies/build output/caches. Nothing reset, cleaned, stashed or discarded. Raw EIA responses are local only; public evidence contains selectors, summaries and hashes. The final intended tree is approximately **14.3 MB**, below the 15 MB cap; no file exceeds 5 MB. The exact byte count is verified after the evidence commit. An AGENTS-required repository tooling note was added to `~/.codex/friction-log.md`; no AGENTS instructions changed. Logs redact local home paths where present.

Reproduce offline checks (no keys):

```sh
OPENAI_API_KEY= EIA_API_KEY= npm test
OPENAI_API_KEY= EIA_API_KEY= npm run build
for f in scripts/eia-lookup/*.test.py; do OPENAI_API_KEY= EIA_API_KEY= python3 -B "$f" || exit; done
```

The live runner is `scripts/eia-lookup/evaluate-coverage.js`; it deliberately refuses an existing run directory. **Do not delete records or run it again.** Browser replay uses `coverage-browser-transport.js` as a Node preload with `LOGIN_REQUIRED=off`, dummy offline-replay keys, and `OPENAI_MODEL=gpt-6-luna`; it denies unmatched external calls. The bundled Playwright module/Chrome paths are supplied as environment variables.

## 7. Git and deployment

Implementation tested at `1098cbf9dfe4ba5f4d570015caf8400b7ec32fb3`; final audit records are a subsequent local preservation commit. All work remains on `codex/eia-coverage`. GitHub has no remote coverage branch; **nothing was pushed**, so no new preview was triggered. No Vercel settings, main, merge or production actions were performed. Remote main was verified at `0d6d312a89aea9112efff559ba8fc969cafb2780`. Production itself was not inspected; no claim about its deployed commit is made.

## 8. Owner exploratory questions for a later approved preview

These are proposed for the next preview after the failed marks are resolved; there is no new preview to test now.

1. Brazil erngy production
2. how much oil does Japan us
3. Looking for data USA prdouction and consumption of nuclear energy
4. electricity prices in georgia — then switch to the country
5. coal production for some countries — North America
6. natural gas reserves for all the US states except alaska
7. energy stuff — choose coal, then production
8. energy consumption for many countries from 2000–2019 — reply Japan and Korea, only from 2005
9. wind generation in Portugal since 2018 (not tested in this job)
10. residential natural gas prices in Vermont from 2017 (not tested in this job)

## Scope decisions for owner review

Historical scope cases are listed below; original sources and pending notes remain in [scope register](scope-review-register.json). No new PDF footnote research was performed. Suspected restrictions without verified metadata retain “EIA scope note not verified.”

| Case | Decision / label |
|---|---|
| gas-sector-sales-price | whole product within named sector; still a sector subset of all-sector requests — sales price; excludes gas transported for other sellers |
| biomass-component | wood-fuel component of biofuels; headline rule does not make it whole biofuels |
| crude-import-components | Crude is a petroleum component; individual grades are crude components; prefer published aggregate imports including estimates over company-level sums. |
| power-sector-receipt-prices | Whole-product price only in the electric-power sector, with whole fuel/sector facets and labelled EIA-923 receipt population; never all-sector economy price. Coal mine-origin series is not destination-state consumer price. — Average cost delivered for electricity generation; EIA-923 reporting plants |
| utility-scale-capacity | Use broader all-size total where published; otherwise accept EIA headline net summer capacity with utility-scale label. Ownership and fuel components remain narrower. — Net summer capacity; utility-scale (1 MW and larger) |
| petroleum-gasoline-retail-survey | all grades/all formulations with tax label; narrower grades or sales populations remain components; preserve alternate seller-stage bases |
| petroleum-crude-first-purchase-refiner-import-prices | different transaction bases labelled separately; composite preferred to domestic/imported acquisition components; imports totals cover all origins, not one origin |
| petroleum-refiner-only-product-prices | broader all-seller series exist as metadata candidates; keep refiner-only prices narrower pending period-compatible B1 comparison |
| crude-production-bases | Prefer official field-production estimates over reserve-survey estimates where compatible; preserve rate and period-total units and crude-plus-lease-condensate basis. Gravity bands, streams and partial geographies remain components. |
| petroleum-consumption-supplied-basis | Accept labelled EIA all-product supplied headline; retain direct-use crude limitation and liquid-biofuel supplied omission of blending inputs. |
| petroleum-stock-reporting-population | Broader inclusive SPR total preferred; preserve end-period, regional reserve exclusions and post-2004 lease exclusion labels. Component stocks remain narrower. |
| gasoline-sales-population | Prime-supplier all-grade total conditionally accepted for sales with source label; refiner/channel and grade components remain narrower. |
| trade-subject-and-partner | Only all-partner totals qualify for whole subject trade. Regional/bilateral/modal flows remain components; net trade stays outside fixed activities. |
| weekly-export-estimates | Keep official weekly estimates with explicit basis label and compare compatible monthly/annual source totals before default selection. |
| gasoline-trade-total | EIA total includes blending components; finished-only and blendstock-only remain product components; no invented sum. |
| fuel-versus-manufacturing-input | Feedstocks are not finished fuel; count/stock-change/input measurements cannot fill output/customer/storage levels. |
| fuel-and-facility-components | Biodiesel/ethanol/LPG components and refinery/biofuel-plant fuel use stay narrower. Headline rule does not turn one fuel or industry subsector into the whole requested product/sector. |
| refinery-operable-capacity | Headline operable atmospheric crude oil distillation capacity qualifies as a labelled petroleum refining-capacity basis. Operating/idle components do not replace operable. Downstream charge capacities are separate unit components, never summed as total. — Operable atmospheric crude oil distillation capacity; includes operating and idle |
| refinery-capacity-calendar-stream | Calendar-day usual operation and stream-day maximum continuous operation remain separate labelled units; January 1 reference dates are not annual sums. Facility counts cannot become capacity or customers. |
| refinery-storage-capacity-population | Refinery-only working/shell storage capacities are narrower facility populations than broader EIA storage reporting. Product components remain components. Capacity volume never becomes observed stocks or refining throughput. |
| refinery-receipts-and-feed | Domestic/foreign refinery receipts are facility deliveries, not customs trade. Downstream fresh-feed input is actual transformation throughput, even where short YDR process name says Capacity. Neither activity is in the fixed vocabulary. |
| crude-refinery-demand-proxy | EIA explicitly uses crude refinery inputs as proxy for demand. Accept only for explicitly named crude oil, with proxy label. Never use as whole petroleum consumption. Generic gross/intermediate inputs do not become consumption. Biofuel blending inputs are a component of broader MER consumption. — Refinery inputs; EIA proxy for crude-oil demand |
| refinery-secondary-output | Combined refinery/blender EP00 total is a labelled secondary-production basis. Refinery-only and blender-only are narrower populations; field extraction and secondary net output are different bases, never added or silently interchanged. Broader compatible all-plant totals take precedence. |
| gasoline-production-populations | Finished motor gasoline is the whole finished-fuel production basis. Grades/blendstocks and plant-only, refinery-only or blender-only outputs remain narrower. Prefer combined and any broader all-plant published total; net values may be negative. |
| petroleum-balance-nonactivities | Stock changes, supply adjustments, transfers, net receipts, days of supply, utilization percentages and processing gain remain accounting/ratio measures, not whole stock, production, trade or capacity. |
| international-import-subject-partner | Whole petroleum and other liquids product; fixed importer must be preserved separately from countryRegionId supplier. This product classification does not establish whole import flow coverage. All-source aggregate required. OECD/OECD Europe do not map to the four place kinds. |

## Audit and next decision

Research uses the established methods and original sources in [DESIGN.md](DESIGN.md). No directly applicable public EIA correspondence benchmark was found; the owner’s frozen sets are task-specific benchmarks, not universal correctness evidence. No new independent diff review was performed in this window. The independent set was previously exposed.

**Recommendation:** keep this branch local. Authorize a bounded follow-up for the shared form/choice contract, geography-alias consistency and null-metadata export, and settle the top-ten chart versus all-available chart expectation. Freeze the remaining old-key conflict before any future paid run. The 576 unchecked coverage cells remain the separately parked follow-up job.
