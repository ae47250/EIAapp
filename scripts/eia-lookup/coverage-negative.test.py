import importlib.util,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-negative.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class NegativeTests(unittest.TestCase):
 def setUp(self):
  self.cell={'id':'US|coal|reserves||','placeKind':'US','product':'coal','activity':'reserves','qualifier':None}
  self.audit={'a':{'validated':True,'retrievalComplete':True,'wholePositiveCells':[],'subsetPositiveCells':[]}}
 def test_metadata_absence_separate_from_data_absence(self):
  self.assertEqual(m.decision(self.cell,[],{},[])['status'],"not in EIA's catalogue")
  self.assertEqual(m.decision(self.cell,['a'],self.audit,[])['status'],'EIA returns no data')
 def test_partial_or_invalid_group_never_negative(self):
  for key in ['validated','retrievalComplete']:
   self.setUp();self.audit['a'][key]=False;self.assertEqual(m.decision(self.cell,['a'],self.audit,[])['status'],'not checked')
  self.assertEqual(m.decision(self.cell,['missing'],self.audit,[])['status'],'not checked')
 def test_numeric_whole_including_zero_blocks_absence(self):
  self.audit['a']['wholePositiveCells']=[self.cell['id']];self.assertEqual(m.decision(self.cell,['a'],self.audit,[])['status'],'not checked')
 def test_subset_requires_complete_groups_and_no_whole_observations(self):
  self.audit['a']['subsetPositiveCells']=[self.cell['id']];self.assertEqual(m.decision(self.cell,['a'],self.audit,[])['status'],'subset only')
  self.audit['a']['wholePositiveCells']=[self.cell['id']];self.assertEqual(m.decision(self.cell,['a'],self.audit,[])['status'],'not checked')
 def test_metadata_gaps_never_support_absence(self):
  gap={'key':'unknown','placeKinds':['US'],'products':['coal'],'activities':['reserves']}
  for groups in [[],['a']]:self.assertEqual(m.decision(self.cell,groups,self.audit,[gap])['status'],'not checked')
 def test_scope_does_not_spread_to_unrelated_product_activity_or_place(self):
  gap={'key':'unknown','placeKinds':['US'],'products':['coal'],'activities':['reserves']}
  for field,value in [('placeKinds',['state']),('products',['natural gas']),('activities',['generation'])]:
   other={**gap,field:value};self.assertEqual(m.decision(self.cell,[],{},[other])['status'],"not in EIA's catalogue")
 def test_qualifier_gap_blocks_whole_and_same_qualifier_not_another(self):
  gap={'key':'unknown','placeKinds':['US'],'products':['coal'],'activities':['reserves'],'qualifier':'known part'}
  for q in [None,'known part']:self.assertTrue(m.blocked({**self.cell,'qualifier':q},[gap]))
  self.assertFalse(m.blocked({**self.cell,'qualifier':'another part'},[gap]))
if __name__=='__main__':unittest.main()
