import importlib.util,unittest,copy
from unittest.mock import patch
from pathlib import Path
s=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-negative-recheck.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class RecheckTests(unittest.TestCase):
 def setUp(self):
  self.cell={'id':'country|coal|production||','placeKind':'country','product':'coal','activity':'production','sector':None,'qualifier':None,'status':"not in EIA's catalogue"}
  self.request={'route':'synthetic','cell':self.cell,'params':{'frequency':'annual','data':['value']}}
  self.cat={'dataColumns':[{'id':'value','classification':'via facet combinations'}],'facets':{'productId':[{'definition':{'id':'7'},'frequencies':['annual'],'classification':'whole product','product':'coal'}],'activityId':[{'definition':{'id':'1'},'frequencies':['annual'],'classification':'whole product','activity':'production'}]}}
  self.node={'frequencies':[{'id':'annual'}]};self.cross={'facets':{'place':[{'definition':{'id':'BRA'},'status':'mapped','geographyCode':'BRA'}]}};self.geos={'BRA':{'type':'country'}}
  self.inventory={**self.cat['facets'],'place':[{'definition':{'id':'BRA'},'frequencies':['annual']}]};self.row={'period':'2024','productId':'7','activityId':'1','place':'BRA','value':'0'}
 def assess(self,row=None):
  with patch.object(m.i,'inventory',return_value=self.inventory):return m.assess(self.request,{'data':[row or self.row],'total':100000},self.cat,self.node,self.cross,self.geos)
 def test_numeric_zero_falsifies_absence_even_in_truncated_probe(self):
  r=self.assess();self.assertFalse(r['pass']);self.assertTrue(r['probeTruncated']);self.assertEqual(r['counterexampleCount'],1)
 def test_symbol_does_not_falsify_numeric_absence(self):
  self.assertTrue(self.assess({**self.row,'value':'--'})['pass'])
 def test_unknown_native_code_cannot_be_silently_ignored(self):
  r=self.assess({**self.row,'productId':'new'});self.assertFalse(r['pass']);self.assertEqual(r['unknownDefinitions'],[{'facet':'productId','code':'new'}])
 def test_foreign_kind_does_not_falsify_us_absence(self):
  self.cell['placeKind']='US';self.assertTrue(self.assess()['pass'])
 def test_subset_can_falsify_catalogue_or_data_absence_but_not_subset_only(self):
  self.cat['facets']['productId'][0]['classification']='subset'
  for status in ["not in EIA's catalogue",'EIA returns no data']:self.cell['status']=status;self.assertFalse(self.assess()['pass'])
  self.cell['status']='subset only';self.assertTrue(self.assess()['pass'])
 def test_whole_falsifies_subset_only(self):
  self.cell['status']='subset only';self.assertFalse(self.assess()['pass'])
 def test_no_sector_or_qualifier_substitution(self):
  self.cell['sector']='industrial';self.assertTrue(self.assess()['pass']);self.cell['sector']=None;self.cell['qualifier']='gasoline';self.assertTrue(self.assess()['pass'])
 def test_missing_native_dimension_or_value_cannot_pass(self):
  for field in ['productId','activityId','place','value','period']:
   row=dict(self.row);row.pop(field);self.assertFalse(self.assess(row)['pass'],field)
 def test_official_us_scope_never_becomes_a_state(self):
  self.cross={'facets':{},'scopeEvidence':{'placeKind':'US'}};self.cell['placeKind']='state';self.assertTrue(self.assess()['pass']);self.cell['placeKind']='US';self.assertFalse(self.assess()['pass'])
if __name__=='__main__':unittest.main()
