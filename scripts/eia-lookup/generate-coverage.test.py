"""Owner-required mapped/subset separation; no network or generation of fixtures."""
import hashlib,importlib.util,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('g',Path(__file__).with_name('generate-coverage.py'));g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
class Generation(unittest.TestCase):
 def test_only_mapped_cells_generate_rows(self):
  d={'route':'international','dataColumn':'value','frequency':'annual','unitName':'Btu','unit':'BTU','basisLabel':'Whole fuel','facets':{'countryRegionId':'BRA','countryRegionTypeId':'c','productId':'p'},'geographyCode':'BRA','alternativeCount':0}
  ids=['country|coal|production||','country|coal|consumption||'];cells=[{'cellId':c,'defaults':[d]} for c in ids]
  checks={'records':[{'key':hashlib.sha256(g.canonical([c,d]).encode()).hexdigest()[:24],'pass':True} for c in ids],'unsupported':[]}
  table={'cells':[{'id':ids[0],'status':'mapped'},{'id':ids[1],'status':'subset only'}]}
  result=g.generate(table,{'mappedCandidateCells':cells},checks,{'routes':{'international':{}}},{'rows':[]})
  self.assertEqual(len(result['rows']),1);self.assertEqual(result['rows'][0]['generatedFrom'],ids[0]);self.assertEqual(result['mappedCells'],[ids[0]])
  self.assertEqual(result['rows'][0]['fixedFacets']['countryRegionTypeId'],'c');self.assertNotIn('points',result['rows'][0])
 def test_failed_verification_never_generates_rows(self):
  with self.assertRaises(AssertionError):g.generate({'cells':[]},{'mappedCandidateCells':[]},{'records':[{'key':'bad','pass':False}],'unsupported':[]},{'routes':{}},{'rows':[]})
if __name__=='__main__':unittest.main()
