import importlib.util,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('t',Path(__file__).with_name('coverage-table.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class PartialTableTests(unittest.TestCase):
 def make(self,valid=True,complete=True):
  grid={'cells':[{'id':'a','status':'not checked'},{'id':'b','status':'not checked'}]};original={'p':{'cells':[{'cellId':'a','candidateStatus':'whole product'}]}};plan={'groups':[{'id':'g','originalPlanIds':['p']}]};audit={'groups':{'g':{'validated':valid,'retrievalComplete':complete,'wholePositiveCells':['a'],'subsetPositiveCells':[]}}}
  return m.build(grid,original,plan,audit)
 def test_no_metadata_candidate_is_not_nonpublication(self):self.assertEqual(self.make()['cells'][1]['status'],'not checked')
 def test_positive_observations_do_not_claim_completed_mapping(self):
  result=self.make();self.assertEqual(result['counts'],{'not checked':2});self.assertEqual(result['progress']['cellsWithWholeProductObservations'],1)
 def test_invalid_or_partial_group_cannot_supply_positive_evidence(self):
  for args in [(False,True),(True,False)]:self.assertEqual(self.make(*args)['progress']['cellsWithWholeProductObservations'],0)
 def test_frozen_cell_inventory_survives(self):self.assertEqual([c['id'] for c in self.make()['cells']],['a','b'])
class MappingGateTests(unittest.TestCase):
 def result(self,passed=True,count=1):
  grid={'cells':[{'id':'a','status':'not checked'}]};original={'p':{'cells':[{'cellId':'a','candidateStatus':'whole product'}]}};plan={'groups':[{'id':'g','originalPlanIds':['p']}]};audit={'groups':{'g':{'validated':True,'retrievalComplete':True,'wholePositiveCells':['a'],'subsetPositiveCells':[]}}}
  selected={'mappedCandidateCells':[{'cellId':'a','defaults':[{'geographyCode':'USA','route':'r','frequency':'annual','unit':'tons'}]}]};checks={'mode':'offline replay','records':[{'cellId':'a','pass':passed}]*count}
  return m.build(grid,original,plan,audit,selected,checks)
 def test_selected_defaults_and_all_row_checks_required(self):
  self.assertEqual(self.result()['cells'][0]['status'],'mapped');self.assertEqual(self.result(False)['cells'][0]['status'],'not checked');self.assertEqual(self.result(count=0)['cells'][0]['status'],'not checked')
 def test_surplus_row_checks_are_not_silently_accepted(self):self.assertEqual(self.result(count=2)['cells'][0]['status'],'not checked')
if __name__=='__main__':unittest.main()
