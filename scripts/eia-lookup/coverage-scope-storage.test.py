"""Owner/source expectations frozen in capacity-scope-source-review.json before edits.
Regression checks, not an independent benchmark or publication proof.
"""
import importlib.util,json,gzip,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
BASE=Path(__file__).parent
def module(name):
 s=importlib.util.spec_from_file_location(name,BASE/(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
e=module('coverage-electricity-classification');c=module('coverage-series-catalog');s=module('coverage-seds-classification');m=module('coverage-mer-classification');i=e.i
class ScopeTests(unittest.TestCase):
 def test_only_approved_exceptions_are_ineligible_for_both_uses(self):
  for fid,code in [('fueltypeid','OB2'),('fueltypeid','OBW'),('sectorid','95')]:
   r=e.facet(e.OPS,fid,{'id':code});self.assertEqual(r['classification'],'pending')
   self.assertFalse(r['coverageEligible']);self.assertFalse(r['nonpublicationEvidenceEligible'])
  for fid,code in [('fueltypeid','UNKNOWN'),('sectorid','UNKNOWN')]:self.assertNotIn('ownerException',e.facet(e.OPS,fid,{'id':code}))
 def test_exception_gate_is_not_classification_completion(self):
  node=next(n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route']==e.OPS)
  out=e.build(node);self.assertFalse(out['complete']);self.assertTrue(out['reviewCompleteWithExceptions']);self.assertEqual(len(out['unresolvedExceptions']),3)
  out=c.build_node(node);self.assertFalse(out['classificationComplete']);self.assertTrue(out['reviewCompleteWithExceptions'])
  for fid in ['fueltypeid','sectorid']:
   for r in out['facets'][fid]:
    if r.get('ownerException'):self.assertFalse(r['coverageEligible']);self.assertFalse(r['nonpublicationEvidenceEligible'])
 def test_additional_unknown_still_blocks_review(self):
  node=next(n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route']==e.OPS)
  original=i.inventory;data=original(e.OPS);data['fueltypeid'].append({'definition':{'id':'NEW_UNKNOWN'},'calls':[],'frequencies':['annual']})
  with patch.object(i,'inventory',return_value=data):self.assertFalse(e.build(node)['reviewCompleteWithExceptions'])
 def test_all_seds_capacity_preserves_basis_and_components(self):
  records=[s.classify(r['definition']) for r in i.inventory('seds')['seriesId']]
  capacity=[r for r in records if r.get('activity')=='capacity'];self.assertEqual(len(capacity),17)
  for r in capacity:
   self.assertEqual(r['capacityScope'],'utility-scale');self.assertIn('December',r['timeMeaning']);self.assertIn('broader EIA total',r['selectionConstraint']);self.assertNotIn('generationScope',r)
  by={r['sourceDefinition']['id']:r for r in capacity}
  for code in ['BTGBP','HPGBP','WDGBP','WSGBP']:self.assertEqual(by[code]['classification'],'subset')
  self.assertIn('small-scale',by['SOGBP']['broaderPublishedTotal'])
 def test_mer_capacity_nuclear_and_historical_scope(self):
  records=[m.classify(r['definition']) for r in i.inventory('total-energy')['msn']]
  capacity=[r for r in records if r.get('activity')=='capacity'];self.assertEqual(len(capacity),60)
  for r in capacity:
   self.assertNotIn('generationScope',r);self.assertIn('End of period',r['timeMeaning'])
   if r['sourceDefinition']['id']=='NUGBPUS':self.assertEqual(r['capacityScope'],'Operable nuclear generating units');self.assertIn('January',r['historicalScope'])
   else:
    self.assertEqual(r['capacityScope'],'utility-scale')
    if r.get('sector') in ['commercial','industrial']:self.assertNotIn('historicalScope',r)
    else:self.assertIn('through 1988 electric utilities only',r['historicalScope'])
 def test_review_storage_round_trip_and_tamper_rejection(self):
  with tempfile.TemporaryDirectory() as tmp:
   home=Path(tmp);path=home/'review.json';data={'series':[{'classification':'whole product','sourceDefinition':{'id':'ABC'}}]}
   with patch.object(Path,'home',return_value=home):i.write_review(path,data)
   # expanduser resolves actual home, so use the actual temporary absolute path in test pointer.
   ptr=json.loads(path.read_text());target=home/ptr['localFile'][2:];ptr['localFile']=str(target);path.write_text(json.dumps(ptr))
   self.assertEqual(i.read(path),data);before=target.read_bytes();target.write_bytes(before+b'x')
   with self.assertRaisesRegex(ValueError,'hash mismatch'):i.read(path)
 def test_missing_evidence_stops_instead_of_empty_fallback(self):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/'pointer.json';p.write_text(json.dumps({'storage':'local-research-evidence-v1','localFile':str(Path(tmp)/'absent.json'),'sha256':'0'*64}))
   with self.assertRaises(FileNotFoundError):i.read(p)
if __name__=='__main__':unittest.main()
