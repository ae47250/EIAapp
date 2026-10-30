"""Denominator invariants, not retrieval or meaning scores."""
import importlib.util,unittest,itertools
from pathlib import Path
spec=importlib.util.spec_from_file_location('grid',Path(__file__).with_name('coverage-grid.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class GridTests(unittest.TestCase):
 def setUp(self):self.v=m.i.read(m.i.ROOT/'data/eia/phase4-routing-config.json')['vocabulary']
 def test_exact_base_denominator(self):
  d=m.build({},self.v);base=[r for r in d['cells'] if r['group']=='base'];self.assertEqual(len(base),672)
  self.assertEqual({(r['placeKind'],r['product'],r['activity']) for r in base},set(itertools.product(m.KINDS,self.v['products'],self.v['activities'])))
 def test_qualifiers_are_separate_and_limited(self):
  d=m.build({},self.v);q=[r for r in d['cells'] if r['group']=='qualifier'];self.assertEqual(len(q),96);self.assertEqual({r['qualifier'] for r in q},{'crude oil','gasoline'});self.assertTrue(all(r['product']=='petroleum' for r in q))
 def test_sector_from_facet_or_encoded_series_is_included(self):
  d={'r':{'dataColumns':[{'classification':'whole product','product':'coal','activity':'consumption'}],'facets':{'sector':[{'classification':'subset','sector':'commercial'}]}},'s':{'dataColumns':[],'facets':{'series':[{'classification':'subset','product':'natural gas','activity':'prices','sector':'industrial'}]}}}
  out=m.build(d,self.v);pairs={(r['product'],r['activity'],r['sector']) for r in out['cells'] if r['group']=='sector'};self.assertEqual(pairs,{('coal','consumption','commercial'),('natural gas','prices','industrial')})
 def test_unknown_exception_never_creates_coverage(self):
  d={'r':{'dataColumns':[],'facets':{'sector':[{'classification':'pending','ownerException':'unidentifiedElectricityMetadata','sector':'industrial','product':'biofuels','activity':'generation'}]}}}
  out=m.build(d,self.v);self.assertNotIn('sector',out['counts']);self.assertTrue(all(r['status']=='not checked' for r in out['cells']))
if __name__=='__main__':unittest.main()
