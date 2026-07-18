# HoHo8 Blinded Release-Candidate Review

Compare the two results without trying to identify which one is deployed. Review every case in this packet.

For each query, mark acceptable results, choose a preference or tie, and identify any unacceptable result. Use severity only when a result could mislead the user.

## Review Cases

### H7-D002

**Raw query:** Texas monthly total energy consumption

**Categories:** seds, frequency-fallback, total-energy

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: domestic
- Geographies: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. SEDS.TETCB.TX.A | Total energy consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=approved_fallback | aggregation=verified_aggregate
  2. SEDS.TEACB.TX.A | Total energy consumption in the transportation sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=approved_fallback | aggregation=unknown
  3. SEDS.TEAPB.TX.A | Total energy consumption per capita in the transportation sector, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=approved_fallback | aggregation=unknown
  4. SEDS.TECCB.TX.A | Total energy consumption in the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=approved_fallback | aggregation=unknown
  5. SEDS.TECPB.TX.A | Total energy consumption per capita in the commercial sector, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=approved_fallback | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. SEDS.TETCB.TX.A | Total energy consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=verified_aggregate
  2. SEDS.TEACB.TX.A | Total energy consumption in the transportation sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  3. SEDS.TEAPB.TX.A | Total energy consumption per capita in the transportation sector, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=not reported | aggregation=unknown
  4. SEDS.TECCB.TX.A | Total energy consumption in the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  5. SEDS.TECPB.TX.A | Total energy consumption per capita in the commercial sector, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D016

**Raw query:** Texas natural gas production

**Categories:** seds, natural-gas, production

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.TX.A | Natural gas marketed production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.NGMPK.TX.A | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | frequency=annual | unit=Thousand Btu per cubic feet | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.TX.A | Natural gas marketed production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D019

**Raw query:** Texas coal production and natural gas consumption

**Categories:** multiple-concept-pairs, pair-scope, domestic

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: coal / production; natural gas / consumption
- Top candidates:
  1. SEDS.CLPRB.TX.A | Coal production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.CLPRK.TX.A | Factor for converting coal production from physical units to Btu, Texas | route=seds | frequency=annual | unit=Million Btu per short ton | routeRelation=exact | aggregation=unknown
  3. SEDS.NGCCB.TX.A | Natural gas delivered to the commercial sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  4. SEDS.NGRCB.TX.A | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  5. SEDS.NGTCB.TX.A | Natural gas total consumption (including supplemental gaseous fuels), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: coal / production; natural gas / consumption
- Top candidates:
  1. SEDS.CLPRB.TX.A | Coal production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  2. SEDS.NGCCB.TX.A | Natural gas delivered to the commercial sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  3. SEDS.NGRCB.TX.A | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  4. SEDS.NGTCB.TX.A | Natural gas total consumption (including supplemental gaseous fuels), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  5. SEDS.NGTPB.TX.A | Natural gas total consumption (including supplemental gaseous fuels) per capita, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D020

**Raw query:** Texas oil and natural gas production

**Categories:** multiple-concept-pairs, shared-activity, domestic

#### Result A

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: petroleum / production; natural gas / production
- Top candidates:
  1. SEDS.PAPRB.TX.A | Crude oil production (including lease condensate), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  2. SEDS.B1PRB.TX.A | Renewable diesel production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  3. SEDS.NGMPB.TX.A | Natural gas marketed production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

#### Result B

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: petroleum / production; natural gas / production
- Top candidates:
  1. SEDS.COPRK.TX.A | Factor for converting crude oil production from physical units to Btu for the United States, Texas | route=seds | frequency=annual | unit=Million Btu per barrel | routeRelation=exact | aggregation=unknown
  2. SEDS.PAPRB.TX.A | Crude oil production (including lease condensate), Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  3. SEDS.B1PRB.TX.A | Renewable diesel production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  4. SEDS.NGMPB.TX.A | Natural gas marketed production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  5. SEDS.NGMPK.TX.A | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | frequency=annual | unit=Thousand Btu per cubic feet | routeRelation=exact | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D021

**Raw query:** Texas coal and natural gas production and consumption

**Categories:** clarification, unresolved-pair-scope, adversarial

#### Result A

- HTTP status: 0
- Clarification: required
- Route: seds
- Geographies: TX
- Concept pairs: coal / production
- Top candidates:
  - None

#### Result B

- HTTP status: 200
- Clarification: required
- Route: seds
- Geographies: TX
- Concept pairs: coal / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D022

**Raw query:** Califronia natural gas prodction

**Categories:** misspelling, seds, natural-gas

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: CA
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.CA.A | Natural gas marketed production, California | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.NGMPK.CA.A | Factor for converting marketed natural gas production from physical units to Btu, California | route=seds | frequency=annual | unit=Thousand Btu per cubic feet | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: CA
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.CA.A | Natural gas marketed production, California | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D033

**Raw query:** Texas nuclear energy consumption

**Categories:** seds, hierarchy-component-control, nuclear

#### Result A

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: nuclear / consumption; total energy / consumption
- Top candidates:
  1. SEDS.TETCB.TX.A | Total energy consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=verified_aggregate
  2. SEDS.TEACB.TX.A | Total energy consumption in the transportation sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  3. SEDS.TEAPB.TX.A | Total energy consumption per capita in the transportation sector, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=not reported | aggregation=unknown
  4. SEDS.TECCB.TX.A | Total energy consumption in the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  5. SEDS.TECPB.TX.A | Total energy consumption per capita in the commercial sector, Texas | route=seds | frequency=annual | unit=Million Btu | routeRelation=not reported | aggregation=unknown

#### Result B

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: nuclear / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D041

**Raw query:** Georgia natural gas production

**Categories:** geography-default, state, adversarial

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: GA
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.GA.A | Natural gas marketed production, Georgia | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.NGMPK.GA.A | Factor for converting marketed natural gas production from physical units to Btu, Georgia | route=seds | frequency=annual | unit=Thousand Btu per cubic feet | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: GA
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.GA.A | Natural gas marketed production, Georgia | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D046

**Raw query:** Texas natural gas production in billion cubic feet

**Categories:** seds, natural-gas, unit

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.TX.A | Natural gas marketed production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.NGMPK.TX.A | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | frequency=annual | unit=Thousand Btu per cubic feet | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.TX.A | Natural gas marketed production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D050

**Raw query:** Texas coal consumption and production

**Categories:** domestic, multiple-concept-pairs, shared-product

#### Result A

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: coal / consumption; coal / production
- Top candidates:
  1. SEDS.CLTCB.TX.A | Coal total consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  2. SEDS.CLTXB.TX.A | Coal total end-use consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  3. SEDS.CLACB.TX.A | Coal consumed by the transportation sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  4. SEDS.CLCCB.TX.A | Coal consumed by the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  5. SEDS.CLPRB.TX.A | Coal production, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

#### Result B

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: coal / consumption; coal / production
- Top candidates:
  1. SEDS.CLTCB.TX.A | Coal total consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.CLTXB.TX.A | Coal total end-use consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  3. SEDS.CLACB.TX.A | Coal consumed by the transportation sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  4. SEDS.CLACK.TX.A | Factor for converting coal consumed by the transportation sector from physical units to Btu, Texas | route=seds | frequency=annual | unit=Million Btu per short ton | routeRelation=exact | aggregation=unknown
  5. SEDS.CLCCB.TX.A | Coal consumed by the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H8-X001

**Raw query:** Texas solar energy consumption

**Categories:** adversarial, specific-source, hierarchy-control

#### Result A

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: solar / consumption; total energy / consumption
- Top candidates:
  1. SEDS.SOTCB.TX.A | Solar energy total consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  2. SEDS.SOTXB.TX.A | Solar energy total end-use consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  3. SEDS.SOCCB.TX.A | Solar energy consumed by the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  4. SEDS.SOICB.TX.A | Solar energy consumed by the industrial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown
  5. SEDS.SORCB.TX.A | Solar energy consumed by the residential sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

#### Result B

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: TX
- Concept pairs: solar / consumption
- Top candidates:
  1. SEDS.SOTCB.TX.A | Solar energy total consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.SOTXB.TX.A | Solar energy total end-use consumption, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  3. SEDS.SOCCB.TX.A | Solar energy consumed by the commercial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  4. SEDS.SOICB.TX.A | Solar energy consumed by the industrial sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  5. SEDS.SORCB.TX.A | Solar energy consumed by the residential sector, Texas | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H8-X003

**Raw query:** Georgia and USA natural gas production

**Categories:** adversarial, geography-context, seds

#### Result A

- HTTP status: 200
- Clarification: not required
- Route: seds
- Geographies: GA, USA
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.GA.A | Natural gas marketed production, Georgia | route=seds | frequency=annual | unit=Billion Btu | routeRelation=not reported | aggregation=unknown

#### Result B

- HTTP status: 0
- Clarification: not required
- Route: seds
- Geographies: GA, USA
- Concept pairs: natural gas / production
- Top candidates:
  1. SEDS.NGMPB.GA.A | Natural gas marketed production, Georgia | route=seds | frequency=annual | unit=Billion Btu | routeRelation=exact | aggregation=unknown
  2. SEDS.NGMPK.GA.A | Factor for converting marketed natural gas production from physical units to Btu, Georgia | route=seds | frequency=annual | unit=Thousand Btu per cubic feet | routeRelation=exact | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H8-X002

**Raw query:** Georgia and France natural gas production

**Categories:** adversarial, geography-context, international

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: international
- Geographies: FRA
- Concept pairs: natural gas / production
- Top candidates:
  1. INTL.26-1-FRA-BCF.A | Dry natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=exact | aggregation=unknown
  2. INTL.3-1-FRA-BCF.A | Gross natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=exact | aggregation=unknown
  3. INTL.43-1-FRA-BCF.A | Vented and flared natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=exact | aggregation=unknown
  4. INTL.48-1-FRA-BCF.A | Reinjected natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=exact | aggregation=unknown
  5. INTL.58-1-FRA-TBPD.M | Natural gas plant liquids production, France, Monthly | route=international | frequency=monthly | unit=thousand barrels per day | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: international
- Geographies: FRA
- Concept pairs: natural gas / production
- Top candidates:
  1. INTL.26-1-FRA-BCF.A | Dry natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=not reported | aggregation=unknown
  2. INTL.3-1-FRA-BCF.A | Gross natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=not reported | aggregation=unknown
  3. INTL.43-1-FRA-BCF.A | Vented and flared natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=not reported | aggregation=unknown
  4. INTL.48-1-FRA-BCF.A | Reinjected natural gas production, France, Annual | route=international | frequency=annual | unit=billion cubic feet | routeRelation=not reported | aggregation=unknown
  5. INTL.58-1-FRA-TBPD.M | Natural gas plant liquids production, France, Monthly | route=international | frequency=monthly | unit=thousand barrels per day | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D011

**Raw query:** Germany renewable energy production and consumption

**Categories:** international, multiple-concept-pairs

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: international
- Geographies: DEU
- Concept pairs: renewable / production; renewable / consumption
- Top candidates:
  1. INTL.4418-1-DEU-QBTU.A | Total energy production from renewables and other, Germany, Annual | route=international | frequency=annual | unit=quadrillion Btu | routeRelation=exact | aggregation=unknown
  2. INTL.79-1-DEU-MT.A | Biofuels production, Germany, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=exact | aggregation=unknown
  3. INTL.4418-2-DEU-QBTU.A | Total energy consumption from renewables and other, Germany, Annual | route=international | frequency=annual | unit=quadrillion Btu | routeRelation=exact | aggregation=unknown
  4. INTL.79-2-DEU-MT.A | Biofuels consumption, Germany, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: international
- Geographies: DEU
- Concept pairs: renewable / production; renewable / consumption
- Top candidates:
  1. INTL.4418-1-DEU-QBTU.A | Total energy production from renewables and other, Germany, Annual | route=international | frequency=annual | unit=quadrillion Btu | routeRelation=not reported | aggregation=unknown
  2. INTL.79-1-DEU-MT.A | Biofuels production, Germany, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=not reported | aggregation=unknown
  3. INTL.4418-2-DEU-QBTU.A | Total energy consumption from renewables and other, Germany, Annual | route=international | frequency=annual | unit=quadrillion Btu | routeRelation=not reported | aggregation=unknown
  4. INTL.79-2-DEU-MT.A | Biofuels consumption, Germany, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D039

**Raw query:** Mexico petroleum consumption

**Categories:** international, petroleum, clear

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: international
- Geographies: MEX
- Concept pairs: petroleum / consumption
- Top candidates:
  1. INTL.5-2-MEX-MT.A | Petroleum and other liquids consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=exact | aggregation=unknown
  2. INTL.54-2-MEX-MT.A | Refined petroleum products consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=exact | aggregation=unknown
  3. INTL.67-2-MEX-MT.A | Liquefied petroleum gases (LPG) consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=exact | aggregation=unknown
  4. INTL.65-13-MEX-TBPD.A | Bunker distillate fuel oil consumption, Mexico, Annual | route=international | frequency=annual | unit=thousand barrels per day | routeRelation=exact | aggregation=unknown
  5. INTL.66-13-MEX-MT.A | Bunker residual fuel oil consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: international
- Geographies: MEX
- Concept pairs: petroleum / consumption
- Top candidates:
  1. INTL.5-2-MEX-MT.A | Petroleum and other liquids consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=not reported | aggregation=unknown
  2. INTL.54-2-MEX-MT.A | Refined petroleum products consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=not reported | aggregation=unknown
  3. INTL.67-2-MEX-MT.A | Liquefied petroleum gases (LPG) consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=not reported | aggregation=unknown
  4. INTL.65-13-MEX-TBPD.A | Bunker distillate fuel oil consumption, Mexico, Annual | route=international | frequency=annual | unit=thousand barrels per day | routeRelation=not reported | aggregation=unknown
  5. INTL.66-13-MEX-MT.A | Bunker residual fuel oil consumption, Mexico, Annual | route=international | frequency=annual | unit=1000 metric tons | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D018

**Raw query:** Texas natural gas excluding production

**Categories:** clarification, exclusion, missing-activity

#### Result A

- HTTP status: 200
- Clarification: required
- Route: seds
- Geographies: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result B

- HTTP status: 0
- Clarification: required
- Route: seds
- Geographies: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D010

**Raw query:** Japan monthly solar electricity generation

**Categories:** international, electricity, frequency-fallback

#### Result A

- HTTP status: 0
- Clarification: not required
- Route: international
- Geographies: JPN
- Concept pairs: solar / generation
- Top candidates:
  1. INTL.116-12-JPN-BKWH.A | Solar electricity net generation, Japan, Annual | route=international | frequency=annual | unit=billion kilowatthours | routeRelation=exact | aggregation=unknown
  2. INTL.36-12-JPN-BKWH.A | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | route=international | frequency=annual | unit=billion kilowatthours | routeRelation=exact | aggregation=unknown

#### Result B

- HTTP status: 200
- Clarification: not required
- Route: international
- Geographies: JPN
- Concept pairs: solar / generation
- Top candidates:
  1. INTL.116-12-JPN-BKWH.A | Solar electricity net generation, Japan, Annual | route=international | frequency=annual | unit=billion kilowatthours | routeRelation=not reported | aggregation=unknown
  2. INTL.36-12-JPN-BKWH.A | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | route=international | frequency=annual | unit=billion kilowatthours | routeRelation=not reported | aggregation=unknown

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

### H7-D017

**Raw query:** Texas monthly natural gas

**Categories:** clarification, frequency, missing-activity

#### Result A

- HTTP status: 200
- Clarification: required
- Route: domestic
- Geographies: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result B

- HTTP status: 0
- Clarification: required
- Route: domestic
- Geographies: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable results: ____________________
- Preferred result or tie: ____________________
- Unacceptable results: ____________________
- Severity: none / minor / material / critical
- Reason: ____________________
- Reviewer notes: ____________________

## Completion

- Number reviewed: ______
- Reviewer initials: ______
- Review date: ______
