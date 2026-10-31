"""P4: metadata regeneration must never reintroduce research instructions."""
import hashlib,importlib.util,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('g',Path(__file__).with_name('generate-coverage.py'));g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
class Descriptions(unittest.TestCase):
 def test_research_notes_stay_out_of_generated_description(self):
  d={'route':'international','dataColumn':'value','frequency':'annual','unitName':'Btu','unit':'BTU','basisLabel':'Coal production','facets':{'countryRegionId':'BRA','countryRegionTypeId':'c','productId':'p'},'geographyCode':'BRA','alternativeCount':0,'scopeNotes':['Prefer EIA compatible all-size total. Label utility-scale.']}
  cid='country|coal|production||';checks={'records':[{'key':hashlib.sha256(g.canonical([cid,d]).encode()).hexdigest()[:24],'pass':True}],'unsupported':[]}
  result=g.generate({'cells':[{'id':cid,'status':'mapped'}]},{'mappedCandidateCells':[{'cellId':cid,'defaults':[d]}]},checks,{'routes':{'international':{}}},{'rows':[]})
  self.assertEqual(result['rows'][0]['description'],'Coal production')
if __name__=='__main__':unittest.main()
