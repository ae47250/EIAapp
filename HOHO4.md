# Live EIA intent-model comparison with deterministic ranking

Status: **complete** (90/90 model-query runs recorded).

Started: 2026-07-17T05:37:28.043Z
Completed: 2026-07-17T05:45:10.589Z
Application default retained: `gpt-5.4-mini`.
Comparison overrides: `gpt-5.4-mini` and `gpt-4.1-nano` and `o3`.
Ranking output: complete top 5 display families per retrieval.

## Scope and safeguards

1. Each model receives exactly the same raw query set.
2. Each available model performs query interpretation; validated intent then enters the same local metadata indexes.
3. AI fields are authoritative only after controlled-vocabulary and query-evidence validation; deterministic rules repair missing, rejected, or unresolved fields.
4. Hard route, geography, product, activity, sector, frequency, selector, negation, and duplicate checks run before scoring.
5. The same local Phase 3 retrieval and Phase 4 deterministic ranking run for every validated intent.
6. Semantic reranking is disabled. AI cannot reorder candidates, invent selectors, or change ranking points.
7. The configured public/default model remains gpt-5.4-mini; this runner changes only its own process environment.
8. No Vercel environment, public route, observation data, or login behavior is changed.
9. OpenAI intent-call token usage is not exposed by the current interpretation interface.

## Official EIA vocabulary sources

The stress queries use concepts and wording found on official EIA data pages:

- [EIA Electric Power Monthly](https://www.eia.gov/electricity/monthly/): monthly state net generation, fuels, and sectors.
- [EIA Natural Gas Data](https://www.eia.gov/naturalgas/data.php): production, consumption, storage, prices, imports, and exports.
- [EIA Renewable and Alternative Fuels Data](https://www.eia.gov/renewable/data.php): wind, solar, hydroelectric, biomass, and renewable generation.
- [EIA International Energy Statistics](https://www.eia.gov/international/data/world): country-level petroleum, electricity, renewable, production, and consumption concepts.

## Fixed raw query inventory

| ID | Test focus | Raw input text |
| --- | --- | --- |
| Q01 | Clear Domestic monthly baseline | `California monthly electricity generation` |
| Q02 | Domestic-to-SEDS frequency fallback | `Texas monthly total energy consumption` |
| Q03 | Specific natural-gas production terminology | `New Mexico monthly marketed natural gas production` |
| Q04 | Explicit sector and activity | `New York monthly residential natural gas consumption` |
| Q05 | Renewable subtype and generation wording | `Iowa monthly wind net generation` |
| Q06 | Broad renewable request with missing activity | `California renewable energy` |
| Q07 | Ambiguous product and missing activity | `Texas gas` |
| Q08 | Unsupported frequency and storage wording | `United States weekly working gas in underground storage` |
| Q09 | Clear International petroleum request | `Brazil annual petroleum consumption` |
| Q10 | International monthly renewable generation | `Japan monthly solar electricity generation` |
| Q11 | Broad product with two activity mentions | `Germany renewable energy production and consumption` |
| Q12 | Multiple geographies and mention order | `Brazil then Japan annual electricity generation` |
| Q13 | Messy spelling and negative constraint | `plz shwo montly nat gas prodction in Texas, not prices` |
| Q14 | Impossible source term and weak activity hint | `California monthly electricity from moon` |
| Q15 | Explicit price measure | `Texas annual natural gas prices` |
| Q16 | Explicit expenditure measure | `California annual petroleum expenditures` |
| Q17 | Stock request with flow exclusion | `United States weekly natural gas storage, not production` |
| Q18 | State and U.S. national geographies | `Texas and United States monthly natural gas production` |
| Q19 | U.S. and foreign-country geographies | `United States then Canada annual natural gas production` |
| Q20 | Explicit requested date range | `Brazil annual petroleum consumption from 2010 to 2020` |
| Q21 | Explicit requested unit | `Brazil annual petroleum consumption in barrels` |
| Q22 | Quarterly Domestic request | `California quarterly electricity generation` |
| Q23 | Weekly non-storage request | `United States weekly natural gas production` |
| Q24 | Misspelled geography | `Califronia monthly electricity generation` |
| Q25 | Multiple products with one activity | `Brazil annual petroleum and natural gas consumption` |
| Q26 | One product with multiple sectors | `Texas annual natural gas consumption for residential and commercial sectors` |
| Q27 | Broad product with explicit product exclusion | `Brazil annual energy consumption excluding petroleum` |
| Q28 | Unavailable geography-frequency combination | `France weekly solar electricity generation` |
| Q29 | Explicit stock wording | `United States weekly working natural gas stocks` |
| Q30 | Explicit technical measure | `Texas annual natural gas conversion factor` |

## Model access preflight

| Requested model | Available | HTTP status | Resolved model | Error code | Safe error detail |
| --- | --- | ---: | --- | --- | --- |
| `gpt-5.4-mini` | yes | 200 | `gpt-5.4-mini-2026-03-17` | `none` | none |
| `gpt-4.1-nano` | yes | 200 | `gpt-4.1-nano-2025-04-14` | `none` | none |
| `o3` | yes | 200 | `o3-2025-04-16` | `none` | none |

## Model summary

| Model | Runs | AI interpretations | Rule fallbacks | Retrievals | Semantic calls | Blocked | Errors | Total elapsed |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `gpt-5.4-mini` | 30 | 29 | 1 | 36 | 0 | 0 | 0 | 113357.031 ms |
| `gpt-4.1-nano` | 30 | 29 | 1 | 36 | 0 | 0 | 0 | 109248.728 ms |
| `o3` | 30 | 28 | 2 | 36 | 0 | 0 | 0 | 233622.158 ms |

## Intent provenance diagnostics

| Model | AI fields | Accepted | Rejected | Deterministic repairs | Full rules fallbacks | User-visible failures | Intent p95 | Total p95 | Repair reasons |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `gpt-5.4-mini` | 97 | 87/97 (89.7%) | 0/97 (0%) | 30 | 1 | 2/30 (6.7%) | 4853.939 ms | 6587.162 ms | activity_ai_ambiguous: 2; country_ai_ambiguous: 13; country_ai_missing: 1; frequency_ai_ambiguous: 4; openai_validation_failed: 5; product_ai_ambiguous: 3; product_ai_rejected: 1; sector_ai_ambiguous: 1 |
| `gpt-4.1-nano` | 93 | 78/93 (83.9%) | 2/93 (2.2%) | 40 | 1 | 2/30 (6.7%) | 3463.853 ms | 4724.58 ms | activity_ai_ambiguous: 4; activity_ai_missing: 2; country_ai_ambiguous: 12; country_ai_missing: 4; frequency_ai_ambiguous: 3; frequency_ai_missing: 2; openai_validation_failed: 5; product_ai_ambiguous: 4; product_ai_missing: 2; product_ai_rejected: 1; sector_ai_ambiguous: 1 |
| `o3` | 99 | 92/99 (92.9%) | 0/99 (0%) | 29 | 2 | 2/30 (6.7%) | 11037.51 ms | 11876.395 ms | activity_ai_ambiguous: 1; country_ai_ambiguous: 12; frequency_ai_ambiguous: 2; openai_validation_failed: 10; product_ai_ambiguous: 2; product_ai_rejected: 1; sector_ai_ambiguous: 1 |

## Cross-model comparison

| ID | Mini vs nano: same validated semantic intent | Mini vs nano: same top-five order | gpt-5.4-mini top result(s) | gpt-4.1-nano top result(s) | o3 top result(s) | Warning difference |
| --- | --- | --- | --- | --- | --- | --- |
| Q01 | yes | yes | ELEC.GEN.ALL-CA-99.M | ELEC.GEN.ALL-CA-99.M | ELEC.GEN.ALL-CA-99.M | none |
| Q02 | yes | yes | SEDS.TETCB.TX.A | SEDS.TETCB.TX.A | SEDS.TETCB.TX.A | none |
| Q03 | yes | yes | NG.N9050NM2.M | NG.N9050NM2.M | NG.N9050NM2.M | none |
| Q04 | yes | yes | NG.N3010NY2.M | NG.N3010NY2.M | NG.N3010NY2.M | none |
| Q05 | yes | yes | ELEC.GEN.WND-IA-99.M | ELEC.GEN.WND-IA-99.M | ELEC.GEN.WND-IA-99.M | none |
| Q06 | yes | yes | SEDS.REPRB.CA.A | SEDS.REPRB.CA.A | SEDS.REPRB.CA.A | none |
| Q07 | yes | yes | SEDS.NGTCB.TX.A; SEDS.OPTCB.TX.A | SEDS.NGTCB.TX.A; SEDS.OPTCB.TX.A | SEDS.NGTCB.TX.A; SEDS.OPTCB.TX.A | none |
| Q08 | yes | yes | NG.NW2_EPG0_SWO_R48_BCF.W | NG.NW2_EPG0_SWO_R48_BCF.W | NG.NW2_EPG0_SWO_R48_BCF.W | none |
| Q09 | yes | yes | INTL.5-2-BRA-MT.A | INTL.5-2-BRA-MT.A | INTL.5-2-BRA-MT.A | none |
| Q10 | yes | yes | INTL.116-12-JPN-BKWH.A | INTL.116-12-JPN-BKWH.A | INTL.116-12-JPN-BKWH.A | none |
| Q11 | yes | yes | INTL.4418-1-DEU-QBTU.A; INTL.4418-2-DEU-QBTU.A | INTL.4418-1-DEU-QBTU.A; INTL.4418-2-DEU-QBTU.A | INTL.4418-1-DEU-QBTU.A; INTL.4418-2-DEU-QBTU.A | none |
| Q12 | yes | yes | INTL.2-12-BRA-BKWH.A; INTL.2-12-JPN-BKWH.A | INTL.2-12-BRA-BKWH.A; INTL.2-12-JPN-BKWH.A | INTL.2-12-BRA-BKWH.A; INTL.2-12-JPN-BKWH.A | none |
| Q13 | yes | yes | NG.N9050TX2.M | NG.N9050TX2.M | NG.N9050TX2.M | none |
| Q14 | yes | yes | no candidate | no candidate | no candidate | none |
| Q15 | yes | yes | SEDS.NGTCD.TX.A | SEDS.NGTCD.TX.A | SEDS.NGTCD.TX.A | none |
| Q16 | yes | yes | SEDS.OPTCV.CA.A | SEDS.OPTCV.CA.A | SEDS.OPTCV.CA.A | none |
| Q17 | yes | yes | NG.NW2_EPG0_SWO_R48_BCF.W | NG.NW2_EPG0_SWO_R48_BCF.W | NG.NW2_EPG0_SWO_R48_BCF.W | none |
| Q18 | yes | yes | NG.N9050TX2.M; NG.N9050US1.M | NG.N9050TX2.M; NG.N9050US1.M | NG.N9050TX2.M; NG.N9050US1.M | none |
| Q19 | yes | yes | INTL.3-1-USA-BCF.A; INTL.3-1-CAN-BCF.A | INTL.3-1-USA-BCF.A; INTL.3-1-CAN-BCF.A | INTL.3-1-USA-BCF.A; INTL.3-1-CAN-BCF.A | none |
| Q20 | yes | yes | INTL.5-2-BRA-MT.A | INTL.5-2-BRA-MT.A | INTL.5-2-BRA-MT.A | none |
| Q21 | yes | yes | INTL.5-2-BRA-MT.A | INTL.5-2-BRA-MT.A | INTL.5-2-BRA-MT.A | none |
| Q22 | yes | yes | ELEC.GEN.ALL-CA-99.Q | ELEC.GEN.ALL-CA-99.Q | ELEC.GEN.ALL-CA-99.Q | none |
| Q23 | yes | yes | no candidate | no candidate | no candidate | none |
| Q24 | yes | yes | ELEC.GEN.ALL-CA-99.M | ELEC.GEN.ALL-CA-99.M | ELEC.GEN.ALL-CA-99.M | none |
| Q25 | yes | yes | INTL.5-2-BRA-MT.A; INTL.26-2-BRA-BCF.A | INTL.5-2-BRA-MT.A; INTL.26-2-BRA-BCF.A | INTL.5-2-BRA-MT.A; INTL.26-2-BRA-BCF.A | none |
| Q26 | yes | yes | SEDS.NGRCB.TX.A | SEDS.NGRCB.TX.A | SEDS.NGRCB.TX.A | none |
| Q27 | yes | yes | INTL.44-2-BRA-QBTU.A | INTL.44-2-BRA-QBTU.A | INTL.44-2-BRA-QBTU.A | none |
| Q28 | yes | yes | no candidate | no candidate | no candidate | none |
| Q29 | yes | yes | NG.NW2_EPG0_SWO_R48_BCF.W | NG.NW2_EPG0_SWO_R48_BCF.W | NG.NW2_EPG0_SWO_R48_BCF.W | none |
| Q30 | yes | yes | SEDS.NGTCK.TX.A | SEDS.NGTCK.TX.A | SEDS.NGTCK.TX.A | none |

## Assessment

- Mini/nano comparable queries: 30/30.
- Same validated semantic intent: 30/30.
- Same deterministic top-five order: 30/30.
- Same warnings: 30/30.
- Raw AI-field disagreement before validation: 13/30.
- Validated semantic-intent disagreement after validation: 0/30.
- Semantic reranking calls: 0. Candidate scores and order remain deterministic.
- o3 access: available.
- Gate conclusion: the available mini/nano cohort agrees end to end; keep the revised pipeline disconnected until human review approves promotion.

## Detailed results

### Q01: Clear Domestic monthly baseline

**Raw input text:** `California monthly electricity generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California monthly electricity generation` |
| Corrected query | `California monthly electricity generation` |
| Confidence | 0.99 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 4604.078 ms, deterministic retrieval/ranking 1982.731 ms, total 6587.162 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California monthly electricity generation` |
| Corrected query | `California monthly electricity generation` |
| Confidence | 0.95 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 2280.74 ms, deterministic retrieval/ranking 1665.799 ms, total 3946.566 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California monthly electricity generation` |
| Corrected query | `California monthly electricity generation` |
| Confidence | 0.93 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `California` | `CA` | approved | none |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 6341.138 ms, deterministic retrieval/ranking 2506.673 ms, total 8847.842 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q02: Domestic-to-SEDS frequency fallback

**Raw input text:** `Texas monthly total energy consumption`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas monthly total energy consumption` |
| Corrected query | `Texas monthly total energy consumption` |
| Confidence | 0.98 |
| Geography order | Texas (TX) |
| Product | total energy |
| Product breadth / alternatives | broad; natural gas, petroleum, electricity, coal, nuclear, renewable |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | total energy / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `total energy` | `total energy` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=total energy:total energy@0 -> consumption:consumption@1; frequency=monthly:monthly@0.
- Timing: intent 2829.569 ms, deterministic retrieval/ranking 2269.96 ms, total 5099.577 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:total energy:consumption

- Geography: Texas (TX).
- Concept: product=total energy; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `requested_frequency_unavailable_seds_annual_fallback` No valid monthly total energy consumption series was found for Texas. Annual SEDS alternatives are shown as clearly labeled fallbacks..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.TETCB.TX.A` | Total energy consumption, Texas | `seds total energy consumption other total energy consumption` | seds / fallback / B | 93.4 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, official_total_label, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | 2 | `SEDS.TENEB.TX.A` | Total primary energy consumption less total primary energy production, Texas | `seds total energy consumption production other total primary energy consumption less total primary energy production` | seds / fallback / B | 88.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 16.2/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, activity_contains_unrequested_concepts |
| 3 | 3 | `SEDS.TEPFB.TX.A` | Total energy used as process fuel and other consumption that has no direct fuel costs, Texas | `seds process fuel total energy consumption price total energy used as process fuel and other consumption that has no direct fuel costs` | seds / fallback / B | 88.1 | annual | Billion Btu | 1970 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 4 | 4 | `SEDS.PESCB.TX.A` | Primary energy total consumption, adjusted for process fuel, intermediate products, and fuels with no direct cost, Texas | `seds process fuel total energy consumption price primary energy total consumption adjusted for process fuel intermediate products and fuels with no direct` | seds / fallback / B | 88.1 | annual | Billion Btu | 1970 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 5 | 5 | `SEDS.TEACB.TX.A` | Total energy consumption in the transportation sector, Texas | `seds total energy consumption other total energy consumption in the transportation sector` | seds / fallback / B | 82.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, unrequested_sector_specific, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback, sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas monthly total energy consumption` |
| Corrected query | `Texas monthly total energy consumption` |
| Confidence | 1 |
| Geography order | Texas (TX) |
| Product | total energy |
| Product breadth / alternatives | broad; natural gas, petroleum, electricity, coal, nuclear, renewable |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | total energy / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `total energy` | `total energy` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=total energy:total energy@0 -> consumption:consumption@1; frequency=monthly:monthly@0.
- Timing: intent 2354.663 ms, deterministic retrieval/ranking 1721.099 ms, total 4075.779 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:total energy:consumption

- Geography: Texas (TX).
- Concept: product=total energy; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `requested_frequency_unavailable_seds_annual_fallback` No valid monthly total energy consumption series was found for Texas. Annual SEDS alternatives are shown as clearly labeled fallbacks..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.TETCB.TX.A` | Total energy consumption, Texas | `seds total energy consumption other total energy consumption` | seds / fallback / B | 93.4 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, official_total_label, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | 2 | `SEDS.TENEB.TX.A` | Total primary energy consumption less total primary energy production, Texas | `seds total energy consumption production other total primary energy consumption less total primary energy production` | seds / fallback / B | 88.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 16.2/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, activity_contains_unrequested_concepts |
| 3 | 3 | `SEDS.TEPFB.TX.A` | Total energy used as process fuel and other consumption that has no direct fuel costs, Texas | `seds process fuel total energy consumption price total energy used as process fuel and other consumption that has no direct fuel costs` | seds / fallback / B | 88.1 | annual | Billion Btu | 1970 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 4 | 4 | `SEDS.PESCB.TX.A` | Primary energy total consumption, adjusted for process fuel, intermediate products, and fuels with no direct cost, Texas | `seds process fuel total energy consumption price primary energy total consumption adjusted for process fuel intermediate products and fuels with no direct` | seds / fallback / B | 88.1 | annual | Billion Btu | 1970 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 5 | 5 | `SEDS.TEACB.TX.A` | Total energy consumption in the transportation sector, Texas | `seds total energy consumption other total energy consumption in the transportation sector` | seds / fallback / B | 82.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, unrequested_sector_specific, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback, sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas monthly total energy consumption` |
| Corrected query | `Texas monthly total energy consumption` |
| Confidence | 0.93 |
| Geography order | Texas (TX) |
| Product | total energy |
| Product breadth / alternatives | broad; natural gas, petroleum, electricity, coal, nuclear, renewable |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | total energy / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Texas` | `TX` | approved | none |
| product | `total energy` | `total energy` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=total energy:total energy@0 -> consumption:consumption@1; frequency=monthly:monthly@0.
- Timing: intent 6548.064 ms, deterministic retrieval/ranking 1646.912 ms, total 8194.993 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:total energy:consumption

- Geography: Texas (TX).
- Concept: product=total energy; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `requested_frequency_unavailable_seds_annual_fallback` No valid monthly total energy consumption series was found for Texas. Annual SEDS alternatives are shown as clearly labeled fallbacks..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.TETCB.TX.A` | Total energy consumption, Texas | `seds total energy consumption other total energy consumption` | seds / fallback / B | 93.4 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, official_total_label, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | 2 | `SEDS.TENEB.TX.A` | Total primary energy consumption less total primary energy production, Texas | `seds total energy consumption production other total primary energy consumption less total primary energy production` | seds / fallback / B | 88.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 16.2/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, activity_contains_unrequested_concepts |
| 3 | 3 | `SEDS.TEPFB.TX.A` | Total energy used as process fuel and other consumption that has no direct fuel costs, Texas | `seds process fuel total energy consumption price total energy used as process fuel and other consumption that has no direct fuel costs` | seds / fallback / B | 88.1 | annual | Billion Btu | 1970 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 4 | 4 | `SEDS.PESCB.TX.A` | Primary energy total consumption, adjusted for process fuel, intermediate products, and fuels with no direct cost, Texas | `seds process fuel total energy consumption price primary energy total consumption adjusted for process fuel intermediate products and fuels with no direct` | seds / fallback / B | 88.1 | annual | Billion Btu | 1970 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 5 | 5 | `SEDS.TEACB.TX.A` | Total energy consumption in the transportation sector, Texas | `seds total energy consumption other total energy consumption in the transportation sector` | seds / fallback / B | 82.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, unrequested_sector_specific, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback, sector_specific_not_requested |

### Q03: Specific natural-gas production terminology

**Raw input text:** `New Mexico monthly marketed natural gas production`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `New Mexico monthly marketed natural gas production` |
| Corrected query | `New Mexico monthly marketed natural gas production` |
| Confidence | 0.92 |
| Geography order | New Mexico (NM) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `NM` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 2784.162 ms, deterministic retrieval/ranking 1767.17 ms, total 4551.392 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: NM:natural gas:production

- Geography: New Mexico (NM).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050NM2.M` | New Mexico Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 92.2 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_marketed, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, requested_subtype_exact | none |
| 2 | 2 | `NG.NA1160_SNM_2.M` | New Mexico Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 82.6 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 11.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |
| 3 | 3 | `NG.NA1150_SNM_2.M` | New Mexico Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 80 | monthly | Million Cubic Feet | 199701 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 11.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `New Mexico monthly marketed natural gas production` |
| Corrected query | `New Mexico monthly marketed natural gas production` |
| Confidence | 1 |
| Geography order | New Mexico (NM) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `NM` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 2043.758 ms, deterministic retrieval/ranking 1542.688 ms, total 3586.478 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: NM:natural gas:production

- Geography: New Mexico (NM).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050NM2.M` | New Mexico Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 92.2 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_marketed, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, requested_subtype_exact | none |
| 2 | 2 | `NG.NA1160_SNM_2.M` | New Mexico Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 82.6 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 11.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |
| 3 | 3 | `NG.NA1150_SNM_2.M` | New Mexico Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 80 | monthly | Million Cubic Feet | 199701 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 11.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `New Mexico monthly marketed natural gas production` |
| Corrected query | `New Mexico monthly marketed natural gas production` |
| Confidence | 0.93 |
| Geography order | New Mexico (NM) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `NM` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 8395.314 ms, deterministic retrieval/ranking 1487.203 ms, total 9882.543 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: NM:natural gas:production

- Geography: New Mexico (NM).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050NM2.M` | New Mexico Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 92.2 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_marketed, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, requested_subtype_exact | none |
| 2 | 2 | `NG.NA1160_SNM_2.M` | New Mexico Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 82.6 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 11.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |
| 3 | 3 | `NG.NA1150_SNM_2.M` | New Mexico Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 80 | monthly | Million Cubic Feet | 199701 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 11.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

### Q04: Explicit sector and activity

**Raw input text:** `New York monthly residential natural gas consumption`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `New York monthly residential natural gas consumption` |
| Corrected query | `New York monthly residential natural gas consumption` |
| Confidence | 0.98 |
| Geography order | New York (NY) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | natural gas / consumption / residential |
| Sector | residential |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `NY` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `residential` | `residential` | approved | none |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> consumption:consumption@1; frequency=monthly:monthly@0.
- Timing: intent 1932.017 ms, deterministic retrieval/ranking 145.939 ms, total 2078 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: NY:natural gas:consumption:residential

- Geography: New York (NY).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N3010NY2.M` | New York Natural Gas Residential Consumption, Monthly | `domestic natural gas consumption other natural gas residential consumption` | domestic / primary / A | 92.6 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; sector 5/5; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_residential, lexical_title_natural, lexical_title_gas, lexical_title_consumption, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `New York monthly residential natural gas consumption` |
| Corrected query | `New York monthly residential natural gas consumption` |
| Confidence | 1 |
| Geography order | New York (NY) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | natural gas / consumption / residential |
| Sector | residential |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `NY` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `residential` | `residential` | approved | none |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> consumption:consumption@1; frequency=monthly:monthly@0.
- Timing: intent 2697.872 ms, deterministic retrieval/ranking 217.526 ms, total 2915.418 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: NY:natural gas:consumption:residential

- Geography: New York (NY).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N3010NY2.M` | New York Natural Gas Residential Consumption, Monthly | `domestic natural gas consumption other natural gas residential consumption` | domestic / primary / A | 92.6 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; sector 5/5; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_residential, lexical_title_natural, lexical_title_gas, lexical_title_consumption, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `New York monthly residential natural gas consumption` |
| Corrected query | `New York monthly residential natural gas consumption` |
| Confidence | 0.93 |
| Geography order | New York (NY) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | natural gas / consumption / residential |
| Sector | residential |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `NY` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `residential` | `residential` | approved | none |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> consumption:consumption@1; frequency=monthly:monthly@0.
- Timing: intent 7468 ms, deterministic retrieval/ranking 138.674 ms, total 7606.695 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: NY:natural gas:consumption:residential

- Geography: New York (NY).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N3010NY2.M` | New York Natural Gas Residential Consumption, Monthly | `domestic natural gas consumption other natural gas residential consumption` | domestic / primary / A | 92.6 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; sector 5/5; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_residential, lexical_title_natural, lexical_title_gas, lexical_title_consumption, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q05: Renewable subtype and generation wording

**Raw input text:** `Iowa monthly wind net generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Iowa monthly wind net generation` |
| Corrected query | `Iowa monthly wind net generation` |
| Confidence | 0.95 |
| Geography order | Iowa (IA) |
| Product | wind |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | wind / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, activity_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `IA` | fallback | country_ai_ambiguous |
| product | `wind` | `wind` | approved | none |
| activity | `generation` | `generation` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=wind:wind@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 2425.34 ms, deterministic retrieval/ranking 155.827 ms, total 2581.226 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: IA:wind:generation

- Geography: Iowa (IA).
- Concept: product=wind; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.WND-IA-99.M` | Net generation : Iowa : all sectors : wind : monthly | `domestic wind generation other net generation all sectors wind` | domestic / primary / A | 100 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, official_all_sectors_total_priority, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.WND-IA-94.M` | Net generation : Iowa : independent power producers (total) : wind : monthly | `domestic wind generation other net generation independent power producers total wind` | domestic / primary / A | 96.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, aggregate_metadata_match, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.WND-IA-1.M` | Net generation : Iowa : electric utility : wind : monthly | `domestic wind generation other net generation electric utility wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.WND-IA-2.M` | Net generation : Iowa : electric utility non-cogen : wind : monthly | `domestic wind generation other net generation electric utility non cogen wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.WND-IA-4.M` | Net generation : Iowa : commercial non-cogen : wind : monthly | `domestic wind generation other net generation commercial non cogen wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 201101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Iowa monthly wind net generation` |
| Corrected query | `Iowa monthly wind net generation` |
| Confidence | 0.95 |
| Geography order | Iowa (IA) |
| Product | wind |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | wind / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, product_ai_ambiguous, activity_ai_ambiguous, frequency_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `IA` | fallback | country_ai_ambiguous |
| product | `renewable` | `wind` | fallback | product_ai_ambiguous |
| activity | `generation` | `generation` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=wind:wind@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 2795.591 ms, deterministic retrieval/ranking 169.924 ms, total 2965.563 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: IA:wind:generation

- Geography: Iowa (IA).
- Concept: product=wind; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.WND-IA-99.M` | Net generation : Iowa : all sectors : wind : monthly | `domestic wind generation other net generation all sectors wind` | domestic / primary / A | 100 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, official_all_sectors_total_priority, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.WND-IA-94.M` | Net generation : Iowa : independent power producers (total) : wind : monthly | `domestic wind generation other net generation independent power producers total wind` | domestic / primary / A | 96.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, aggregate_metadata_match, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.WND-IA-1.M` | Net generation : Iowa : electric utility : wind : monthly | `domestic wind generation other net generation electric utility wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.WND-IA-2.M` | Net generation : Iowa : electric utility non-cogen : wind : monthly | `domestic wind generation other net generation electric utility non cogen wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.WND-IA-4.M` | Net generation : Iowa : commercial non-cogen : wind : monthly | `domestic wind generation other net generation commercial non cogen wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 201101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Iowa monthly wind net generation` |
| Corrected query | `Iowa monthly wind net generation` |
| Confidence | 0.9 |
| Geography order | Iowa (IA) |
| Product | wind |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | wind / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `IA` | fallback | country_ai_ambiguous |
| product | `wind` | `wind` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=wind:wind@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 6755.365 ms, deterministic retrieval/ranking 103.52 ms, total 6858.899 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: IA:wind:generation

- Geography: Iowa (IA).
- Concept: product=wind; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.WND-IA-99.M` | Net generation : Iowa : all sectors : wind : monthly | `domestic wind generation other net generation all sectors wind` | domestic / primary / A | 100 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, official_all_sectors_total_priority, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.WND-IA-94.M` | Net generation : Iowa : independent power producers (total) : wind : monthly | `domestic wind generation other net generation independent power producers total wind` | domestic / primary / A | 96.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, aggregate_metadata_match, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.WND-IA-1.M` | Net generation : Iowa : electric utility : wind : monthly | `domestic wind generation other net generation electric utility wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.WND-IA-2.M` | Net generation : Iowa : electric utility non-cogen : wind : monthly | `domestic wind generation other net generation electric utility non cogen wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.WND-IA-4.M` | Net generation : Iowa : commercial non-cogen : wind : monthly | `domestic wind generation other net generation commercial non cogen wind` | domestic / primary / A | 88.7 | monthly | thousand megawatthours | 201101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q06: Broad renewable request with missing activity

**Raw input text:** `California renewable energy`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California renewable energy` |
| Corrected query | `California renewable energy` |
| Confidence | 0.62 |
| Geography order | California (CA) |
| Product | renewable |
| Product breadth / alternatives | broad; wind, solar, hydro, geothermal, biofuels |
| Activity / weak inference | missing; none |
| Ordered concept pairs | renewable |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous, product_ai_ambiguous, frequency_ai_ambiguous, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `none` | `renewable` | fallback | product_ai_ambiguous |
| activity | `none` | `none` | ambiguous | No activity explicitly stated. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=renewable:renewable@0; frequency=none.
- Timing: intent 2914.454 ms, deterministic retrieval/ranking 1102.586 ms, total 4017.114 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:renewable

- Geography: California (CA).
- Concept: product=renewable; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.REPRB.CA.A` | Renewable energy production, California | `seds renewable production other renewable energy production` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.RETCB.CA.A` | Renewable energy total consumption, California | `seds renewable consumption other renewable energy total consumption` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NCPRB.CA.A` | Noncombustible renewable energy production, California | `seds renewable production other noncombustible renewable energy production` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | activity_missing_ranked_aggregate_first |
| 4 | 4 | `SEDS.REGBP.CA.A` | Renewable energy total generating units net summer capacity in all sectors, California | `seds electricity renewable capacity other renewable energy total generating units net summer capacity in all sectors` | seds / fallback / C | 91.7 | annual | Thousand kilowatts | 2008 to 2024 | productOrScope 19.8/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, aggregate_metadata_match, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 5 | 5 | `SEDS.REACB.CA.A` | Renewable energy sources consumed by the transportation sector, California | `seds renewable consumption other renewable energy sources consumed by the transportation sector` | seds / fallback / C | 84.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 5.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, unrequested_sector_specific, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California renewable energy` |
| Corrected query | `California renewable energy` |
| Confidence | 0.95 |
| Geography order | California (CA) |
| Product | renewable |
| Product breadth / alternatives | broad; wind, solar, hydro, geothermal, biofuels |
| Activity / weak inference | missing; none |
| Ordered concept pairs | renewable |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous, product_ai_ambiguous, frequency_ai_ambiguous, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `renewable` | `renewable` | fallback | product_ai_ambiguous |
| activity | `none` | `none` | ambiguous | No activity specified. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `none` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=renewable:renewable@0; frequency=none.
- Timing: intent 2415.38 ms, deterministic retrieval/ranking 1699.112 ms, total 4114.518 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:renewable

- Geography: California (CA).
- Concept: product=renewable; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.REPRB.CA.A` | Renewable energy production, California | `seds renewable production other renewable energy production` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.RETCB.CA.A` | Renewable energy total consumption, California | `seds renewable consumption other renewable energy total consumption` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NCPRB.CA.A` | Noncombustible renewable energy production, California | `seds renewable production other noncombustible renewable energy production` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | activity_missing_ranked_aggregate_first |
| 4 | 4 | `SEDS.REGBP.CA.A` | Renewable energy total generating units net summer capacity in all sectors, California | `seds electricity renewable capacity other renewable energy total generating units net summer capacity in all sectors` | seds / fallback / C | 91.7 | annual | Thousand kilowatts | 2008 to 2024 | productOrScope 19.8/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, aggregate_metadata_match, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 5 | 5 | `SEDS.REACB.CA.A` | Renewable energy sources consumed by the transportation sector, California | `seds renewable consumption other renewable energy sources consumed by the transportation sector` | seds / fallback / C | 84.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 5.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, unrequested_sector_specific, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California renewable energy` |
| Corrected query | `California renewable energy` |
| Confidence | 0.82 |
| Geography order | California (CA) |
| Product | renewable |
| Product breadth / alternatives | broad; wind, solar, hydro, geothermal, biofuels |
| Activity / weak inference | missing; none |
| Ordered concept pairs | renewable |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous, frequency_ai_ambiguous, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `renewable` | `renewable` | approved | none |
| activity | `none` | `none` | ambiguous | No explicit activity term (e.g., production, consumption) was provided. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=renewable:renewable@0; frequency=none.
- Timing: intent 5544.52 ms, deterministic retrieval/ranking 1082.347 ms, total 6626.886 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:renewable

- Geography: California (CA).
- Concept: product=renewable; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.REPRB.CA.A` | Renewable energy production, California | `seds renewable production other renewable energy production` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.RETCB.CA.A` | Renewable energy total consumption, California | `seds renewable consumption other renewable energy total consumption` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NCPRB.CA.A` | Noncombustible renewable energy production, California | `seds renewable production other noncombustible renewable energy production` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | activity_missing_ranked_aggregate_first |
| 4 | 4 | `SEDS.REGBP.CA.A` | Renewable energy total generating units net summer capacity in all sectors, California | `seds electricity renewable capacity other renewable energy total generating units net summer capacity in all sectors` | seds / fallback / C | 91.7 | annual | Thousand kilowatts | 2008 to 2024 | productOrScope 19.8/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, aggregate_metadata_match, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 5 | 5 | `SEDS.REACB.CA.A` | Renewable energy sources consumed by the transportation sector, California | `seds renewable consumption other renewable energy sources consumed by the transportation sector` | seds / fallback / C | 84.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 5.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, unrequested_sector_specific, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q07: Ambiguous product and missing activity

**Raw input text:** `Texas gas`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas gas` |
| Corrected query | `Texas gas` |
| Confidence | 0.82 |
| Geography order | Texas (TX) |
| Product | missing |
| Product breadth / alternatives | ambiguous; natural gas, petroleum |
| Activity / weak inference | missing; none |
| Ordered concept pairs | empty |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous, frequency_ai_ambiguous, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `none` | ambiguous | The product term may refer to more than one approved energy-product family. |
| activity | `none` | `none` | ambiguous | No activity explicitly stated. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=none; frequency=none.
- Timing: intent 2736.98 ms, deterministic retrieval/ranking 485.101 ms, total 3222.136 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas

- Geography: Texas (TX).
- Concept: product=natural gas; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `ambiguous_product_interpretation` The broad product wording was interpreted as natural gas. Other approved interpretations are shown separately.; `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption including supplemental gaseous fuels` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption excluding supplemental gaseous fuels` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all sectors including supplemental gaseous fuels` | seds / fallback / C | 95.2 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | `seds natural gas consumption other factor for converting natural gas total consumption from physical units to` | seds / fallback / C | 95.2 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.NGTCV.TX.A` | Natural gas total expenditures (including supplemental gaseous fuels), Texas | `seds natural gas expenditures other natural gas total expenditures including supplemental gaseous fuels` | seds / fallback / C | 95.2 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: TX:petroleum

- Geography: Texas (TX).
- Concept: product=petroleum; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `ambiguous_product_interpretation` The broad product wording was interpreted as petroleum. Other approved interpretations are shown separately.; `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.OPTCB.TX.A` | Other petroleum products total consumption, Texas | `seds petroleum consumption other other petroleum products total consumption` | seds / fallback / C | 67.1 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.P1TCB.TX.A` | Asphalt and road oil, aviation gasoline, kerosene, lubricants, petroleum coke, and "other petroleum products" total consumption, Texas | `seds petroleum consumption other asphalt and road oil aviation gasoline kerosene lubricants petroleum coke and other petroleum products total consumption` | seds / fallback / C | 67.1 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.OPTCD.TX.A` | Other petroleum products average price, all sectors, Texas | `seds petroleum prices price other petroleum products average all sectors` | seds / fallback / C | 63.5 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.OPTCV.TX.A` | Other petroleum products total expenditures, Texas | `seds petroleum expenditures other other petroleum products total expenditures` | seds / fallback / C | 63.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.OPTXB.TX.A` | Other petroleum products total end-use consumption, Texas | `seds petroleum consumption other other petroleum products total end use consumption` | seds / fallback / C | 63.5 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas gas` |
| Corrected query | `Texas gas` |
| Confidence | 1 |
| Geography order | Texas (TX) |
| Product | missing |
| Product breadth / alternatives | ambiguous; natural gas, petroleum |
| Activity / weak inference | missing; none |
| Ordered concept pairs | empty |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous, frequency_ai_ambiguous, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `none` | ambiguous | The product term may refer to more than one approved energy-product family. |
| activity | `none` | `none` | ambiguous | No activity specified. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `none` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=none; frequency=none.
- Timing: intent 2346.297 ms, deterministic retrieval/ranking 850.46 ms, total 3196.8 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas

- Geography: Texas (TX).
- Concept: product=natural gas; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `ambiguous_product_interpretation` The broad product wording was interpreted as natural gas. Other approved interpretations are shown separately.; `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption including supplemental gaseous fuels` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption excluding supplemental gaseous fuels` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all sectors including supplemental gaseous fuels` | seds / fallback / C | 95.2 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | `seds natural gas consumption other factor for converting natural gas total consumption from physical units to` | seds / fallback / C | 95.2 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.NGTCV.TX.A` | Natural gas total expenditures (including supplemental gaseous fuels), Texas | `seds natural gas expenditures other natural gas total expenditures including supplemental gaseous fuels` | seds / fallback / C | 95.2 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: TX:petroleum

- Geography: Texas (TX).
- Concept: product=petroleum; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `ambiguous_product_interpretation` The broad product wording was interpreted as petroleum. Other approved interpretations are shown separately.; `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.OPTCB.TX.A` | Other petroleum products total consumption, Texas | `seds petroleum consumption other other petroleum products total consumption` | seds / fallback / C | 67.1 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.P1TCB.TX.A` | Asphalt and road oil, aviation gasoline, kerosene, lubricants, petroleum coke, and "other petroleum products" total consumption, Texas | `seds petroleum consumption other asphalt and road oil aviation gasoline kerosene lubricants petroleum coke and other petroleum products total consumption` | seds / fallback / C | 67.1 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.OPTCD.TX.A` | Other petroleum products average price, all sectors, Texas | `seds petroleum prices price other petroleum products average all sectors` | seds / fallback / C | 63.5 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.OPTCV.TX.A` | Other petroleum products total expenditures, Texas | `seds petroleum expenditures other other petroleum products total expenditures` | seds / fallback / C | 63.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.OPTXB.TX.A` | Other petroleum products total end-use consumption, Texas | `seds petroleum consumption other other petroleum products total end use consumption` | seds / fallback / C | 63.5 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | rules |
| Cleaned query | `Texas gas` |
| Corrected query | `Texas gas` |
| Confidence | 0.65 |
| Geography order | Texas (TX) |
| Product | missing |
| Product breadth / alternatives | ambiguous; natural gas, petroleum |
| Activity / weak inference | missing; none |
| Ordered concept pairs | empty |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | openai_validation_failed, product_from_deterministic_fallback, activity_from_deterministic_fallback, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | openai_validation_failed |
| product | `none` | `none` | ambiguous | openai_validation_failed |
| activity | `none` | `none` | missing | openai_validation_failed |
| sector | `none` | `none` | missing | openai_validation_failed |
| frequency | `none` | `annual` | fallback | openai_validation_failed |

- Mention order: geography=texas:undefined@0; concepts=none; frequency=none.
- Timing: intent 7918.187 ms, deterministic retrieval/ranking 466.356 ms, total 8384.582 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas

- Geography: Texas (TX).
- Concept: product=natural gas; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `ambiguous_product_interpretation` The broad product wording was interpreted as natural gas. Other approved interpretations are shown separately.; `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption including supplemental gaseous fuels` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption excluding supplemental gaseous fuels` | seds / fallback / C | 98.9 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all sectors including supplemental gaseous fuels` | seds / fallback / C | 95.2 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | `seds natural gas consumption other factor for converting natural gas total consumption from physical units to` | seds / fallback / C | 95.2 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.NGTCV.TX.A` | Natural gas total expenditures (including supplemental gaseous fuels), Texas | `seds natural gas expenditures other natural gas total expenditures including supplemental gaseous fuels` | seds / fallback / C | 95.2 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 20/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: TX:petroleum

- Geography: Texas (TX).
- Concept: product=petroleum; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: `ambiguous_product_interpretation` The broad product wording was interpreted as petroleum. Other approved interpretations are shown separately.; `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.OPTCB.TX.A` | Other petroleum products total consumption, Texas | `seds petroleum consumption other other petroleum products total consumption` | seds / fallback / C | 67.1 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | 2 | `SEDS.P1TCB.TX.A` | Asphalt and road oil, aviation gasoline, kerosene, lubricants, petroleum coke, and "other petroleum products" total consumption, Texas | `seds petroleum consumption other asphalt and road oil aviation gasoline kerosene lubricants petroleum coke and other petroleum products total consumption` | seds / fallback / C | 67.1 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.OPTCD.TX.A` | Other petroleum products average price, all sectors, Texas | `seds petroleum prices price other petroleum products average all sectors` | seds / fallback / C | 63.5 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.OPTCV.TX.A` | Other petroleum products total expenditures, Texas | `seds petroleum expenditures other other petroleum products total expenditures` | seds / fallback / C | 63.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.OPTXB.TX.A` | Other petroleum products total end-use consumption, Texas | `seds petroleum consumption other other petroleum products total end use consumption` | seds / fallback / C | 63.5 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 0/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q08: Unsupported frequency and storage wording

**Raw input text:** `United States weekly working gas in underground storage`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly working gas in underground storage` |
| Corrected query | `United States weekly working gas in underground storage` |
| Confidence | 0.94 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | product_ai_rejected |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | fallback | product_ai_rejected |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 2095.599 ms, deterministic retrieval/ranking 1587.182 ms, total 3682.836 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 92.2 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_gas, lexical_title_underground, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly working gas in underground storage` |
| Corrected query | `United States weekly working gas in underground storage` |
| Confidence | 1 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | product_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `none` | `natural gas` | fallback | product_ai_ambiguous |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 2420.145 ms, deterministic retrieval/ranking 1718.342 ms, total 4138.505 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 92.2 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_gas, lexical_title_underground, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly working gas in underground storage` |
| Corrected query | `United States weekly working gas in underground storage` |
| Confidence | 0.83 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | product_ai_rejected |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | fallback | product_ai_rejected |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 6828.679 ms, deterministic retrieval/ranking 1382.03 ms, total 8210.736 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 92.2 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_gas, lexical_title_underground, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q09: Clear International petroleum request

**Raw input text:** `Brazil annual petroleum consumption`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption` |
| Corrected query | `Brazil annual petroleum consumption` |
| Confidence | 0.99 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2226.71 ms, deterministic retrieval/ranking 2535.413 ms, total 4762.178 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption` |
| Corrected query | `Brazil annual petroleum consumption` |
| Confidence | 1 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2229.302 ms, deterministic retrieval/ranking 1775.678 ms, total 4004.997 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption` |
| Corrected query | `Brazil annual petroleum consumption` |
| Confidence | 0.93 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 3524.545 ms, deterministic retrieval/ranking 1780.487 ms, total 5305.046 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q10: International monthly renewable generation

**Raw input text:** `Japan monthly solar electricity generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Japan monthly solar electricity generation` |
| Corrected query | `Japan monthly solar electricity generation` |
| Confidence | 0.93 |
| Geography order | Japan (JPN) |
| Product | solar |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | solar / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Japan` | `JPN` | approved | none |
| product | `solar` | `solar` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=solar:solar@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 7179.444 ms, deterministic retrieval/ranking 112.66 ms, total 7292.22 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: JPN:solar:generation

- Geography: Japan (JPN).
- Concept: product=solar; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `requested_frequency_unavailable_international_annual_fallback` No valid monthly solar generation series was found for Japan. Annual International alternatives are shown separately and are not substitutes for the requested frequency..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | `international solar generation other solar electricity net generation` | international / fallback / B | 90.7 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |
| 2 | 2 | `INTL.36-12-JPN-BKWH.A` | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | `international solar generation other solar tide wave fuel cell electricity net generation` | international / fallback / B | 90.7 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Japan monthly solar electricity generation` |
| Corrected query | `Japan monthly solar electricity generation` |
| Confidence | 1 |
| Geography order | Japan (JPN) |
| Product | solar |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | solar / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Japan` | `JPN` | approved | none |
| product | `solar` | `solar` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=solar:solar@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 2002.729 ms, deterministic retrieval/ranking 90.551 ms, total 2093.302 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: JPN:solar:generation

- Geography: Japan (JPN).
- Concept: product=solar; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `requested_frequency_unavailable_international_annual_fallback` No valid monthly solar generation series was found for Japan. Annual International alternatives are shown separately and are not substitutes for the requested frequency..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | `international solar generation other solar electricity net generation` | international / fallback / B | 90.7 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |
| 2 | 2 | `INTL.36-12-JPN-BKWH.A` | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | `international solar generation other solar tide wave fuel cell electricity net generation` | international / fallback / B | 90.7 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Japan monthly solar electricity generation` |
| Corrected query | `Japan monthly solar electricity generation` |
| Confidence | 0.93 |
| Geography order | Japan (JPN) |
| Product | solar |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | solar / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | international |
| Ambiguity | none |
| Fallback | product_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Japan` | `JPN` | approved | none |
| product | `solar` | `electricity` | fallback | product_ai_ambiguous |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=solar:solar@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 6548.416 ms, deterministic retrieval/ranking 46.691 ms, total 6595.127 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: JPN:solar:generation

- Geography: Japan (JPN).
- Concept: product=solar; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `requested_frequency_unavailable_international_annual_fallback` No valid monthly solar generation series was found for Japan. Annual International alternatives are shown separately and are not substitutes for the requested frequency..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | `international solar generation other solar electricity net generation` | international / fallback / B | 90.7 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |
| 2 | 2 | `INTL.36-12-JPN-BKWH.A` | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | `international solar generation other solar tide wave fuel cell electricity net generation` | international / fallback / B | 90.7 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 0/5; currentness 3/3; availability 3/3 | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |

### Q11: Broad product with two activity mentions

**Raw input text:** `Germany renewable energy production and consumption`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Germany renewable energy production and consumption` |
| Corrected query | `Germany renewable energy production and consumption` |
| Confidence | 0.89 |
| Geography order | Germany (DEU) |
| Product | renewable |
| Product breadth / alternatives | broad; wind, solar, hydro, geothermal, biofuels |
| Activity / weak inference | production; none |
| Ordered concept pairs | renewable / production -> renewable / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | international |
| Ambiguity | none |
| Fallback | product_ai_ambiguous, activity_ai_ambiguous, frequency_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Germany` | `DEU` | approved | none |
| product | `none` | `renewable` | fallback | product_ai_ambiguous |
| activity | `production` | `consumption` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=renewable:renewable@0 -> production:production@1 -> renewable:renewable@2 -> consumption:consumption@3; frequency=none.
- Timing: intent 4853.939 ms, deterministic retrieval/ranking 266.875 ms, total 5120.867 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: DEU:renewable:production

- Geography: Germany (DEU).
- Concept: product=renewable; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.4418-1-DEU-QBTU.A` | Total energy production from renewables and other, Germany, Annual | `international renewable total energy production other total energy production from renewables and other` | international / primary / C | 76.9 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 6.5/20; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_energy, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | 2 | `INTL.79-1-DEU-MT.A` | Biofuels production, Germany, Annual | `international biofuels production other biofuels production` | international / fallback / C | 67 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 2.2/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_production, ordinary_series, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: DEU:renewable:consumption

- Geography: Germany (DEU).
- Concept: product=renewable; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.4418-2-DEU-QBTU.A` | Total energy consumption from renewables and other, Germany, Annual | `international renewable total energy consumption other total energy consumption from renewables and other` | international / primary / C | 76.9 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 6.5/20; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | 2 | `INTL.79-2-DEU-MT.A` | Biofuels consumption, Germany, Annual | `international biofuels consumption other biofuels consumption` | international / fallback / C | 67 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 2.2/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Germany renewable energy production and consumption` |
| Corrected query | `Germany renewable energy production and consumption` |
| Confidence | 1 |
| Geography order | Germany (DEU) |
| Product | renewable |
| Product breadth / alternatives | broad; wind, solar, hydro, geothermal, biofuels |
| Activity / weak inference | production; none |
| Ordered concept pairs | renewable / production -> renewable / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | international |
| Ambiguity | none |
| Fallback | country_ai_missing, product_ai_missing, activity_ai_missing, frequency_ai_missing |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `DEU` | fallback | country_ai_missing |
| product | `none` | `renewable` | fallback | product_ai_missing |
| activity | `none` | `consumption` | fallback | activity_ai_missing |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `none` | `annual` | fallback | frequency_ai_missing |

- Mention order: geography=undefined:undefined@0; concepts=renewable:renewable@0 -> production:production@1 -> renewable:renewable@2 -> consumption:consumption@3; frequency=none.
- Timing: intent 2904.622 ms, deterministic retrieval/ranking 297.796 ms, total 3202.435 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: DEU:renewable:production

- Geography: Germany (DEU).
- Concept: product=renewable; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.4418-1-DEU-QBTU.A` | Total energy production from renewables and other, Germany, Annual | `international renewable total energy production other total energy production from renewables and other` | international / primary / C | 76.9 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 6.5/20; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_energy, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | 2 | `INTL.79-1-DEU-MT.A` | Biofuels production, Germany, Annual | `international biofuels production other biofuels production` | international / fallback / C | 67 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 2.2/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_production, ordinary_series, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: DEU:renewable:consumption

- Geography: Germany (DEU).
- Concept: product=renewable; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.4418-2-DEU-QBTU.A` | Total energy consumption from renewables and other, Germany, Annual | `international renewable total energy consumption other total energy consumption from renewables and other` | international / primary / C | 76.9 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 6.5/20; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | 2 | `INTL.79-2-DEU-MT.A` | Biofuels consumption, Germany, Annual | `international biofuels consumption other biofuels consumption` | international / fallback / C | 67 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 2.2/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Germany renewable energy production and consumption` |
| Corrected query | `Germany renewable energy production and consumption` |
| Confidence | 0.9 |
| Geography order | Germany (DEU) |
| Product | renewable |
| Product breadth / alternatives | broad; wind, solar, hydro, geothermal, biofuels |
| Activity / weak inference | production; none |
| Ordered concept pairs | renewable / production -> renewable / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | none |
| Route | international |
| Ambiguity | none |
| Fallback | activity_ai_ambiguous, frequency_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Germany` | `DEU` | approved | none |
| product | `renewable` | `renewable` | approved | none |
| activity | `production` | `consumption` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=renewable:renewable@0 -> production:production@1 -> renewable:renewable@2 -> consumption:consumption@3; frequency=none.
- Timing: intent 6373.117 ms, deterministic retrieval/ranking 168.953 ms, total 6542.083 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: DEU:renewable:production

- Geography: Germany (DEU).
- Concept: product=renewable; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.4418-1-DEU-QBTU.A` | Total energy production from renewables and other, Germany, Annual | `international renewable total energy production other total energy production from renewables and other` | international / primary / C | 76.9 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 6.5/20; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_energy, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | 2 | `INTL.79-1-DEU-MT.A` | Biofuels production, Germany, Annual | `international biofuels production other biofuels production` | international / fallback / C | 67 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 2.2/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_production, ordinary_series, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: DEU:renewable:consumption

- Geography: Germany (DEU).
- Concept: product=renewable; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=not_explicit.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.4418-2-DEU-QBTU.A` | Total energy consumption from renewables and other, Germany, Annual | `international renewable total energy consumption other total energy consumption from renewables and other` | international / primary / C | 76.9 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 6.5/20; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | 2 | `INTL.79-2-DEU-MT.A` | Biofuels consumption, Germany, Annual | `international biofuels consumption other biofuels consumption` | international / fallback / C | 67 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 2.2/20; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q12: Multiple geographies and mention order

**Raw input text:** `Brazil then Japan annual electricity generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil then Japan annual electricity generation` |
| Corrected query | `Brazil then Japan annual electricity generation` |
| Confidence | 0.98 |
| Geography order | Brazil (BRA) -> Japan (JPN) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `BRA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=electricity:electricity@0 -> generation:generation@1; frequency=annual:annual@0.
- Timing: intent 2086.315 ms, deterministic retrieval/ranking 412.812 ms, total 2499.179 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:electricity:generation

- Geography: Brazil (BRA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.2-12-BRA-BKWH.A` | Electricity net generation, Brazil, Annual | `international electricity generation other electricity net generation` | international / primary / A | 80 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `INTL.116-12-BRA-BKWH.A` | Solar electricity net generation, Brazil, Annual | `international electricity solar generation other solar electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | 3 | `INTL.117-12-BRA-BKWH.A` | Tide and wave electricity net generation, Brazil, Annual | `international electricity marine generation other tide and wave electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | 4 | `INTL.27-12-BRA-BKWH.A` | Nuclear electricity net generation, Brazil, Annual | `international electricity nuclear generation other nuclear electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `INTL.28-12-BRA-BKWH.A` | Fossil fuels electricity net generation, Brazil, Annual | `international electricity fossil fuels generation other fossil fuels electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

##### Retrieval 2: JPN:electricity:generation

- Geography: Japan (JPN).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.2-12-JPN-BKWH.A` | Electricity net generation, Japan, Annual | `international electricity generation other electricity net generation` | international / primary / A | 80 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | `international electricity solar generation other solar electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | 3 | `INTL.117-12-JPN-BKWH.A` | Tide and wave electricity net generation, Japan, Annual | `international electricity marine generation other tide and wave electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | 4 | `INTL.27-12-JPN-BKWH.A` | Nuclear electricity net generation, Japan, Annual | `international electricity nuclear generation other nuclear electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `INTL.28-12-JPN-BKWH.A` | Fossil fuels electricity net generation, Japan, Annual | `international electricity fossil fuels generation other fossil fuels electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil then Japan annual electricity generation` |
| Corrected query | `Brazil then Japan annual electricity generation` |
| Confidence | 1 |
| Geography order | Brazil (BRA) -> Japan (JPN) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | country_ai_missing |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `BRA` | fallback | country_ai_missing |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=electricity:electricity@0 -> generation:generation@1; frequency=annual:annual@0.
- Timing: intent 3117.979 ms, deterministic retrieval/ranking 302.707 ms, total 3420.701 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:electricity:generation

- Geography: Brazil (BRA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.2-12-BRA-BKWH.A` | Electricity net generation, Brazil, Annual | `international electricity generation other electricity net generation` | international / primary / A | 80 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `INTL.116-12-BRA-BKWH.A` | Solar electricity net generation, Brazil, Annual | `international electricity solar generation other solar electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | 3 | `INTL.117-12-BRA-BKWH.A` | Tide and wave electricity net generation, Brazil, Annual | `international electricity marine generation other tide and wave electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | 4 | `INTL.27-12-BRA-BKWH.A` | Nuclear electricity net generation, Brazil, Annual | `international electricity nuclear generation other nuclear electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `INTL.28-12-BRA-BKWH.A` | Fossil fuels electricity net generation, Brazil, Annual | `international electricity fossil fuels generation other fossil fuels electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

##### Retrieval 2: JPN:electricity:generation

- Geography: Japan (JPN).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.2-12-JPN-BKWH.A` | Electricity net generation, Japan, Annual | `international electricity generation other electricity net generation` | international / primary / A | 80 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | `international electricity solar generation other solar electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | 3 | `INTL.117-12-JPN-BKWH.A` | Tide and wave electricity net generation, Japan, Annual | `international electricity marine generation other tide and wave electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | 4 | `INTL.27-12-JPN-BKWH.A` | Nuclear electricity net generation, Japan, Annual | `international electricity nuclear generation other nuclear electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `INTL.28-12-JPN-BKWH.A` | Fossil fuels electricity net generation, Japan, Annual | `international electricity fossil fuels generation other fossil fuels electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil then Japan annual electricity generation` |
| Corrected query | `Brazil then Japan annual electricity generation` |
| Confidence | 0.94 |
| Geography order | Brazil (BRA) -> Japan (JPN) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `BRA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=electricity:electricity@0 -> generation:generation@1; frequency=annual:annual@0.
- Timing: intent 4906.812 ms, deterministic retrieval/ranking 377.324 ms, total 5284.166 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:electricity:generation

- Geography: Brazil (BRA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.2-12-BRA-BKWH.A` | Electricity net generation, Brazil, Annual | `international electricity generation other electricity net generation` | international / primary / A | 80 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `INTL.116-12-BRA-BKWH.A` | Solar electricity net generation, Brazil, Annual | `international electricity solar generation other solar electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | 3 | `INTL.117-12-BRA-BKWH.A` | Tide and wave electricity net generation, Brazil, Annual | `international electricity marine generation other tide and wave electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | 4 | `INTL.27-12-BRA-BKWH.A` | Nuclear electricity net generation, Brazil, Annual | `international electricity nuclear generation other nuclear electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `INTL.28-12-BRA-BKWH.A` | Fossil fuels electricity net generation, Brazil, Annual | `international electricity fossil fuels generation other fossil fuels electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

##### Retrieval 2: JPN:electricity:generation

- Geography: Japan (JPN).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.2-12-JPN-BKWH.A` | Electricity net generation, Japan, Annual | `international electricity generation other electricity net generation` | international / primary / A | 80 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 14.3/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | `international electricity solar generation other solar electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | 3 | `INTL.117-12-JPN-BKWH.A` | Tide and wave electricity net generation, Japan, Annual | `international electricity marine generation other tide and wave electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | 4 | `INTL.27-12-JPN-BKWH.A` | Nuclear electricity net generation, Japan, Annual | `international electricity nuclear generation other nuclear electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `INTL.28-12-JPN-BKWH.A` | Fossil fuels electricity net generation, Japan, Annual | `international electricity fossil fuels generation other fossil fuels electricity net generation` | international / primary / C | 74.8 | annual | billion kilowatthours | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 3.5/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

### Q13: Messy spelling and negative constraint

**Raw input text:** `plz shwo montly nat gas prodction in Texas, not prices`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `plz shwo montly nat gas prodction in Texas, not prices` |
| Corrected query | `monthly natural gas production in Texas, not prices` |
| Confidence | 0.98 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | activity:prices |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_missing |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_missing |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 2054.662 ms, deterministic retrieval/ranking 2055.983 ms, total 4110.699 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:production

- Geography: Texas (TX).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 74.9 | monthly | Million Cubic Feet | 199704 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `plz shwo montly nat gas prodction in Texas, not prices` |
| Corrected query | `please show monthly natural gas production in Texas, not prices` |
| Confidence | 1 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | activity:prices |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 2609.875 ms, deterministic retrieval/ranking 1658.037 ms, total 4267.929 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:production

- Geography: Texas (TX).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 74.9 | monthly | Million Cubic Feet | 199704 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `plz shwo montly nat gas prodction in Texas, not prices` |
| Corrected query | `please show monthly natural gas production in Texas, not prices` |
| Confidence | 0.9 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | activity:prices |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 7585.514 ms, deterministic retrieval/ranking 2823.819 ms, total 10409.351 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:production

- Geography: Texas (TX).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 74.9 | monthly | Million Cubic Feet | 199704 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

### Q14: Impossible source term and weak activity hint

**Raw input text:** `California monthly electricity from moon`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | rules |
| Cleaned query | `California monthly electricity from moon` |
| Corrected query | `California monthly electricity from moon` |
| Confidence | 0.65 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | missing; none |
| Ordered concept pairs | electricity |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | moon |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | openai_validation_failed, activity_from_deterministic_fallback |
| Clarification | Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | openai_validation_failed |
| product | `none` | `electricity` | fallback | openai_validation_failed |
| activity | `none` | `none` | missing | openai_validation_failed |
| sector | `none` | `none` | missing | openai_validation_failed |
| frequency | `none` | `monthly` | fallback | openai_validation_failed |

- Mention order: geography=california:undefined@0; concepts=electricity:electricity@19; frequency=monthly:monthly@11.
- Timing: intent 2379.492 ms, deterministic retrieval/ranking 906.85 ms, total 3286.391 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity

- Geography: California (CA).
- Concept: product=electricity; activity=missing; activity source=missing.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series.; `unresolved_qualifier_requires_clarification` Clarify or remove moon before candidates can be shown..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | rules |
| Cleaned query | `California monthly electricity from moon` |
| Corrected query | `California monthly electricity from moon` |
| Confidence | 0.65 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | missing; none |
| Ordered concept pairs | electricity |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | moon |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | openai_validation_failed, activity_from_deterministic_fallback |
| Clarification | Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | openai_validation_failed |
| product | `none` | `electricity` | fallback | openai_validation_failed |
| activity | `none` | `none` | missing | openai_validation_failed |
| sector | `none` | `none` | missing | openai_validation_failed |
| frequency | `none` | `monthly` | fallback | openai_validation_failed |

- Mention order: geography=california:undefined@0; concepts=electricity:electricity@19; frequency=monthly:monthly@11.
- Timing: intent 1838.959 ms, deterministic retrieval/ranking 928.723 ms, total 2767.715 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity

- Geography: California (CA).
- Concept: product=electricity; activity=missing; activity source=missing.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series.; `unresolved_qualifier_requires_clarification` Clarify or remove moon before candidates can be shown..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | rules |
| Cleaned query | `California monthly electricity from moon` |
| Corrected query | `California monthly electricity from moon` |
| Confidence | 0.65 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | missing; none |
| Ordered concept pairs | electricity |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | moon |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | openai_validation_failed, activity_from_deterministic_fallback |
| Clarification | Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | openai_validation_failed |
| product | `none` | `electricity` | fallback | openai_validation_failed |
| activity | `none` | `none` | missing | openai_validation_failed |
| sector | `none` | `none` | missing | openai_validation_failed |
| frequency | `none` | `monthly` | fallback | openai_validation_failed |

- Mention order: geography=california:undefined@0; concepts=electricity:electricity@19; frequency=monthly:monthly@11.
- Timing: intent 5758.18 ms, deterministic retrieval/ranking 1278.393 ms, total 7036.609 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity

- Geography: California (CA).
- Concept: product=electricity; activity=missing; activity source=missing.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series.; `unresolved_qualifier_requires_clarification` Clarify or remove moon before candidates can be shown..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

### Q15: Explicit price measure

**Raw input text:** `Texas annual natural gas prices`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas prices` |
| Corrected query | `Texas annual natural gas prices` |
| Confidence | 0.98 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | prices; none |
| Ordered concept pairs | natural gas / prices |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Texas` | `TX` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `prices` | `prices` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> prices:prices@1; frequency=annual:annual@0.
- Timing: intent 2803.2 ms, deterministic retrieval/ranking 190.021 ms, total 2993.246 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:prices

- Geography: Texas (TX).
- Concept: product=natural gas; activity=prices; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all sectors including supplemental gaseous fuels` | seds / primary / A | 82.4 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `SEDS.NGTXD.TX.A` | Natural gas average price, all end-use sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all end use sectors including supplemental gaseous fuels` | seds / primary / A | 82.4 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `SEDS.NGACD.TX.A` | Natural gas price in the transportation sector, Texas | `seds natural gas prices price natural gas in the transportation sector` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `SEDS.NGCCD.TX.A` | Natural gas price in the commercial sector (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas in the commercial sector including supplemental gaseous fuels` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `SEDS.NGICD.TX.A` | Natural gas price in the industrial sector (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas in the industrial sector including supplemental gaseous fuels` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas prices` |
| Corrected query | `Texas annual natural gas prices` |
| Confidence | 1 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | prices; none |
| Ordered concept pairs | natural gas / prices |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, activity_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `prices` | `prices` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> prices:prices@1; frequency=annual:annual@0.
- Timing: intent 3463.853 ms, deterministic retrieval/ranking 184.125 ms, total 3648.007 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:prices

- Geography: Texas (TX).
- Concept: product=natural gas; activity=prices; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all sectors including supplemental gaseous fuels` | seds / primary / A | 82.4 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `SEDS.NGTXD.TX.A` | Natural gas average price, all end-use sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all end use sectors including supplemental gaseous fuels` | seds / primary / A | 82.4 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `SEDS.NGACD.TX.A` | Natural gas price in the transportation sector, Texas | `seds natural gas prices price natural gas in the transportation sector` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `SEDS.NGCCD.TX.A` | Natural gas price in the commercial sector (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas in the commercial sector including supplemental gaseous fuels` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `SEDS.NGICD.TX.A` | Natural gas price in the industrial sector (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas in the industrial sector including supplemental gaseous fuels` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas prices` |
| Corrected query | `Texas annual natural gas prices` |
| Confidence | 0.92 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | prices; none |
| Ordered concept pairs | natural gas / prices |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `prices` | `prices` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> prices:prices@1; frequency=annual:annual@0.
- Timing: intent 9453.186 ms, deterministic retrieval/ranking 176.741 ms, total 9629.957 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:prices

- Geography: Texas (TX).
- Concept: product=natural gas; activity=prices; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all sectors including supplemental gaseous fuels` | seds / primary / A | 82.4 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `SEDS.NGTXD.TX.A` | Natural gas average price, all end-use sectors (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas average all end use sectors including supplemental gaseous fuels` | seds / primary / A | 82.4 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `SEDS.NGACD.TX.A` | Natural gas price in the transportation sector, Texas | `seds natural gas prices price natural gas in the transportation sector` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `SEDS.NGCCD.TX.A` | Natural gas price in the commercial sector (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas in the commercial sector including supplemental gaseous fuels` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `SEDS.NGICD.TX.A` | Natural gas price in the industrial sector (including supplemental gaseous fuels), Texas | `seds natural gas prices price natural gas in the industrial sector including supplemental gaseous fuels` | seds / primary / A | 74.7 | annual | Dollars per million Btu | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 7.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_prices, unrequested_sector_specific, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q16: Explicit expenditure measure

**Raw input text:** `California annual petroleum expenditures`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California annual petroleum expenditures` |
| Corrected query | `California annual petroleum expenditures` |
| Confidence | 0.97 |
| Geography order | California (CA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | expenditures; none |
| Ordered concept pairs | petroleum / expenditures |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, frequency_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `expenditures` | `expenditures` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | fallback | frequency_ai_ambiguous |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> expenditures:expenditures@1; frequency=annual:annual@0.
- Timing: intent 3573.309 ms, deterministic retrieval/ranking 295.229 ms, total 3868.55 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:petroleum:expenditures

- Geography: California (CA).
- Concept: product=petroleum; activity=expenditures; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.OPTCV.CA.A` | Other petroleum products total expenditures, California | `seds petroleum expenditures other other petroleum products total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `SEDS.OPTXV.CA.A` | Other petroleum products total end-use expenditures, California | `seds petroleum expenditures other other petroleum products total end use expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `SEDS.PATCV.CA.A` | All petroleum products total expenditures, California | `seds petroleum expenditures other all petroleum products total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.PATXV.CA.A` | All petroleum products total end-use expenditures, California | `seds petroleum expenditures other all petroleum products total end use expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.PCTCV.CA.A` | Petroleum coke total expenditures, California | `seds petroleum expenditures other petroleum coke total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California annual petroleum expenditures` |
| Corrected query | `California annual petroleum expenditures` |
| Confidence | 1 |
| Geography order | California (CA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | expenditures; none |
| Ordered concept pairs | petroleum / expenditures |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, activity_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `expenditures` | `expenditures` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> expenditures:expenditures@1; frequency=annual:annual@0.
- Timing: intent 2833.402 ms, deterministic retrieval/ranking 442.494 ms, total 3275.918 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:petroleum:expenditures

- Geography: California (CA).
- Concept: product=petroleum; activity=expenditures; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.OPTCV.CA.A` | Other petroleum products total expenditures, California | `seds petroleum expenditures other other petroleum products total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `SEDS.OPTXV.CA.A` | Other petroleum products total end-use expenditures, California | `seds petroleum expenditures other other petroleum products total end use expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `SEDS.PATCV.CA.A` | All petroleum products total expenditures, California | `seds petroleum expenditures other all petroleum products total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.PATXV.CA.A` | All petroleum products total end-use expenditures, California | `seds petroleum expenditures other all petroleum products total end use expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.PCTCV.CA.A` | Petroleum coke total expenditures, California | `seds petroleum expenditures other petroleum coke total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California annual petroleum expenditures` |
| Corrected query | `California annual petroleum expenditures` |
| Confidence | 0.92 |
| Geography order | California (CA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | expenditures; none |
| Ordered concept pairs | petroleum / expenditures |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `California` | `CA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `expenditures` | `expenditures` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> expenditures:expenditures@1; frequency=annual:annual@0.
- Timing: intent 5876.356 ms, deterministic retrieval/ranking 350.881 ms, total 6227.255 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:petroleum:expenditures

- Geography: California (CA).
- Concept: product=petroleum; activity=expenditures; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.OPTCV.CA.A` | Other petroleum products total expenditures, California | `seds petroleum expenditures other other petroleum products total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `SEDS.OPTXV.CA.A` | Other petroleum products total end-use expenditures, California | `seds petroleum expenditures other other petroleum products total end use expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `SEDS.PATCV.CA.A` | All petroleum products total expenditures, California | `seds petroleum expenditures other all petroleum products total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `SEDS.PATXV.CA.A` | All petroleum products total end-use expenditures, California | `seds petroleum expenditures other all petroleum products total end use expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `SEDS.PCTCV.CA.A` | Petroleum coke total expenditures, California | `seds petroleum expenditures other petroleum coke total expenditures` | seds / primary / A | 96.5 | annual | Million dollars | 1970 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_expenditures, aggregate_metadata_match, lexical_title_petroleum, lexical_title_expenditures, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q17: Stock request with flow exclusion

**Raw input text:** `United States weekly natural gas storage, not production`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly natural gas storage, not production` |
| Corrected query | `United States weekly natural gas storage, not production` |
| Confidence | 0.98 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | activity:production |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 2541.464 ms, deterministic retrieval/ranking 1263.703 ms, total 3805.188 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 81.5 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.8/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_natural, lexical_title_gas, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly natural gas storage, not production` |
| Corrected query | `United States weekly natural gas storage, not production` |
| Confidence | 1 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | activity:production |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 2689.786 ms, deterministic retrieval/ranking 1410.622 ms, total 4100.431 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 81.5 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.8/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_natural, lexical_title_gas, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly natural gas storage, not production` |
| Corrected query | `United States weekly natural gas storage, not production` |
| Confidence | 0.9 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | activity:production |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 5921.581 ms, deterministic retrieval/ranking 1826.656 ms, total 7748.25 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 81.5 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.8/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_natural, lexical_title_gas, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q18: State and U.S. national geographies

**Raw input text:** `Texas and United States monthly natural gas production`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas and United States monthly natural gas production` |
| Corrected query | `Texas and United States monthly natural gas production` |
| Confidence | 0.98 |
| Geography order | Texas (TX) -> United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `USA` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 3096.306 ms, deterministic retrieval/ranking 581.583 ms, total 3677.907 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:production

- Geography: Texas (TX).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 74.9 | monthly | Million Cubic Feet | 199704 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

##### Retrieval 2: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050US1.M` | U.S. Natural Gas Marketed Production (Wet), Monthly | `domestic natural gas production other u s natural gas marketed production wet` | domestic / primary / A | 80.7 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.N9050US2.M` | U.S. Natural Gas Marketed Production, Monthly | `domestic natural gas production other u s natural gas marketed production` | domestic / primary / A | 80.7 | monthly | Million Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.N9070US1.M` | U.S. Dry Natural Gas Production, Monthly | `domestic natural gas production other u s dry natural gas production` | domestic / primary / A | 80.7 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `NG.N9060US1.M` | U.S. Natural Gas Plant Liquids Production, Gaseous Equivalent, Monthly | `domestic natural gas plant production other u s natural gas plant liquids production gaseous equivalent` | domestic / primary / C | 78.1 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `NG.N9060US2.M` | U.S. Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other u s natural gas plant liquids production` | domestic / primary / C | 78.1 | monthly | Million Cubic Feet | 197301 to 202604 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | product_contains_unrequested_concepts |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas and United States monthly natural gas production` |
| Corrected query | `Texas and United States monthly natural gas production` |
| Confidence | 1 |
| Geography order | Texas (TX) -> United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | country_ai_missing, product_ai_missing, activity_ai_missing, frequency_ai_missing |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `USA` | fallback | country_ai_missing |
| product | `none` | `natural gas` | fallback | product_ai_missing |
| activity | `none` | `production` | fallback | activity_ai_missing |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `none` | `monthly` | fallback | frequency_ai_missing |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 3034.256 ms, deterministic retrieval/ranking 514.021 ms, total 3548.296 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:production

- Geography: Texas (TX).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 74.9 | monthly | Million Cubic Feet | 199704 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

##### Retrieval 2: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050US1.M` | U.S. Natural Gas Marketed Production (Wet), Monthly | `domestic natural gas production other u s natural gas marketed production wet` | domestic / primary / A | 80.7 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.N9050US2.M` | U.S. Natural Gas Marketed Production, Monthly | `domestic natural gas production other u s natural gas marketed production` | domestic / primary / A | 80.7 | monthly | Million Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.N9070US1.M` | U.S. Dry Natural Gas Production, Monthly | `domestic natural gas production other u s dry natural gas production` | domestic / primary / A | 80.7 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `NG.N9060US1.M` | U.S. Natural Gas Plant Liquids Production, Gaseous Equivalent, Monthly | `domestic natural gas plant production other u s natural gas plant liquids production gaseous equivalent` | domestic / primary / C | 78.1 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `NG.N9060US2.M` | U.S. Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other u s natural gas plant liquids production` | domestic / primary / C | 78.1 | monthly | Million Cubic Feet | 197301 to 202604 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | product_contains_unrequested_concepts |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas and United States monthly natural gas production` |
| Corrected query | `Texas and United States monthly natural gas production` |
| Confidence | 0.94 |
| Geography order | Texas (TX) -> United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `USA` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=natural gas:natural gas@0 -> production:production@1; frequency=monthly:monthly@0.
- Timing: intent 11037.51 ms, deterministic retrieval/ranking 446.558 ms, total 11484.083 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:production

- Geography: Texas (TX).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | `domestic natural gas production other natural gas marketed production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 198901 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | `domestic natural gas production other dry natural gas production` | domestic / primary / A | 77.4 | monthly | Million Cubic Feet | 200601 to 202412 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other natural gas plant liquids production` | domestic / primary / C | 74.9 | monthly | Million Cubic Feet | 199704 to 202412 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.3/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

##### Retrieval 2: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.N9050US1.M` | U.S. Natural Gas Marketed Production (Wet), Monthly | `domestic natural gas production other u s natural gas marketed production wet` | domestic / primary / A | 80.7 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `NG.N9050US2.M` | U.S. Natural Gas Marketed Production, Monthly | `domestic natural gas production other u s natural gas marketed production` | domestic / primary / A | 80.7 | monthly | Million Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | 3 | `NG.N9070US1.M` | U.S. Dry Natural Gas Production, Monthly | `domestic natural gas production other u s dry natural gas production` | domestic / primary / A | 80.7 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `NG.N9060US1.M` | U.S. Natural Gas Plant Liquids Production, Gaseous Equivalent, Monthly | `domestic natural gas plant production other u s natural gas plant liquids production gaseous equivalent` | domestic / primary / C | 78.1 | monthly | Billion Cubic Feet | 197301 to 202604 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | 5 | `NG.N9060US2.M` | U.S. Natural Gas Plant Liquids Production, Monthly | `domestic natural gas plant production other u s natural gas plant liquids production` | domestic / primary / C | 78.1 | monthly | Million Cubic Feet | 197301 to 202604 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | product_contains_unrequested_concepts |

### Q19: U.S. and foreign-country geographies

**Raw input text:** `United States then Canada annual natural gas production`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States then Canada annual natural gas production` |
| Corrected query | `United States then Canada annual natural gas production` |
| Confidence | 0.99 |
| Geography order | United States (USA) -> Canada (CAN) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `USA` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=natural gas:natural gas@0 -> production:production@1; frequency=annual:annual@0.
- Timing: intent 2740.623 ms, deterministic retrieval/ranking 1870.924 ms, total 4611.574 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.3-1-USA-BCF.A` | Gross natural gas production, United States, Annual | `international natural gas production other gross natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.43-1-USA-BCF.A` | Vented and flared natural gas production, United States, Annual | `international natural gas production other vented and flared natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.48-1-USA-BCF.A` | Reinjected natural gas production, United States, Annual | `international natural gas production other reinjected natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.26-1-USA-BCF.A` | Dry natural gas production, United States, Annual | `international natural gas production other dry natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4413-1-USA-QBTU.A` | Total energy production from natural gas, United States, Annual | `international natural gas total energy production other total energy production from natural gas` | international / primary / C | 77.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

##### Retrieval 2: CAN:natural gas:production

- Geography: Canada (CAN).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.3-1-CAN-BCF.A` | Gross natural gas production, Canada, Annual | `international natural gas production other gross natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.43-1-CAN-BCF.A` | Vented and flared natural gas production, Canada, Annual | `international natural gas production other vented and flared natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2015 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.48-1-CAN-BCF.A` | Reinjected natural gas production, Canada, Annual | `international natural gas production other reinjected natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1990 to 2015 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.26-1-CAN-BCF.A` | Dry natural gas production, Canada, Annual | `international natural gas production other dry natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4413-1-CAN-QBTU.A` | Total energy production from natural gas, Canada, Annual | `international natural gas total energy production other total energy production from natural gas` | international / primary / C | 75.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States then Canada annual natural gas production` |
| Corrected query | `United States then Canada annual natural gas production` |
| Confidence | 1 |
| Geography order | United States (USA) -> Canada (CAN) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | country_ai_missing |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `USA` | fallback | country_ai_missing |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=natural gas:natural gas@0 -> production:production@1; frequency=annual:annual@0.
- Timing: intent 2990.927 ms, deterministic retrieval/ranking 1733.628 ms, total 4724.58 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.3-1-USA-BCF.A` | Gross natural gas production, United States, Annual | `international natural gas production other gross natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.43-1-USA-BCF.A` | Vented and flared natural gas production, United States, Annual | `international natural gas production other vented and flared natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.48-1-USA-BCF.A` | Reinjected natural gas production, United States, Annual | `international natural gas production other reinjected natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.26-1-USA-BCF.A` | Dry natural gas production, United States, Annual | `international natural gas production other dry natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4413-1-USA-QBTU.A` | Total energy production from natural gas, United States, Annual | `international natural gas total energy production other total energy production from natural gas` | international / primary / C | 77.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

##### Retrieval 2: CAN:natural gas:production

- Geography: Canada (CAN).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.3-1-CAN-BCF.A` | Gross natural gas production, Canada, Annual | `international natural gas production other gross natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.43-1-CAN-BCF.A` | Vented and flared natural gas production, Canada, Annual | `international natural gas production other vented and flared natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2015 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.48-1-CAN-BCF.A` | Reinjected natural gas production, Canada, Annual | `international natural gas production other reinjected natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1990 to 2015 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.26-1-CAN-BCF.A` | Dry natural gas production, Canada, Annual | `international natural gas production other dry natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4413-1-CAN-QBTU.A` | Total energy production from natural gas, Canada, Annual | `international natural gas total energy production other total energy production from natural gas` | international / primary / C | 75.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States then Canada annual natural gas production` |
| Corrected query | `United States then Canada annual natural gas production` |
| Confidence | 0.86 |
| Geography order | United States (USA) -> Canada (CAN) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0 -> undefined:undefined@1; concepts=natural gas:natural gas@0 -> production:production@1; frequency=annual:annual@0.
- Timing: intent 4301.879 ms, deterministic retrieval/ranking 1939.553 ms, total 6241.46 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.3-1-USA-BCF.A` | Gross natural gas production, United States, Annual | `international natural gas production other gross natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.43-1-USA-BCF.A` | Vented and flared natural gas production, United States, Annual | `international natural gas production other vented and flared natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.48-1-USA-BCF.A` | Reinjected natural gas production, United States, Annual | `international natural gas production other reinjected natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.26-1-USA-BCF.A` | Dry natural gas production, United States, Annual | `international natural gas production other dry natural gas production` | international / primary / A | 75.5 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4413-1-USA-QBTU.A` | Total energy production from natural gas, United States, Annual | `international natural gas total energy production other total energy production from natural gas` | international / primary / C | 77.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

##### Retrieval 2: CAN:natural gas:production

- Geography: Canada (CAN).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.3-1-CAN-BCF.A` | Gross natural gas production, Canada, Annual | `international natural gas production other gross natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2017 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.43-1-CAN-BCF.A` | Vented and flared natural gas production, Canada, Annual | `international natural gas production other vented and flared natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2015 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.48-1-CAN-BCF.A` | Reinjected natural gas production, Canada, Annual | `international natural gas production other reinjected natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1990 to 2015 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.26-1-CAN-BCF.A` | Dry natural gas production, Canada, Annual | `international natural gas production other dry natural gas production` | international / primary / A | 73.7 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4413-1-CAN-QBTU.A` | Total energy production from natural gas, Canada, Annual | `international natural gas total energy production other total energy production from natural gas` | international / primary / C | 75.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

### Q20: Explicit requested date range

**Raw input text:** `Brazil annual petroleum consumption from 2010 to 2020`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption from 2010 to 2020` |
| Corrected query | `Brazil annual petroleum consumption from 2010 to 2020` |
| Confidence | 0.99 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2518.181 ms, deterministic retrieval/ranking 170.651 ms, total 2688.855 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption from 2010 to 2020` |
| Corrected query | `Brazil annual petroleum consumption from 2010 to 2020` |
| Confidence | 1 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2566.853 ms, deterministic retrieval/ranking 174.604 ms, total 2741.476 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption from 2010 to 2020` |
| Corrected query | `Brazil annual petroleum consumption from 2010 to 2020` |
| Confidence | 0.93 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 4601.644 ms, deterministic retrieval/ranking 155.668 ms, total 4757.33 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 92.2 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 20/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 77.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 7.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q21: Explicit requested unit

**Raw input text:** `Brazil annual petroleum consumption in barrels`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption in barrels` |
| Corrected query | `Brazil annual petroleum consumption in barrels` |
| Confidence | 0.98 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2746.272 ms, deterministic retrieval/ranking 226.005 ms, total 2972.295 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 73.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 73.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption in barrels` |
| Corrected query | `Brazil annual petroleum consumption in barrels` |
| Confidence | 1 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2418.359 ms, deterministic retrieval/ranking 189.862 ms, total 2608.305 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 73.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 73.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum consumption in barrels` |
| Corrected query | `Brazil annual petroleum consumption in barrels` |
| Confidence | 0.93 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 6706.735 ms, deterministic retrieval/ranking 213.396 ms, total 6920.154 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 81.4 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 73.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 73.6 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q22: Quarterly Domestic request

**Raw input text:** `California quarterly electricity generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California quarterly electricity generation` |
| Corrected query | `California quarterly electricity generation` |
| Confidence | 0.97 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | quarterly |
| Explicit requested frequency | quarterly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `quarterly` | `quarterly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=quarterly:quarterly@0.
- Timing: intent 2680.541 ms, deterministic retrieval/ranking 1746.425 ms, total 4427.001 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=quarterly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.Q` | Net generation : California : all sectors : all fuels : quarterly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.Q` | Net generation : California : independent power producers (total) : all fuels : quarterly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.Q` | Net generation : California : electric utility : all fuels : quarterly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.Q` | Net generation : California : electric utility non-cogen : all fuels : quarterly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.Q` | Net generation : California : electric utility cogen : all fuels : quarterly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California quarterly electricity generation` |
| Corrected query | `California quarterly electricity generation` |
| Confidence | 1 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | quarterly |
| Explicit requested frequency | quarterly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `quarterly` | `quarterly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=quarterly:quarterly@0.
- Timing: intent 2343.34 ms, deterministic retrieval/ranking 1598.47 ms, total 3941.829 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=quarterly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.Q` | Net generation : California : all sectors : all fuels : quarterly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.Q` | Net generation : California : independent power producers (total) : all fuels : quarterly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.Q` | Net generation : California : electric utility : all fuels : quarterly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.Q` | Net generation : California : electric utility non-cogen : all fuels : quarterly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.Q` | Net generation : California : electric utility cogen : all fuels : quarterly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `California quarterly electricity generation` |
| Corrected query | `California quarterly electricity generation` |
| Confidence | 0.94 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | quarterly |
| Explicit requested frequency | quarterly |
| Route | domestic |
| Ambiguity | none |
| Fallback | country_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `CA` | fallback | country_ai_ambiguous |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `quarterly` | `quarterly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=quarterly:quarterly@0.
- Timing: intent 5472.239 ms, deterministic retrieval/ranking 1843.443 ms, total 7315.702 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=quarterly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.Q` | Net generation : California : all sectors : all fuels : quarterly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.Q` | Net generation : California : independent power producers (total) : all fuels : quarterly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.Q` | Net generation : California : electric utility : all fuels : quarterly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.Q` | Net generation : California : electric utility non-cogen : all fuels : quarterly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.Q` | Net generation : California : electric utility cogen : all fuels : quarterly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | quarterly | thousand megawatthours | 2001Q1 to 2026Q2 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q23: Weekly non-storage request

**Raw input text:** `United States weekly natural gas production`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly natural gas production` |
| Corrected query | `United States weekly natural gas production` |
| Confidence | 0.99 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=weekly:weekly@0.
- Timing: intent 2221.494 ms, deterministic retrieval/ranking 24.671 ms, total 2246.193 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `no_displayable_candidate` No validated weekly natural gas production candidate was found for United States. No substitute was selected..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly natural gas production` |
| Corrected query | `United States weekly natural gas production` |
| Confidence | 1 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=weekly:weekly@0.
- Timing: intent 3138.512 ms, deterministic retrieval/ranking 20.695 ms, total 3159.222 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `no_displayable_candidate` No validated weekly natural gas production candidate was found for United States. No substitute was selected..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly natural gas production` |
| Corrected query | `United States weekly natural gas production` |
| Confidence | 0.93 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | production; none |
| Ordered concept pairs | natural gas / production |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `production` | `production` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> production:production@1; frequency=weekly:weekly@0.
- Timing: intent 3607.669 ms, deterministic retrieval/ranking 39.304 ms, total 3647.017 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:production

- Geography: United States (USA).
- Concept: product=natural gas; activity=production; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `no_displayable_candidate` No validated weekly natural gas production candidate was found for United States. No substitute was selected..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

### Q24: Misspelled geography

**Raw input text:** `Califronia monthly electricity generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Califronia monthly electricity generation` |
| Corrected query | `California monthly electricity generation` |
| Confidence | 0.99 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | not used |
| Clarification | Please clarify the country. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `none` | ambiguous | No country was explicitly stated. |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 2003.242 ms, deterministic retrieval/ranking 316.425 ms, total 2319.689 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Califronia monthly electricity generation` |
| Corrected query | `California monthly electricity generation` |
| Confidence | 1 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `none` | rejected | No approved geography was found. |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `electric power` | `none` | rejected | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 2766.283 ms, deterministic retrieval/ranking 193.271 ms, total 2959.584 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Califronia monthly electricity generation` |
| Corrected query | `California monthly electricity generation` |
| Confidence | 0.92 |
| Geography order | California (CA) |
| Product | electricity |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | electricity / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | monthly |
| Explicit requested frequency | monthly |
| Route | domestic |
| Ambiguity | ambiguous |
| Fallback | not used |
| Clarification | Please clarify the country. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `none` | ambiguous | Query references a U.S. state, not a country. |
| product | `electricity` | `electricity` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `monthly` | `monthly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=electricity:electricity@0 -> generation:generation@1; frequency=monthly:monthly@0.
- Timing: intent 5624.058 ms, deterministic retrieval/ranking 176.594 ms, total 5800.674 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: CA:electricity:generation

- Geography: California (CA).
- Concept: product=electricity; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=monthly; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | `domestic electricity generation other net generation all sectors all fuels` | domestic / primary / A | 91.7 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 15/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | `domestic electricity generation other net generation independent power producers total all fuels` | domestic / primary / A | 88.3 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | `domestic electricity generation other net generation electric utility all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility non cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | `domestic electricity generation other net generation electric utility cogen all fuels` | domestic / primary / A | 80.5 | monthly | thousand megawatthours | 200101 to 202604 | productOrScope 22/22; activity 18/18; measureOrAggregation 5.3/15; fieldedLexical 12.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q25: Multiple products with one activity

**Raw input text:** `Brazil annual petroleum and natural gas consumption`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum and natural gas consumption` |
| Corrected query | `Brazil annual petroleum and natural gas consumption` |
| Confidence | 0.9 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption -> natural gas / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | product_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `none` | `natural gas` | fallback | product_ai_ambiguous |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1 -> natural gas:natural gas@2 -> consumption:consumption@3; frequency=annual:annual@0.
- Timing: intent 2356.114 ms, deterministic retrieval/ranking 1719.523 ms, total 4075.653 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 70.9 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 1.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 70.9 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 1.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: BRA:natural gas:consumption

- Geography: Brazil (BRA).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.26-2-BRA-BCF.A` | Dry natural gas consumption, Brazil, Annual | `international natural gas consumption other dry natural gas consumption` | international / primary / A | 80.7 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.4010-8-BRA-MMTCD.A` | Consumed natural gas CO2 emissions, Brazil, Annual | `international natural gas consumption other consumed natural gas co2 emissions` | international / primary / A | 76.4 | annual | million metric tonnes carbon dioxide | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 6.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `INTL.4413-2-BRA-QBTU.A` | Total energy consumption from natural gas, Brazil, Annual | `international natural gas total energy consumption other total energy consumption from natural gas` | international / primary / C | 82.4 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum and natural gas consumption` |
| Corrected query | `Brazil annual petroleum and natural gas consumption` |
| Confidence | 1 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption -> natural gas / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | product_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `null` | `natural gas` | fallback | product_ai_ambiguous |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1 -> natural gas:natural gas@2 -> consumption:consumption@3; frequency=annual:annual@0.
- Timing: intent 7439.082 ms, deterministic retrieval/ranking 1555.846 ms, total 8994.94 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 70.9 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 1.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 70.9 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 1.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: BRA:natural gas:consumption

- Geography: Brazil (BRA).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.26-2-BRA-BCF.A` | Dry natural gas consumption, Brazil, Annual | `international natural gas consumption other dry natural gas consumption` | international / primary / A | 80.7 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.4010-8-BRA-MMTCD.A` | Consumed natural gas CO2 emissions, Brazil, Annual | `international natural gas consumption other consumed natural gas co2 emissions` | international / primary / A | 76.4 | annual | million metric tonnes carbon dioxide | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 6.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `INTL.4413-2-BRA-QBTU.A` | Total energy consumption from natural gas, Brazil, Annual | `international natural gas total energy consumption other total energy consumption from natural gas` | international / primary / C | 82.4 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual petroleum and natural gas consumption` |
| Corrected query | `Brazil annual petroleum and natural gas consumption` |
| Confidence | 0.86 |
| Geography order | Brazil (BRA) |
| Product | petroleum |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | petroleum / consumption -> natural gas / consumption |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `petroleum` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=petroleum:petroleum@0 -> consumption:consumption@1 -> natural gas:natural gas@2 -> consumption:consumption@3; frequency=annual:annual@0.
- Timing: intent 6936.561 ms, deterministic retrieval/ranking 1673.002 ms, total 8609.579 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:petroleum:consumption

- Geography: Brazil (BRA).
- Concept: product=petroleum; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | `international petroleum consumption other petroleum and other liquids consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | `international petroleum consumption other liquefied petroleum gases lpg consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | `international petroleum consumption other refined petroleum products consumption` | international / primary / A | 74.3 | annual | 1000 metric tons | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 4.6/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker distillate fuel oil consumption` | international / primary / A | 70.9 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 1.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | `international petroleum consumption other bunker residual fuel oil consumption` | international / primary / A | 70.9 | annual | thousand barrels per day | 1986 to 2014 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 1.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

##### Retrieval 2: BRA:natural gas:consumption

- Geography: Brazil (BRA).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.26-2-BRA-BCF.A` | Dry natural gas consumption, Brazil, Annual | `international natural gas consumption other dry natural gas consumption` | international / primary / A | 80.7 | annual | billion cubic feet | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.4010-8-BRA-MMTCD.A` | Consumed natural gas CO2 emissions, Brazil, Annual | `international natural gas consumption other consumed natural gas co2 emissions` | international / primary / A | 76.4 | annual | million metric tonnes carbon dioxide | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 6.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | 3 | `INTL.4413-2-BRA-QBTU.A` | Total energy consumption from natural gas, Brazil, Annual | `international natural gas total energy consumption other total energy consumption from natural gas` | international / primary / C | 82.4 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 19.8/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 10.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |

### Q26: One product with multiple sectors

**Raw input text:** `Texas annual natural gas consumption for residential and commercial sectors`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas consumption for residential and commercial sectors` |
| Corrected query | `Texas annual natural gas consumption for residential and commercial sectors` |
| Confidence | 0.97 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | natural gas / consumption / residential |
| Sector | residential |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, sector_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `residential` | `residential` | fallback | sector_ai_ambiguous |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2865.18 ms, deterministic retrieval/ranking 986.711 ms, total 3851.91 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:consumption:residential

- Geography: Texas (TX).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGRCB.TX.A` | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas delivered to the residential sector used as consumption including supplemental gaseous fuels` | seds / primary / A | 81.4 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 9.8/20; sector 5/5; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_consumption, lexical_title_residential, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas consumption for residential and commercial sectors` |
| Corrected query | `Texas annual natural gas consumption for residential and commercial sectors` |
| Confidence | 1 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | natural gas / consumption / residential |
| Sector | residential |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, sector_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `residential` | `residential` | fallback | sector_ai_ambiguous |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2293.734 ms, deterministic retrieval/ranking 963.39 ms, total 3257.139 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:consumption:residential

- Geography: Texas (TX).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGRCB.TX.A` | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas delivered to the residential sector used as consumption including supplemental gaseous fuels` | seds / primary / A | 81.4 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 9.8/20; sector 5/5; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_consumption, lexical_title_residential, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas consumption for residential and commercial sectors` |
| Corrected query | `Texas annual natural gas consumption for residential and commercial sectors` |
| Confidence | 0.9 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | natural gas / consumption / residential |
| Sector | residential |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | none |
| Fallback | country_ai_ambiguous, sector_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `residential` | fallback | sector_ai_ambiguous |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 10966.917 ms, deterministic retrieval/ranking 909.465 ms, total 11876.395 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas:consumption:residential

- Geography: Texas (TX).
- Concept: product=natural gas; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGRCB.TX.A` | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas delivered to the residential sector used as consumption including supplemental gaseous fuels` | seds / primary / A | 81.4 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 9.8/20; sector 5/5; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_consumption, lexical_title_residential, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q27: Broad product with explicit product exclusion

**Raw input text:** `Brazil annual energy consumption excluding petroleum`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual energy consumption excluding petroleum` |
| Corrected query | `Brazil annual energy consumption excluding petroleum` |
| Confidence | 0.98 |
| Geography order | Brazil (BRA) |
| Product | total energy |
| Product breadth / alternatives | broad; natural gas, petroleum, electricity, coal, nuclear, renewable |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | total energy / consumption |
| Sector | missing |
| Exclusions | product:petroleum |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | ambiguous |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `total energy` | `none` | ambiguous | The query says 'energy' broadly; mapped to total energy as the safest available product value. |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=total energy:total energy@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2286.15 ms, deterministic retrieval/ranking 1292.435 ms, total 3578.62 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:total energy:consumption

- Geography: Brazil (BRA).
- Concept: product=total energy; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.44-2-BRA-QBTU.A` | Total energy consumption, Brazil, Annual | `international total energy consumption other total energy consumption` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.4411-2-BRA-QBTU.A` | Total energy consumption from coal, Brazil, Annual | `international coal total energy consumption other total energy consumption from coal` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.4413-2-BRA-QBTU.A` | Total energy consumption from natural gas, Brazil, Annual | `international natural gas total energy consumption other total energy consumption from natural gas` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.4417-2-BRA-QBTU.A` | Total energy consumption from nuclear, Brazil, Annual | `international nuclear total energy consumption other total energy consumption from nuclear` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4418-2-BRA-QBTU.A` | Total energy consumption from renewables and other, Brazil, Annual | `international renewable total energy consumption other total energy consumption from renewables and other` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual energy consumption excluding petroleum` |
| Corrected query | `Brazil annual energy consumption excluding petroleum` |
| Confidence | 1 |
| Geography order | Brazil (BRA) |
| Product | total energy |
| Product breadth / alternatives | broad; natural gas, petroleum, electricity, coal, nuclear, renewable |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | total energy / consumption |
| Sector | missing |
| Exclusions | product:petroleum |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | product_ai_rejected |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `petroleum` | `total energy` | fallback | product_ai_rejected |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=total energy:total energy@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 2270.789 ms, deterministic retrieval/ranking 1553.551 ms, total 3824.371 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:total energy:consumption

- Geography: Brazil (BRA).
- Concept: product=total energy; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.44-2-BRA-QBTU.A` | Total energy consumption, Brazil, Annual | `international total energy consumption other total energy consumption` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.4411-2-BRA-QBTU.A` | Total energy consumption from coal, Brazil, Annual | `international coal total energy consumption other total energy consumption from coal` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.4413-2-BRA-QBTU.A` | Total energy consumption from natural gas, Brazil, Annual | `international natural gas total energy consumption other total energy consumption from natural gas` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.4417-2-BRA-QBTU.A` | Total energy consumption from nuclear, Brazil, Annual | `international nuclear total energy consumption other total energy consumption from nuclear` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4418-2-BRA-QBTU.A` | Total energy consumption from renewables and other, Brazil, Annual | `international renewable total energy consumption other total energy consumption from renewables and other` | international / primary / A | 79.5 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 5.4/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Brazil annual energy consumption excluding petroleum` |
| Corrected query | `Brazil annual total energy consumption excluding petroleum` |
| Confidence | 0.86 |
| Geography order | Brazil (BRA) |
| Product | total energy |
| Product breadth / alternatives | broad; natural gas, petroleum, electricity, coal, nuclear, renewable |
| Activity / weak inference | consumption; none |
| Ordered concept pairs | total energy / consumption |
| Sector | missing |
| Exclusions | product:petroleum |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | international |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Brazil` | `BRA` | approved | none |
| product | `total energy` | `total energy` | approved | none |
| activity | `consumption` | `consumption` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=total energy:total energy@0 -> consumption:consumption@1; frequency=annual:annual@0.
- Timing: intent 5232.493 ms, deterministic retrieval/ranking 1443.328 ms, total 6675.855 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: BRA:total energy:consumption

- Geography: Brazil (BRA).
- Concept: product=total energy; activity=consumption; activity source=explicit_or_validated.
- Frequency rule: requested=annual; mode=exact.
- User warnings: none.
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `INTL.44-2-BRA-QBTU.A` | Total energy consumption, Brazil, Annual | `international total energy consumption other total energy consumption` | international / primary / A | 82.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | 2 | `INTL.4411-2-BRA-QBTU.A` | Total energy consumption from coal, Brazil, Annual | `international coal total energy consumption other total energy consumption from coal` | international / primary / A | 82.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | 3 | `INTL.4413-2-BRA-QBTU.A` | Total energy consumption from natural gas, Brazil, Annual | `international natural gas total energy consumption other total energy consumption from natural gas` | international / primary / A | 82.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | 4 | `INTL.4417-2-BRA-QBTU.A` | Total energy consumption from nuclear, Brazil, Annual | `international nuclear total energy consumption other total energy consumption from nuclear` | international / primary / A | 82.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | 5 | `INTL.4418-2-BRA-QBTU.A` | Total energy consumption from renewables and other, Brazil, Annual | `international renewable total energy consumption other total energy consumption from renewables and other` | international / primary / A | 82.2 | annual | quadrillion Btu | 1980 to 2024 | productOrScope 22/22; activity 18/18; measureOrAggregation 12/15; fieldedLexical 7.7/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_total_energy, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q28: Unavailable geography-frequency combination

**Raw input text:** `France weekly solar electricity generation`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `France weekly solar electricity generation` |
| Corrected query | `France weekly solar electricity generation` |
| Confidence | 0.96 |
| Geography order | France (FRA) |
| Product | solar |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | solar / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | international |
| Ambiguity | none |
| Fallback | frequency_weekly_unsupported_by_international |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `France` | `FRA` | approved | none |
| product | `solar` | `solar` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=solar:solar@0 -> generation:generation@1; frequency=weekly:weekly@0.
- Timing: intent 2135.397 ms, deterministic retrieval/ranking 23.472 ms, total 2158.887 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: FRA:solar:generation

- Geography: France (FRA).
- Concept: product=solar; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `no_displayable_candidate` No validated weekly solar generation candidate was found for France. No substitute was selected..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `France weekly solar electricity generation` |
| Corrected query | `France weekly solar electricity generation` |
| Confidence | 1 |
| Geography order | France (FRA) |
| Product | solar |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | solar / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | international |
| Ambiguity | none |
| Fallback | frequency_weekly_unsupported_by_international |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `France` | `FRA` | approved | none |
| product | `solar` | `solar` | approved | none |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=solar:solar@0 -> generation:generation@1; frequency=weekly:weekly@0.
- Timing: intent 2072.945 ms, deterministic retrieval/ranking 28.942 ms, total 2101.904 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: FRA:solar:generation

- Geography: France (FRA).
- Concept: product=solar; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `no_displayable_candidate` No validated weekly solar generation candidate was found for France. No substitute was selected..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `France weekly solar electricity generation` |
| Corrected query | `France weekly solar electricity generation` |
| Confidence | 0.78 |
| Geography order | France (FRA) |
| Product | solar |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | generation; none |
| Ordered concept pairs | solar / generation |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | international |
| Ambiguity | none |
| Fallback | product_ai_ambiguous, frequency_weekly_unsupported_by_international |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `France` | `FRA` | approved | none |
| product | `solar` | `electricity` | fallback | product_ai_ambiguous |
| activity | `generation` | `generation` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=solar:solar@0 -> generation:generation@1; frequency=weekly:weekly@0.
- Timing: intent 11465.399 ms, deterministic retrieval/ranking 17.833 ms, total 11483.249 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: FRA:solar:generation

- Geography: France (FRA).
- Concept: product=solar; activity=generation; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `no_displayable_candidate` No validated weekly solar generation candidate was found for France. No substitute was selected..
- Ranking mode: deterministic only; semantic reranking was not invoked.

_No displayable candidate. No substitute was silently selected._

### Q29: Explicit stock wording

**Raw input text:** `United States weekly working natural gas stocks`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly working natural gas stocks` |
| Corrected query | `United States weekly working natural gas stocks` |
| Confidence | 0.91 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 2020.11 ms, deterministic retrieval/ranking 1380.029 ms, total 3400.158 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 85.3 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 14.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly working natural gas stocks` |
| Corrected query | `United States weekly working natural gas stocks` |
| Confidence | 1 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | activity_ai_ambiguous |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `reserves` | `storage` | fallback | activity_ai_ambiguous |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 2270.259 ms, deterministic retrieval/ranking 1408.183 ms, total 3678.459 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 85.3 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 14.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `United States weekly working natural gas stocks` |
| Corrected query | `United States weekly working natural gas stocks` |
| Confidence | 0.9 |
| Geography order | United States (USA) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | storage; none |
| Ordered concept pairs | natural gas / storage |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | weekly |
| Explicit requested frequency | weekly |
| Route | domestic |
| Ambiguity | none |
| Fallback | not used |
| Clarification | not required |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `United States` | `USA` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `storage` | `storage` | approved | none |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `weekly` | `weekly` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0 -> storage:storage@1; frequency=weekly:weekly@0.
- Timing: intent 10884.718 ms, deterministic retrieval/ranking 1248.633 ms, total 12133.372 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: USA:natural gas:storage

- Geography: United States (USA).
- Concept: product=natural gas; activity=storage; activity source=explicit_or_validated.
- Frequency rule: requested=weekly; mode=exact.
- User warnings: `coverage_geography_scope_note` Coverage geography: Lower 48 States..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | `domestic natural gas storage stock weekly lower 48 natural gas working underground storage weekly` | domestic / primary / A | 85.3 | weekly | Billion Cubic Feet | 20100101 to 20260710 | productOrScope 22/22; activity 18/18; measureOrAggregation 8.3/15; fieldedLexical 14.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q30: Explicit technical measure

**Raw input text:** `Texas annual natural gas conversion factor`

#### gpt-5.4-mini

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas conversion factor` |
| Corrected query | `Texas annual natural gas conversion factor` |
| Confidence | 0.61 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | missing; none |
| Ordered concept pairs | natural gas |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Texas` | `TX` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `none` | `none` | ambiguous | Not a supported activity value; likely refers to a measurement attribute rather than production, consumption, or another allowed activity. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0; frequency=annual:annual@0.
- Timing: intent 2469.485 ms, deterministic retrieval/ranking 1320.813 ms, total 3790.328 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas

- Geography: Texas (TX).
- Concept: product=natural gas; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=exact.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | `seds natural gas consumption other factor for converting natural gas total consumption from physical units to` | seds / fallback / C | 80.7 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption including supplemental gaseous fuels` | seds / fallback / C | 75.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption excluding supplemental gaseous fuels` | seds / fallback / C | 75.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 4 | 4 | `SEDS.NGTXK.TX.A` | Factor for converting natural gas used by end-use sectors from physical units to Btu, Texas | `seds natural gas other factor for converting natural gas used by end use sectors from physical units to` | seds / fallback / C | 75.3 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 8.3/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 5 | 5 | `SEDS.NGMPK.TX.A` | Factor for converting marketed natural gas production from physical units to Btu, Texas | `seds natural gas production other factor for converting marketed natural gas production from physical units to` | seds / fallback / C | 75.3 | annual | Thousand Btu per cubic feet | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 8.3/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |

#### gpt-4.1-nano

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas conversion factor` |
| Corrected query | `Texas annual natural gas conversion factor` |
| Confidence | 1 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | missing; none |
| Ordered concept pairs | natural gas |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `Texas` | `TX` | approved | none |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `conversion factor` | `none` | ambiguous | Conversion factor is a metric, not a standard activity like consumption or production |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0; frequency=annual:annual@0.
- Timing: intent 2052.426 ms, deterministic retrieval/ranking 1935.104 ms, total 3987.561 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas

- Geography: Texas (TX).
- Concept: product=natural gas; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=exact.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | `seds natural gas consumption other factor for converting natural gas total consumption from physical units to` | seds / fallback / C | 80.7 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption including supplemental gaseous fuels` | seds / fallback / C | 75.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption excluding supplemental gaseous fuels` | seds / fallback / C | 75.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 4 | 4 | `SEDS.NGTXK.TX.A` | Factor for converting natural gas used by end-use sectors from physical units to Btu, Texas | `seds natural gas other factor for converting natural gas used by end use sectors from physical units to` | seds / fallback / C | 75.3 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 8.3/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 5 | 5 | `SEDS.NGMPK.TX.A` | Factor for converting marketed natural gas production from physical units to Btu, Texas | `seds natural gas production other factor for converting marketed natural gas production from physical units to` | seds / fallback / C | 75.3 | annual | Thousand Btu per cubic feet | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 8.3/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |

#### o3

| Interpretation field | Value |
| --- | --- |
| Interpreter | openai |
| Cleaned query | `Texas annual natural gas conversion factor` |
| Corrected query | `Texas annual natural gas conversion factor` |
| Confidence | 0.7 |
| Geography order | Texas (TX) |
| Product | natural gas |
| Product breadth / alternatives | specific; none |
| Activity / weak inference | missing; none |
| Ordered concept pairs | natural gas |
| Sector | missing |
| Exclusions | none |
| Unknown qualifiers | none |
| Frequency | annual |
| Explicit requested frequency | annual |
| Route | seds |
| Ambiguity | ambiguous |
| Fallback | country_ai_ambiguous, route_defaulted_for_state |
| Clarification | Please clarify the activity. Example: United States total energy consumption. |

| Field provenance | AI value | Validated value | Status | Repair reason |
| --- | --- | --- | --- | --- |
| country | `none` | `TX` | fallback | country_ai_ambiguous |
| product | `natural gas` | `natural gas` | approved | none |
| activity | `none` | `none` | ambiguous | "conversion factor" is not a supported activity category. |
| sector | `none` | `none` | missing | No approved sector was found. |
| frequency | `annual` | `annual` | approved | none |

- Mention order: geography=undefined:undefined@0; concepts=natural gas:natural gas@0; frequency=annual:annual@0.
- Timing: intent 6302.83 ms, deterministic retrieval/ranking 983.422 ms, total 7286.268 ms.
- Pipeline versions: candidate `phase4a-v3`, ranking `phase4-v6`, taxonomy `phase4-concepts-v2`.

##### Retrieval 1: TX:natural gas

- Geography: Texas (TX).
- Concept: product=natural gas; activity=missing; activity source=missing.
- Frequency rule: requested=annual; mode=exact.
- User warnings: `activity_missing_aggregate_priority` No activity was requested. Results are grouped by activity and measure type; within each group, official total-labeled series rank before sector-specific or component series..
- Ranking mode: deterministic only; semantic reranking was not invoked.

| Model rank | Deterministic rank | Series / candidate | Title | Family | Route / pool / tier | Score | Frequency | Unit | Coverage | Ranking points | Reasons | Warnings |
| ---: | ---: | --- | --- | --- | --- | ---: | --- | --- | --- | --- | --- | --- |
| 1 | 1 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | `seds natural gas consumption other factor for converting natural gas total consumption from physical units to` | seds / fallback / C | 80.7 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 12/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | 2 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption including supplemental gaseous fuels` | seds / fallback / C | 75.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | 3 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | `seds natural gas consumption other natural gas total consumption excluding supplemental gaseous fuels` | seds / fallback / C | 75.6 | annual | Billion Btu | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 14.3/15; fieldedLexical 4.1/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_natural, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 4 | 4 | `SEDS.NGTXK.TX.A` | Factor for converting natural gas used by end-use sectors from physical units to Btu, Texas | `seds natural gas other factor for converting natural gas used by end use sectors from physical units to` | seds / fallback / C | 75.3 | annual | Thousand Btu per cubic foot | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 8.3/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 5 | 5 | `SEDS.NGMPK.TX.A` | Factor for converting marketed natural gas production from physical units to Btu, Texas | `seds natural gas production other factor for converting marketed natural gas production from physical units to` | seds / fallback / C | 75.3 | annual | Thousand Btu per cubic feet | 1960 to 2024 | productOrScope 22/22; measureOrAggregation 8.3/15; fieldedLexical 9.9/20; frequency 5/5; currentness 3/3; availability 3/3 | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_factor, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |

## Interpretation notes

- Each model is evaluated as an intent interpreter only. All displayed scores and ordering come from the same deterministic ranker.
- A model that fails the access preflight has no attributed rankings. Deterministic fallback output is not presented as that model's work.
- `semanticRerankingApplied` remains false and semantic invocation count remains zero for every run.
- Empty or fallback results are retained rather than silently replacing the requested frequency, route, geography, or concept.
- Scores are deterministic Phase 4 scores. AI creates no points and supplies no candidate ordering.
- Semantic-intent comparison excludes confidence, fallback provenance, corrected wording, and model-reported ambiguity when all validated routing and retrieval fields are identical.

