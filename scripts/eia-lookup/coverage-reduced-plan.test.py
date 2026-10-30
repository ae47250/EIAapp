"""Proposal bookkeeping against the fixed original candidate plan; no network."""
import importlib.util,unittest,collections,copy
from pathlib import Path
spec=importlib.util.spec_from_file_location('r',Path(__file__).with_name('coverage-reduced-plan.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class ReducedPlanTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.plan=m.i.read(m.i.EVIDENCE/'b1-request-plan.json');cls.sizes=m.i.read(m.i.EVIDENCE/'sizing-results.json');cls.result=m.build(cls.plan,cls.sizes)
 def test_every_original_request_is_retained_once(self):
  actual=[x for g in self.result['groups'] for x in g['originalPlanIds']];expected=[p['id'] for p in self.plan['plans']]
  self.assertEqual(collections.Counter(actual),collections.Counter(expected));self.assertEqual(len(actual),len(set(actual)))
 def test_all_candidate_cells_and_freeze_hash_retained(self):
  self.assertEqual({c['cellId'] for p in self.plan['plans'] for c in p['cells']},{c for g in self.result['groups'] for c in g['cells']});self.assertEqual(self.result['frozenGridSHA256'],self.plan['frozenGridSHA256'])
 def test_every_original_native_filter_survives_batching(self):
  old={p['id']:p for p in self.plan['plans']}
  for g in self.result['groups']:
   for id in g['originalPlanIds']:
    p=old[id];self.assertIn(p['column'],g['columns']);self.assertEqual(p['frequency'],g['frequency'])
    for fid,values in p['filters'].items():self.assertTrue(set(values)<=set(g['filters'][fid]))
 def test_approved_exceptions_still_excluded(self):
  for g in self.result['groups']:
   if g['route']==m.OPS:self.assertFalse(set(g['filters']['fueltypeid'])&{'OB2','OBW'});self.assertNotIn('95',g['filters']['sectorid'])
 def test_proposal_is_below_gate_and_not_execution(self):
  self.assertLess(self.result['totalPlanningAllowance'],20000);self.assertTrue(self.result['status'].startswith('PROPOSED ONLY'));self.assertEqual(self.sizes['actualNewCalls'],40)
 def test_joint_columns_require_actual_return_evidence(self):
  sizes=copy.deepcopy(self.sizes);next(r for r in sizes['results'] if r['id']=='joint-measure-columns')['returnedRequestedColumns']=[]
  with self.assertRaisesRegex(ValueError,'not returned'):m.build(self.plan,sizes)
if __name__=='__main__':unittest.main()
