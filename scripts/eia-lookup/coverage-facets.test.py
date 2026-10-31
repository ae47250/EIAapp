"""Offline guards for the Job 5 facet inventory. No credentials or network."""
import contextlib,importlib.util,io,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('facets',Path(__file__).with_name('coverage-facets.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
class FakeCollector:
    def __init__(self,pages):self.pages=iter(pages);self.records=[];self.requests=[]
    def get(self,route,params=None,kind=None):
        self.requests.append((route,params,kind));page=next(self.pages);rec={'id':len(self.records)+1};self.records.append(rec);return {'response':page},rec
class FacetTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=f.r.EVIDENCE;f.r.EVIDENCE=Path(self.temp.name)
        self.node={'route':'fixture','metadataCall':1,'facets':[{'id':'product','description':'Product'}]}
    def tearDown(self):f.r.EVIDENCE=self.old;self.temp.cleanup()
    def collect(self,c):
        with contextlib.redirect_stdout(io.StringIO()):return f.collect(c,self.node)
    def test_paging_preserves_every_definition(self):
        c=FakeCollector([{'totalFacets':3,'facets':[{'id':'1','name':'A'}]},{'totalFacets':3,'facets':[{'id':'2','name':'B'},{'id':'3','name':'C'}]}])
        d=self.collect(c);self.assertTrue(d['complete']);self.assertEqual(d['facets']['product']['total'],3);self.assertEqual(c.requests[1][1],{'offset':1,'length':5000})
    def test_distinct_labels_for_same_id_are_retained(self):
        c=FakeCollector([{'totalFacets':2,'facets':[{'id':'PS','name':'Pumped storage'},{'id':'PS','name':'Pumped Storage'}]}])
        v=self.collect(c)['facets']['product'];self.assertEqual(len(v['values']),2);self.assertEqual(v['uniqueIds'],1);self.assertEqual(v['duplicateIds'],['PS'])
    def test_repeated_page_is_not_complete(self):
        c=FakeCollector([{'totalFacets':2,'facets':[{'id':'1','name':'A'}]},{'totalFacets':2,'facets':[{'id':'1','name':'A'}]}])
        with self.assertRaisesRegex(RuntimeError,'duplicate-page'):self.collect(c)
    def test_changed_total_stops(self):
        c=FakeCollector([{'totalFacets':2,'facets':[{'id':'1'}]},{'totalFacets':3,'facets':[{'id':'2'}]}])
        with self.assertRaisesRegex(RuntimeError,'total changed'):self.collect(c)
    def test_empty_page_stops(self):
        c=FakeCollector([{'totalFacets':2,'facets':[{'id':'1'}]},{'totalFacets':2,'facets':[]}])
        with self.assertRaisesRegex(RuntimeError,'paging stalled'):self.collect(c)
    def test_resume_does_not_refetch_completed_default(self):
        self.collect(FakeCollector([{'totalFacets':1,'facets':[{'id':'1'}]}]))
        c=FakeCollector([]);d=self.collect(c);self.assertEqual(c.requests,[]);self.assertIn('frequency-specific completeness is not established',d['completenessScope'])
if __name__=='__main__':unittest.main()
