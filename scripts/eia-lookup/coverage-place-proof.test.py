import importlib.util,unittest
from unittest.mock import patch
from pathlib import Path
s=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-place-proof.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class PlaceProofTests(unittest.TestCase):
 def setUp(self):
  self.p=m.Proof.__new__(m.Proof);self.cid='country|coal|production||';self.p.original={'p':{'cells':[{'cellId':self.cid}]} };self.p.plan={'groups':[{'id':'a','route':'r','originalPlanIds':['p']}]};self.p.audit={'a':{'validated':True,'retrievalComplete':True}};self.p.cross={'r':{'facets':{'place':[{'status':'mapped','geographyCode':'BRA'}]}}};self.p.gaps=[];self.p.cache={'a':{'calls':[1,2],'series':[]}}
 def get(self,code='BRA'):
  with patch.object(Path,'read_bytes',return_value=b'crosswalk'):return self.p.get(self.cid,code,'annual')
 def test_missing_default_is_not_consulted_as_proof(self):
  d=self.get();self.assertTrue(d['verified']);self.assertEqual(d['status'],'EIA returns no data');self.assertEqual(d['calls'],[1,2])
 def test_no_place_in_complete_crosswalk_is_catalogue_absence(self):
  d=self.get('GEO');self.assertTrue(d['verified']);self.assertEqual(d['status'],"not in EIA's catalogue")
 def test_unfinished_group_cannot_prove_absence(self):
  self.p.audit['a']['retrievalComplete']=False;self.assertFalse(self.get()['verified'])
 def test_invalid_audit_cannot_prove_absence(self):
  self.p.audit['a']['validated']=False;self.assertFalse(self.get()['verified'])
 def series(self,numeric=1,frequency='annual'):
  return {'id':'s','cellId':self.cid,'candidateStatus':'whole product','frequency':frequency,'measureFacets':{'product':'coal'},'places':{'p':{'geographyCode':'BRA','numeric':numeric,'rows':1,'symbols':{} if numeric else {'--':1},'nativePlaceFilters':{'place':'BRA'}}}}
 def test_numeric_zero_counts_as_observation_and_blocks_absence(self):
  self.p.cache['a']['series']=[self.series()];self.assertFalse(self.get()['verified'])
 def test_other_frequency_data_prevents_unqualified_absence(self):
  self.p.cache['a']['series']=[self.series(frequency='monthly')];self.assertFalse(self.get()['verified'])
 def test_symbol_only_data_must_be_preserved(self):
  self.p.cache['a']['series']=[self.series(numeric=0)];d=self.get();self.assertFalse(d['verified']);self.assertIn('symbolOnly',d)
 def test_gap_blocks_only_places_that_route_can_cover(self):
  self.p.gaps=[{'key':'x','route':'r','placeKinds':['country'],'products':['coal'],'activities':['production']}];self.assertFalse(self.get()['verified']);self.assertTrue(self.get('GEO')['verified'])
if __name__=='__main__':unittest.main()
