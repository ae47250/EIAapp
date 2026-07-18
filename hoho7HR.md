# HoHo7 Blinded Human Review Packet

## 1. Review Instructions

Evaluate semantic usefulness and safety. Do not try to identify which system produced a result. A first-ranked result is not automatically a total. Hierarchy is known only for the approved 52-target SEDS total-energy relationship family; all other parent, child, total, component, subtype, and cross-route relationships remain unknown. Clarification is preferable to an unsupported guess, and multiple result sets may be equally acceptable.

Do not treat machine ordering as a human judgment. Select all acceptable arms, then identify a preference or tie.

## 2. Review Reason Codes

- [ ] correct clarification
- [ ] unnecessary clarification
- [ ] missed clarification
- [ ] correct product/activity
- [ ] wrong product
- [ ] wrong activity
- [ ] correct concept pairing
- [ ] cross-pair error
- [ ] correct geography
- [ ] correct route
- [ ] exclusion respected
- [ ] relevant top five
- [ ] useful ordering
- [ ] relevant candidate lost
- [ ] hierarchy uncertainty handled correctly
- [ ] unsupported hierarchy claim
- [ ] correct frequency/unit/coverage disclosure
- [ ] misleading fallback presentation
- [ ] no meaningful difference
- [ ] cannot determine

## 3. Query Review Blocks

### H7-D001

**Raw query:** California monthly electricity generation

**Categories:** domestic, electricity, frequency

#### Result A

- Clarification: not required
- Route: domestic
- Geography: CA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:da79c4924dc4300465dab4814e933ca892d310bb463f42f71e9eb417c0c15a6b | Net generation : California : electric utility : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:c31487d47fbae78c33aae0c34ccc12db0840882f50edd92178045dd9f6ea9287 | Net generation : California : electric utility non-cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:b6d031e4305aff870d0c508721126ac0344a70af63600e2ab13e7c758b0ef20d | Net generation : California : electric utility cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:323c479de925e22747ee8ef985ea58d435270515055ec9131004c746d573a5c3 | Net generation : California : commercial non-cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:41dc891e8fd467b0cfc2bd7e626304215d29f90394a2758a6b0c3e34b8406dc1 | Net generation : California : commercial cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: CA
- Concept pairs: electricity / generation
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: domestic
- Geography: CA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:da79c4924dc4300465dab4814e933ca892d310bb463f42f71e9eb417c0c15a6b | Net generation : California : electric utility : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:c31487d47fbae78c33aae0c34ccc12db0840882f50edd92178045dd9f6ea9287 | Net generation : California : electric utility non-cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:b6d031e4305aff870d0c508721126ac0344a70af63600e2ab13e7c758b0ef20d | Net generation : California : electric utility cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:323c479de925e22747ee8ef985ea58d435270515055ec9131004c746d573a5c3 | Net generation : California : commercial non-cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:41dc891e8fd467b0cfc2bd7e626304215d29f90394a2758a6b0c3e34b8406dc1 | Net generation : California : commercial cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: domestic
- Geography: CA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:da79c4924dc4300465dab4814e933ca892d310bb463f42f71e9eb417c0c15a6b | Net generation : California : electric utility : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:c31487d47fbae78c33aae0c34ccc12db0840882f50edd92178045dd9f6ea9287 | Net generation : California : electric utility non-cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:b6d031e4305aff870d0c508721126ac0344a70af63600e2ab13e7c758b0ef20d | Net generation : California : electric utility cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:323c479de925e22747ee8ef985ea58d435270515055ec9131004c746d573a5c3 | Net generation : California : commercial non-cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:41dc891e8fd467b0cfc2bd7e626304215d29f90394a2758a6b0c3e34b8406dc1 | Net generation : California : commercial cogen : all fuels : monthly | route=domestic | geography=CA | product=electricity | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D002

**Raw query:** Texas monthly total energy consumption

**Categories:** seds, frequency-fallback, total-energy

#### Result A

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=seds_annual_state_fallback; wrong_frequency_fallback
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=seds_annual_state_fallback; wrong_frequency_fallback
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  2. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  3. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  4. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  5. eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2 | Total energy consumption in the industrial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=seds_annual_state_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D003

**Raw query:** New Mexico monthly marketed natural gas production

**Categories:** domestic, natural-gas, production

#### Result A

- Clarification: not required
- Route: international
- Geography: unknown
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: domestic
- Geography: NM
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:b1236c390d3d39a21cd51c66c5aa425e7293a7c30e2db2f69f32aab549cce04a | New Mexico Natural Gas Marketed Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:141c6390147c50d4f612f2000c7ad374b1badc10347c939639f73f125aca7336 | New Mexico Dry Natural Gas Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:0fd5ea34f1484e317a66795657dfd88b1ee2286ef7593be81f7c41e4485f549c | New Mexico Natural Gas Plant Liquids Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: domestic
- Geography: NM
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:b1236c390d3d39a21cd51c66c5aa425e7293a7c30e2db2f69f32aab549cce04a | New Mexico Natural Gas Marketed Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:141c6390147c50d4f612f2000c7ad374b1badc10347c939639f73f125aca7336 | New Mexico Dry Natural Gas Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:0fd5ea34f1484e317a66795657dfd88b1ee2286ef7593be81f7c41e4485f549c | New Mexico Natural Gas Plant Liquids Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: domestic
- Geography: NM
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:b1236c390d3d39a21cd51c66c5aa425e7293a7c30e2db2f69f32aab549cce04a | New Mexico Natural Gas Marketed Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:141c6390147c50d4f612f2000c7ad374b1badc10347c939639f73f125aca7336 | New Mexico Dry Natural Gas Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:0fd5ea34f1484e317a66795657dfd88b1ee2286ef7593be81f7c41e4485f549c | New Mexico Natural Gas Plant Liquids Production, Monthly | route=domestic | geography=NM | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D004

**Raw query:** New York monthly residential natural gas consumption

**Categories:** domestic, natural-gas, sector

#### Result A

- Clarification: not required
- Route: domestic
- Geography: NY
- Concept pairs: natural gas / consumption
- Top candidates:
  1. eia:1:f10af69a204c5aa5fbfc4cb4bb541fb2c514a59cb08931af562a3dc79d0e45a9 | New York Natural Gas Residential Consumption, Monthly | route=domestic | geography=NY | product=natural gas | activity=consumption | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: domestic
- Geography: NY
- Concept pairs: natural gas / consumption
- Top candidates:
  1. eia:1:f10af69a204c5aa5fbfc4cb4bb541fb2c514a59cb08931af562a3dc79d0e45a9 | New York Natural Gas Residential Consumption, Monthly | route=domestic | geography=NY | product=natural gas | activity=consumption | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: domestic
- Geography: NY
- Concept pairs: natural gas / consumption
- Top candidates:
  1. eia:1:f10af69a204c5aa5fbfc4cb4bb541fb2c514a59cb08931af562a3dc79d0e45a9 | New York Natural Gas Residential Consumption, Monthly | route=domestic | geography=NY | product=natural gas | activity=consumption | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: NY
- Concept pairs: natural gas / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D005

**Raw query:** Iowa monthly wind net generation

**Categories:** domestic, electricity, renewable

#### Result A

- Clarification: not required
- Route: domestic
- Geography: IA
- Concept pairs: wind / generation
- Top candidates:
  1. eia:1:41e519e19a66980344bb244f6afcf9aa7a5638cb86ed7aab38be68f4c77bae62 | Net generation : Iowa : electric utility : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:444b08cadf1c0b5be3c1de63b4adc3356f92881c07fa1ad4d132df63929fbf71 | Net generation : Iowa : electric utility non-cogen : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:9640df69936481af67bf773b208a92194b6ec5d2cc12f1346a87c1d73c89464e | Net generation : Iowa : commercial non-cogen : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:3e2117900afe8cf2df452e2c3ef49e256caabc6f749934c48323d71699c3f77c | Net generation : Iowa : independent power producers (total) : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a935a7bd0e990101cdd92954e11bff7e63335a777a0510b47e10ad6b6ad5c3dc | Net generation : Iowa : all commercial (total) : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: IA
- Concept pairs: wind / generation
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: domestic
- Geography: IA
- Concept pairs: wind / generation
- Top candidates:
  1. eia:1:41e519e19a66980344bb244f6afcf9aa7a5638cb86ed7aab38be68f4c77bae62 | Net generation : Iowa : electric utility : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:444b08cadf1c0b5be3c1de63b4adc3356f92881c07fa1ad4d132df63929fbf71 | Net generation : Iowa : electric utility non-cogen : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:9640df69936481af67bf773b208a92194b6ec5d2cc12f1346a87c1d73c89464e | Net generation : Iowa : commercial non-cogen : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:3e2117900afe8cf2df452e2c3ef49e256caabc6f749934c48323d71699c3f77c | Net generation : Iowa : independent power producers (total) : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a935a7bd0e990101cdd92954e11bff7e63335a777a0510b47e10ad6b6ad5c3dc | Net generation : Iowa : all commercial (total) : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: domestic
- Geography: IA
- Concept pairs: wind / generation
- Top candidates:
  1. eia:1:41e519e19a66980344bb244f6afcf9aa7a5638cb86ed7aab38be68f4c77bae62 | Net generation : Iowa : electric utility : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:444b08cadf1c0b5be3c1de63b4adc3356f92881c07fa1ad4d132df63929fbf71 | Net generation : Iowa : electric utility non-cogen : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:9640df69936481af67bf773b208a92194b6ec5d2cc12f1346a87c1d73c89464e | Net generation : Iowa : commercial non-cogen : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:3e2117900afe8cf2df452e2c3ef49e256caabc6f749934c48323d71699c3f77c | Net generation : Iowa : independent power producers (total) : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a935a7bd0e990101cdd92954e11bff7e63335a777a0510b47e10ad6b6ad5c3dc | Net generation : Iowa : all commercial (total) : wind : monthly | route=domestic | geography=IA | product=wind | activity=generation | sector=none | frequency=monthly | unit=thousand megawatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D006

**Raw query:** California renewable energy

**Categories:** clarification, missing-activity

#### Result A

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: CA
- Concept pairs: renewable / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: CA
- Concept pairs: renewable / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: international
- Geography: CA
- Concept pairs: renewable / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: CA
- Concept pairs: renewable / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D007

**Raw query:** Texas gas

**Categories:** clarification, ambiguous-product

#### Result A

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: ? / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: ? / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: ? / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: international
- Geography: TX
- Concept pairs: ? / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D008

**Raw query:** United States weekly working gas in underground storage

**Categories:** domestic, natural-gas, storage

#### Result A

- Clarification: not required
- Route: domestic
- Geography: USA
- Concept pairs: natural gas / storage
- Top candidates:
  1. eia:1:002933454450d055e0a217809181c7376221bfb6399db14080f254547da7eb83 | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | route=domestic | geography=USA | product=natural gas | activity=storage | sector=none | frequency=weekly | unit=Billion Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: domestic
- Geography: USA
- Concept pairs: natural gas / storage
- Top candidates:
  1. eia:1:002933454450d055e0a217809181c7376221bfb6399db14080f254547da7eb83 | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | route=domestic | geography=USA | product=natural gas | activity=storage | sector=none | frequency=weekly | unit=Billion Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: USA
- Concept pairs: natural gas / storage
- Top candidates:
  1. INTL:USA:26:2:QBTU:annual | Dry natural gas - Consumption | route=international | geography=USA | product=Dry natural gas | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:USA:26:4:QBTU:annual | Dry natural gas - Exports | route=international | geography=USA | product=Dry natural gas | activity=Exports | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:USA:26:3:QBTU:annual | Dry natural gas - Imports | route=international | geography=USA | product=Dry natural gas | activity=Imports | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:USA:26:1:QBTU:annual | Dry natural gas - Production | route=international | geography=USA | product=Dry natural gas | activity=Production | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:USA:31:12:BKWH:annual | Natural gas - Generation | route=international | geography=USA | product=Natural gas | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result D

- Clarification: not required
- Route: domestic
- Geography: USA
- Concept pairs: natural gas / storage
- Top candidates:
  1. eia:1:002933454450d055e0a217809181c7376221bfb6399db14080f254547da7eb83 | Weekly Lower 48 States Natural Gas Working Underground Storage, Weekly | route=domestic | geography=USA | product=natural gas | activity=storage | sector=none | frequency=weekly | unit=Billion Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D009

**Raw query:** Brazil annual petroleum consumption

**Categories:** international, petroleum, consumption

#### Result A

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. INTL:BRA:5:2:TBPD:annual | Petroleum and other liquids - Consumption | route=international | geography=BRA | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:BRA:54:2:TBPD:annual | Refined petroleum products - Consumption | route=international | geography=BRA | product=Refined petroleum products | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:BRA:4415:2:QBTU:annual | Petroleum and other liquids - Consumption | route=international | geography=BRA | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:BRA:67:2:TBPD:annual | Liquefied Petroleum Gases - Consumption | route=international | geography=BRA | product=Liquefied Petroleum Gases | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:BRA:68:2:TBPD:annual | Other petroleum liquids - Consumption | route=international | geography=BRA | product=Other petroleum liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result B

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:c57942476fba66e8a1ddda1f0bd94c6780902a7e24c70658c7662bf67888b606 | Petroleum and other liquids consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8839cf6dd2c979d8b6579c8c9e9b036d0aaa1864b60e3c84dcfb415e43826d95 | Refined petroleum products consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:33fab27217140e926301369c9b81bc4557071fea6bc57296a2c6144d2d75a497 | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:802a2dfd7f525f10bc76f4978d3c970a9446fc40e589abb316c2d3b9fa99f32f | Bunker distillate fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ef19e98b7c355077c3c2795d47b41b7ca024abae39dda3948955d1d93940dc5c | Bunker residual fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:c57942476fba66e8a1ddda1f0bd94c6780902a7e24c70658c7662bf67888b606 | Petroleum and other liquids consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8839cf6dd2c979d8b6579c8c9e9b036d0aaa1864b60e3c84dcfb415e43826d95 | Refined petroleum products consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:33fab27217140e926301369c9b81bc4557071fea6bc57296a2c6144d2d75a497 | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:802a2dfd7f525f10bc76f4978d3c970a9446fc40e589abb316c2d3b9fa99f32f | Bunker distillate fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ef19e98b7c355077c3c2795d47b41b7ca024abae39dda3948955d1d93940dc5c | Bunker residual fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:c57942476fba66e8a1ddda1f0bd94c6780902a7e24c70658c7662bf67888b606 | Petroleum and other liquids consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8839cf6dd2c979d8b6579c8c9e9b036d0aaa1864b60e3c84dcfb415e43826d95 | Refined petroleum products consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:33fab27217140e926301369c9b81bc4557071fea6bc57296a2c6144d2d75a497 | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:802a2dfd7f525f10bc76f4978d3c970a9446fc40e589abb316c2d3b9fa99f32f | Bunker distillate fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ef19e98b7c355077c3c2795d47b41b7ca024abae39dda3948955d1d93940dc5c | Bunker residual fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D010

**Raw query:** Japan monthly solar electricity generation

**Categories:** international, electricity, frequency-fallback

#### Result A

- Clarification: not required
- Route: international
- Geography: JPN
- Concept pairs: solar / generation
- Top candidates:
  1. eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf | Solar electricity net generation, Japan, Annual | route=international | geography=JPN | product=solar | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=international_annual_frequency_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  2. eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58 | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | route=international | geography=JPN | product=solar | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=international_annual_frequency_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: JPN
- Concept pairs: solar / generation
- Top candidates:
  1. INTL:JPN:54:2:TBPD:monthly | Refined petroleum products - Consumption | route=international | geography=JPN | product=Refined petroleum products | activity=Consumption | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:JPN:57:1:TBPD:monthly | Crude oil including lease condensate - Production | route=international | geography=JPN | product=Crude oil including lease condensate | activity=Production | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:JPN:59:1:TBPD:monthly | Other liquids - Production | route=international | geography=JPN | product=Other liquids | activity=Production | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:JPN:5:5:MBBL:monthly | Petroleum and other liquids - Stocks, OECD | route=international | geography=JPN | product=Petroleum and other liquids | activity=Stocks, OECD | sector=none | frequency=monthly | unit=millions barrels | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:JPN:58:1:TBPD:monthly | NGPL - Production | route=international | geography=JPN | product=NGPL | activity=Production | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result C

- Clarification: not required
- Route: international
- Geography: JPN
- Concept pairs: solar / generation
- Top candidates:
  1. eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf | Solar electricity net generation, Japan, Annual | route=international | geography=JPN | product=solar | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=international_annual_frequency_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  2. eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58 | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | route=international | geography=JPN | product=solar | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=international_annual_frequency_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: JPN
- Concept pairs: solar / generation
- Top candidates:
  1. eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf | Solar electricity net generation, Japan, Annual | route=international | geography=JPN | product=solar | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=international_annual_frequency_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified
  2. eia:1:f18ad2b772213acc3df99a28dc2b58573d5f1442f22c2fe7911815c88f5a1e58 | Solar, tide, wave, fuel cell electricity net generation, Japan, Annual | route=international | geography=JPN | product=solar | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=international_annual_frequency_fallback; wrong_frequency_fallback; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D011

**Raw query:** Germany renewable energy production and consumption

**Categories:** international, multiple-concept-pairs

#### Result A

- Clarification: not required
- Route: international
- Geography: DEU
- Concept pairs: renewable / production; renewable / consumption
- Top candidates:
  1. eia:1:74e3ff9c1a2654d04a270caa7586096236f5fcdc4b03127efcace3e940146705 | Total energy production from renewables and other, Germany, Annual | route=international | geography=DEU | product=renewable | activity=production | sector=none | frequency=annual | unit=quadrillion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  2. eia:1:460369ecd121ac4d0589460e2979c45cd1054d4b94cf74813d78f7be001c45b9 | Biofuels production, Germany, Annual | route=international | geography=DEU | product=renewable | activity=production | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:e0d4dd239068648bb163fe9ca2dd4c871400d4f6f404aceca4f74df13885c180 | Total energy consumption from renewables and other, Germany, Annual | route=international | geography=DEU | product=renewable | activity=consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:1f2c35677c3cb18158b955f1aeaeb38b97c6cc5d2ca390e682391e879ac19d23 | Biofuels consumption, Germany, Annual | route=international | geography=DEU | product=renewable | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: DEU
- Concept pairs: renewable / production; renewable / consumption
- Top candidates:
  1. eia:1:74e3ff9c1a2654d04a270caa7586096236f5fcdc4b03127efcace3e940146705 | Total energy production from renewables and other, Germany, Annual | route=international | geography=DEU | product=renewable | activity=production | sector=none | frequency=annual | unit=quadrillion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  2. eia:1:460369ecd121ac4d0589460e2979c45cd1054d4b94cf74813d78f7be001c45b9 | Biofuels production, Germany, Annual | route=international | geography=DEU | product=renewable | activity=production | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:e0d4dd239068648bb163fe9ca2dd4c871400d4f6f404aceca4f74df13885c180 | Total energy consumption from renewables and other, Germany, Annual | route=international | geography=DEU | product=renewable | activity=consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:1f2c35677c3cb18158b955f1aeaeb38b97c6cc5d2ca390e682391e879ac19d23 | Biofuels consumption, Germany, Annual | route=international | geography=DEU | product=renewable | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: DEU
- Concept pairs: renewable / production; renewable / consumption
- Top candidates:
  1. INTL:DEU:4419:2:QBTU:annual | Nuclear, renewables, and other - Consumption | route=international | geography=DEU | product=Nuclear, renewables, and other | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:DEU:4418:2:QBTU:annual | Renewables and other - Consumption | route=international | geography=DEU | product=Renewables and other | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:DEU:44:2:QBTU:annual | Primary energy - Consumption | route=international | geography=DEU | product=Primary energy | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:DEU:65:2:TBPD:annual | Distillate fuel oil - Consumption | route=international | geography=DEU | product=Distillate fuel oil | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:DEU:63:2:QBTU:annual | Jet fuel - Consumption | route=international | geography=DEU | product=Jet fuel | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result D

- Clarification: not required
- Route: international
- Geography: DEU
- Concept pairs: renewable / production; renewable / consumption
- Top candidates:
  1. eia:1:74e3ff9c1a2654d04a270caa7586096236f5fcdc4b03127efcace3e940146705 | Total energy production from renewables and other, Germany, Annual | route=international | geography=DEU | product=renewable | activity=production | sector=none | frequency=annual | unit=quadrillion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  2. eia:1:460369ecd121ac4d0589460e2979c45cd1054d4b94cf74813d78f7be001c45b9 | Biofuels production, Germany, Annual | route=international | geography=DEU | product=renewable | activity=production | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:e0d4dd239068648bb163fe9ca2dd4c871400d4f6f404aceca4f74df13885c180 | Total energy consumption from renewables and other, Germany, Annual | route=international | geography=DEU | product=renewable | activity=consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:1f2c35677c3cb18158b955f1aeaeb38b97c6cc5d2ca390e682391e879ac19d23 | Biofuels consumption, Germany, Annual | route=international | geography=DEU | product=renewable | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D012

**Raw query:** Brazil then Japan annual electricity generation

**Categories:** international, multiple-geographies

#### Result A

- Clarification: not required
- Route: international
- Geography: BRA, JPN
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:aca76ace8f5ec2271e489d0964b12a3712549633752c16aa9c506be31efddd58 | Electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:33e95f0397d60f03e0e7a64c34e64ff5bee743dcfd43389eb65955064b1a018e | Solar electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:7d6dc85403397ebdbf43e5dfe4307e8360c82c5b9fa23aa41c39083ba627c7b7 | Tide and wave electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:7cddc922fa2994465a07d269fd594db9a8dbab7e91388937d771c3d79004971b | Nuclear electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:197931f33950a48947124d25d103b7aca525daea943b6e382c8427e5cd92c8ee | Fossil fuels electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: BRA, JPN
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:aca76ace8f5ec2271e489d0964b12a3712549633752c16aa9c506be31efddd58 | Electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:33e95f0397d60f03e0e7a64c34e64ff5bee743dcfd43389eb65955064b1a018e | Solar electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:7d6dc85403397ebdbf43e5dfe4307e8360c82c5b9fa23aa41c39083ba627c7b7 | Tide and wave electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:7cddc922fa2994465a07d269fd594db9a8dbab7e91388937d771c3d79004971b | Nuclear electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:197931f33950a48947124d25d103b7aca525daea943b6e382c8427e5cd92c8ee | Fossil fuels electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: BRA, JPN
- Concept pairs: electricity / generation
- Top candidates:
  1. INTL:BRA:2:12:BKWH:annual | Electricity - Generation | route=international | geography=BRA | product=Electricity | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:BRA:33:12:BKWH:annual | Hydroelectricity - Generation | route=international | geography=BRA | product=Hydroelectricity | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:BRA:38:12:QBTU:annual | Biomass and waste - Generation | route=international | geography=BRA | product=Biomass and waste | activity=Generation | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:BRA:30:12:BKWH:annual | Coal - Generation | route=international | geography=BRA | product=Coal | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:BRA:2:7:MK:annual | Electricity - Capacity | route=international | geography=BRA | product=Electricity | activity=Capacity | sector=none | frequency=annual | unit=million kilowatts | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result D

- Clarification: not required
- Route: international
- Geography: BRA, JPN
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:aca76ace8f5ec2271e489d0964b12a3712549633752c16aa9c506be31efddd58 | Electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:33e95f0397d60f03e0e7a64c34e64ff5bee743dcfd43389eb65955064b1a018e | Solar electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:7d6dc85403397ebdbf43e5dfe4307e8360c82c5b9fa23aa41c39083ba627c7b7 | Tide and wave electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:7cddc922fa2994465a07d269fd594db9a8dbab7e91388937d771c3d79004971b | Nuclear electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:197931f33950a48947124d25d103b7aca525daea943b6e382c8427e5cd92c8ee | Fossil fuels electricity net generation, Brazil, Annual | route=international | geography=BRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D013

**Raw query:** plz shwo montly nat gas prodction in Texas, not prices

**Categories:** misspelling, exclusion, natural-gas

#### Result A

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:25e2bce45942416c28d521acfce0fea5f8320fbe52a4b47d22a88630036e3d33 | Texas Natural Gas Marketed Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:f3b82642a1be234dce4d2891f1ed824d9739ae76fc2e611cf16d9fe4335e7db4 | Texas Dry Natural Gas Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:3c93586b09880ce6efb936c6a2772e15650b4ef88e219f751222cc68a2f94c23 | Texas Natural Gas Plant Liquids Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:25e2bce45942416c28d521acfce0fea5f8320fbe52a4b47d22a88630036e3d33 | Texas Natural Gas Marketed Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:f3b82642a1be234dce4d2891f1ed824d9739ae76fc2e611cf16d9fe4335e7db4 | Texas Dry Natural Gas Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:3c93586b09880ce6efb936c6a2772e15650b4ef88e219f751222cc68a2f94c23 | Texas Natural Gas Plant Liquids Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:25e2bce45942416c28d521acfce0fea5f8320fbe52a4b47d22a88630036e3d33 | Texas Natural Gas Marketed Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:f3b82642a1be234dce4d2891f1ed824d9739ae76fc2e611cf16d9fe4335e7db4 | Texas Dry Natural Gas Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:3c93586b09880ce6efb936c6a2772e15650b4ef88e219f751222cc68a2f94c23 | Texas Natural Gas Plant Liquids Production, Monthly | route=domestic | geography=TX | product=natural gas | activity=production | sector=none | frequency=monthly | unit=Million Cubic Feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D014

**Raw query:** California monthly electricity from moon

**Categories:** clarification, unsupported-qualifier, no-result

#### Result A

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: international
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: domestic
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: domestic
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: domestic
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D015

**Raw query:** Texas natural gas

**Categories:** clarification, missing-activity, ambiguous-product

#### Result A

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: international
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D016

**Raw query:** Texas natural gas production

**Categories:** seds, natural-gas, production

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:3d75436829dd4dbbc299085c71ab932a502f54e8c1de027a8a6761c9c31b3359 | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:3d75436829dd4dbbc299085c71ab932a502f54e8c1de027a8a6761c9c31b3359 | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D017

**Raw query:** Texas monthly natural gas

**Categories:** clarification, frequency, missing-activity

#### Result A

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: domestic
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: domestic
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: domestic
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: international
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D018

**Raw query:** Texas natural gas excluding production

**Categories:** clarification, exclusion, missing-activity

#### Result A

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the activity. Example: United States total energy consumption.
- Route: international
- Geography: TX
- Concept pairs: natural gas / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D019

**Raw query:** Texas coal production and natural gas consumption

**Categories:** multiple-concept-pairs, pair-scope, domestic

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: coal / production; natural gas / consumption
- Top candidates:
  1. eia:1:ceb5025650f78ad682d1fde8719e2fa0c551800dddb871ff38fd39fa7496d9a1 | Coal production, Texas | route=seds | geography=TX | product=coal | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:5fa441152cdb858bd3d58d8850c9283a563a6b11310f7ba7c959663f17a42267 | Factor for converting coal production from physical units to Btu, Texas | route=seds | geography=TX | product=coal | activity=production | sector=none | frequency=annual | unit=Million Btu per short ton | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:0300957d2ad5d39ae3f9af0a2dd3dd6c4594cce043fbb0d787c1ed92ea950dc4 | Natural gas delivered to the commercial sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:666f29f410fb3a585c14d6bc09d8eb927811c3f9a69562d9e978e0003c22a4b2 | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:0dff4a1d9e361e967265c6fd30a3f784067eedb57e4b66e712493068148e6b7c | Natural gas total consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: coal / production; natural gas / consumption
- Top candidates:
  1. eia:1:ceb5025650f78ad682d1fde8719e2fa0c551800dddb871ff38fd39fa7496d9a1 | Coal production, Texas | route=seds | geography=TX | product=coal | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:0300957d2ad5d39ae3f9af0a2dd3dd6c4594cce043fbb0d787c1ed92ea950dc4 | Natural gas delivered to the commercial sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:666f29f410fb3a585c14d6bc09d8eb927811c3f9a69562d9e978e0003c22a4b2 | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:0dff4a1d9e361e967265c6fd30a3f784067eedb57e4b66e712493068148e6b7c | Natural gas total consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:597abe3489a241c11d9b69038a0dea57cac72822ebdc6ddf5c543595d1321eac | Natural gas total consumption (including supplemental gaseous fuels) per capita, Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: coal / production; natural gas / consumption
- Top candidates:
  1. eia:1:ceb5025650f78ad682d1fde8719e2fa0c551800dddb871ff38fd39fa7496d9a1 | Coal production, Texas | route=seds | geography=TX | product=coal | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:5fa441152cdb858bd3d58d8850c9283a563a6b11310f7ba7c959663f17a42267 | Factor for converting coal production from physical units to Btu, Texas | route=seds | geography=TX | product=coal | activity=production | sector=none | frequency=annual | unit=Million Btu per short ton | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:0300957d2ad5d39ae3f9af0a2dd3dd6c4594cce043fbb0d787c1ed92ea950dc4 | Natural gas delivered to the commercial sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:666f29f410fb3a585c14d6bc09d8eb927811c3f9a69562d9e978e0003c22a4b2 | Natural gas delivered to the residential sector, used as consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:0dff4a1d9e361e967265c6fd30a3f784067eedb57e4b66e712493068148e6b7c | Natural gas total consumption (including supplemental gaseous fuels), Texas | route=seds | geography=TX | product=natural gas | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: coal / production; natural gas / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D020

**Raw query:** Texas oil and natural gas production

**Categories:** multiple-concept-pairs, shared-activity, domestic

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: petroleum / production; natural gas / production
- Top candidates:
  1. eia:1:181271d44f9313bf1ce2e6a88f6ff41da29d556941f85cb91da4c10333edd4c2 | Factor for converting crude oil production from physical units to Btu for the United States, Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Million Btu per barrel | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:47929a94eeeb483bb770657c706545418d36f63f382d49f889977c82a78f5d9a | Crude oil production (including lease condensate), Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:b54ec6216c16fcb8f4986960536b943e0c4ac619c2766d67c8add0ec9652552a | Renewable diesel production, Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:3d75436829dd4dbbc299085c71ab932a502f54e8c1de027a8a6761c9c31b3359 | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: petroleum / production; natural gas / production
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: petroleum / production; natural gas / production
- Top candidates:
  1. eia:1:47929a94eeeb483bb770657c706545418d36f63f382d49f889977c82a78f5d9a | Crude oil production (including lease condensate), Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:b54ec6216c16fcb8f4986960536b943e0c4ac619c2766d67c8add0ec9652552a | Renewable diesel production, Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: petroleum / production; natural gas / production
- Top candidates:
  1. eia:1:181271d44f9313bf1ce2e6a88f6ff41da29d556941f85cb91da4c10333edd4c2 | Factor for converting crude oil production from physical units to Btu for the United States, Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Million Btu per barrel | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:47929a94eeeb483bb770657c706545418d36f63f382d49f889977c82a78f5d9a | Crude oil production (including lease condensate), Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:b54ec6216c16fcb8f4986960536b943e0c4ac619c2766d67c8add0ec9652552a | Renewable diesel production, Texas | route=seds | geography=TX | product=petroleum | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:3d75436829dd4dbbc299085c71ab932a502f54e8c1de027a8a6761c9c31b3359 | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D021

**Raw query:** Texas coal and natural gas production and consumption

**Categories:** clarification, unresolved-pair-scope, adversarial

#### Result A

- Clarification: required - Please clarify which activity applies to each energy product. No series will be selected until the pairing is resolved.
- Route: seds
- Geography: TX
- Concept pairs: coal / consumption
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify which activity applies to each energy product. No series will be selected until the pairing is resolved.
- Route: seds
- Geography: TX
- Concept pairs: coal / production
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: coal / production; natural gas / production
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify which activity applies to each energy product. No series will be selected until the pairing is resolved.
- Route: seds
- Geography: TX
- Concept pairs: coal / production
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D022

**Raw query:** Califronia natural gas prodction

**Categories:** misspelling, seds, natural-gas

#### Result A

- Clarification: not required
- Route: international
- Geography: CA
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: seds
- Geography: CA
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:6a4bb752abec3910b4ccad41b18255029a90ad6a31b104a02b9258d2f3622942 | Natural gas marketed production, California | route=seds | geography=CA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:5cd307d50df323ae462208886364bf639a09fdd0552c4808543505c04879ddfd | Factor for converting marketed natural gas production from physical units to Btu, California | route=seds | geography=CA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: CA
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:6a4bb752abec3910b4ccad41b18255029a90ad6a31b104a02b9258d2f3622942 | Natural gas marketed production, California | route=seds | geography=CA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:5cd307d50df323ae462208886364bf639a09fdd0552c4808543505c04879ddfd | Factor for converting marketed natural gas production from physical units to Btu, California | route=seds | geography=CA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: CA
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:6a4bb752abec3910b4ccad41b18255029a90ad6a31b104a02b9258d2f3622942 | Natural gas marketed production, California | route=seds | geography=CA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D023

**Raw query:** Texas total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2 | Total energy consumption in the industrial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D024

**Raw query:** California total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: international
- Geography: CA
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: seds
- Geography: CA
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:64d3c9a9faf94c7b1375b107c602e33302ee999a01733b9e773e3f5993e2e80a | Total energy consumption, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:672740634dbda4490cbf7a70149ccdf1228556e06c69052e23589a481270113c | Total energy consumption in the transportation sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:7c7870b798d962a81d27dea881a04017f1aa3d6f79dd290b6fdce403f0c1cd56 | Total energy consumption per capita in the transportation sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:63cf2ea201621abd5c540aa17f5cd68c2948e5b9169e18d6a62bb78b1c3eb80f | Total energy consumption in the commercial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:3e01c742b197a17f8afbf008bb9b02614a8025e471e3711062570ee91f3535fa | Total energy consumption per capita in the commercial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: CA
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:672740634dbda4490cbf7a70149ccdf1228556e06c69052e23589a481270113c | Total energy consumption in the transportation sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:7c7870b798d962a81d27dea881a04017f1aa3d6f79dd290b6fdce403f0c1cd56 | Total energy consumption per capita in the transportation sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:63cf2ea201621abd5c540aa17f5cd68c2948e5b9169e18d6a62bb78b1c3eb80f | Total energy consumption in the commercial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:3e01c742b197a17f8afbf008bb9b02614a8025e471e3711062570ee91f3535fa | Total energy consumption per capita in the commercial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:e45390d206497e9d4ac029976fa10494cd9901270af4bb2d61bd9d2def812bf3 | Total energy consumption in the industrial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: CA
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:64d3c9a9faf94c7b1375b107c602e33302ee999a01733b9e773e3f5993e2e80a | Total energy consumption, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:672740634dbda4490cbf7a70149ccdf1228556e06c69052e23589a481270113c | Total energy consumption in the transportation sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:7c7870b798d962a81d27dea881a04017f1aa3d6f79dd290b6fdce403f0c1cd56 | Total energy consumption per capita in the transportation sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:63cf2ea201621abd5c540aa17f5cd68c2948e5b9169e18d6a62bb78b1c3eb80f | Total energy consumption in the commercial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:3e01c742b197a17f8afbf008bb9b02614a8025e471e3711062570ee91f3535fa | Total energy consumption per capita in the commercial sector, California | route=seds | geography=CA | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D025

**Raw query:** District of Columbia total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: seds
- Geography: DC
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:b837441f96396d425e677bcea5e533c09d69dfbd930ff0e79bdb1e56bd0a0a52 | Total energy consumption, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:6c20bf748bbbf33209981ccc99444522edef78afd94978a1a6c3b9451fefdd17 | Total energy consumption in the transportation sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:baa34fea3e4bdd62fd16c411f227f5bff627673447c86adf31be6a85f924feef | Total energy consumption per capita in the transportation sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:581027e6933a0031f836feedf79c3b08cf92f115afe9070e384ed96b3dcca028 | Total energy consumption in the commercial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:79c9927a53d0f8cfb77bb6f1f864500167ad8fb6ec3f7c4c7f8deb5da8ef4259 | Total energy consumption per capita in the commercial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: DC
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:6c20bf748bbbf33209981ccc99444522edef78afd94978a1a6c3b9451fefdd17 | Total energy consumption in the transportation sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:baa34fea3e4bdd62fd16c411f227f5bff627673447c86adf31be6a85f924feef | Total energy consumption per capita in the transportation sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:581027e6933a0031f836feedf79c3b08cf92f115afe9070e384ed96b3dcca028 | Total energy consumption in the commercial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:79c9927a53d0f8cfb77bb6f1f864500167ad8fb6ec3f7c4c7f8deb5da8ef4259 | Total energy consumption per capita in the commercial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d5c8ecd0caec64bcda298a68e7dffc9e96b09f8ec4d88893b330ed5513039605 | Total energy consumption in the industrial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: DC
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:b837441f96396d425e677bcea5e533c09d69dfbd930ff0e79bdb1e56bd0a0a52 | Total energy consumption, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:6c20bf748bbbf33209981ccc99444522edef78afd94978a1a6c3b9451fefdd17 | Total energy consumption in the transportation sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:baa34fea3e4bdd62fd16c411f227f5bff627673447c86adf31be6a85f924feef | Total energy consumption per capita in the transportation sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:581027e6933a0031f836feedf79c3b08cf92f115afe9070e384ed96b3dcca028 | Total energy consumption in the commercial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:79c9927a53d0f8cfb77bb6f1f864500167ad8fb6ec3f7c4c7f8deb5da8ef4259 | Total energy consumption per capita in the commercial sector, District of Columbia | route=seds | geography=DC | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: DC
- Concept pairs: total energy / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D026

**Raw query:** Alaska total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: seds
- Geography: AK
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:cf3558e2e41e942ae84cafecbd2e79f8dd61665ed967cdbf2298e2d1e629e1cd | Total energy consumption in the transportation sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8ada2740336dc4a2d4817904d4d30e3a44bc8e9d17d75abd9dd0b8525f08ea7e | Total energy consumption per capita in the transportation sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:038a6931804ca3812872f353861496428b988ba95c854196a4fb241194ef649b | Total energy consumption in the commercial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:5add2c8e79d7caaa15386058ae1da351cff1fc798a388bb35556e4f2ddd8f55e | Total energy consumption per capita in the commercial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:515fb4dfaf597cb0114b70ea116bbaffba52bf8db03d853c85c8dd46bd349f19 | Total energy consumption in the industrial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: AK
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: seds
- Geography: AK
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:a86b9f24e66afa42fff3516c856003844a96a31cf19d8c25086b13498fae428d | Total energy consumption, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:cf3558e2e41e942ae84cafecbd2e79f8dd61665ed967cdbf2298e2d1e629e1cd | Total energy consumption in the transportation sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:8ada2740336dc4a2d4817904d4d30e3a44bc8e9d17d75abd9dd0b8525f08ea7e | Total energy consumption per capita in the transportation sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:038a6931804ca3812872f353861496428b988ba95c854196a4fb241194ef649b | Total energy consumption in the commercial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:5add2c8e79d7caaa15386058ae1da351cff1fc798a388bb35556e4f2ddd8f55e | Total energy consumption per capita in the commercial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: AK
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:a86b9f24e66afa42fff3516c856003844a96a31cf19d8c25086b13498fae428d | Total energy consumption, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:cf3558e2e41e942ae84cafecbd2e79f8dd61665ed967cdbf2298e2d1e629e1cd | Total energy consumption in the transportation sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:8ada2740336dc4a2d4817904d4d30e3a44bc8e9d17d75abd9dd0b8525f08ea7e | Total energy consumption per capita in the transportation sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:038a6931804ca3812872f353861496428b988ba95c854196a4fb241194ef649b | Total energy consumption in the commercial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:5add2c8e79d7caaa15386058ae1da351cff1fc798a388bb35556e4f2ddd8f55e | Total energy consumption per capita in the commercial sector, Alaska | route=seds | geography=AK | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D027

**Raw query:** Hawaii total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: seds
- Geography: HI
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:d211fc9397b6762326c847f1265ed818a0ea459f0f557c58c35eb7bce44d489f | Total energy consumption, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:f560a3b49d34dc7ca4c6c26522e5e2af2c64cd11eddf8da955454af0e2b72c1c | Total energy consumption in the transportation sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:589cb470e9c001436068a269d42afd17aa13c97f510330ab6845745e52469cd1 | Total energy consumption per capita in the transportation sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:01f18f6c386cc2828a01a26d58095365831a28fb34df1b1aa5555d9571706cbb | Total energy consumption in the commercial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:7bdfb196755cf724b9eb4079ce3edf80d79447876eaf3b66a0df28ddde1d086b | Total energy consumption per capita in the commercial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: HI
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: seds
- Geography: HI
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:f560a3b49d34dc7ca4c6c26522e5e2af2c64cd11eddf8da955454af0e2b72c1c | Total energy consumption in the transportation sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:589cb470e9c001436068a269d42afd17aa13c97f510330ab6845745e52469cd1 | Total energy consumption per capita in the transportation sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:01f18f6c386cc2828a01a26d58095365831a28fb34df1b1aa5555d9571706cbb | Total energy consumption in the commercial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:7bdfb196755cf724b9eb4079ce3edf80d79447876eaf3b66a0df28ddde1d086b | Total energy consumption per capita in the commercial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:7e1f08457cc3bdc429d09d4cad587e5d2f40de777ed59bc7d9effae6bc38a7b6 | Total energy consumption in the industrial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: HI
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:d211fc9397b6762326c847f1265ed818a0ea459f0f557c58c35eb7bce44d489f | Total energy consumption, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:f560a3b49d34dc7ca4c6c26522e5e2af2c64cd11eddf8da955454af0e2b72c1c | Total energy consumption in the transportation sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:589cb470e9c001436068a269d42afd17aa13c97f510330ab6845745e52469cd1 | Total energy consumption per capita in the transportation sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:01f18f6c386cc2828a01a26d58095365831a28fb34df1b1aa5555d9571706cbb | Total energy consumption in the commercial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:7bdfb196755cf724b9eb4079ce3edf80d79447876eaf3b66a0df28ddde1d086b | Total energy consumption per capita in the commercial sector, Hawaii | route=seds | geography=HI | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D028

**Raw query:** New York total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: seds
- Geography: NY
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:bb41bcb5fb842571ba6db2f5a23d1a8bcb28ca79dfa076d17d8e9c4473272ad4 | Total energy consumption, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:5911f58da29d093d49c2e265f7ea02a7f915f792fe8fddc994a0ca90b5a7a294 | Total energy consumption in the transportation sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:457dcb3a86a416871875c129fd2189cb01307af18b555a93b0b04a871200dd6c | Total energy consumption per capita in the transportation sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:581129511e01daf3a56b6946be276b2047f79e556bf546920312964fba50d845 | Total energy consumption in the commercial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:8ce3516e0a421d66d799d4316e54a271e949f39e79d70eff3c86f2751212a979 | Total energy consumption per capita in the commercial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: NY
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:5911f58da29d093d49c2e265f7ea02a7f915f792fe8fddc994a0ca90b5a7a294 | Total energy consumption in the transportation sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:457dcb3a86a416871875c129fd2189cb01307af18b555a93b0b04a871200dd6c | Total energy consumption per capita in the transportation sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:581129511e01daf3a56b6946be276b2047f79e556bf546920312964fba50d845 | Total energy consumption in the commercial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:8ce3516e0a421d66d799d4316e54a271e949f39e79d70eff3c86f2751212a979 | Total energy consumption per capita in the commercial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:b402a121ef9d901f08333267b1e4b795289d33f0a8f376322c078453078bfbd6 | Total energy consumption in the industrial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: NY
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:bb41bcb5fb842571ba6db2f5a23d1a8bcb28ca79dfa076d17d8e9c4473272ad4 | Total energy consumption, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:5911f58da29d093d49c2e265f7ea02a7f915f792fe8fddc994a0ca90b5a7a294 | Total energy consumption in the transportation sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:457dcb3a86a416871875c129fd2189cb01307af18b555a93b0b04a871200dd6c | Total energy consumption per capita in the transportation sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:581129511e01daf3a56b6946be276b2047f79e556bf546920312964fba50d845 | Total energy consumption in the commercial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:8ce3516e0a421d66d799d4316e54a271e949f39e79d70eff3c86f2751212a979 | Total energy consumption per capita in the commercial sector, New York | route=seds | geography=NY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: NY
- Concept pairs: total energy / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D029

**Raw query:** Wyoming total energy consumption

**Categories:** seds, hierarchy-eligible, total-energy

#### Result A

- Clarification: not required
- Route: seds
- Geography: WY
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:d8e195d12b686e72d89125fb2f236de81201c66f38789bda3abb2495d047b267 | Total energy consumption, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:13d0d40a4cee518b1158d3ee9eb79de4216c9a1d598d15298ada6706a81db5ed | Total energy consumption in the transportation sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:543c2ca2ed7f5b3d6cc3dde38af5ea76f8bfeb07c6d317d0784e195ae5f3f34b | Total energy consumption per capita in the transportation sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:b79b2e7aa8fb0f8dd787d8fc64beeb2456a8acfa55f2036250c955b57d46e6ee | Total energy consumption in the commercial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:572f83916907f1d79e4cbbdfcd1452240a6fdba4f2ccd9cb73ebdf7b09d38d7a | Total energy consumption per capita in the commercial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: WY
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:d8e195d12b686e72d89125fb2f236de81201c66f38789bda3abb2495d047b267 | Total energy consumption, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:13d0d40a4cee518b1158d3ee9eb79de4216c9a1d598d15298ada6706a81db5ed | Total energy consumption in the transportation sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:543c2ca2ed7f5b3d6cc3dde38af5ea76f8bfeb07c6d317d0784e195ae5f3f34b | Total energy consumption per capita in the transportation sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:b79b2e7aa8fb0f8dd787d8fc64beeb2456a8acfa55f2036250c955b57d46e6ee | Total energy consumption in the commercial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:572f83916907f1d79e4cbbdfcd1452240a6fdba4f2ccd9cb73ebdf7b09d38d7a | Total energy consumption per capita in the commercial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: WY
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: seds
- Geography: WY
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:13d0d40a4cee518b1158d3ee9eb79de4216c9a1d598d15298ada6706a81db5ed | Total energy consumption in the transportation sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:543c2ca2ed7f5b3d6cc3dde38af5ea76f8bfeb07c6d317d0784e195ae5f3f34b | Total energy consumption per capita in the transportation sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:b79b2e7aa8fb0f8dd787d8fc64beeb2456a8acfa55f2036250c955b57d46e6ee | Total energy consumption in the commercial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:572f83916907f1d79e4cbbdfcd1452240a6fdba4f2ccd9cb73ebdf7b09d38d7a | Total energy consumption per capita in the commercial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:1e56ef560b103b372cbb97d4407725ec94e063f055989a8058fe2a7ac6ce2fe0 | Total energy consumption in the industrial sector, Wyoming | route=seds | geography=WY | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D030

**Raw query:** United States total energy consumption

**Categories:** domestic, verified-relationship-route-limited, total-energy

#### Result A

- Clarification: not required
- Route: domestic
- Geography: USA
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: international
- Geography: USA
- Concept pairs: total energy / consumption
- Top candidates:
  1. INTL:USA:44:2:QBTU:annual | Primary energy - Consumption | route=international | geography=USA | product=Primary energy | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:USA:65:2:TBPD:annual | Distillate fuel oil - Consumption | route=international | geography=USA | product=Distillate fuel oil | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:USA:63:2:QBTU:annual | Jet fuel - Consumption | route=international | geography=USA | product=Jet fuel | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:USA:64:2:QBTU:annual | Kerosene - Consumption | route=international | geography=USA | product=Kerosene | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:USA:67:2:TBPD:annual | Liquefied Petroleum Gases - Consumption | route=international | geography=USA | product=Liquefied Petroleum Gases | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result C

- Clarification: not required
- Route: domestic
- Geography: USA
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: domestic
- Geography: USA
- Concept pairs: total energy / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D031

**Raw query:** Texas renewable energy consumption

**Categories:** seds, hierarchy-component-control, renewable

#### Result A

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: renewable / consumption
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: renewable / consumption
- Top candidates:
  1. eia:1:e108631fb090940748551f04e8e429b4066e4181506218e5d54e8b08a5b4d71d | Renewable energy total consumption, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:b6020a2e96a85a8f98c5ee3c78a3390272f349bbec99bdbd6bc572ad4eb1d687 | Renewable energy sources consumed by the transportation sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:be76482fd74da16b5a7f9990a4016b3aad7a8be36ac22ae01878de2177e525fb | Renewable energy sources consumed by the commercial sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:ed8d643cd9679ca7c9edfe7b823844c3a69179a5278238303838a06c9e031108 | Renewable energy sources consumed by the industrial sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a8c289bcc262b8ecac08a57cea3a4d2f6c8ef5e1cfb38611f6d2c964d64c6e70 | Renewable energy sources consumed by the residential sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: renewable / consumption
- Top candidates:
  1. eia:1:e108631fb090940748551f04e8e429b4066e4181506218e5d54e8b08a5b4d71d | Renewable energy total consumption, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:b6020a2e96a85a8f98c5ee3c78a3390272f349bbec99bdbd6bc572ad4eb1d687 | Renewable energy sources consumed by the transportation sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:be76482fd74da16b5a7f9990a4016b3aad7a8be36ac22ae01878de2177e525fb | Renewable energy sources consumed by the commercial sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:ed8d643cd9679ca7c9edfe7b823844c3a69179a5278238303838a06c9e031108 | Renewable energy sources consumed by the industrial sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a8c289bcc262b8ecac08a57cea3a4d2f6c8ef5e1cfb38611f6d2c964d64c6e70 | Renewable energy sources consumed by the residential sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: renewable / consumption
- Top candidates:
  1. eia:1:e108631fb090940748551f04e8e429b4066e4181506218e5d54e8b08a5b4d71d | Renewable energy total consumption, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:b6020a2e96a85a8f98c5ee3c78a3390272f349bbec99bdbd6bc572ad4eb1d687 | Renewable energy sources consumed by the transportation sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:be76482fd74da16b5a7f9990a4016b3aad7a8be36ac22ae01878de2177e525fb | Renewable energy sources consumed by the commercial sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:ed8d643cd9679ca7c9edfe7b823844c3a69179a5278238303838a06c9e031108 | Renewable energy sources consumed by the industrial sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a8c289bcc262b8ecac08a57cea3a4d2f6c8ef5e1cfb38611f6d2c964d64c6e70 | Renewable energy sources consumed by the residential sector, Texas | route=seds | geography=TX | product=renewable | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D032

**Raw query:** Texas fossil fuel consumption

**Categories:** seds, hierarchy-component-control, fossil-fuel

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: fossil fuels / consumption
- Top candidates:
  1. eia:1:1ba9e9b2a47cabf8a9986ec7d96e5ce550d2a1fc99bbb76dd0c1a5f4939fc973 | Fossil fuels total consumption, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:ab58517962db957a894cddcd8553818894d91a91fa4c7f2d9c0c5b96ffe6aedd | Adjusted total biodiesel consumption blended with distillate fuel oil, portion to the transportation sector (2009 through 2011 only), Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:1f13b814d96b3fe425fe62d20df64fc141341149c6a67549db6de8167790467e | Coal total consumption adjusted for process fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:2c0defba9464acd6740b8c68b30c180c6bebab14fbe52aa0673dd6f2091af8fe | Coal consumed by the industrial sector excluding refinery fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:bf7916684982c786eb16a3313b7e3f4188f0fcf9d64280cf316da38ca01841a6 | Coal consumed by the industrial sector other than coke plants excluding refinery fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: fossil fuels / consumption
- Top candidates:
  1. eia:1:1ba9e9b2a47cabf8a9986ec7d96e5ce550d2a1fc99bbb76dd0c1a5f4939fc973 | Fossil fuels total consumption, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:ab58517962db957a894cddcd8553818894d91a91fa4c7f2d9c0c5b96ffe6aedd | Adjusted total biodiesel consumption blended with distillate fuel oil, portion to the transportation sector (2009 through 2011 only), Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:1f13b814d96b3fe425fe62d20df64fc141341149c6a67549db6de8167790467e | Coal total consumption adjusted for process fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:2c0defba9464acd6740b8c68b30c180c6bebab14fbe52aa0673dd6f2091af8fe | Coal consumed by the industrial sector excluding refinery fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:bf7916684982c786eb16a3313b7e3f4188f0fcf9d64280cf316da38ca01841a6 | Coal consumed by the industrial sector other than coke plants excluding refinery fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: fossil fuels / consumption
- Top candidates:
  1. eia:1:1ba9e9b2a47cabf8a9986ec7d96e5ce550d2a1fc99bbb76dd0c1a5f4939fc973 | Fossil fuels total consumption, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:ab58517962db957a894cddcd8553818894d91a91fa4c7f2d9c0c5b96ffe6aedd | Adjusted total biodiesel consumption blended with distillate fuel oil, portion to the transportation sector (2009 through 2011 only), Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:1f13b814d96b3fe425fe62d20df64fc141341149c6a67549db6de8167790467e | Coal total consumption adjusted for process fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:2c0defba9464acd6740b8c68b30c180c6bebab14fbe52aa0673dd6f2091af8fe | Coal consumed by the industrial sector excluding refinery fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:bf7916684982c786eb16a3313b7e3f4188f0fcf9d64280cf316da38ca01841a6 | Coal consumed by the industrial sector other than coke plants excluding refinery fuel, Texas | route=seds | geography=TX | product=fossil fuels | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: fossil fuels / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D033

**Raw query:** Texas nuclear energy consumption

**Categories:** seds, hierarchy-component-control, nuclear

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: nuclear / consumption; total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: nuclear / consumption; total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: nuclear / consumption; total energy / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: nuclear / consumption; total energy / consumption
- Top candidates:
  1. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2 | Total energy consumption in the industrial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D034

**Raw query:** Texas electricity net imports

**Categories:** domestic, hierarchy-route-control, electricity

#### Result A

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: electricity / imports
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: electricity / imports
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: electricity / imports
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: electricity / imports
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D035

**Raw query:** Texas annual total energy consumption

**Categories:** seds, hierarchy-eligible, frequency

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2 | Total energy consumption in the industrial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D036

**Raw query:** SEDS.TETCB.TX.A

**Categories:** exact-identifier, unsupported-qualifier, clarification

#### Result A

- Clarification: required - Please clarify the country, product, and activity. Example: United States total energy consumption.
- Route: international
- Geography: unknown
- Concept pairs: none
- Top candidates:
  - None

#### Result B

- Clarification: required - Please include one country name. Examples: Brazil energy consumption, Jordan electricity generation, Mexico natural gas production.
- Route: unknown
- Geography: unknown
- Concept pairs: none
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the country, product, and activity. Example: United States total energy consumption.
- Route: international
- Geography: unknown
- Concept pairs: none
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the country, product, and activity. Example: United States total energy consumption.
- Route: international
- Geography: unknown
- Concept pairs: none
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D037

**Raw query:** Brazil petroleum consumption per day

**Categories:** international, petroleum, unit

#### Result A

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. INTL:BRA:5:2:TBPD:annual | Petroleum and other liquids - Consumption | route=international | geography=BRA | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:BRA:54:2:TBPD:annual | Refined petroleum products - Consumption | route=international | geography=BRA | product=Refined petroleum products | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:BRA:4415:2:QBTU:annual | Petroleum and other liquids - Consumption | route=international | geography=BRA | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:BRA:67:2:TBPD:annual | Liquefied Petroleum Gases - Consumption | route=international | geography=BRA | product=Liquefied Petroleum Gases | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:BRA:68:2:TBPD:annual | Other petroleum liquids - Consumption | route=international | geography=BRA | product=Other petroleum liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result B

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D038

**Raw query:** Canada natural gas production

**Categories:** international, natural-gas, clear

#### Result A

- Clarification: not required
- Route: international
- Geography: CAN
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:c4ad1938fa39626582813b60aca7b4f9470295998d73ddc081758dce2af031ef | Dry natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8f6c0f8b2180dee8e1b73e9b584ae4d9accf832c571dadfe47aeee8cb5c7b576 | Gross natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:49e94f942b58139ee8f3e6f4afc570aa7f8883415b0382c6f4b33dea20936188 | Vented and flared natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:9e34c16cc3fb8b81f45c4d4ac8ef14e0572a60e6006f413a4df3d24210e36e76 | Reinjected natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:278557a49508b89f3867eea5e5e2c7161c28ed84c87c152c6a19539e7f474715 | Natural gas plant liquids production, Canada, Monthly | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=wrong_frequency_fallback; product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: CAN
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:c4ad1938fa39626582813b60aca7b4f9470295998d73ddc081758dce2af031ef | Dry natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8f6c0f8b2180dee8e1b73e9b584ae4d9accf832c571dadfe47aeee8cb5c7b576 | Gross natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:49e94f942b58139ee8f3e6f4afc570aa7f8883415b0382c6f4b33dea20936188 | Vented and flared natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:9e34c16cc3fb8b81f45c4d4ac8ef14e0572a60e6006f413a4df3d24210e36e76 | Reinjected natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:278557a49508b89f3867eea5e5e2c7161c28ed84c87c152c6a19539e7f474715 | Natural gas plant liquids production, Canada, Monthly | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=wrong_frequency_fallback; product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: CAN
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:c4ad1938fa39626582813b60aca7b4f9470295998d73ddc081758dce2af031ef | Dry natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8f6c0f8b2180dee8e1b73e9b584ae4d9accf832c571dadfe47aeee8cb5c7b576 | Gross natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:49e94f942b58139ee8f3e6f4afc570aa7f8883415b0382c6f4b33dea20936188 | Vented and flared natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:9e34c16cc3fb8b81f45c4d4ac8ef14e0572a60e6006f413a4df3d24210e36e76 | Reinjected natural gas production, Canada, Annual | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=annual | unit=billion cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:278557a49508b89f3867eea5e5e2c7161c28ed84c87c152c6a19539e7f474715 | Natural gas plant liquids production, Canada, Monthly | route=international | geography=CAN | product=natural gas | activity=production | sector=none | frequency=monthly | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=wrong_frequency_fallback; product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: CAN
- Concept pairs: natural gas / production
- Top candidates:
  1. INTL:CAN:26:1:QBTU:annual | Dry natural gas - Production | route=international | geography=CAN | product=Dry natural gas | activity=Production | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:CAN:4413:1:QBTU:annual | Natural gas - Production | route=international | geography=CAN | product=Natural gas | activity=Production | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:CAN:3:1:BCF:annual | Gross natural gas - Production | route=international | geography=CAN | product=Gross natural gas | activity=Production | sector=none | frequency=annual | unit=billion cubic feet | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:CAN:48:1:BCF:annual | Reinjected natural gas - Production | route=international | geography=CAN | product=Reinjected natural gas | activity=Production | sector=none | frequency=annual | unit=billion cubic feet | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:CAN:43:1:BCF:annual | Vented and flared natural gas - Production | route=international | geography=CAN | product=Vented and flared natural gas | activity=Production | sector=none | frequency=annual | unit=billion cubic feet | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D039

**Raw query:** Mexico petroleum consumption

**Categories:** international, petroleum, clear

#### Result A

- Clarification: not required
- Route: international
- Geography: MEX
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:6cfdc8514968871594c5d6bbf78f996b81803099093b9d45d13419e23648eb4e | Petroleum and other liquids consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:2f815fee1d99d766b6f5d925a76915b6cba21b5efc4b8bc4479c872ca8b565fa | Refined petroleum products consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:191ee8ef3125f3eb72503e6159f9622d8ceafb161ea833453d51685c85fe155b | Liquefied petroleum gases (LPG) consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:dcc2b7c911ad77420c5d41d9d70acbf4391e978f06e681cb0d1e94cbe2fb02cb | Bunker distillate fuel oil consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:fbb18af2fa950ba29716555589b0a975417cc91db9658dce14c1cd1be73ac56c | Bunker residual fuel oil consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: MEX
- Concept pairs: petroleum / consumption
- Top candidates:
  1. INTL:MEX:5:2:TBPD:annual | Petroleum and other liquids - Consumption | route=international | geography=MEX | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:MEX:54:2:TBPD:annual | Refined petroleum products - Consumption | route=international | geography=MEX | product=Refined petroleum products | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:MEX:4415:2:QBTU:annual | Petroleum and other liquids - Consumption | route=international | geography=MEX | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:MEX:67:2:TBPD:annual | Liquefied Petroleum Gases - Consumption | route=international | geography=MEX | product=Liquefied Petroleum Gases | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:MEX:68:2:TBPD:annual | Other petroleum liquids - Consumption | route=international | geography=MEX | product=Other petroleum liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result C

- Clarification: not required
- Route: international
- Geography: MEX
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:6cfdc8514968871594c5d6bbf78f996b81803099093b9d45d13419e23648eb4e | Petroleum and other liquids consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:2f815fee1d99d766b6f5d925a76915b6cba21b5efc4b8bc4479c872ca8b565fa | Refined petroleum products consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:191ee8ef3125f3eb72503e6159f9622d8ceafb161ea833453d51685c85fe155b | Liquefied petroleum gases (LPG) consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:dcc2b7c911ad77420c5d41d9d70acbf4391e978f06e681cb0d1e94cbe2fb02cb | Bunker distillate fuel oil consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:fbb18af2fa950ba29716555589b0a975417cc91db9658dce14c1cd1be73ac56c | Bunker residual fuel oil consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: MEX
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:6cfdc8514968871594c5d6bbf78f996b81803099093b9d45d13419e23648eb4e | Petroleum and other liquids consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:2f815fee1d99d766b6f5d925a76915b6cba21b5efc4b8bc4479c872ca8b565fa | Refined petroleum products consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:191ee8ef3125f3eb72503e6159f9622d8ceafb161ea833453d51685c85fe155b | Liquefied petroleum gases (LPG) consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:dcc2b7c911ad77420c5d41d9d70acbf4391e978f06e681cb0d1e94cbe2fb02cb | Bunker distillate fuel oil consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:fbb18af2fa950ba29716555589b0a975417cc91db9658dce14c1cd1be73ac56c | Bunker residual fuel oil consumption, Mexico, Annual | route=international | geography=MEX | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D040

**Raw query:** France electricity generation

**Categories:** international, electricity, clear

#### Result A

- Clarification: not required
- Route: international
- Geography: FRA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:d001cb2161ff43396188253085983c864f919dff7f3e50e28c206275f68704d1 | Electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:9840aceb38ada73fdcdcdaf4217290e1b048ddac9902577c0bd429ad8e56cb51 | Solar electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:72afff6823e945983e964c0e2ac79ed46993306dd61f3f9d2080ca071484ff58 | Tide and wave electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:218b9e9e8b5ab80cc5fefbff9d1bf5f32ebffcd5e33e36cffe58ccbd3b42578d | Nuclear electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:f236f64367dffecdb5f80ffc17f15ab0596e484386e2e6ffb7733cd9d99f4adc | Fossil fuels electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: FRA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:d001cb2161ff43396188253085983c864f919dff7f3e50e28c206275f68704d1 | Electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:9840aceb38ada73fdcdcdaf4217290e1b048ddac9902577c0bd429ad8e56cb51 | Solar electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:72afff6823e945983e964c0e2ac79ed46993306dd61f3f9d2080ca071484ff58 | Tide and wave electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:218b9e9e8b5ab80cc5fefbff9d1bf5f32ebffcd5e33e36cffe58ccbd3b42578d | Nuclear electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:f236f64367dffecdb5f80ffc17f15ab0596e484386e2e6ffb7733cd9d99f4adc | Fossil fuels electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: FRA
- Concept pairs: electricity / generation
- Top candidates:
  1. INTL:FRA:2:12:BKWH:annual | Electricity - Generation | route=international | geography=FRA | product=Electricity | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:FRA:33:12:BKWH:annual | Hydroelectricity - Generation | route=international | geography=FRA | product=Hydroelectricity | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:FRA:38:12:QBTU:annual | Biomass and waste - Generation | route=international | geography=FRA | product=Biomass and waste | activity=Generation | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:FRA:30:12:BKWH:annual | Coal - Generation | route=international | geography=FRA | product=Coal | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:FRA:2:7:MK:annual | Electricity - Capacity | route=international | geography=FRA | product=Electricity | activity=Capacity | sector=none | frequency=annual | unit=million kilowatts | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result D

- Clarification: not required
- Route: international
- Geography: FRA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:d001cb2161ff43396188253085983c864f919dff7f3e50e28c206275f68704d1 | Electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:9840aceb38ada73fdcdcdaf4217290e1b048ddac9902577c0bd429ad8e56cb51 | Solar electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:72afff6823e945983e964c0e2ac79ed46993306dd61f3f9d2080ca071484ff58 | Tide and wave electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:218b9e9e8b5ab80cc5fefbff9d1bf5f32ebffcd5e33e36cffe58ccbd3b42578d | Nuclear electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:f236f64367dffecdb5f80ffc17f15ab0596e484386e2e6ffb7733cd9d99f4adc | Fossil fuels electricity net generation, France, Annual | route=international | geography=FRA | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D041

**Raw query:** Georgia natural gas production

**Categories:** ambiguous-geography, clarification, adversarial

#### Result A

- Clarification: not required
- Route: seds
- Geography: GA
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:fe2e2e2fdd93b56661fc5d344bb97c776152b60084e60562be9b8495ac9ee6b4 | Natural gas marketed production, Georgia | route=seds | geography=GA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:5d7244a0a88c2f8a01f05f6b0f46a2ef6cbe542636132c1558a69b53e1cdd126 | Factor for converting marketed natural gas production from physical units to Btu, Georgia | route=seds | geography=GA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: GA
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:fe2e2e2fdd93b56661fc5d344bb97c776152b60084e60562be9b8495ac9ee6b4 | Natural gas marketed production, Georgia | route=seds | geography=GA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:5d7244a0a88c2f8a01f05f6b0f46a2ef6cbe542636132c1558a69b53e1cdd126 | Factor for converting marketed natural gas production from physical units to Btu, Georgia | route=seds | geography=GA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: seds
- Geography: GA
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:fe2e2e2fdd93b56661fc5d344bb97c776152b60084e60562be9b8495ac9ee6b4 | Natural gas marketed production, Georgia | route=seds | geography=GA | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: GA
- Concept pairs: natural gas / production
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D042

**Raw query:** monthly natural gas production

**Categories:** clarification, missing-geography, frequency

#### Result A

- Clarification: required - Please clarify the country. Example: United States total energy consumption.
- Route: domestic
- Geography: unknown
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result B

- Clarification: required - Please include one country name. Examples: Brazil energy consumption, Jordan electricity generation, Mexico natural gas production.
- Route: unknown
- Geography: unknown
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the country. Example: United States total energy consumption.
- Route: domestic
- Geography: unknown
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the country. Example: United States total energy consumption.
- Route: domestic
- Geography: unknown
- Concept pairs: natural gas / production
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D043

**Raw query:** Texas production

**Categories:** clarification, missing-product

#### Result A

- Clarification: required - Please clarify the product. Example: United States total energy consumption.
- Route: international
- Geography: TX
- Concept pairs: ? / production
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify the product. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: ? / production
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify the product. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: ? / production
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify the product. Example: United States total energy consumption.
- Route: seds
- Geography: TX
- Concept pairs: ? / production
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D044

**Raw query:** California quarterly electricity from moon rock

**Categories:** clarification, unsupported-qualifier, no-result

#### Result A

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: international
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

#### Result B

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: domestic
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

#### Result C

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: domestic
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

#### Result D

- Clarification: required - Please clarify or remove the unsupported qualifier moon. No series will be selected until it is resolved.
- Route: domestic
- Geography: CA
- Concept pairs: electricity / ?
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D045

**Raw query:** Texas electric power sector electricity consumption

**Categories:** domestic, electricity, sector

#### Result A

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: electricity / consumption
- Top candidates:
  - None

#### Result B

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: electricity / consumption
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: domestic
- Geography: TX
- Concept pairs: electricity / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: electricity / consumption
- Top candidates:
  - None

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D046

**Raw query:** Texas natural gas production in billion cubic feet

**Categories:** seds, natural-gas, unit

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:3d75436829dd4dbbc299085c71ab932a502f54e8c1de027a8a6761c9c31b3359 | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  - None

#### Result C

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:3d75436829dd4dbbc299085c71ab932a502f54e8c1de027a8a6761c9c31b3359 | Factor for converting marketed natural gas production from physical units to Btu, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Thousand Btu per cubic feet | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: natural gas / production
- Top candidates:
  1. eia:1:cc257910ac901838eb403912bd5d96695a90a1388636c87217a21cd662ba7f8e | Natural gas marketed production, Texas | route=seds | geography=TX | product=natural gas | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D047

**Raw query:** Texas total energy consumption since 2000

**Categories:** seds, date-coverage, unsupported-qualifier

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:9e5ca269749ef17723ac3cc1f447a3c244dd141d864509c9224ac89190e57da2 | Total energy consumption in the industrial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: total energy / consumption
- Top candidates:
  1. eia:1:aec9a47bb24a4b3218ab689cf8ebdbb4a5e805aa0622886da56f1a9c26466aca | Total energy consumption, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=verified_aggregate | hierarchy=observation_validated | warnings=none
  2. eia:1:30a6b562233f06b814725e0cc9ebf666b4d7e26fbfa7d1c67b3e30d815badd10 | Total energy consumption in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:a9717f310b0b7f3d0ab3d6fc170ca165a2c58c5447cef762db2a96949dd8d86f | Total energy consumption per capita in the transportation sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:6690f114c164bb7c0a4f655766a22e1edd6c55b5c3dda38c91656204d72311d6 | Total energy consumption in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:d97ffc262b5f965e97fa2bbec39c291528dbecb43d0c2c5140beadf18a4c9c3d | Total energy consumption per capita in the commercial sector, Texas | route=seds | geography=TX | product=total energy | activity=consumption | sector=none | frequency=annual | unit=Million Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D048

**Raw query:** Brazil petroleum consumption excluding production

**Categories:** international, exclusion, petroleum

#### Result A

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:c57942476fba66e8a1ddda1f0bd94c6780902a7e24c70658c7662bf67888b606 | Petroleum and other liquids consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8839cf6dd2c979d8b6579c8c9e9b036d0aaa1864b60e3c84dcfb415e43826d95 | Refined petroleum products consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:33fab27217140e926301369c9b81bc4557071fea6bc57296a2c6144d2d75a497 | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:802a2dfd7f525f10bc76f4978d3c970a9446fc40e589abb316c2d3b9fa99f32f | Bunker distillate fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ef19e98b7c355077c3c2795d47b41b7ca024abae39dda3948955d1d93940dc5c | Bunker residual fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:c57942476fba66e8a1ddda1f0bd94c6780902a7e24c70658c7662bf67888b606 | Petroleum and other liquids consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8839cf6dd2c979d8b6579c8c9e9b036d0aaa1864b60e3c84dcfb415e43826d95 | Refined petroleum products consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:33fab27217140e926301369c9b81bc4557071fea6bc57296a2c6144d2d75a497 | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:802a2dfd7f525f10bc76f4978d3c970a9446fc40e589abb316c2d3b9fa99f32f | Bunker distillate fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ef19e98b7c355077c3c2795d47b41b7ca024abae39dda3948955d1d93940dc5c | Bunker residual fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. eia:1:c57942476fba66e8a1ddda1f0bd94c6780902a7e24c70658c7662bf67888b606 | Petroleum and other liquids consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:8839cf6dd2c979d8b6579c8c9e9b036d0aaa1864b60e3c84dcfb415e43826d95 | Refined petroleum products consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:33fab27217140e926301369c9b81bc4557071fea6bc57296a2c6144d2d75a497 | Liquefied petroleum gases (LPG) consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=1000 metric tons | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:802a2dfd7f525f10bc76f4978d3c970a9446fc40e589abb316c2d3b9fa99f32f | Bunker distillate fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ef19e98b7c355077c3c2795d47b41b7ca024abae39dda3948955d1d93940dc5c | Bunker residual fuel oil consumption, Brazil, Annual | route=international | geography=BRA | product=petroleum | activity=consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: BRA
- Concept pairs: petroleum / consumption
- Top candidates:
  1. INTL:BRA:5:2:TBPD:annual | Petroleum and other liquids - Consumption | route=international | geography=BRA | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:BRA:54:2:TBPD:annual | Refined petroleum products - Consumption | route=international | geography=BRA | product=Refined petroleum products | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:BRA:4415:2:QBTU:annual | Petroleum and other liquids - Consumption | route=international | geography=BRA | product=Petroleum and other liquids | activity=Consumption | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:BRA:67:2:TBPD:annual | Liquefied Petroleum Gases - Consumption | route=international | geography=BRA | product=Liquefied Petroleum Gases | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:BRA:68:2:TBPD:annual | Other petroleum liquids - Consumption | route=international | geography=BRA | product=Other petroleum liquids | activity=Consumption | sector=none | frequency=annual | unit=thousand barrels per day | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D049

**Raw query:** Japan and Brazil electricity generation

**Categories:** international, multiple-geographies, electricity

#### Result A

- Clarification: not required
- Route: international
- Geography: JPN, BRA
- Concept pairs: electricity / generation
- Top candidates:
  1. INTL:JPN:2:12:BKWH:annual | Electricity - Generation | route=international | geography=JPN | product=Electricity | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  2. INTL:JPN:33:12:BKWH:annual | Hydroelectricity - Generation | route=international | geography=JPN | product=Hydroelectricity | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  3. INTL:JPN:38:12:QBTU:annual | Biomass and waste - Generation | route=international | geography=JPN | product=Biomass and waste | activity=Generation | sector=none | frequency=annual | unit=quadrillion Btu | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  4. INTL:JPN:30:12:BKWH:annual | Coal - Generation | route=international | geography=JPN | product=Coal | activity=Generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none
  5. INTL:JPN:2:7:MK:annual | Electricity - Capacity | route=international | geography=JPN | product=Electricity | activity=Capacity | sector=none | frequency=annual | unit=million kilowatts | semantic=legacy-not-reported | aggregation=legacy-not-reported | hierarchy=legacy-not-reported | warnings=none

#### Result B

- Clarification: not required
- Route: international
- Geography: JPN, BRA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:964e7ea78022bc75b4a13e59b0861c0a2340a5c0ab38ec7d66650e98618b38ff | Electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf | Solar electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:edb75ee58d21536080a9bdb8e113b5325bf2702fdf4a9f466564f101ac13b0ab | Tide and wave electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:9f18cd89df9525827d816e2e760624ae7ee6f785963d58938ebfd0df2a13d9e9 | Nuclear electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:f5c601a160b5543d963fa32655e497488619fd1ffe2d149e2318cd8a5ead2e08 | Fossil fuels electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: JPN, BRA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:964e7ea78022bc75b4a13e59b0861c0a2340a5c0ab38ec7d66650e98618b38ff | Electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf | Solar electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:edb75ee58d21536080a9bdb8e113b5325bf2702fdf4a9f466564f101ac13b0ab | Tide and wave electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:9f18cd89df9525827d816e2e760624ae7ee6f785963d58938ebfd0df2a13d9e9 | Nuclear electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:f5c601a160b5543d963fa32655e497488619fd1ffe2d149e2318cd8a5ead2e08 | Fossil fuels electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

#### Result D

- Clarification: not required
- Route: international
- Geography: JPN, BRA
- Concept pairs: electricity / generation
- Top candidates:
  1. eia:1:964e7ea78022bc75b4a13e59b0861c0a2340a5c0ab38ec7d66650e98618b38ff | Electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:ef8d0d6b696303e736d8e78bf46c667343f3a2468700f052c6360c72ab46b6cf | Solar electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  3. eia:1:edb75ee58d21536080a9bdb8e113b5325bf2702fdf4a9f466564f101ac13b0ab | Tide and wave electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  4. eia:1:9f18cd89df9525827d816e2e760624ae7ee6f785963d58938ebfd0df2a13d9e9 | Nuclear electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified
  5. eia:1:f5c601a160b5543d963fa32655e497488619fd1ffe2d149e2318cd8a5ead2e08 | Fossil fuels electricity net generation, Japan, Annual | route=international | geography=JPN | product=electricity | activity=generation | sector=none | frequency=annual | unit=billion kilowatthours | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=product_contains_unrequested_concepts; aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

### H7-D050

**Raw query:** Texas coal consumption and production

**Categories:** domestic, multiple-concept-pairs, shared-product

#### Result A

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: coal / consumption; coal / production
- Top candidates:
  1. eia:1:819ae01e1c9bbdbc304e8779a1f4a450207fe7623d970aaa09078a7f44839d94 | Coal total consumption, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:e69c1598ff3553ce1b2fb263eca7a5d93d45a09a915a9e9b00486069840e983d | Coal total end-use consumption, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:14effd387f325590aded2eb300ea14680fb834f9c713dca933d397c1dcafd981 | Coal consumed by the transportation sector, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:59d53bac6c65d186f0bd558d09647623028831ea7722a1b2c628cfafef4854ad | Factor for converting coal consumed by the transportation sector from physical units to Btu, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Million Btu per short ton | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a3773e28260407c8f98341dd59491d736e902eff375816be21f0269287283ea5 | Coal consumed by the commercial sector, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result B

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: coal / consumption; coal / production
- Top candidates:
  1. eia:1:819ae01e1c9bbdbc304e8779a1f4a450207fe7623d970aaa09078a7f44839d94 | Coal total consumption, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:e69c1598ff3553ce1b2fb263eca7a5d93d45a09a915a9e9b00486069840e983d | Coal total end-use consumption, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:14effd387f325590aded2eb300ea14680fb834f9c713dca933d397c1dcafd981 | Coal consumed by the transportation sector, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:a3773e28260407c8f98341dd59491d736e902eff375816be21f0269287283ea5 | Coal consumed by the commercial sector, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:ceb5025650f78ad682d1fde8719e2fa0c551800dddb871ff38fd39fa7496d9a1 | Coal production, Texas | route=seds | geography=TX | product=coal | activity=production | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

#### Result C

- Clarification: not required
- Route: international
- Geography: TX
- Concept pairs: coal / consumption; coal / production
- Top candidates:
  - None

#### Result D

- Clarification: not required
- Route: seds
- Geography: TX
- Concept pairs: coal / consumption; coal / production
- Top candidates:
  1. eia:1:819ae01e1c9bbdbc304e8779a1f4a450207fe7623d970aaa09078a7f44839d94 | Coal total consumption, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  2. eia:1:e69c1598ff3553ce1b2fb263eca7a5d93d45a09a915a9e9b00486069840e983d | Coal total end-use consumption, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  3. eia:1:14effd387f325590aded2eb300ea14680fb834f9c713dca933d397c1dcafd981 | Coal consumed by the transportation sector, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  4. eia:1:59d53bac6c65d186f0bd558d09647623028831ea7722a1b2c628cfafef4854ad | Factor for converting coal consumed by the transportation sector from physical units to Btu, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Million Btu per short ton | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified
  5. eia:1:a3773e28260407c8f98341dd59491d736e902eff375816be21f0269287283ea5 | Coal consumed by the commercial sector, Texas | route=seds | geography=TX | product=coal | activity=consumption | sector=none | frequency=annual | unit=Billion Btu | semantic=compatible | aggregation=unknown | hierarchy=none | warnings=aggregation_relationship_not_verified

**Human response**

- Semantically acceptable arms: ____________________
- Preferred arm or tie: ____________________
- Unacceptable arms: ____________________
- Severity: none / minor / material / critical
- Reason codes: ____________________
- Reviewer notes: ____________________
- Reviewer name or initials: ____________________
- Review date: ____________________
- Adjudication required: yes / no

---

## 4. Summary Review Sheet

- Number reviewed: ______
- Better: ______
- Neutral: ______
- Worse: ______
- Cannot determine: ______
- Critical regressions: ______
- Adjudications required: ______
