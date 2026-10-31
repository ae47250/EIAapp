The 12 second-set questions, twice: 21/24 meanings correct, 23/24 final local checks passed, 21/24 correct data/clarification outcomes, zero unlabelled wrong data. First attempt: 21 meanings and 22 local checks passed. Two local-check re-asks were used; wrong meanings were never retried to improve the score.

These questions test reading independently of the locked-form instructions. The lookup list was built knowing these questions, so they are not an independent test of the list. They become regression cases after this run.

The list was built knowing these questions. These are now regression cases. The expectations and scoring are self-adjudicated until an independent reviewer checks them.

| Question | Run | Meaning | Checks | Data | Clarification | Exact displayed EIA name / unit, or failure | Generation estimate |
|---|---:|---|---|---|---|---|---:|
| I1 — how much crude oil does saudi arabia export? not sure if eia even has that | 1 | PASS | PASS | PASS | No | SAU petroleum/exports: Crude oil including lease condensate — Exports — thousand barrels per day; annual | $0.00079468 |
| I2 — residential electricity prices in pensilvania per month | 1 | PASS | PASS | PASS | No | PA electricity/prices: Average Price of Electricity to Ultimate Customers — cents per kilowatt-hour; monthly | $0.00017013 |
| I3 — coal production and exports for australia and indonesia | 1 | PASS | PASS | PASS | No | AUS coal/production: Coal — Production — thousand short tons; annual / AUS coal/exports: Coal — Exports — thousand short tons; annual / IDN coal/production: Coal — Production — thousand short tons; annual / IDN coal/exports: Coal — Exports — thousand short tons; annual | $0.00018737 |
| I4 — what are gas prices like in michigan lately | 1 | PASS | PASS | PASS | Yes | Correct clarification | $0.00018700 |
| I5 — electricity consumption in riverton | 1 | PASS | PASS | PASS | Yes | Correct clarification | $0.00016062 |
| I6 — energy consumption in new york excluding the transportation sector | 1 | PASS | PASS | PASS | No | EIA does not publish total energy consumption excluding transportation for New York. | $0.00017600 |
| I7 — natural gas reserves for all the US states except alaska | 1 | PASS | PASS | PASS | No | USA natural gas/reserves: Lower 48 States Dry Natural Gas Expected Future Production (Billion Cubic Feet) — Billion cubic feet; annual | $0.00022112 |
| I8 — hydroelectic capacity in norway and sweden | 1 | PASS | PASS | PASS | No | NOR hydro/capacity: Hydroelectricity — Capacity — million kilowatts; annual / SWE hydro/capacity: Hydroelectricity — Capacity — million kilowatts; annual | $0.00018350 |
| I9 — weekly natural gas storage numbers for the US please, thanks so much | 1 | PASS | PASS | PASS | No | USA natural gas/storage: Weekly Lower 48 States Natural Gas Working Underground Storage (Billion Cubic Feet) — Billion cubic feet; weekly | $0.00016600 |
| I10 — uh hi so basically im trying to figure out like how many electricity customers there are in arizona and nevada, its for a class thing | 1 | PASS | PASS | PASS | No | AZ electricity/customers: Number of Ultimate Customers — number of customers; annual / NV electricity/customers: Number of Ultimate Customers — number of customers; annual | $0.00017987 |
| I11 — compare georgia and armenia natural gas imports | 1 | PASS | PASS | PASS | No | GEO natural gas/imports: Dry natural gas — Imports — billion cubic feet; annual / ARM natural gas/imports: Dry natural gas — Imports — billion cubic feet; annual | $0.00017750 |
| I12 — biofuel production in iowa and nebraksa | 1 | FAIL | PASS | FAIL | Yes | unexpected_clarification; IA/biofuels/production:missing_entry; NE/biofuels/production:missing_entry | $0.00042200 |
| I1 — how much crude oil does saudi arabia export? not sure if eia even has that | 2 | PASS | PASS | PASS | No | SAU petroleum/exports: Crude oil including lease condensate — Exports — thousand barrels per day; annual | $0.00017459 |
| I2 — residential electricity prices in pensilvania per month | 2 | PASS | PASS | PASS | No | PA electricity/prices: Average Price of Electricity to Ultimate Customers — cents per kilowatt-hour; monthly | $0.00012850 |
| I3 — coal production and exports for australia and indonesia | 2 | PASS | PASS | PASS | No | AUS coal/production: Coal — Production — thousand short tons; annual / AUS coal/exports: Coal — Exports — thousand short tons; annual / IDN coal/production: Coal — Production — thousand short tons; annual / IDN coal/exports: Coal — Exports — thousand short tons; annual | $0.00015448 |
| I4 — what are gas prices like in michigan lately | 2 | PASS | PASS | PASS | Yes | Correct clarification | $0.00015349 |
| I5 — electricity consumption in riverton | 2 | PASS | PASS | PASS | Yes | Correct clarification | $0.00012596 |
| I6 — energy consumption in new york excluding the transportation sector | 2 | PASS | PASS | PASS | No | EIA does not publish total energy consumption excluding transportation for New York. | $0.00014749 |
| I7 — natural gas reserves for all the US states except alaska | 2 | FAIL | PASS | FAIL | No | USA/natural gas/reserves:missing_entry; unexpected_entries | $0.00065050 |
| I8 — hydroelectic capacity in norway and sweden | 2 | PASS | PASS | PASS | No | NOR hydro/capacity: Hydroelectricity — Capacity — million kilowatts; annual / SWE hydro/capacity: Hydroelectricity — Capacity — million kilowatts; annual | $0.00014799 |
| I9 — weekly natural gas storage numbers for the US please, thanks so much | 2 | PASS | PASS | PASS | No | USA natural gas/storage: Weekly Lower 48 States Natural Gas Working Underground Storage (Billion Cubic Feet) — Billion cubic feet; weekly | $0.00012503 |
| I10 — uh hi so basically im trying to figure out like how many electricity customers there are in arizona and nevada, its for a class thing | 2 | PASS | PASS | PASS | No | AZ electricity/customers: Number of Ultimate Customers — number of customers; annual / NV electricity/customers: Number of Ultimate Customers — number of customers; annual | $0.00014668 |
| I11 — compare georgia and armenia natural gas imports | 2 | PASS | PASS | PASS | No | GEO natural gas/imports: Dry natural gas — Imports — billion cubic feet; annual / ARM natural gas/imports: Dry natural gas — Imports — billion cubic feet; annual | $0.00015149 |
| I12 — biofuel production in iowa and nebraksa | 2 | FAIL | FAIL | FAIL | Yes | unexpected_clarification; IA/biofuels/production:missing_entry; NE/biofuels/production:missing_entry | $0.00035772 |

The three failed outcomes remain unfixed by design: I12 run 1 omitted Iowa and asked an unnecessary geography clarification after a validation re-ask; I12 run 2 still failed validation after its one re-ask; I7 run 2 enumerated individual states instead of the owner-approved USA aggregate excluding Alaska. No prompt, schema, check or expected answer was revised.

I7 run 2 also exposed an evaluation/direct-route serialization error: the expanded internal intent was 31,741 characters; the browser source-form payload was 4,215. The shared source-only serializer now covers both paths. [The zero-call replay](serialization-replay.json) preserves the old record, shows 49 unsupported state requests instead of a false payload rejection, and leaves the 21/24 score unchanged.

Cost: [reconciled usage](cost-reconciliation.json) includes cache writes, unlike the simpler initial estimates retained in the original scored records. All raw outputs and both attempts are preserved under live-model/.
