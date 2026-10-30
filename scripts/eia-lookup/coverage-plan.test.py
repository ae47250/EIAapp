"""Metadata request-plan invariants; no network and no publication claims."""
import importlib.util,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('plan',Path(__file__).with_name('coverage-plan.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class PlanTests(unittest.TestCase):
 def test_exceptions_and_ineligible_definitions_never_form_requests(self):
  for extra in [{'ownerException':'unidentifiedElectricityMetadata'},{'coverageEligible':False}]:self.assertEqual(m.meanings({'classification':'whole product','product':'coal','activity':'production',**extra}),[])
 def test_sector_never_becomes_all_sector_total(self):
  r={'classification':'subset','product':'natural gas','activity':'prices','sector':'industrial','sectorCellClassification':'whole product'}
  self.assertIn(('natural gas','prices','industrial',None,'whole product'),m.meanings(r));self.assertIn(('natural gas','prices',None,None,'subset'),m.meanings(r))
 def test_component_still_component_after_sector_merge(self):
  col={'classification':'whole product','activity':'generation'}
  parts={'fuel':{'classification':'subset','product':'solar'},'sector':{'classification':'subset','sector':'industrial','sectorCellClassification':'whole product'}}
  self.assertTrue(all(r[-1]=='subset' for r in m.composed(col,parts)))
 def test_qualified_whole_is_not_whole_petroleum(self):
  r={'classification':'subset','product':'petroleum','activity':'prices','qualifier':'gasoline','qualifierClassification':'whole product'}
  self.assertIn(('petroleum','prices',None,'gasoline','whole product'),m.meanings(r));self.assertNotIn(('petroleum','prices',None,None,'whole product'),m.meanings(r))
 def test_all_fuel_consumption_uses_input_product(self):
  col={'classification':'whole product','activity':'consumption'};parts={'fuel':{'classification':'whole product','product':'electricity','inputProduct':'total energy'}}
  self.assertEqual(m.composed(col,parts),[('total energy','consumption',None,None,'whole product')])
 def test_international_via_facets_is_neutral_not_subset(self):
  self.assertEqual(m.composed({'classification':'via facet combinations'}, {'p':{'classification':'whole product','product':'coal'},'a':{'classification':'whole product','activity':'production'}}),[('coal','production',None,None,'whole product')])
 def test_trade_direction_does_not_turn_prices_into_exports(self):
  col={'classification':'whole product','product':'coal','activity':'prices'};part={'exportImportType':{'classification':'whole product','activity':'exports'}}
  self.assertEqual(m.composed(col,part),[('coal','prices',None,None,'whole product')])
 def test_place_aliases_and_required_filters_are_preserved(self):
  rows=[{'status':'mapped','geographyCode':'TX','frequencies':['annual'],'definition':{'id':v},'requiredFilters':{'destinationType':[t]}} for v,t in [('RS_TX','RS'),('PS_TX','PS')]]
  out=m.place_options('crude-oil-imports',{'facets':{'destinationId':rows}},{'TX':'state'},'annual');self.assertEqual(len(out),2);self.assertEqual({r['filters']['destinationType'][0] for r in out},{'RS','PS'});self.assertEqual(m.place_options('r',{'facets':{'destinationId':rows}},{'TX':'state'},'monthly'),[])
 def test_us_scope_does_not_create_country_scope(self):
  out=m.place_options('total-energy',{'facets':{},'scopeEvidence':{'placeKind':'US'}},{},'annual');self.assertEqual([r['kind'] for r in out],['US'])
if __name__=='__main__':unittest.main()
