"""Offline transport invariants; synthetic responses, no network or keys."""
import importlib.util,unittest,copy,itertools,threading,concurrent.futures
from pathlib import Path
spec=importlib.util.spec_from_file_location('fetcher',Path(__file__).with_name('coverage-fetch.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class Clock:
 def __init__(self,t=10000):self.t=t
 def now(self):return self.t
 def sleep(self,n):self.t+=n
class FetchTests(unittest.TestCase):
 def test_partition_preserves_disjoint_cartesian_filter_space(self):
  p={'facets':{'a':[str(x) for x in range(30)],'b':[str(x) for x in range(20)]},'length':5000}
  pieces=m.split_filters(p,170)
  actual=[x for q in pieces for x in itertools.product(q['facets']['a'],q['facets']['b'])]
  self.assertEqual(set(actual),set(itertools.product(p['facets']['a'],p['facets']['b'])));self.assertEqual(len(actual),len(set(actual)))
 def test_shared_concurrent_rate_limit(self):
  c=Clock();starts=[];l=m.Limiter([],starts,20000,c.now,c.sleep)
  with concurrent.futures.ThreadPoolExecutor(max_workers=4) as ex:list(ex.map(lambda n:l.acquire(str(n)),range(100)))
  ts=[r['timestamp'] for r in starts];self.assertTrue(all(b-a>=.549999 for a,b in zip(ts,ts[1:])));self.assertEqual(len({r['id'] for r in starts}),100)
 def test_rolling_hour_limit_survives_restart(self):
  c=Clock();prior=[{'id':n+1,'timestamp':9900+n/10000} for n in range(7900)];l=m.Limiter(prior,[],20000,c.now,c.sleep)
  r=l.acquire('x');self.assertGreaterEqual(r['timestamp'],13500)
 def test_deadline_stops_new_requests(self):
  c=Clock();l=m.Limiter([],[],10060,c.now,c.sleep)
  with self.assertRaises(m.StopWork):l.acquire('x')
 def test_job_cap_includes_prior_and_reservations(self):
  c=Clock(100000);l=m.Limiter([{'id':n,'timestamp':0} for n in range(24999)],[{'id':25000,'timestamp':0}],200000,c.now,c.sleep)
  with self.assertRaises(m.StopWork):l.acquire('x')
 def part(self):return {'total':None,'nextOffset':0,'pages':[]}
 def rec(self,offset,n):return {'id':offset+1,'offset':offset,'rows':n,'file':'test','sha256':'test'}
 def test_full_paging_required_before_complete(self):
  p=self.part();m.accept_page(p,self.rec(0,5000),{'total':'5001','data':[{}]*5000});self.assertNotEqual(p['status'],'complete')
  m.accept_page(p,self.rec(5000,1),{'total':'5001','data':[{}]});self.assertEqual(p['status'],'complete')
 def test_truncation_rejected(self):
  with self.assertRaisesRegex(ValueError,'Truncated'):m.accept_page(self.part(),self.rec(0,1),{'total':5001,'data':[{}]})
 def test_changed_total_rejected(self):
  p=self.part();p['total']=5
  with self.assertRaisesRegex(ValueError,'changed'):m.accept_page(p,self.rec(0,6),{'total':6,'data':[{}]*6})
 def test_noncontiguous_page_rejected(self):
  with self.assertRaisesRegex(ValueError,'Noncontiguous'):m.accept_page(self.part(),self.rec(1,1),{'total':2,'data':[{}]})
 def test_completed_empty_page_cannot_be_appended_twice(self):
  p=self.part();r=self.rec(0,0);response={'total':0,'data':[]};m.accept_page(p,r,response)
  with self.assertRaisesRegex(ValueError,'already complete'):m.accept_page(p,r,response)
  self.assertEqual(len(p['pages']),1)
 def test_zero_total_is_complete_but_has_no_positive_observations(self):
  p=self.part();m.accept_page(p,self.rec(0,0),{'total':'0','data':[]});self.assertEqual(p['status'],'complete');self.assertEqual(p['rowsSaved'],0)
class ParallelPageTests(unittest.TestCase):
 def part(self):return {'status':'not checked','total':10001,'nextOffset':0,'pages':[]}
 def rec(self,offset,n):return {'id':offset+1,'offset':offset,'rows':n,'file':'test','sha256':'test'}
 def test_out_of_order_pages_wait_for_missing_prefix(self):
  p=self.part();pending={5000:(self.rec(5000,5000),{'total':10001,'data':[{}]*5000})};self.assertEqual(m.drain_pages(p,pending),0);self.assertEqual(p['nextOffset'],0)
  pending[0]=(self.rec(0,5000),{'total':10001,'data':[{}]*5000});self.assertEqual(m.drain_pages(p,pending),2);self.assertEqual(p['nextOffset'],10000);self.assertNotEqual(p['status'],'complete')
  pending[10000]=(self.rec(10000,1),{'total':10001,'data':[{}]});self.assertEqual(m.drain_pages(p,pending),1);self.assertEqual(p['status'],'complete')
 def test_parallel_offsets_do_not_repeat_running_or_saved_pages(self):
  self.assertEqual(m.available_offsets(self.part(),{0,5000},4),[10000]);self.assertEqual(m.available_offsets(self.part(),set(),4),[0,5000,10000])
 def test_unknown_total_allows_first_page_only(self):
  p=self.part();p['total']=None;self.assertEqual(m.available_offsets(p,set(),4),[0]);self.assertEqual(m.available_offsets(p,{0},4),[])
 def test_failed_part_cannot_be_certified_by_later_pages(self):
  p=self.part();p['status']='error';self.assertEqual(m.available_offsets(p,set(),4),[]);self.assertEqual(m.drain_pages(p,{0:(self.rec(0,5000),{'total':10001,'data':[{}]*5000})}),0)
if __name__=='__main__':unittest.main()
