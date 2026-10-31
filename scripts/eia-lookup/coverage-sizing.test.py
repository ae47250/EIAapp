"""Sizing is bounded bookkeeping, never observation coverage."""
import importlib.util,io,json,tempfile,unittest,urllib.error
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('sizing',Path(__file__).with_name('coverage-sizing.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class SizingTests(unittest.TestCase):
 def test_sizing_requests_exactly_one_row(self):
  self.assertEqual(dict(m.sizing_params({'frequency':'annual','column':'value'})),{'frequency':'annual','data[0]':'value','offset':0,'length':1})
 def test_sharing_unions_ids_without_summing_observations(self):
  common={'route':'seds','frequency':'annual','column':'value','rectangularPages':2,'seriesFacet':'seriesId','cells':[{'cellId':'a'}]}
  plans=[{**common,'id':'x','filters':{'seriesId':['A'],'stateId':['NY']}},{**common,'id':'y','filters':{'seriesId':['B'],'stateId':['TX']},'cells':[{'cellId':'b'}]}]
  g=m.group_plan({'plans':plans});self.assertEqual(len(g),1);self.assertEqual(g[0]['filters'],{'seriesId':['A','B'],'stateId':['NY','TX']});self.assertEqual(g[0]['cells'],['a','b']);self.assertNotIn('observations',g[0])
 def test_budget_stops_retry_before_extra_request(self):
  r=m.research
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp);key=root/'key';key.write_text('dummy-not-a-real-credential');error=urllib.error.HTTPError('https://example.invalid',429,'limited',{},io.BytesIO(b'{}'))
   with patch.object(r,'KEYFILE',key),patch.object(r,'RAW',root/'raw'),patch.object(r,'LOG',root/'calls.jsonl'),patch.object(r.time,'sleep'),patch.object(r.urllib.request,'urlopen',side_effect=error) as fetch:
    c=r.Collector(max_new_calls=1)
    with self.assertRaisesRegex(RuntimeError,'per-run call limit'):c.get('test',kind='test')
    self.assertEqual(fetch.call_count,1);self.assertEqual(len(c.records),1)
 def test_zero_budget_never_sends_request(self):
  r=m.research;c=r.Collector.__new__(r.Collector);c.records=[];c.cached={};c.call_limit=0
  with patch.object(r.urllib.request,'urlopen') as fetch:
   with self.assertRaisesRegex(RuntimeError,'per-run call limit'):c.get('test')
   fetch.assert_not_called()
if __name__=='__main__':unittest.main()
