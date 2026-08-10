# Raw-only versus raw-plus-cleaned EIA interpretation A/B test

Status: **complete** (40/40 OpenAI calls recorded).

Model: `gpt-4.1-nano`.
Started: 2026-07-17T05:48:37.321Z.
Completed: 2026-07-17T05:50:47.419Z.
Semantic reranking: disabled; all candidate retrieval and ranking after intent validation is deterministic.

## Method

- Condition A sends the exact raw note and the mechanically cleaned copy.
- Condition B sends only the exact raw note.
- Mechanical cleanup changes curly quotes, non-breaking spaces, repeated whitespace, tabs/newlines, and edge whitespace only.
- Both conditions use the same model, local metadata index, validation, routing, retrieval, and ranking configuration.
- There are 20 queries and two conditions, producing exactly 40 interpretation calls with no separate model probe.

## Summary

| Metric | Result |
| --- | ---: |
| Completed pairs | 20/20 |
| Same validated intent | 20/20 |
| Same top-five order | 20/20 |
| Same warnings | 20/20 |
| Errors | 0 |

## Pair comparison

| ID | Same intent | Same top five | Same warnings | Raw + cleaned top result | Raw-only top result |
| --- | --- | --- | --- | --- | --- |
| Q01 | yes | yes | yes | ELEC.GEN.ALL-CA-99.M: Net generation : California : all sectors : all fuels : monthly | ELEC.GEN.ALL-CA-99.M: Net generation : California : all sectors : all fuels : monthly |
| Q02 | yes | yes | yes | SEDS.TETCB.TX.A: Total energy consumption, Texas | SEDS.TETCB.TX.A: Total energy consumption, Texas |
| Q03 | yes | yes | yes | NG.N9050TX2.M: Texas Natural Gas Marketed Production, Monthly | NG.N9050TX2.M: Texas Natural Gas Marketed Production, Monthly |
| Q04 | yes | yes | yes | NG.N9050NM2.M: New Mexico Natural Gas Marketed Production, Monthly | NG.N9050NM2.M: New Mexico Natural Gas Marketed Production, Monthly |
| Q05 | yes | yes | yes | NG.N3010NY2.M: New York Natural Gas Residential Consumption, Monthly | NG.N3010NY2.M: New York Natural Gas Residential Consumption, Monthly |
| Q06 | yes | yes | yes | ELEC.GEN.WND-IA-99.M: Net generation : Iowa : all sectors : wind : monthly | ELEC.GEN.WND-IA-99.M: Net generation : Iowa : all sectors : wind : monthly |
| Q07 | yes | yes | yes | SEDS.REPRB.CA.A: Renewable energy production, California | SEDS.REPRB.CA.A: Renewable energy production, California |
| Q08 | yes | yes | yes | SEDS.NGTCB.TX.A: Natural gas total consumption (including supplemental gaseous fuels), Texas | SEDS.NGTCB.TX.A: Natural gas total consumption (including supplemental gaseous fuels), Texas |
| Q09 | yes | yes | yes | NG.NW2_EPG0_SWO_R48_BCF.W: Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | NG.NW2_EPG0_SWO_R48_BCF.W: Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly |
| Q10 | yes | yes | yes | INTL.5-2-BRA-MT.A: Petroleum and other liquids consumption, Brazil, Annual | INTL.5-2-BRA-MT.A: Petroleum and other liquids consumption, Brazil, Annual |
| Q11 | yes | yes | yes | INTL.116-12-JPN-BKWH.A: Solar electricity net generation, Japan, Annual | INTL.116-12-JPN-BKWH.A: Solar electricity net generation, Japan, Annual |
| Q12 | yes | yes | yes | INTL.4418-1-DEU-QBTU.A: Total energy production from renewables and other, Germany, Annual | INTL.4418-1-DEU-QBTU.A: Total energy production from renewables and other, Germany, Annual |
| Q13 | yes | yes | yes | INTL.2-12-BRA-BKWH.A: Electricity net generation, Brazil, Annual | INTL.2-12-BRA-BKWH.A: Electricity net generation, Brazil, Annual |
| Q14 | yes | yes | yes | none | none |
| Q15 | yes | yes | yes | SEDS.PAPRB.AK.A: Crude oil production (including lease condensate), Alaska | SEDS.PAPRB.AK.A: Crude oil production (including lease condensate), Alaska |
| Q16 | yes | yes | yes | ELEC.PRICE.FL-RES.A: Average retail price of electricity : Florida : residential : annual | ELEC.PRICE.FL-RES.A: Average retail price of electricity : Florida : residential : annual |
| Q17 | yes | yes | yes | ELEC.CONS_TOT_BTU.COW-OH-1.M: Total consumption (Btu) : Ohio : electric utility : coal : monthly | ELEC.CONS_TOT_BTU.COW-OH-1.M: Total consumption (Btu) : Ohio : electric utility : coal : monthly |
| Q18 | yes | yes | yes | INTL.27-12-FRA-BKWH.A: Nuclear electricity net generation, France, Annual | INTL.27-12-FRA-BKWH.A: Nuclear electricity net generation, France, Annual |
| Q19 | yes | yes | yes | ELEC.GEN.DPV-CO-99.M: Net generation : Colorado : all sectors : small-scale solar photovoltaic : monthly | ELEC.GEN.DPV-CO-99.M: Net generation : Colorado : all sectors : small-scale solar photovoltaic : monthly |
| Q20 | yes | yes | yes | INTL.26-3-CAN-BCF.A: Dry natural gas imports, Canada, Annual | INTL.26-3-CAN-BCF.A: Dry natural gas imports, Canada, Annual |

## Complete results

### Q01

Raw input:

```text
  “California[NBSP]monthly   electricity[NEWLINE]
 generation”  
```

Mechanically cleaned: `"California monthly electricity generation"`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `California monthly electricity generation` |
| Geography | California (CA) |
| Product / breadth | electricity / specific |
| Activity / sector | generation / none |
| Concept pairs | electricity:generation |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2749 ms AI; 1721 ms local |

Retrieval: `CA:electricity:generation`; warnings: eia:1:186e5032c692213edbcf03f0c6af3f38a059563520e134cd1bff90e81da15e0c:primary:product_or_scope_hard_gate_failed; eia:1:655b9f8e81614267cb8d188c07c9ccf40183bd0feb58f636a7a7e831a6bc87e3:primary:product_or_scope_hard_gate_failed; eia:1:ef27d2a541052f7e23a0d2a23c15b82d04f8bad47d645b20126c62b1d896175a:primary:product_or_scope_hard_gate_failed; eia:1:49981a4c56cc21d0c7ff8a68d91b80e6ee8b34c126c09b23c7ac035a836e0ab8:primary:product_or_scope_hard_gate_failed; eia:1:0c0fd1fe1dbc042fa731a4b90283d1871f3082b0107f4edadf2aa587518f0cc2:primary:product_or_scope_hard_gate_failed; eia:1:5ac522eb4ac8bc4deeb59b2e2309a085d658a714938626bdd31dfb2fffda9c22:primary:product_or_scope_hard_gate_failed; eia:1:e341dca3a3c1fff937454314585e8230a8756c335c192c77aba299a460f377c9:primary:product_or_scope_hard_gate_failed; eia:1:0ad09932c8f3d02fefdb05fce1aade77011e4e4fbdea56ddf7eaed50c6e3992a:primary:product_or_scope_hard_gate_failed; eia:1:72b8071f85fd251141827fc104e82161090ef734d5dc0b9962c45b2ef5978533:primary:product_or_scope_hard_gate_failed; eia:1:8aac5a7b257d3891a7f690bb6a8b98942a806143cd3ece2946784bfee80c521a:primary:product_or_scope_hard_gate_failed; eia:1:b0cdbec5a86a0de132baede21538ecfa62a5aa801647500d0063a14e3828dd47:primary:product_or_scope_hard_gate_failed; eia:1:90100248ed96274b44b2da4c1f59c6818f8758b0b8ddea2cf74fd60481477a5b:primary:product_or_scope_hard_gate_failed; eia:1:1daa814710e7cba97c2bb6904900850d0b52b80d4ed6094b0bad06d5e5844b14:primary:product_or_scope_hard_gate_failed; eia:1:68338b0a8ee7a7a35f018112172bdea0d86fa61fec04f73934a06585b0783e27:primary:product_or_scope_hard_gate_failed; eia:1:bb16424cc36f6a3109f9d04a41206d794fb8b6a3d3d07ee03e258765e1a383a7:primary:product_or_scope_hard_gate_failed; eia:1:644492487c4166fb6eb742183bc0da791c2081c3ba65bce155a7401083dbb9cd:primary:product_or_scope_hard_gate_failed; eia:1:0d7de76d56a09547eed7fd0371d022fa0eee12ed8b6f0fd9a9bc3dd72693366d:primary:product_or_scope_hard_gate_failed; sector_specific_not_requested; product_contains_unrequested_concepts; activity_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | domestic/primary/A | 91.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | domestic/primary/A | 88.3 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | domestic/primary/A | 80.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | domestic/primary/A | 80.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | domestic/primary/A | 80.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `California monthly electricity generation` |
| Geography | California (CA) |
| Product / breadth | electricity / specific |
| Activity / sector | generation / none |
| Concept pairs | electricity:generation |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2933 ms AI; 120 ms local |

Retrieval: `CA:electricity:generation`; warnings: eia:1:186e5032c692213edbcf03f0c6af3f38a059563520e134cd1bff90e81da15e0c:primary:product_or_scope_hard_gate_failed; eia:1:655b9f8e81614267cb8d188c07c9ccf40183bd0feb58f636a7a7e831a6bc87e3:primary:product_or_scope_hard_gate_failed; eia:1:ef27d2a541052f7e23a0d2a23c15b82d04f8bad47d645b20126c62b1d896175a:primary:product_or_scope_hard_gate_failed; eia:1:49981a4c56cc21d0c7ff8a68d91b80e6ee8b34c126c09b23c7ac035a836e0ab8:primary:product_or_scope_hard_gate_failed; eia:1:0c0fd1fe1dbc042fa731a4b90283d1871f3082b0107f4edadf2aa587518f0cc2:primary:product_or_scope_hard_gate_failed; eia:1:5ac522eb4ac8bc4deeb59b2e2309a085d658a714938626bdd31dfb2fffda9c22:primary:product_or_scope_hard_gate_failed; eia:1:e341dca3a3c1fff937454314585e8230a8756c335c192c77aba299a460f377c9:primary:product_or_scope_hard_gate_failed; eia:1:0ad09932c8f3d02fefdb05fce1aade77011e4e4fbdea56ddf7eaed50c6e3992a:primary:product_or_scope_hard_gate_failed; eia:1:72b8071f85fd251141827fc104e82161090ef734d5dc0b9962c45b2ef5978533:primary:product_or_scope_hard_gate_failed; eia:1:8aac5a7b257d3891a7f690bb6a8b98942a806143cd3ece2946784bfee80c521a:primary:product_or_scope_hard_gate_failed; eia:1:b0cdbec5a86a0de132baede21538ecfa62a5aa801647500d0063a14e3828dd47:primary:product_or_scope_hard_gate_failed; eia:1:90100248ed96274b44b2da4c1f59c6818f8758b0b8ddea2cf74fd60481477a5b:primary:product_or_scope_hard_gate_failed; eia:1:1daa814710e7cba97c2bb6904900850d0b52b80d4ed6094b0bad06d5e5844b14:primary:product_or_scope_hard_gate_failed; eia:1:68338b0a8ee7a7a35f018112172bdea0d86fa61fec04f73934a06585b0783e27:primary:product_or_scope_hard_gate_failed; eia:1:bb16424cc36f6a3109f9d04a41206d794fb8b6a3d3d07ee03e258765e1a383a7:primary:product_or_scope_hard_gate_failed; eia:1:644492487c4166fb6eb742183bc0da791c2081c3ba65bce155a7401083dbb9cd:primary:product_or_scope_hard_gate_failed; eia:1:0d7de76d56a09547eed7fd0371d022fa0eee12ed8b6f0fd9a9bc3dd72693366d:primary:product_or_scope_hard_gate_failed; sector_specific_not_requested; product_contains_unrequested_concepts; activity_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.GEN.ALL-CA-99.M` | Net generation : California : all sectors : all fuels : monthly | domestic/primary/A | 91.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_all_sectors_total_priority, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `ELEC.GEN.ALL-CA-94.M` | Net generation : California : independent power producers (total) : all fuels : monthly | domestic/primary/A | 88.3 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, aggregate_metadata_match, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | `ELEC.GEN.ALL-CA-1.M` | Net generation : California : electric utility : all fuels : monthly | domestic/primary/A | 80.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | `ELEC.GEN.ALL-CA-2.M` | Net generation : California : electric utility non-cogen : all fuels : monthly | domestic/primary/A | 80.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | `ELEC.GEN.ALL-CA-3.M` | Net generation : California : electric utility cogen : all fuels : monthly | domestic/primary/A | 80.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, unrequested_sector_specific, lexical_description_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q02

Raw input:

```text
[TAB]‘Texas’[NBSP]monthly[TAB] total energy   consumption[NEWLINE]

```

Mechanically cleaned: `'Texas' monthly total energy consumption`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'Texas' monthly total energy consumption` |
| Geography | Texas (TX) |
| Product / breadth | total energy / broad |
| Activity / sector | consumption / none |
| Concept pairs | total energy:consumption |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 3633 ms AI; 1676 ms local |

Retrieval: `TX:total energy:consumption`; warnings: [object Object]; eia:1:87282bd5e177c6e090173024b44c8e5dc6bee74b2116bfdbe1be8bbe194cf7d9:fallback:seds_annual_state_fallback; eia:1:87282bd5e177c6e090173024b44c8e5dc6bee74b2116bfdbe1be8bbe194cf7d9:fallback:wrong_frequency_fallback; eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10:fallback:seds_annual_state_fallback; eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10:fallback:wrong_frequency_fallback; eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f:fallback:seds_annual_state_fallback; eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f:fallback:wrong_frequency_fallback; eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6:fallback:seds_annual_state_fallback; eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6:fallback:wrong_frequency_fallback; eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d:fallback:seds_annual_state_fallback; eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d:fallback:wrong_frequency_fallback; eia:1:dc84e32c6dd85c946767626aec2fc555d215e54ed53c4307c188dd2ce6c70429:fallback:seds_annual_state_fallback; eia:1:dc84e32c6dd85c946767626aec2fc555d215e54ed53c4307c188dd2ce6c70429:fallback:wrong_frequency_fallback; eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2:fallback:seds_annual_state_fallback; eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2:fallback:wrong_frequency_fallback; eia:1:273fa17a9397a4f494d34425bb3b2b7f291112c463a250b70f37e258e16d1e96:fallback:seds_annual_state_fallback; eia:1:273fa17a9397a4f494d34425bb3b2b7f291112c463a250b70f37e258e16d1e96:fallback:wrong_frequency_fallback; eia:1:f7413d17c8d67f9e3f102ff6320a551a3457f0dd68b72a14768df0241a33b4a8:fallback:seds_annual_state_fallback; eia:1:f7413d17c8d67f9e3f102ff6320a551a3457f0dd68b72a14768df0241a33b4a8:fallback:wrong_frequency_fallback; eia:1:f4c14edaec760b547a67e6f002875e114fdf0d3b8778e8ce11372b37476658d0:fallback:seds_annual_state_fallback; eia:1:f4c14edaec760b547a67e6f002875e114fdf0d3b8778e8ce11372b37476658d0:fallback:wrong_frequency_fallback; eia:1:ef4ae547cc8fcf0438a6984b5a02f8883d8d706f8cad3a1f3a2add41cd956001:fallback:seds_annual_state_fallback; eia:1:ef4ae547cc8fcf0438a6984b5a02f8883d8d706f8cad3a1f3a2add41cd956001:fallback:wrong_frequency_fallback; eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca:fallback:seds_annual_state_fallback; eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca:fallback:wrong_frequency_fallback; eia:1:deefae92b97279829f2ba446c4acc25b455e4d113e1761fd35b195b17e06d837:fallback:seds_annual_state_fallback; eia:1:deefae92b97279829f2ba446c4acc25b455e4d113e1761fd35b195b17e06d837:fallback:wrong_frequency_fallback; eia:1:6ed14ddbaacf62fb13d149ef4e8949094f4e9511ba978dbe89582a3252fecc99:fallback:seds_annual_state_fallback; eia:1:6ed14ddbaacf62fb13d149ef4e8949094f4e9511ba978dbe89582a3252fecc99:fallback:wrong_frequency_fallback; eia:1:a2678affd99b19afc26267ded302b781771a3f675a8ef1dc3584917bc5c19039:fallback:product_or_scope_hard_gate_failed; eia:1:929d2a5975b65f7337756fa7c059cbb2dcf65fa6e9a77248d2908d7ce8004ce8:fallback:product_or_scope_hard_gate_failed; eia:1:ded6547965d05a80ff9576882cc3ff23d531693d4ed8583b0a304ec57ba9879b:fallback:product_or_scope_hard_gate_failed; eia:1:807ec3bf352e94c448d60d6c2b6ae3eddfd27847cd474a5597b8146e9b5e832b:fallback:product_or_scope_hard_gate_failed; eia:1:aee192bf0e2e8ee2b7e0d4bbddf5f95a0185c8b32e0b0290350068fdbcc7a39b:fallback:product_or_scope_hard_gate_failed; eia:1:496db5361cc5081a6b4fcd01736f9b1acddb2a3a478f520c2d51d04f259eeca3:fallback:product_or_scope_hard_gate_failed; eia:1:a939ab63cd305a2e898779f4a3dd3af0b64050557b04f3a2505ff56ad6e46e92:fallback:product_or_scope_hard_gate_failed; eia:1:fff0943b804729897df207662aff7c83711d6075733d3ebc492d760b251fc4e5:fallback:seds_annual_state_fallback; eia:1:fff0943b804729897df207662aff7c83711d6075733d3ebc492d760b251fc4e5:fallback:wrong_frequency_fallback; eia:1:93943a4110ca2edbcf2f99525bcd359a2081e2046d277658df96f5fe0bc0766b:fallback:seds_annual_state_fallback; eia:1:93943a4110ca2edbcf2f99525bcd359a2081e2046d277658df96f5fe0bc0766b:fallback:wrong_frequency_fallback; eia:1:b858d7fbb57c829ae58a89b219e7b53b8c786a2afe64f9a403b8f19e9e8bd498:fallback:seds_annual_state_fallback; eia:1:b858d7fbb57c829ae58a89b219e7b53b8c786a2afe64f9a403b8f19e9e8bd498:fallback:wrong_frequency_fallback; eia:1:b123d1a2ee2828415843169360c4dbee9b8e1d68e31ff21ea78d264727ca2618:fallback:seds_annual_state_fallback; eia:1:b123d1a2ee2828415843169360c4dbee9b8e1d68e31ff21ea78d264727ca2618:fallback:wrong_frequency_fallback; eia:1:16d9f9be42a70d7e3ec62a70f33ac97a4181ffe708d13fd3b24ce84c2e6f46c2:fallback:seds_annual_state_fallback; eia:1:16d9f9be42a70d7e3ec62a70f33ac97a4181ffe708d13fd3b24ce84c2e6f46c2:fallback:wrong_frequency_fallback; eia:1:23f92a25ab9b18b327ad633644772e513130c84c2dafa3bfc1e66a7b52419013:fallback:activity_hard_gate_failed; eia:1:c5ed9a89f41318afc80220fc29023fb1f23ee3173b825ab84431a7e0e2de2eea:fallback:activity_hard_gate_failed; eia:1:64d2f78efa1fca3ececaa26d809ca7554ce1f9e701f0ccbd67dd82b32ea978de:fallback:product_or_scope_hard_gate_failed; eia:1:a2e104a15d95464d073d09631f77a230ec2ff138b2baeb28fa1319395a68fb27:fallback:product_or_scope_hard_gate_failed; eia:1:364913785b2f16702a4c280b4978ce309967fbe2ef05c14049da849e6d960092:fallback:product_or_scope_hard_gate_failed; eia:1:2127b2e839d60167e4e21a3cb8e2e7ddd5aa4a400899513a3c311c36e7df5193:fallback:product_or_scope_hard_gate_failed; eia:1:e384f10d6aa690bc39ed608a28f73282fd1cdd276efc052e5754f7354587d5f2:fallback:product_or_scope_hard_gate_failed; eia:1:9d3839b16f4b41d2d9ee4d67a4e8bd7aab169cbbf093b820c53a7e03ac7bdda7:fallback:seds_annual_state_fallback; eia:1:9d3839b16f4b41d2d9ee4d67a4e8bd7aab169cbbf093b820c53a7e03ac7bdda7:fallback:wrong_frequency_fallback; eia:1:e8263b2920e81f98a38fd73d971b0b9ccf28ee60d8cf5a09310bc27d530a1050:fallback:product_or_scope_hard_gate_failed; eia:1:4a72b5956f383ad5f16b0dcd110670309bfe3ebf2c75c7c58567dd25abc22a52:fallback:product_or_scope_hard_gate_failed; eia:1:baf87a12a8b03c5aaed4fd85b70e4bd770e7189f0011b24a3c49dd3b11ce8204:fallback:product_or_scope_hard_gate_failed; eia:1:4f6953d3751f0d88c75c6180605e35e2db1f4d94a115be97f0a2eb6186f44793:fallback:product_or_scope_hard_gate_failed; eia:1:710f4e0ed9a5e08f556da30cf376ab65684a6ea34cb93d5195a53c39f69bcfa4:fallback:product_or_scope_hard_gate_failed; eia:1:15f9ab9f81654319f57553afb94f69244f91a80d15dbdd54c10cca6fa17d5862:fallback:product_or_scope_hard_gate_failed; eia:1:01cce6fb01ba68abf32ff1bc429d470a412b31a7417bf8af79c69e29bd8c920d:fallback:product_or_scope_hard_gate_failed; eia:1:b65337326b8a090bfc1698a24895e5e56996e6c3ba4d25520a466ffc0a9428b5:fallback:product_or_scope_hard_gate_failed; eia:1:54f3cb22901b008c7484bf57414de1cdabd21963cbe834a15d14cf358ac1a307:fallback:product_or_scope_hard_gate_failed; eia:1:b132474b214897508a1c51df636db117b284be2cb818d3874face0459e6b862e:fallback:product_or_scope_hard_gate_failed; eia:1:27355945374ed716e54997563ed59783cca594d3798acc9de3e62cb89712ccd7:fallback:product_or_scope_hard_gate_failed; eia:1:1a6ac6b756ec9732af2d62f1190c4f3c31fd94b262c9557dbf456cd4f7bf7cc8:fallback:product_or_scope_hard_gate_failed; eia:1:00f8c9d0055d7db582728a3576eaec5aabfd4d2f06a75ee9c859876d3529fa07:fallback:product_or_scope_hard_gate_failed; eia:1:d13d0f13f05345c74f0fdf67c0409392e31379aa262f0d41914c273493bf5c30:fallback:product_or_scope_hard_gate_failed; eia:1:246b6f44b7a5a267924113bd0169c96f06c4135b9279a458e2d1a86664965dd7:fallback:product_or_scope_hard_gate_failed; eia:1:955b207f5222d32b64782eef3183bca616c6eaa01c1b3ff571a2c559947d5dbc:fallback:product_or_scope_hard_gate_failed; seds_annual_state_fallback; wrong_frequency_fallback; activity_contains_unrequested_concepts; product_contains_unrequested_concepts; sector_specific_not_requested; derived_metric_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.TETCB.TX.A` | Total energy consumption, Texas | seds/fallback/B | 93.4 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, official_total_label, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | `SEDS.TENEB.TX.A` | Total primary energy consumption less total primary energy production, Texas | seds/fallback/B | 88.6 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, activity_contains_unrequested_concepts |
| 3 | `SEDS.TEPFB.TX.A` | Total energy used as process fuel and other consumption that has no direct fuel costs, Texas | seds/fallback/B | 88.1 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 4 | `SEDS.PESCB.TX.A` | Primary energy total consumption, adjusted for process fuel, intermediate products, and fuels with no direct cost, Texas | seds/fallback/B | 88.1 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 5 | `SEDS.TEACB.TX.A` | Total energy consumption in the transportation sector, Texas | seds/fallback/B | 82.9 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, unrequested_sector_specific, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback, sector_specific_not_requested |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Texas monthly total energy consumption` |
| Geography | Texas (TX) |
| Product / breadth | total energy / broad |
| Activity / sector | consumption / none |
| Concept pairs | total energy:consumption |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2535 ms AI; 3131 ms local |

Retrieval: `TX:total energy:consumption`; warnings: [object Object]; eia:1:87282bd5e177c6e090173024b44c8e5dc6bee74b2116bfdbe1be8bbe194cf7d9:fallback:seds_annual_state_fallback; eia:1:87282bd5e177c6e090173024b44c8e5dc6bee74b2116bfdbe1be8bbe194cf7d9:fallback:wrong_frequency_fallback; eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10:fallback:seds_annual_state_fallback; eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10:fallback:wrong_frequency_fallback; eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f:fallback:seds_annual_state_fallback; eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f:fallback:wrong_frequency_fallback; eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6:fallback:seds_annual_state_fallback; eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6:fallback:wrong_frequency_fallback; eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d:fallback:seds_annual_state_fallback; eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d:fallback:wrong_frequency_fallback; eia:1:dc84e32c6dd85c946767626aec2fc555d215e54ed53c4307c188dd2ce6c70429:fallback:seds_annual_state_fallback; eia:1:dc84e32c6dd85c946767626aec2fc555d215e54ed53c4307c188dd2ce6c70429:fallback:wrong_frequency_fallback; eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2:fallback:seds_annual_state_fallback; eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2:fallback:wrong_frequency_fallback; eia:1:273fa17a9397a4f494d34425bb3b2b7f291112c463a250b70f37e258e16d1e96:fallback:seds_annual_state_fallback; eia:1:273fa17a9397a4f494d34425bb3b2b7f291112c463a250b70f37e258e16d1e96:fallback:wrong_frequency_fallback; eia:1:f7413d17c8d67f9e3f102ff6320a551a3457f0dd68b72a14768df0241a33b4a8:fallback:seds_annual_state_fallback; eia:1:f7413d17c8d67f9e3f102ff6320a551a3457f0dd68b72a14768df0241a33b4a8:fallback:wrong_frequency_fallback; eia:1:f4c14edaec760b547a67e6f002875e114fdf0d3b8778e8ce11372b37476658d0:fallback:seds_annual_state_fallback; eia:1:f4c14edaec760b547a67e6f002875e114fdf0d3b8778e8ce11372b37476658d0:fallback:wrong_frequency_fallback; eia:1:ef4ae547cc8fcf0438a6984b5a02f8883d8d706f8cad3a1f3a2add41cd956001:fallback:seds_annual_state_fallback; eia:1:ef4ae547cc8fcf0438a6984b5a02f8883d8d706f8cad3a1f3a2add41cd956001:fallback:wrong_frequency_fallback; eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca:fallback:seds_annual_state_fallback; eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca:fallback:wrong_frequency_fallback; eia:1:deefae92b97279829f2ba446c4acc25b455e4d113e1761fd35b195b17e06d837:fallback:seds_annual_state_fallback; eia:1:deefae92b97279829f2ba446c4acc25b455e4d113e1761fd35b195b17e06d837:fallback:wrong_frequency_fallback; eia:1:6ed14ddbaacf62fb13d149ef4e8949094f4e9511ba978dbe89582a3252fecc99:fallback:seds_annual_state_fallback; eia:1:6ed14ddbaacf62fb13d149ef4e8949094f4e9511ba978dbe89582a3252fecc99:fallback:wrong_frequency_fallback; eia:1:a2678affd99b19afc26267ded302b781771a3f675a8ef1dc3584917bc5c19039:fallback:product_or_scope_hard_gate_failed; eia:1:929d2a5975b65f7337756fa7c059cbb2dcf65fa6e9a77248d2908d7ce8004ce8:fallback:product_or_scope_hard_gate_failed; eia:1:ded6547965d05a80ff9576882cc3ff23d531693d4ed8583b0a304ec57ba9879b:fallback:product_or_scope_hard_gate_failed; eia:1:807ec3bf352e94c448d60d6c2b6ae3eddfd27847cd474a5597b8146e9b5e832b:fallback:product_or_scope_hard_gate_failed; eia:1:aee192bf0e2e8ee2b7e0d4bbddf5f95a0185c8b32e0b0290350068fdbcc7a39b:fallback:product_or_scope_hard_gate_failed; eia:1:496db5361cc5081a6b4fcd01736f9b1acddb2a3a478f520c2d51d04f259eeca3:fallback:product_or_scope_hard_gate_failed; eia:1:a939ab63cd305a2e898779f4a3dd3af0b64050557b04f3a2505ff56ad6e46e92:fallback:product_or_scope_hard_gate_failed; eia:1:fff0943b804729897df207662aff7c83711d6075733d3ebc492d760b251fc4e5:fallback:seds_annual_state_fallback; eia:1:fff0943b804729897df207662aff7c83711d6075733d3ebc492d760b251fc4e5:fallback:wrong_frequency_fallback; eia:1:93943a4110ca2edbcf2f99525bcd359a2081e2046d277658df96f5fe0bc0766b:fallback:seds_annual_state_fallback; eia:1:93943a4110ca2edbcf2f99525bcd359a2081e2046d277658df96f5fe0bc0766b:fallback:wrong_frequency_fallback; eia:1:b858d7fbb57c829ae58a89b219e7b53b8c786a2afe64f9a403b8f19e9e8bd498:fallback:seds_annual_state_fallback; eia:1:b858d7fbb57c829ae58a89b219e7b53b8c786a2afe64f9a403b8f19e9e8bd498:fallback:wrong_frequency_fallback; eia:1:b123d1a2ee2828415843169360c4dbee9b8e1d68e31ff21ea78d264727ca2618:fallback:seds_annual_state_fallback; eia:1:b123d1a2ee2828415843169360c4dbee9b8e1d68e31ff21ea78d264727ca2618:fallback:wrong_frequency_fallback; eia:1:16d9f9be42a70d7e3ec62a70f33ac97a4181ffe708d13fd3b24ce84c2e6f46c2:fallback:seds_annual_state_fallback; eia:1:16d9f9be42a70d7e3ec62a70f33ac97a4181ffe708d13fd3b24ce84c2e6f46c2:fallback:wrong_frequency_fallback; eia:1:23f92a25ab9b18b327ad633644772e513130c84c2dafa3bfc1e66a7b52419013:fallback:activity_hard_gate_failed; eia:1:c5ed9a89f41318afc80220fc29023fb1f23ee3173b825ab84431a7e0e2de2eea:fallback:activity_hard_gate_failed; eia:1:64d2f78efa1fca3ececaa26d809ca7554ce1f9e701f0ccbd67dd82b32ea978de:fallback:product_or_scope_hard_gate_failed; eia:1:a2e104a15d95464d073d09631f77a230ec2ff138b2baeb28fa1319395a68fb27:fallback:product_or_scope_hard_gate_failed; eia:1:364913785b2f16702a4c280b4978ce309967fbe2ef05c14049da849e6d960092:fallback:product_or_scope_hard_gate_failed; eia:1:2127b2e839d60167e4e21a3cb8e2e7ddd5aa4a400899513a3c311c36e7df5193:fallback:product_or_scope_hard_gate_failed; eia:1:e384f10d6aa690bc39ed608a28f73282fd1cdd276efc052e5754f7354587d5f2:fallback:product_or_scope_hard_gate_failed; eia:1:9d3839b16f4b41d2d9ee4d67a4e8bd7aab169cbbf093b820c53a7e03ac7bdda7:fallback:seds_annual_state_fallback; eia:1:9d3839b16f4b41d2d9ee4d67a4e8bd7aab169cbbf093b820c53a7e03ac7bdda7:fallback:wrong_frequency_fallback; eia:1:e8263b2920e81f98a38fd73d971b0b9ccf28ee60d8cf5a09310bc27d530a1050:fallback:product_or_scope_hard_gate_failed; eia:1:4a72b5956f383ad5f16b0dcd110670309bfe3ebf2c75c7c58567dd25abc22a52:fallback:product_or_scope_hard_gate_failed; eia:1:baf87a12a8b03c5aaed4fd85b70e4bd770e7189f0011b24a3c49dd3b11ce8204:fallback:product_or_scope_hard_gate_failed; eia:1:4f6953d3751f0d88c75c6180605e35e2db1f4d94a115be97f0a2eb6186f44793:fallback:product_or_scope_hard_gate_failed; eia:1:710f4e0ed9a5e08f556da30cf376ab65684a6ea34cb93d5195a53c39f69bcfa4:fallback:product_or_scope_hard_gate_failed; eia:1:15f9ab9f81654319f57553afb94f69244f91a80d15dbdd54c10cca6fa17d5862:fallback:product_or_scope_hard_gate_failed; eia:1:01cce6fb01ba68abf32ff1bc429d470a412b31a7417bf8af79c69e29bd8c920d:fallback:product_or_scope_hard_gate_failed; eia:1:b65337326b8a090bfc1698a24895e5e56996e6c3ba4d25520a466ffc0a9428b5:fallback:product_or_scope_hard_gate_failed; eia:1:54f3cb22901b008c7484bf57414de1cdabd21963cbe834a15d14cf358ac1a307:fallback:product_or_scope_hard_gate_failed; eia:1:b132474b214897508a1c51df636db117b284be2cb818d3874face0459e6b862e:fallback:product_or_scope_hard_gate_failed; eia:1:27355945374ed716e54997563ed59783cca594d3798acc9de3e62cb89712ccd7:fallback:product_or_scope_hard_gate_failed; eia:1:1a6ac6b756ec9732af2d62f1190c4f3c31fd94b262c9557dbf456cd4f7bf7cc8:fallback:product_or_scope_hard_gate_failed; eia:1:00f8c9d0055d7db582728a3576eaec5aabfd4d2f06a75ee9c859876d3529fa07:fallback:product_or_scope_hard_gate_failed; eia:1:d13d0f13f05345c74f0fdf67c0409392e31379aa262f0d41914c273493bf5c30:fallback:product_or_scope_hard_gate_failed; eia:1:246b6f44b7a5a267924113bd0169c96f06c4135b9279a458e2d1a86664965dd7:fallback:product_or_scope_hard_gate_failed; eia:1:955b207f5222d32b64782eef3183bca616c6eaa01c1b3ff571a2c559947d5dbc:fallback:product_or_scope_hard_gate_failed; seds_annual_state_fallback; wrong_frequency_fallback; activity_contains_unrequested_concepts; product_contains_unrequested_concepts; sector_specific_not_requested; derived_metric_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.TETCB.TX.A` | Total energy consumption, Texas | seds/fallback/B | 93.4 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, official_total_label, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | `SEDS.TENEB.TX.A` | Total primary energy consumption less total primary energy production, Texas | seds/fallback/B | 88.6 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, activity_contains_unrequested_concepts |
| 3 | `SEDS.TEPFB.TX.A` | Total energy used as process fuel and other consumption that has no direct fuel costs, Texas | seds/fallback/B | 88.1 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 4 | `SEDS.PESCB.TX.A` | Primary energy total consumption, adjusted for process fuel, intermediate products, and fuels with no direct cost, Texas | seds/fallback/B | 88.1 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |
| 5 | `SEDS.TEACB.TX.A` | Total energy consumption in the transportation sector, Texas | seds/fallback/B | 82.9 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_total_energy, activity_exact_consumption, unrequested_sector_specific, lexical_title_total, lexical_title_energy, lexical_title_consumption, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback, sector_specific_not_requested |

### Q03

Raw input:

```text
  plz   shwo[NEWLINE]
‘montly’[NBSP]nat gas prodction in Texas, not prices  
```

Mechanically cleaned: `plz shwo 'montly' nat gas prodction in Texas, not prices`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `monthly natural gas production in Texas, not prices` |
| Geography | Texas (TX) |
| Product / breadth | natural gas / specific |
| Activity / sector | production / none |
| Concept pairs | natural gas:production |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [{"type":"activity","value":"prices","order":0,"confidence":1,"source":"deterministic_negation"}] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2163 ms AI; 1434 ms local |

Retrieval: `TX:natural gas:production`; warnings: product_contains_unrequested_concepts; mixed_production_consumption_activity; activity_contains_unrequested_concepts; sector_specific_not_requested; activity_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | domestic/primary/A | 77.4 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | domestic/primary/A | 77.4 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | domestic/primary/C | 74.9 | monthly | Million Cubic Feet | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `monthly natural gas production in Texas, not prices` |
| Geography | Texas (TX) |
| Product / breadth | natural gas / specific |
| Activity / sector | production / none |
| Concept pairs | natural gas:production |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [{"type":"activity","value":"prices","order":0,"confidence":1,"source":"deterministic_negation"}] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2479 ms AI; 145 ms local |

Retrieval: `TX:natural gas:production`; warnings: product_contains_unrequested_concepts; mixed_production_consumption_activity; activity_contains_unrequested_concepts; sector_specific_not_requested; activity_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.N9050TX2.M` | Texas Natural Gas Marketed Production, Monthly | domestic/primary/A | 77.4 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 2 | `NG.NA1160_STX_2.M` | Texas Dry Natural Gas Production, Monthly | domestic/primary/A | 77.4 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 3 | `NG.NA1150_STX_2.M` | Texas Natural Gas Plant Liquids Production, Monthly | domestic/primary/C | 74.9 | monthly | Million Cubic Feet | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

### Q04

Raw input:

```text
“New Mexico”[NBSP]monthly   marketed[NEWLINE]
 natural gas production
```

Mechanically cleaned: `"New Mexico" monthly marketed natural gas production`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"New Mexico" monthly marketed natural gas production` |
| Geography | New Mexico (NM) |
| Product / breadth | natural gas / specific |
| Activity / sector | production / none |
| Concept pairs | natural gas:production |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2692 ms AI; 85 ms local |

Retrieval: `NM:natural gas:production`; warnings: product_contains_unrequested_concepts; mixed_production_consumption_activity; activity_contains_unrequested_concepts; sector_specific_not_requested; activity_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.N9050NM2.M` | New Mexico Natural Gas Marketed Production, Monthly | domestic/primary/A | 92.2 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_marketed, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, requested_subtype_exact | none |
| 2 | `NG.NA1160_SNM_2.M` | New Mexico Dry Natural Gas Production, Monthly | domestic/primary/A | 82.6 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |
| 3 | `NG.NA1150_SNM_2.M` | New Mexico Natural Gas Plant Liquids Production, Monthly | domestic/primary/C | 80 | monthly | Million Cubic Feet | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `New Mexico monthly marketed natural gas production` |
| Geography | New Mexico (NM) |
| Product / breadth | natural gas / specific |
| Activity / sector | production / none |
| Concept pairs | natural gas:production |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 1791 ms AI; 102 ms local |

Retrieval: `NM:natural gas:production`; warnings: product_contains_unrequested_concepts; mixed_production_consumption_activity; activity_contains_unrequested_concepts; sector_specific_not_requested; activity_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.N9050NM2.M` | New Mexico Natural Gas Marketed Production, Monthly | domestic/primary/A | 92.2 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_marketed, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, requested_subtype_exact | none |
| 2 | `NG.NA1160_SNM_2.M` | New Mexico Dry Natural Gas Production, Monthly | domestic/primary/A | 82.6 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | none |
| 3 | `NG.NA1150_SNM_2.M` | New Mexico Natural Gas Plant Liquids Production, Monthly | domestic/primary/C | 80 | monthly | Million Cubic Feet | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, product_extra_concept_penalty, activity_exact_production, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_production, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | product_contains_unrequested_concepts |

### Q05

Raw input:

```text
[NEWLINE]
 ‘New York’   monthly[NBSP]residential natural gas[TAB]consumption 
```

Mechanically cleaned: `'New York' monthly residential natural gas consumption`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'New York' monthly residential natural gas consumption` |
| Geography | New York (NY) |
| Product / breadth | natural gas / specific |
| Activity / sector | consumption / residential |
| Concept pairs | natural gas:consumption |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 3270 ms AI; 104 ms local |

Retrieval: `NY:natural gas:consumption:residential`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.N3010NY2.M` | New York Natural Gas Residential Consumption, Monthly | domestic/primary/A | 92.6 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_residential, lexical_title_natural, lexical_title_gas, lexical_title_consumption, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `New York monthly residential natural gas consumption` |
| Geography | New York (NY) |
| Product / breadth | natural gas / specific |
| Activity / sector | consumption / residential |
| Concept pairs | natural gas:consumption |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2135 ms AI; 89 ms local |

Retrieval: `NY:natural gas:consumption:residential`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.N3010NY2.M` | New York Natural Gas Residential Consumption, Monthly | domestic/primary/A | 92.6 | monthly | Million Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_consumption, ordinary_series, lexical_title_residential, lexical_title_natural, lexical_title_gas, lexical_title_consumption, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q06

Raw input:

```text
  “Iowa”[NBSP]monthly[NEWLINE]
wind   net generation[TAB]
```

Mechanically cleaned: `"Iowa" monthly wind net generation`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Iowa" monthly wind net generation` |
| Geography | Iowa (IA) |
| Product / breadth | wind / specific |
| Activity / sector | generation / none |
| Concept pairs | wind:generation |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2205 ms AI; 101 ms local |

Retrieval: `IA:wind:generation`; warnings: sector_specific_not_requested; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.GEN.WND-IA-99.M` | Net generation : Iowa : all sectors : wind : monthly | domestic/primary/A | 100 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, official_all_sectors_total_priority, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `ELEC.GEN.WND-IA-94.M` | Net generation : Iowa : independent power producers (total) : wind : monthly | domestic/primary/A | 96.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, aggregate_metadata_match, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | `ELEC.GEN.WND-IA-1.M` | Net generation : Iowa : electric utility : wind : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | `ELEC.GEN.WND-IA-2.M` | Net generation : Iowa : electric utility non-cogen : wind : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | `ELEC.GEN.WND-IA-4.M` | Net generation : Iowa : commercial non-cogen : wind : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Iowa" monthly wind net generation` |
| Geography | Iowa (IA) |
| Product / breadth | wind / specific |
| Activity / sector | generation / none |
| Concept pairs | wind:generation |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2375 ms AI; 81 ms local |

Retrieval: `IA:wind:generation`; warnings: sector_specific_not_requested; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.GEN.WND-IA-99.M` | Net generation : Iowa : all sectors : wind : monthly | domestic/primary/A | 100 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, official_all_sectors_total_priority, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `ELEC.GEN.WND-IA-94.M` | Net generation : Iowa : independent power producers (total) : wind : monthly | domestic/primary/A | 96.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, aggregate_metadata_match, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 3 | `ELEC.GEN.WND-IA-1.M` | Net generation : Iowa : electric utility : wind : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 4 | `ELEC.GEN.WND-IA-2.M` | Net generation : Iowa : electric utility non-cogen : wind : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |
| 5 | `ELEC.GEN.WND-IA-4.M` | Net generation : Iowa : commercial non-cogen : wind : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_wind, activity_exact_generation, unrequested_sector_specific, lexical_title_wind, lexical_title_net, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q07

Raw input:

```text
[TAB]‘California’[NBSP]renewable[NEWLINE]
  energy   
```

Mechanically cleaned: `'California' renewable energy`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'California' renewable energy` |
| Geography | California (CA) |
| Product / breadth | renewable / broad |
| Activity / sector | none / none |
| Concept pairs | renewable:? |
| Frequency | annual; explicit=false |
| Route | seds |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / Please clarify the activity. Example: United States total energy consumption. |
| Timing | 2724 ms AI; 1046 ms local |

Retrieval: `CA:renewable`; warnings: [object Object]; activity_missing_ranked_aggregate_first; product_contains_unrequested_concepts; sector_specific_not_requested; derived_metric_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.REPRB.CA.A` | Renewable energy production, California | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | `SEDS.RETCB.CA.A` | Renewable energy total consumption, California | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | `SEDS.NCPRB.CA.A` | Noncombustible renewable energy production, California | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | activity_missing_ranked_aggregate_first |
| 4 | `SEDS.REGBP.CA.A` | Renewable energy total generating units net summer capacity in all sectors, California | seds/fallback/C | 91.7 | annual | Thousand kilowatts | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, aggregate_metadata_match, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 5 | `SEDS.REACB.CA.A` | Renewable energy sources consumed by the transportation sector, California | seds/fallback/C | 84.6 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, unrequested_sector_specific, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `California renewable energy` |
| Geography | California (CA) |
| Product / breadth | renewable / broad |
| Activity / sector | none / none |
| Concept pairs | renewable:? |
| Frequency | annual; explicit=false |
| Route | seds |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / Please clarify the activity. Example: United States total energy consumption. |
| Timing | 2444 ms AI; 153 ms local |

Retrieval: `CA:renewable`; warnings: [object Object]; activity_missing_ranked_aggregate_first; product_contains_unrequested_concepts; sector_specific_not_requested; derived_metric_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.REPRB.CA.A` | Renewable energy production, California | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | `SEDS.RETCB.CA.A` | Renewable energy total consumption, California | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | `SEDS.NCPRB.CA.A` | Noncombustible renewable energy production, California | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, official_total_label, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1 | activity_missing_ranked_aggregate_first |
| 4 | `SEDS.REGBP.CA.A` | Renewable energy total generating units net summer capacity in all sectors, California | seds/fallback/C | 91.7 | annual | Thousand kilowatts | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, aggregate_metadata_match, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 5 | `SEDS.REACB.CA.A` | Renewable energy sources consumed by the transportation sector, California | seds/fallback/C | 84.6 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_renewable, unrequested_sector_specific, lexical_title_renewable, lexical_title_energy, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q08

Raw input:

```text
  “Texas”[NBSP] gas[NEWLINE]
 
```

Mechanically cleaned: `"Texas" gas`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Texas" gas` |
| Geography | Texas (TX) |
| Product / breadth | none / ambiguous |
| Activity / sector | none / none |
| Concept pairs | ?:? |
| Frequency | annual; explicit=false |
| Route | seds |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / Please clarify the activity. Example: United States total energy consumption. |
| Timing | 2424 ms AI; 211 ms local |

Retrieval: `TX:natural gas`; warnings: [object Object]; [object Object]; activity_missing_ranked_aggregate_first; product_contains_unrequested_concepts; sector_specific_not_requested; derived_metric_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | seds/fallback/C | 95.2 | annual | Dollars per million Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | seds/fallback/C | 95.2 | annual | Thousand Btu per cubic foot | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | `SEDS.NGTCV.TX.A` | Natural gas total expenditures (including supplemental gaseous fuels), Texas | seds/fallback/C | 95.2 | annual | Million dollars | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

Retrieval: `TX:petroleum`; warnings: [object Object]; [object Object]; activity_missing_ranked_aggregate_first; product_contains_unrequested_concepts; sector_specific_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.OPTCB.TX.A` | Other petroleum products total consumption, Texas | seds/fallback/C | 67.1 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | `SEDS.P1TCB.TX.A` | Asphalt and road oil, aviation gasoline, kerosene, lubricants, petroleum coke, and "other petroleum products" total consumption, Texas | seds/fallback/C | 67.1 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | `SEDS.OPTCD.TX.A` | Other petroleum products average price, all sectors, Texas | seds/fallback/C | 63.5 | annual | Dollars per million Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | `SEDS.OPTCV.TX.A` | Other petroleum products total expenditures, Texas | seds/fallback/C | 63.5 | annual | Million dollars | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | `SEDS.OPTXB.TX.A` | Other petroleum products total end-use consumption, Texas | seds/fallback/C | 63.5 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Texas" gas` |
| Geography | Texas (TX) |
| Product / breadth | none / ambiguous |
| Activity / sector | none / none |
| Concept pairs | ?:? |
| Frequency | annual; explicit=false |
| Route | seds |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / Please clarify the activity. Example: United States total energy consumption. |
| Timing | 2153 ms AI; 541 ms local |

Retrieval: `TX:natural gas`; warnings: [object Object]; [object Object]; activity_missing_ranked_aggregate_first; product_contains_unrequested_concepts; sector_specific_not_requested; derived_metric_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.NGTCB.TX.A` | Natural gas total consumption (including supplemental gaseous fuels), Texas | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | `SEDS.NNTCB.TX.A` | Natural gas total consumption (excluding supplemental gaseous fuels), Texas | seds/fallback/C | 98.9 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, official_total_label, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | `SEDS.NGTCD.TX.A` | Natural gas average price, all sectors (including supplemental gaseous fuels), Texas | seds/fallback/C | 95.2 | annual | Dollars per million Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | `SEDS.NGTCK.TX.A` | Factor for converting natural gas total consumption from physical units to Btu, Texas | seds/fallback/C | 95.2 | annual | Thousand Btu per cubic foot | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | `SEDS.NGTCV.TX.A` | Natural gas total expenditures (including supplemental gaseous fuels), Texas | seds/fallback/C | 95.2 | annual | Million dollars | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_natural_gas, aggregate_metadata_match, lexical_title_gas, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

Retrieval: `TX:petroleum`; warnings: [object Object]; [object Object]; activity_missing_ranked_aggregate_first; product_contains_unrequested_concepts; sector_specific_not_requested.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.OPTCB.TX.A` | Other petroleum products total consumption, Texas | seds/fallback/C | 67.1 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 2 | `SEDS.P1TCB.TX.A` | Asphalt and road oil, aviation gasoline, kerosene, lubricants, petroleum coke, and "other petroleum products" total consumption, Texas | seds/fallback/C | 67.1 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, official_total_label, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | activity_missing_ranked_aggregate_first |
| 3 | `SEDS.OPTCD.TX.A` | Other petroleum products average price, all sectors, Texas | seds/fallback/C | 63.5 | annual | Dollars per million Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | `SEDS.OPTCV.TX.A` | Other petroleum products total expenditures, Texas | seds/fallback/C | 63.5 | annual | Million dollars | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | `SEDS.OPTXB.TX.A` | Other petroleum products total end-use consumption, Texas | seds/fallback/C | 63.5 | annual | Billion Btu | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, frequency_validated, product_exact_petroleum, aggregate_metadata_match, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q09

Raw input:

```text
 ‘United States’[NBSP]weekly[NEWLINE]
working gas   in underground[TAB]storage 
```

Mechanically cleaned: `'United States' weekly working gas in underground storage`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'United States' weekly working gas in underground storage` |
| Geography | United States (USA) |
| Product / breadth | natural gas / specific |
| Activity / sector | storage / none |
| Concept pairs | natural gas:storage |
| Frequency | weekly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2064 ms AI; 1736 ms local |

Retrieval: `USA:natural gas:storage`; warnings: [object Object].

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | domestic/primary/A | 92.2 | weekly | Billion Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_gas, lexical_title_underground, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'United States' weekly working gas in underground storage` |
| Geography | United States (USA) |
| Product / breadth | natural gas / specific |
| Activity / sector | storage / none |
| Concept pairs | natural gas:storage |
| Frequency | weekly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2377 ms AI; 19 ms local |

Retrieval: `USA:natural gas:storage`; warnings: [object Object].

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `NG.NW2_EPG0_SWO_R48_BCF.W` | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | domestic/primary/A | 92.2 | weekly | Billion Cubic Feet | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_storage, ordinary_series, lexical_title_weekly, lexical_title_working, lexical_title_gas, lexical_title_underground, lexical_title_storage, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q10

Raw input:

```text
[NEWLINE]
“Brazil”[NBSP]annual   petroleum[TAB]consumption  
```

Mechanically cleaned: `"Brazil" annual petroleum consumption`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Brazil" annual petroleum consumption` |
| Geography | Brazil (BRA) |
| Product / breadth | petroleum / specific |
| Activity / sector | consumption / none |
| Concept pairs | petroleum:consumption |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2022 ms AI; 1258 ms local |

Retrieval: `BRA:petroleum:consumption`; warnings: eia:1:522123ffa5071b16e0004611772dbecf249fd3d8803a846e52ec44b274394c12:primary:product_or_scope_hard_gate_failed; eia:1:1c8a82334ff74b5b1afca59fd2844b3c64d0bde1786a801661719f4e7b70b640:primary:product_or_scope_hard_gate_failed; eia:1:a1f6c6778d719509110a6a69955160952c0ac161d6dd87eca6deb0f800d6c6ec:primary:product_or_scope_hard_gate_failed; eia:1:e4ec867b321fb1666d2faed3e48ef3fdc329c5985f03872368df17c2b6c2bbc6:primary:product_or_scope_hard_gate_failed; eia:1:43f9693da3febf5839a7a18573d211b8200b596549da1382ac401e0469ca40f3:primary:product_or_scope_hard_gate_failed; eia:1:76050a92d25b1fa99a6face2deb90b316a245c72f1b643389f65e0d780edf666:primary:product_or_scope_hard_gate_failed; eia:1:d1ea59c6b91bbbd9f72c956f0cf62a1c43fd9fd7abea0ba204a0471d2c3a3a5a:primary:product_or_scope_hard_gate_failed; eia:1:8b75265fe5f85acf3b1b4a9fe7ccd037822b64099cd82c574e656b3fae14ed8d:primary:product_or_scope_hard_gate_failed; eia:1:2d11ac94fcbb7b7caf8ce70b0d2f5d674b2c19b531c87c89a3267471ef21d8cb:primary:product_or_scope_hard_gate_failed; eia:1:e60cbfdd020f31cd182a5c6178ee6d894ff17c401daa07dd61015b972c62076f:primary:product_or_scope_hard_gate_failed; eia:1:9b722f8c50f2588ed722eae8accc1c4166878ab215d43ec289bbf02d110d17ab:primary:product_or_scope_hard_gate_failed; eia:1:0a4211a17ad84b8c70fbdb059561b9cfcaf30339b2947844cc18e402749ff9bc:primary:product_or_scope_hard_gate_failed; eia:1:159d5aad0fff4741eecd14278f14af538c63562f79319609f2621bbdf43bb841:primary:product_or_scope_hard_gate_failed; eia:1:d7a266ef99c6e65577457144adeb2a66fd0ad321031f9678897d58696aa44a5f:primary:product_or_scope_hard_gate_failed; eia:1:0ea81090ff6065c5a96b870a7bc866b5f0f387f3a8bf2a379b6d98870f2ba4cd:primary:product_or_scope_hard_gate_failed; product_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | international/primary/A | 92.2 | annual | 1000 metric tons | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | international/primary/A | 92.2 | annual | 1000 metric tons | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | international/primary/A | 92.2 | annual | 1000 metric tons | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | international/primary/A | 77.6 | annual | thousand barrels per day | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | international/primary/A | 77.6 | annual | thousand barrels per day | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Brazil annual petroleum consumption` |
| Geography | Brazil (BRA) |
| Product / breadth | petroleum / specific |
| Activity / sector | consumption / none |
| Concept pairs | petroleum:consumption |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 1914 ms AI; 136 ms local |

Retrieval: `BRA:petroleum:consumption`; warnings: eia:1:522123ffa5071b16e0004611772dbecf249fd3d8803a846e52ec44b274394c12:primary:product_or_scope_hard_gate_failed; eia:1:1c8a82334ff74b5b1afca59fd2844b3c64d0bde1786a801661719f4e7b70b640:primary:product_or_scope_hard_gate_failed; eia:1:a1f6c6778d719509110a6a69955160952c0ac161d6dd87eca6deb0f800d6c6ec:primary:product_or_scope_hard_gate_failed; eia:1:e4ec867b321fb1666d2faed3e48ef3fdc329c5985f03872368df17c2b6c2bbc6:primary:product_or_scope_hard_gate_failed; eia:1:43f9693da3febf5839a7a18573d211b8200b596549da1382ac401e0469ca40f3:primary:product_or_scope_hard_gate_failed; eia:1:76050a92d25b1fa99a6face2deb90b316a245c72f1b643389f65e0d780edf666:primary:product_or_scope_hard_gate_failed; eia:1:d1ea59c6b91bbbd9f72c956f0cf62a1c43fd9fd7abea0ba204a0471d2c3a3a5a:primary:product_or_scope_hard_gate_failed; eia:1:8b75265fe5f85acf3b1b4a9fe7ccd037822b64099cd82c574e656b3fae14ed8d:primary:product_or_scope_hard_gate_failed; eia:1:2d11ac94fcbb7b7caf8ce70b0d2f5d674b2c19b531c87c89a3267471ef21d8cb:primary:product_or_scope_hard_gate_failed; eia:1:e60cbfdd020f31cd182a5c6178ee6d894ff17c401daa07dd61015b972c62076f:primary:product_or_scope_hard_gate_failed; eia:1:9b722f8c50f2588ed722eae8accc1c4166878ab215d43ec289bbf02d110d17ab:primary:product_or_scope_hard_gate_failed; eia:1:0a4211a17ad84b8c70fbdb059561b9cfcaf30339b2947844cc18e402749ff9bc:primary:product_or_scope_hard_gate_failed; eia:1:159d5aad0fff4741eecd14278f14af538c63562f79319609f2621bbdf43bb841:primary:product_or_scope_hard_gate_failed; eia:1:d7a266ef99c6e65577457144adeb2a66fd0ad321031f9678897d58696aa44a5f:primary:product_or_scope_hard_gate_failed; eia:1:0ea81090ff6065c5a96b870a7bc866b5f0f387f3a8bf2a379b6d98870f2ba4cd:primary:product_or_scope_hard_gate_failed; product_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.5-2-BRA-MT.A` | Petroleum and other liquids consumption, Brazil, Annual | international/primary/A | 92.2 | annual | 1000 metric tons | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | `INTL.67-2-BRA-MT.A` | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | international/primary/A | 92.2 | annual | 1000 metric tons | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | `INTL.54-2-BRA-MT.A` | Refined petroleum products consumption, Brazil, Annual | international/primary/A | 92.2 | annual | 1000 metric tons | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_petroleum, lexical_title_consumption, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |
| 4 | `INTL.65-13-BRA-TBPD.A` | Bunker distillate fuel oil consumption, Brazil, Annual | international/primary/A | 77.6 | annual | thousand barrels per day | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 5 | `INTL.66-13-BRA-TBPD.A` | Bunker residual fuel oil consumption, Brazil, Annual | international/primary/A | 77.6 | annual | thousand barrels per day | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_petroleum, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q11

Raw input:

```text
 ‘Japan’[NBSP]monthly[NEWLINE]
solar electricity   generation[TAB]
```

Mechanically cleaned: `'Japan' monthly solar electricity generation`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'Japan' monthly solar electricity generation` |
| Geography | Japan (JPN) |
| Product / breadth | solar / specific |
| Activity / sector | generation / none |
| Concept pairs | solar:generation |
| Frequency | monthly; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2356 ms AI; 85 ms local |

Retrieval: `JPN:solar:generation`; warnings: [object Object]; eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf:fallback:international_annual_frequency_fallback; eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf:fallback:wrong_frequency_fallback; eia:1:9d7ba54ec41315a8f0db864f730dd2180eec3e5b574b93ab20fb16ef681ab42f:fallback:international_annual_frequency_fallback; eia:1:9d7ba54ec41315a8f0db864f730dd2180eec3e5b574b93ab20fb16ef681ab42f:fallback:wrong_frequency_fallback; eia:1:c0f10267251e5d86ffd00c61fb3e67a62795ddaaf82b9f62a587c45cd87104cf:fallback:international_annual_frequency_fallback; eia:1:c0f10267251e5d86ffd00c61fb3e67a62795ddaaf82b9f62a587c45cd87104cf:fallback:wrong_frequency_fallback; eia:1:4f39d1beeccdfa7d18777184f06a2a2e4dbb7da309dcb433fc1c06dc14b3ea74:fallback:international_annual_frequency_fallback; eia:1:4f39d1beeccdfa7d18777184f06a2a2e4dbb7da309dcb433fc1c06dc14b3ea74:fallback:wrong_frequency_fallback; eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58:fallback:international_annual_frequency_fallback; eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58:fallback:wrong_frequency_fallback; eia:1:d18177202dc594562bdb2147d1df80deb699b1112d46f9b6b76bedef2c74333a:fallback:international_annual_frequency_fallback; eia:1:d18177202dc594562bdb2147d1df80deb699b1112d46f9b6b76bedef2c74333a:fallback:wrong_frequency_fallback; eia:1:82948b2032b78d6855a09ed3626820dd38c81d886173e1a42948dc59f3605683:fallback:international_annual_frequency_fallback; eia:1:82948b2032b78d6855a09ed3626820dd38c81d886173e1a42948dc59f3605683:fallback:wrong_frequency_fallback; eia:1:6117688b570d31ccd465b461d1dce38cc61730ebb950d8088bcac210f854e41b:fallback:international_annual_frequency_fallback; eia:1:6117688b570d31ccd465b461d1dce38cc61730ebb950d8088bcac210f854e41b:fallback:wrong_frequency_fallback; international_annual_frequency_fallback; wrong_frequency_fallback.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | international/fallback/B | 90.7 | annual | billion kilowatthours | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |
| 2 | `INTL.36-12-JPN-BKWH.A` | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | international/fallback/B | 90.7 | annual | billion kilowatthours | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Japan monthly solar electricity generation` |
| Geography | Japan (JPN) |
| Product / breadth | solar / specific |
| Activity / sector | generation / none |
| Concept pairs | solar:generation |
| Frequency | monthly; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2470 ms AI; 70 ms local |

Retrieval: `JPN:solar:generation`; warnings: [object Object]; eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf:fallback:international_annual_frequency_fallback; eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf:fallback:wrong_frequency_fallback; eia:1:9d7ba54ec41315a8f0db864f730dd2180eec3e5b574b93ab20fb16ef681ab42f:fallback:international_annual_frequency_fallback; eia:1:9d7ba54ec41315a8f0db864f730dd2180eec3e5b574b93ab20fb16ef681ab42f:fallback:wrong_frequency_fallback; eia:1:c0f10267251e5d86ffd00c61fb3e67a62795ddaaf82b9f62a587c45cd87104cf:fallback:international_annual_frequency_fallback; eia:1:c0f10267251e5d86ffd00c61fb3e67a62795ddaaf82b9f62a587c45cd87104cf:fallback:wrong_frequency_fallback; eia:1:4f39d1beeccdfa7d18777184f06a2a2e4dbb7da309dcb433fc1c06dc14b3ea74:fallback:international_annual_frequency_fallback; eia:1:4f39d1beeccdfa7d18777184f06a2a2e4dbb7da309dcb433fc1c06dc14b3ea74:fallback:wrong_frequency_fallback; eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58:fallback:international_annual_frequency_fallback; eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58:fallback:wrong_frequency_fallback; eia:1:d18177202dc594562bdb2147d1df80deb699b1112d46f9b6b76bedef2c74333a:fallback:international_annual_frequency_fallback; eia:1:d18177202dc594562bdb2147d1df80deb699b1112d46f9b6b76bedef2c74333a:fallback:wrong_frequency_fallback; eia:1:82948b2032b78d6855a09ed3626820dd38c81d886173e1a42948dc59f3605683:fallback:international_annual_frequency_fallback; eia:1:82948b2032b78d6855a09ed3626820dd38c81d886173e1a42948dc59f3605683:fallback:wrong_frequency_fallback; eia:1:6117688b570d31ccd465b461d1dce38cc61730ebb950d8088bcac210f854e41b:fallback:international_annual_frequency_fallback; eia:1:6117688b570d31ccd465b461d1dce38cc61730ebb950d8088bcac210f854e41b:fallback:wrong_frequency_fallback; international_annual_frequency_fallback; wrong_frequency_fallback.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | international/fallback/B | 90.7 | annual | billion kilowatthours | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |
| 2 | `INTL.36-12-JPN-BKWH.A` | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | international/fallback/B | 90.7 | annual | billion kilowatthours | tier_B, source_pool_fallback, international_annual_frequency_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_electricity, lexical_title_generation, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | international_annual_frequency_fallback, wrong_frequency_fallback |

### Q12

Raw input:

```text
  “Germany”[NBSP]renewable energy[NEWLINE]
 production   and[TAB]consumption 
```

Mechanically cleaned: `"Germany" renewable energy production and consumption`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Germany" renewable energy production and consumption` |
| Geography | Germany (DEU) |
| Product / breadth | renewable / broad |
| Activity / sector | production / none |
| Concept pairs | renewable:production, renewable:consumption |
| Frequency | annual; explicit=false |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2320 ms AI; 191 ms local |

Retrieval: `DEU:renewable:production`; warnings: product_contains_unrequested_concepts; mixed_renewable_nuclear_scope; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.4418-1-DEU-QBTU.A` | Total energy production from renewables and other, Germany, Annual | international/primary/C | 76.9 | annual | quadrillion Btu | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_energy, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | `INTL.79-1-DEU-MT.A` | Biofuels production, Germany, Annual | international/fallback/C | 67 | annual | 1000 metric tons | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_production, ordinary_series, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

Retrieval: `DEU:renewable:consumption`; warnings: product_contains_unrequested_concepts; mixed_renewable_nuclear_scope; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.4418-2-DEU-QBTU.A` | Total energy consumption from renewables and other, Germany, Annual | international/primary/C | 76.9 | annual | quadrillion Btu | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | `INTL.79-2-DEU-MT.A` | Biofuels consumption, Germany, Annual | international/fallback/C | 67 | annual | 1000 metric tons | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Germany" renewable energy production and consumption` |
| Geography | Germany (DEU) |
| Product / breadth | renewable / broad |
| Activity / sector | production / none |
| Concept pairs | renewable:production, renewable:consumption |
| Frequency | annual; explicit=false |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2079 ms AI; 150 ms local |

Retrieval: `DEU:renewable:production`; warnings: product_contains_unrequested_concepts; mixed_renewable_nuclear_scope; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.4418-1-DEU-QBTU.A` | Total energy production from renewables and other, Germany, Annual | international/primary/C | 76.9 | annual | quadrillion Btu | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_production, aggregate_metadata_match, lexical_title_energy, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | `INTL.79-1-DEU-MT.A` | Biofuels production, Germany, Annual | international/fallback/C | 67 | annual | 1000 metric tons | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_production, ordinary_series, lexical_title_production, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

Retrieval: `DEU:renewable:consumption`; warnings: product_contains_unrequested_concepts; mixed_renewable_nuclear_scope; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.4418-2-DEU-QBTU.A` | Total energy consumption from renewables and other, Germany, Annual | international/primary/C | 76.9 | annual | quadrillion Btu | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_renewable, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_energy, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | `INTL.79-2-DEU-MT.A` | Biofuels consumption, Germany, Annual | international/fallback/C | 67 | annual | 1000 metric tons | tier_C, source_pool_fallback, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_related_biofuels, activity_exact_consumption, ordinary_series, lexical_title_consumption, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q13

Raw input:

```text
[TAB]‘Brazil’ then[NBSP]“Japan”[NEWLINE]
 annual electricity   generation 
```

Mechanically cleaned: `'Brazil' then "Japan" annual electricity generation`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'Brazil' then "Japan" annual electricity generation` |
| Geography | Brazil (BRA) -> Japan (JPN) |
| Product / breadth | electricity / specific |
| Activity / sector | generation / none |
| Concept pairs | electricity:generation |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2273 ms AI; 172 ms local |

Retrieval: `BRA:electricity:generation`; warnings: product_contains_unrequested_concepts; activity_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.2-12-BRA-BKWH.A` | Electricity net generation, Brazil, Annual | international/primary/A | 80 | annual | billion kilowatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `INTL.116-12-BRA-BKWH.A` | Solar electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | `INTL.117-12-BRA-BKWH.A` | Tide and wave electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | `INTL.27-12-BRA-BKWH.A` | Nuclear electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | `INTL.28-12-BRA-BKWH.A` | Fossil fuels electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

Retrieval: `JPN:electricity:generation`; warnings: product_contains_unrequested_concepts; activity_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.2-12-JPN-BKWH.A` | Electricity net generation, Japan, Annual | international/primary/A | 80 | annual | billion kilowatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | `INTL.117-12-JPN-BKWH.A` | Tide and wave electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | `INTL.27-12-JPN-BKWH.A` | Nuclear electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | `INTL.28-12-JPN-BKWH.A` | Fossil fuels electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Brazil then Japan annual electricity generation` |
| Geography | Brazil (BRA) -> Japan (JPN) |
| Product / breadth | electricity / specific |
| Activity / sector | generation / none |
| Concept pairs | electricity:generation |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2147 ms AI; 172 ms local |

Retrieval: `BRA:electricity:generation`; warnings: product_contains_unrequested_concepts; activity_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.2-12-BRA-BKWH.A` | Electricity net generation, Brazil, Annual | international/primary/A | 80 | annual | billion kilowatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `INTL.116-12-BRA-BKWH.A` | Solar electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | `INTL.117-12-BRA-BKWH.A` | Tide and wave electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | `INTL.27-12-BRA-BKWH.A` | Nuclear electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | `INTL.28-12-BRA-BKWH.A` | Fossil fuels electricity net generation, Brazil, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

Retrieval: `JPN:electricity:generation`; warnings: product_contains_unrequested_concepts; activity_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.2-12-JPN-BKWH.A` | Electricity net generation, Japan, Annual | international/primary/A | 80 | annual | billion kilowatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_generation, official_total_label, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 2 | `INTL.116-12-JPN-BKWH.A` | Solar electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | `INTL.117-12-JPN-BKWH.A` | Tide and wave electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | `INTL.27-12-JPN-BKWH.A` | Nuclear electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | `INTL.28-12-JPN-BKWH.A` | Fossil fuels electricity net generation, Japan, Annual | international/primary/C | 74.8 | annual | billion kilowatthours | tier_C, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_generation, aggregate_metadata_match, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

### Q14

Raw input:

```text
 “California”[NBSP]monthly electricity[NEWLINE]
from   moon[TAB]
```

Mechanically cleaned: `"California" monthly electricity from moon`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"California" monthly electricity from moon` |
| Geography | California (CA) |
| Product / breadth | electricity / specific |
| Activity / sector | none / none |
| Concept pairs | electricity:? |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [{"value":"moon","order":0,"confidence":1,"source":"validated_interpreter_and_rules"}] |
| Fallback / clarification | none / Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved. |
| Timing | 2278 ms AI; 1853 ms local |

Retrieval: `CA:electricity`; warnings: [object Object]; [object Object].

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| n/a | none | No displayable candidate | n/a | n/a | n/a | n/a | n/a | n/a |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"California" monthly electricity from moon` |
| Geography | California (CA) |
| Product / breadth | electricity / specific |
| Activity / sector | none / none |
| Concept pairs | electricity:? |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [{"value":"moon","order":0,"confidence":1,"source":"deterministic_unresolved_qualifier"}] |
| Fallback / clarification | fallback / Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved. |
| Timing | 2337 ms AI; 1552 ms local |

Retrieval: `CA:electricity`; warnings: [object Object]; [object Object].

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| n/a | none | No displayable candidate | n/a | n/a | n/a | n/a | n/a | n/a |

### Q15

Raw input:

```text
  “Alaska”[NBSP]quarterly[NEWLINE]
 crude oil   production[TAB]
```

Mechanically cleaned: `"Alaska" quarterly crude oil production`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Alaska" quarterly crude oil production` |
| Geography | Alaska (AK) |
| Product / breadth | petroleum / specific |
| Activity / sector | production / none |
| Concept pairs | petroleum:production |
| Frequency | quarterly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2406 ms AI; 1831 ms local |

Retrieval: `AK:petroleum:production`; warnings: [object Object]; eia:1:ece9fc4e63f29822dd3248565468c4670e323615f5e9b8d726e877b85e5a2626:fallback:seds_annual_state_fallback; eia:1:ece9fc4e63f29822dd3248565468c4670e323615f5e9b8d726e877b85e5a2626:fallback:wrong_frequency_fallback; eia:1:9e33243d0e22076f8cae627bea7e3ee4fb2d9bdd916e995bafd57af87af373c6:fallback:seds_annual_state_fallback; eia:1:9e33243d0e22076f8cae627bea7e3ee4fb2d9bdd916e995bafd57af87af373c6:fallback:wrong_frequency_fallback; eia:1:4f6b85ba38e6df489ae78527ad19365c20c6dacbba52403bb84154f51aeff7d3:fallback:seds_annual_state_fallback; eia:1:4f6b85ba38e6df489ae78527ad19365c20c6dacbba52403bb84154f51aeff7d3:fallback:wrong_frequency_fallback; eia:1:dd032e97cc5a395bb47639424fb6c06fa81f0d81734e03e5a78669b1d4b8a4d1:fallback:seds_annual_state_fallback; eia:1:dd032e97cc5a395bb47639424fb6c06fa81f0d81734e03e5a78669b1d4b8a4d1:fallback:wrong_frequency_fallback; eia:1:1efbd935f449ce9a9f8c46eec58098c6a788b6456dbf262fd49311673480156c:fallback:seds_annual_state_fallback; eia:1:1efbd935f449ce9a9f8c46eec58098c6a788b6456dbf262fd49311673480156c:fallback:wrong_frequency_fallback; seds_annual_state_fallback; wrong_frequency_fallback; product_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.PAPRB.AK.A` | Crude oil production (including lease condensate), Alaska | seds/fallback/B | 93.4 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_petroleum, activity_exact_production, official_total_label, lexical_title_crude, lexical_title_oil, lexical_title_production, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, requested_subtype_exact | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | `SEDS.COPRK.AK.A` | Factor for converting crude oil production from physical units to Btu for the United States, Alaska | seds/fallback/B | 86.4 | annual | Million Btu per barrel | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_petroleum, activity_exact_production, ordinary_series, lexical_title_crude, lexical_title_oil, lexical_title_production, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, requested_subtype_exact, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback |
| 3 | `SEDS.B1PRB.AK.A` | Renewable diesel production, Alaska | seds/fallback/B | 72.7 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_petroleum, product_extra_concept_penalty, activity_exact_production, official_aggregate_label_exact_total, lexical_title_production, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, unrequested_subtype_qualifiers_1 | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Alaska quarterly crude oil production` |
| Geography | Alaska (AK) |
| Product / breadth | petroleum / specific |
| Activity / sector | production / none |
| Concept pairs | petroleum:production |
| Frequency | quarterly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2143 ms AI; 1839 ms local |

Retrieval: `AK:petroleum:production`; warnings: [object Object]; eia:1:ece9fc4e63f29822dd3248565468c4670e323615f5e9b8d726e877b85e5a2626:fallback:seds_annual_state_fallback; eia:1:ece9fc4e63f29822dd3248565468c4670e323615f5e9b8d726e877b85e5a2626:fallback:wrong_frequency_fallback; eia:1:9e33243d0e22076f8cae627bea7e3ee4fb2d9bdd916e995bafd57af87af373c6:fallback:seds_annual_state_fallback; eia:1:9e33243d0e22076f8cae627bea7e3ee4fb2d9bdd916e995bafd57af87af373c6:fallback:wrong_frequency_fallback; eia:1:4f6b85ba38e6df489ae78527ad19365c20c6dacbba52403bb84154f51aeff7d3:fallback:seds_annual_state_fallback; eia:1:4f6b85ba38e6df489ae78527ad19365c20c6dacbba52403bb84154f51aeff7d3:fallback:wrong_frequency_fallback; eia:1:dd032e97cc5a395bb47639424fb6c06fa81f0d81734e03e5a78669b1d4b8a4d1:fallback:seds_annual_state_fallback; eia:1:dd032e97cc5a395bb47639424fb6c06fa81f0d81734e03e5a78669b1d4b8a4d1:fallback:wrong_frequency_fallback; eia:1:1efbd935f449ce9a9f8c46eec58098c6a788b6456dbf262fd49311673480156c:fallback:seds_annual_state_fallback; eia:1:1efbd935f449ce9a9f8c46eec58098c6a788b6456dbf262fd49311673480156c:fallback:wrong_frequency_fallback; seds_annual_state_fallback; wrong_frequency_fallback; product_contains_unrequested_concepts.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `SEDS.PAPRB.AK.A` | Crude oil production (including lease condensate), Alaska | seds/fallback/B | 93.4 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_petroleum, activity_exact_production, official_total_label, lexical_title_crude, lexical_title_oil, lexical_title_production, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, requested_subtype_exact | seds_annual_state_fallback, wrong_frequency_fallback |
| 2 | `SEDS.COPRK.AK.A` | Factor for converting crude oil production from physical units to Btu for the United States, Alaska | seds/fallback/B | 86.4 | annual | Million Btu per barrel | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_petroleum, activity_exact_production, ordinary_series, lexical_title_crude, lexical_title_oil, lexical_title_production, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, requested_subtype_exact, equivalent_semantic_choice | seds_annual_state_fallback, wrong_frequency_fallback |
| 3 | `SEDS.B1PRB.AK.A` | Renewable diesel production, Alaska | seds/fallback/B | 72.7 | annual | Billion Btu | tier_B, source_pool_fallback, seds_annual_state_fallback, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, wrong_frequency_fallback, product_exact_petroleum, product_extra_concept_penalty, activity_exact_production, official_aggregate_label_exact_total, lexical_title_production, frequency_fallback, frequency_mismatch_fallback, current_active, availability_present, unrequested_subtype_qualifiers_1 | seds_annual_state_fallback, wrong_frequency_fallback, product_contains_unrequested_concepts |

### Q16

Raw input:

```text
[NEWLINE]
‘Florida’[NBSP]annual residential[TAB] electricity   prices 
```

Mechanically cleaned: `'Florida' annual residential electricity prices`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'Florida' annual residential electricity prices` |
| Geography | Florida (FL) |
| Product / breadth | electricity / specific |
| Activity / sector | prices / residential |
| Concept pairs | electricity:prices |
| Frequency | annual; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 6574 ms AI; 1083 ms local |

Retrieval: `FL:electricity:prices:residential`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.PRICE.FL-RES.A` | Average retail price of electricity : Florida : residential : annual | domestic/primary/A | 82.5 | annual | cents per kilowatthour | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_prices, ordinary_series, lexical_title_residential, lexical_title_electricity, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Florida annual residential electricity prices` |
| Geography | Florida (FL) |
| Product / breadth | electricity / specific |
| Activity / sector | prices / residential |
| Concept pairs | electricity:prices |
| Frequency | annual; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 1861 ms AI; 79 ms local |

Retrieval: `FL:electricity:prices:residential`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.PRICE.FL-RES.A` | Average retail price of electricity : Florida : residential : annual | domestic/primary/A | 82.5 | annual | cents per kilowatthour | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, activity_exact_prices, ordinary_series, lexical_title_residential, lexical_title_electricity, residential_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |

### Q17

Raw input:

```text
  “Ohio”[NBSP]monthly coal[NEWLINE]
 consumption   electric power[TAB]sector 
```

Mechanically cleaned: `"Ohio" monthly coal consumption electric power sector`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Ohio" monthly coal consumption electric power sector` |
| Geography | Ohio (OH) |
| Product / breadth | coal / specific |
| Activity / sector | consumption / electric power |
| Concept pairs | coal:consumption, electricity:consumption |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2382 ms AI; 277 ms local |

Retrieval: `OH:coal:consumption:electric power`; warnings: product_contains_unrequested_concepts; activity_contains_unrequested_concepts; mixed_consumption_generation_activity; activity_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.CONS_TOT_BTU.COW-OH-1.M` | Total consumption (Btu) : Ohio : electric utility : coal : monthly | domestic/primary/A | 83.8 | monthly | million MMBtu | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_description_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | `ELEC.CONS_TOT_BTU.COW-OH-2.M` | Total consumption (Btu) : Ohio : electric utility non-cogen : coal : monthly | domestic/primary/A | 83.8 | monthly | million MMBtu | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_description_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | `ELEC.CONS_TOT_BTU.COW-OH-3.M` | Total consumption (Btu) : Ohio : electric utility cogen : coal : monthly | domestic/primary/A | 83.8 | monthly | million MMBtu | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_description_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | `ELEC.CONS_TOT_BTU.COW-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : coal : monthly | domestic/primary/C | 83.2 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | `ELEC.CONS_UTO_BTU.COW-OH-98.M` | Consumption for useful thermal output (Btu) : Ohio : electric power (total) : coal : monthly | domestic/primary/C | 81.2 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, product_extra_concept_penalty, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts, activity_contains_unrequested_concepts |

Retrieval: `OH:electricity:consumption:electric power`; warnings: eia:1:6b6e509cd77e73c569c0ade63b60fc181e77201ebbf0090d0e9465db1ea6e60b:primary:product_or_scope_hard_gate_failed; eia:1:c22ce5a4016d0d07e00c3cdcf5713f69825ec2bb0f394ff12763d477d9106f18:primary:product_or_scope_hard_gate_failed; eia:1:0fc9936898c19a43082c2fc82c5a9a6ce65e1040f4578786807b38b92dc13e3a:primary:product_or_scope_hard_gate_failed; eia:1:3f9136ffdf6c292dc18e8b5f9eb6239ae4328170e6246a40e38a950c836efd7b:primary:product_or_scope_hard_gate_failed; eia:1:a131fdd03a26ba5a93904291be38cb10762b1713e96f1e9bcee789cbd0040f77:primary:product_or_scope_hard_gate_failed; product_contains_unrequested_concepts; mixed_consumption_generation_activity; activity_contains_unrequested_concepts; activity_semantic_floor_failed; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.CONS_TOT_BTU.COW-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : coal : monthly | domestic/primary/C | 83.7 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | `ELEC.CONS_TOT_BTU.NG-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : natural gas : monthly | domestic/primary/C | 78.8 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | `ELEC.CONS_TOT_BTU.PC-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : petroleum coke : monthly | domestic/primary/C | 78.8 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | `ELEC.CONS_TOT_BTU.PEL-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : petroleum liquids : monthly | domestic/primary/C | 78.8 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Ohio monthly coal consumption electric power sector` |
| Geography | Ohio (OH) |
| Product / breadth | coal / specific |
| Activity / sector | consumption / electric power |
| Concept pairs | coal:consumption, electricity:consumption |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2232 ms AI; 305 ms local |

Retrieval: `OH:coal:consumption:electric power`; warnings: product_contains_unrequested_concepts; activity_contains_unrequested_concepts; mixed_consumption_generation_activity; activity_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.CONS_TOT_BTU.COW-OH-1.M` | Total consumption (Btu) : Ohio : electric utility : coal : monthly | domestic/primary/A | 83.8 | monthly | million MMBtu | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_description_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | `ELEC.CONS_TOT_BTU.COW-OH-2.M` | Total consumption (Btu) : Ohio : electric utility non-cogen : coal : monthly | domestic/primary/A | 83.8 | monthly | million MMBtu | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_description_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | `ELEC.CONS_TOT_BTU.COW-OH-3.M` | Total consumption (Btu) : Ohio : electric utility cogen : coal : monthly | domestic/primary/A | 83.8 | monthly | million MMBtu | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_description_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 4 | `ELEC.CONS_TOT_BTU.COW-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : coal : monthly | domestic/primary/C | 83.2 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 5 | `ELEC.CONS_UTO_BTU.COW-OH-98.M` | Consumption for useful thermal output (Btu) : Ohio : electric power (total) : coal : monthly | domestic/primary/C | 81.2 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_coal, product_extra_concept_penalty, activity_exact_consumption, activity_extra_concept_penalty, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts, activity_contains_unrequested_concepts |

Retrieval: `OH:electricity:consumption:electric power`; warnings: eia:1:6b6e509cd77e73c569c0ade63b60fc181e77201ebbf0090d0e9465db1ea6e60b:primary:product_or_scope_hard_gate_failed; eia:1:c22ce5a4016d0d07e00c3cdcf5713f69825ec2bb0f394ff12763d477d9106f18:primary:product_or_scope_hard_gate_failed; eia:1:0fc9936898c19a43082c2fc82c5a9a6ce65e1040f4578786807b38b92dc13e3a:primary:product_or_scope_hard_gate_failed; eia:1:3f9136ffdf6c292dc18e8b5f9eb6239ae4328170e6246a40e38a950c836efd7b:primary:product_or_scope_hard_gate_failed; eia:1:a131fdd03a26ba5a93904291be38cb10762b1713e96f1e9bcee789cbd0040f77:primary:product_or_scope_hard_gate_failed; product_contains_unrequested_concepts; mixed_consumption_generation_activity; activity_contains_unrequested_concepts; activity_semantic_floor_failed; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.CONS_TOT_BTU.COW-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : coal : monthly | domestic/primary/C | 83.7 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_coal, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | product_contains_unrequested_concepts |
| 2 | `ELEC.CONS_TOT_BTU.NG-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : natural gas : monthly | domestic/primary/C | 78.8 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 3 | `ELEC.CONS_TOT_BTU.PC-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : petroleum coke : monthly | domestic/primary/C | 78.8 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |
| 4 | `ELEC.CONS_TOT_BTU.PEL-OH-98.M` | Total consumption (Btu) : Ohio : electric power (total) : petroleum liquids : monthly | domestic/primary/C | 78.8 | monthly | million MMBtu | tier_C, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, sector_hard_gate_passed, frequency_validated, product_exact_electricity, product_extra_concept_penalty, activity_exact_consumption, aggregate_metadata_match, lexical_title_consumption, lexical_title_electric, lexical_title_power, electric_power_exact, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | product_contains_unrequested_concepts |

### Q18

Raw input:

```text
[TAB]‘France’[NBSP]annual nuclear[NEWLINE]
 electricity   generation 
```

Mechanically cleaned: `'France' annual nuclear electricity generation`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'France' annual nuclear electricity generation` |
| Geography | France (FRA) |
| Product / breadth | nuclear / specific |
| Activity / sector | generation / none |
| Concept pairs | nuclear:generation |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2353 ms AI; 1513 ms local |

Retrieval: `FRA:nuclear:generation`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.27-12-FRA-BKWH.A` | Nuclear electricity net generation, France, Annual | international/primary/A | 96.5 | annual | billion kilowatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_nuclear, activity_exact_generation, aggregate_metadata_match, lexical_title_nuclear, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `France annual nuclear electricity generation` |
| Geography | France (FRA) |
| Product / breadth | nuclear / specific |
| Activity / sector | generation / none |
| Concept pairs | nuclear:generation |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | none / none |
| Timing | 2769 ms AI; 75 ms local |

Retrieval: `FRA:nuclear:generation`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.27-12-FRA-BKWH.A` | Nuclear electricity net generation, France, Annual | international/primary/A | 96.5 | annual | billion kilowatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_nuclear, activity_exact_generation, aggregate_metadata_match, lexical_title_nuclear, lexical_title_electricity, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |

### Q19

Raw input:

```text
  “Colorado”[NBSP]monthly solar[TAB] generation,   not consumption[NEWLINE]

```

Mechanically cleaned: `"Colorado" monthly solar generation, not consumption`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `"Colorado" monthly solar generation, not consumption` |
| Geography | Colorado (CO) |
| Product / breadth | solar / specific |
| Activity / sector | generation / none |
| Concept pairs | solar:generation |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [{"type":"activity","value":"consumption","order":0,"confidence":1,"source":"deterministic_negation"}] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2385 ms AI; 2119 ms local |

Retrieval: `CO:solar:generation`; warnings: sector_specific_not_requested; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.GEN.DPV-CO-99.M` | Net generation : Colorado : all sectors : small-scale solar photovoltaic : monthly | domestic/primary/A | 81 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, official_all_sectors_total_priority, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | `ELEC.GEN.TSN-CO-99.M` | Net generation : Colorado : all sectors : all solar : monthly | domestic/primary/A | 81 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, official_all_sectors_total_priority, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | `ELEC.GEN.TSN-CO-94.M` | Net generation : Colorado : independent power producers (total) : all solar : monthly | domestic/primary/A | 77.6 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 4 | `ELEC.GEN.SUN-CO-99.M` | Net generation : Colorado : all sectors : all utility-scale solar : monthly | domestic/primary/A | 69.8 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, unrequested_sector_specific, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | sector_specific_not_requested |
| 5 | `ELEC.GEN.DPV-CO-8.M` | Net generation : Colorado : residential : small-scale solar photovoltaic : monthly | domestic/primary/A | 69.8 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, unrequested_sector_specific, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Colorado monthly solar generation` |
| Geography | Colorado (CO) |
| Product / breadth | solar / specific |
| Activity / sector | generation / none |
| Concept pairs | solar:generation |
| Frequency | monthly; explicit=true |
| Route | domestic |
| Exclusions | [{"type":"activity","value":"consumption","order":0,"confidence":1,"source":"deterministic_negation"}] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2591 ms AI; 117 ms local |

Retrieval: `CO:solar:generation`; warnings: sector_specific_not_requested; product_or_scope_semantic_floor_failed.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `ELEC.GEN.DPV-CO-99.M` | Net generation : Colorado : all sectors : small-scale solar photovoltaic : monthly | domestic/primary/A | 100 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, official_all_sectors_total_priority, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 2 | `ELEC.GEN.TSN-CO-99.M` | Net generation : Colorado : all sectors : all solar : monthly | domestic/primary/A | 100 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, official_all_sectors_total_priority, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | none |
| 3 | `ELEC.GEN.TSN-CO-94.M` | Net generation : Colorado : independent power producers (total) : all solar : monthly | domestic/primary/A | 96.5 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, aggregate_metadata_match, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | none |
| 4 | `ELEC.GEN.SUN-CO-99.M` | Net generation : Colorado : all sectors : all utility-scale solar : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, unrequested_sector_specific, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested | sector_specific_not_requested |
| 5 | `ELEC.GEN.DPV-CO-8.M` | Net generation : Colorado : residential : small-scale solar photovoltaic : monthly | domestic/primary/A | 88.7 | monthly | thousand megawatthours | tier_A, source_pool_primary, route_family_validated, geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, negation_hard_gate_passed, frequency_validated, product_exact_solar, activity_exact_generation, unrequested_sector_specific, lexical_title_solar, lexical_title_generation, frequency_exact, current_active, availability_present, broad_scope_preferred_no_subtype_requested, equivalent_semantic_choice | sector_specific_not_requested |

### Q20

Raw input:

```text
[NEWLINE]
‘Canada’[NBSP]annual natural gas   imports[TAB]and exports  
```

Mechanically cleaned: `'Canada' annual natural gas imports and exports`

#### Raw + mechanically cleaned

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `'Canada' annual natural gas imports and exports` |
| Geography | Canada (CAN) |
| Product / breadth | natural gas / specific |
| Activity / sector | imports / none |
| Concept pairs | natural gas:imports, natural gas:exports |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2583 ms AI; 1488 ms local |

Retrieval: `CAN:natural gas:imports`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.26-3-CAN-BCF.A` | Dry natural gas imports, Canada, Annual | international/primary/A | 81 | annual | billion cubic feet | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_imports, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_imports, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |

Retrieval: `CAN:natural gas:exports`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.26-4-CAN-BCF.A` | Dry natural gas exports, Canada, Annual | international/primary/A | 81 | annual | billion cubic feet | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_exports, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_exports, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |

#### Raw only

| Intent field | Value |
| --- | --- |
| Interpreter | openai |
| Corrected query | `Canada annual natural gas imports and exports` |
| Geography | Canada (CAN) |
| Product / breadth | natural gas / specific |
| Activity / sector | imports / none |
| Concept pairs | natural gas:imports, natural gas:exports |
| Frequency | annual; explicit=true |
| Route | international |
| Exclusions | [] |
| Unknown qualifiers | [] |
| Fallback / clarification | fallback / none |
| Timing | 2590 ms AI; 130 ms local |

Retrieval: `CAN:natural gas:imports`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.26-3-CAN-BCF.A` | Dry natural gas imports, Canada, Annual | international/primary/A | 81 | annual | billion cubic feet | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_imports, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_imports, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |

Retrieval: `CAN:natural gas:exports`; warnings: none.

| Rank | Series/candidate | Title | Route/pool/tier | Score | Frequency | Unit | Reasons | Warnings |
| ---: | --- | --- | --- | ---: | --- | --- | --- | --- |
| 1 | `INTL.26-4-CAN-BCF.A` | Dry natural gas exports, Canada, Annual | international/primary/A | 81 | annual | billion cubic feet | tier_A, source_pool_primary, route_family_validated, geography_validated, selector_geography_validated, product_or_scope_hard_gate_passed, activity_hard_gate_passed, frequency_validated, product_exact_natural_gas, activity_exact_exports, ordinary_series, lexical_title_natural, lexical_title_gas, lexical_title_exports, frequency_exact, current_active, availability_present, unrequested_subtype_qualifiers_1, equivalent_semantic_choice | none |

## GPT analysis instructions

Assess whether supplying the mechanically cleaned copy materially improved validated intent, routing, warnings, or top-five candidate quality. Treat score/order differences as downstream consequences of intent differences because semantic reranking was disabled. Identify failures, regressions, and cases where both conditions were equally wrong. Do not attribute deterministic ranking points to the AI model.

