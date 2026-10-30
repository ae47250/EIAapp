import importlib.util,unittest,copy
from pathlib import Path
s=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-selection.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class SelectionTests(unittest.TestCase):
 def candidate(self,id='a',unit='kWh',scope='unspecified',first='2000',last='2024',freq='annual'):
  return {'series':{'id':id,'route':'route','frequency':freq,'unit':unit,'unitName':unit},'place':{'geographyCode':'USA','nativePlaceFilters':{},'firstNumeric':first,'lastNumeric':last,'numeric':25},'constraints':{'pending':[],'facilityScope':scope}}
 def test_broader_facility_total_beats_longer_utility_history(self):
  a=self.candidate('a',scope='utility-scale',first='1949');b=self.candidate('b',scope='all sizes',first='2014');self.assertEqual(m.choose([a,b],'electricity')[0],b)
 def test_physical_units_precede_thermal_for_electricity(self):
  a=self.candidate('a',unit='Btu',first='1949');b=self.candidate('b');self.assertEqual(m.choose([a,b],'electricity')[0],b)
 def test_joules_and_oil_equivalent_do_not_outrank_physical_product_units(self):
  for unit,name in [('TJ','terajoules'),('MTOE','million metric tons of oil equivalent'),('GJ','gigajoules')]:
   with self.subTest(unit=unit):
    thermal=self.candidate('a',unit=unit,first='1949');thermal['series']['unitName']=name
    physical=self.candidate('z',unit='short tons',first='1980')
    self.assertEqual(m.choose([thermal,physical],'coal')[0],physical)
 def test_approved_energy_codes_work_when_unit_name_is_absent(self):
  for unit in ['TJ','MTOE']:
   thermal=self.candidate('a',unit=unit,first='1949');thermal['series'].pop('unitName');physical=self.candidate('z',unit='BCF');self.assertEqual(m.choose([thermal,physical],'natural gas')[0],physical)
 def test_energy_equivalent_remains_eligible_when_physical_unit_is_unavailable(self):
  a=self.candidate(unit='TJ');self.assertEqual(m.choose([a],'coal')[0],a)
 def test_total_energy_prefers_btu(self):
  a=self.candidate('a',unit='Btu');b=self.candidate('b',first='1949');self.assertEqual(m.choose([a,b],'total energy')[0],a)
 def test_longest_compatible_history(self):
  a=self.candidate('a',first='2010');b=self.candidate('b',first='2000');self.assertEqual(m.choose([a,b],'coal')[0],b)
 def test_mixed_frequency_or_place_rejected(self):
  a=self.candidate();b=self.candidate('b',freq='monthly',first='2000-01',last='2024-12')
  with self.assertRaises(ValueError):m.choose([a,b],'coal')
  b=self.candidate('b');b['place']['geographyCode']='ISL'
  with self.assertRaises(ValueError):m.choose([a,b],'coal')
 def test_known_scope_constraint_remains_unresolved(self):
  a=self.candidate();a['constraints']['pending']=[{'field':'scopeConstraints','value':'historical break'}];self.assertIsNone(m.choose([a],'coal')[0])
 def test_small_scale_component_never_default(self):self.assertIsNone(m.choose([self.candidate(scope='small-scale only')],'solar')[0])
 def test_source_constraints_preserved_without_guessing(self):
  c=m.constraints([{'generationScope':'utility-scale','broaderPublishedTotal':'official broader total unverified'}]);self.assertEqual(c['facilityScope'],'utility-scale');self.assertEqual(c['pending'][0]['field'],'broaderPublishedTotal')
 def test_distinct_product_scopes_require_reconciliation(self):
  a=self.candidate('a');b=self.candidate('b');a['constraints']['nativeProductDefinitions']=['crude oil'];b['constraints']['nativeProductDefinitions']=['crude oil plus lease condensate'];self.assertIsNone(m.choose([a,b],'petroleum')[0])
 def test_specific_all_size_facet_overrides_generic_utility_column(self):
  records=[{'id':'generation','generationScope':'utility-scale unless explicit all-size or small-scale fuel code','definition':{'alias':'Utility Scale Electricity Net Generation'}},{'generationScope':'all sizes'}]
  con=m.constraints(records);self.assertEqual(con['facilityScope'],'all sizes');label=m.selection_label({'basis':{'label':'Utility Scale Electricity Net Generation; estimated total solar'}},con,records);self.assertNotIn('Utility Scale Electricity Net Generation',label);self.assertIn('all facility sizes',label)
  self.assertEqual(m.constraints(records[:1])['facilityScope'],'utility-scale')
 def test_utility_fallback_keeps_size_label(self):
  self.assertIn('1 MW and larger',m.selection_label({'basis':{'label':'Wind generation'}},{'facilityScope':'utility-scale'},[]))
 def test_calendar_spans(self):
  self.assertEqual(m.span('2000-12','2001-01','monthly'),1);self.assertEqual(m.span('2000-Q4','2001-Q1','quarterly'),1)
 def test_verified_whole_basis_correspondence_preserves_physical_unit_preference(self):
  a=self.candidate('a',unit='BCF');b=self.candidate('b',unit='QBTU',first='1949')
  for c,name in [(a,'dry natural gas'),(b,'natural gas')]:c['constraints'].update(nativeProductDefinitions=[name],verifiedBasisGroup='whole natural gas measurement bases')
  self.assertEqual(m.choose([a,b],'natural gas')[0],a)
 def test_unverified_definition_cannot_join_reviewed_group(self):
  a=self.candidate('a');b=self.candidate('b')
  a['constraints'].update(nativeProductDefinitions=['dry natural gas'],verifiedBasisGroup='whole natural gas measurement bases')
  b['constraints'].update(nativeProductDefinitions=['unknown gas'])
  self.assertIsNone(m.choose([a,b],'natural gas')[0])
 def test_two_different_reviewed_products_do_not_become_equivalent(self):
  a=self.candidate('a');b=self.candidate('b')
  a['constraints'].update(nativeProductDefinitions=['dry natural gas'],verifiedBasisGroup='whole natural gas measurement bases')
  b['constraints'].update(nativeProductDefinitions=['petroleum and other liquids'],verifiedBasisGroup='petroleum and other liquids total')
  self.assertIsNone(m.choose([a,b],'natural gas')[0])
 def test_basis_review_matches_route_facet_code_and_name(self):
  r={'sourceFacet':'productId','product':'natural gas','definition':{'id':'26','name':'Dry natural gas'}}
  self.assertEqual(m.constraints([r],'international')['verifiedBasisGroup'],'whole natural gas measurement bases')
  self.assertIsNone(m.constraints([r],'unknown')['verifiedBasisGroup'])
  r['definition']['name']='Unknown gas';self.assertIsNone(m.constraints([r],'international')['verifiedBasisGroup'])
 def test_verified_basis_never_removes_explicit_scope_blocker(self):
  a=self.candidate();a['constraints'].update(nativeProductDefinitions=['dry natural gas'],verifiedBasisGroup='whole natural gas measurement bases',pending=[{'field':'broaderPublishedTotal','value':'unresolved'}])
  self.assertIsNone(m.choose([a],'natural gas')[0])
 def test_explicit_us_restriction_does_not_block_states(self):
  c={'pending':[{'field':'scopeConstraints','value':[{'placeCode':'USA','wholeScopeFrom':'2013','reason':'US excludes Alaska before 2013'}]}],'facilityScope':'unspecified'}
  self.assertTrue(m.for_place(c,'USA')['pending'])
  for place in ['AK','TX','SD','GEO']:self.assertFalse(m.for_place(c,place)['pending'])
  self.assertTrue(c['pending'])
 def test_unscoped_and_other_constraints_still_block(self):
  c={'pending':[{'field':'scopeConstraints','value':[{'reason':'scope unknown'}]},{'field':'broaderPublishedTotal','value':'unknown'}]}
  self.assertEqual(len(m.for_place(c,'TX')['pending']),2)
 def test_verified_all_size_total_precedes_unspecified_scope(self):
  a=self.candidate('a',scope='unspecified',first='1949');b=self.candidate('b',scope='all sizes',first='2014')
  self.assertEqual(m.choose([a,b],'solar')[0],b)
 def test_generation_basis_correspondence_does_not_apply_to_other_activity(self):
  review=m.i.read(m.E/'basis-equivalence-review.json');e=next(e for e in review['entries'] if e.get('activities')==['generation']);r={'sourceFacet':e['facet'],'definition':e['definition'],'product':'electricity'}
  self.assertEqual(m.constraints([r],e['route'],'generation')['verifiedBasisGroup'],e['group'])
  self.assertIsNone(m.constraints([r],e['route'],'consumption')['verifiedBasisGroup'])
if __name__=='__main__':unittest.main()
