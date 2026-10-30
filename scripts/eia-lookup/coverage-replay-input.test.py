import gzip,hashlib,importlib.util,json,tempfile,unittest
from pathlib import Path
s=importlib.util.spec_from_file_location('m',Path(__file__).with_name('coverage-replay-input.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class ChunkTests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
 def save(self,name,jobs):
  b=gzip.compress(json.dumps({'jobs':jobs}).encode());p=self.root/name;p.write_bytes(b);return {'localFile':str(p),'sha256':hashlib.sha256(b).hexdigest(),'jobs':len(jobs)}
 def manifest(self):return {'format':'bounded-replay-chunks-v1','parts':[self.save('a.gz',[{'key':'a'},{'key':'b'}]),self.save('b.gz',[{'key':'c'}])],'jobs':3}
 def test_complete_order_survives_chunk_boundary(self):self.assertEqual([x['key'] for x in m.jobs(self.manifest())],['a','b','c'])
 def test_corrupted_chunk_stops(self):
  d=self.manifest();Path(d['parts'][1]['localFile']).write_bytes(b'changed')
  with self.assertRaises(ValueError):list(m.jobs(d))
 def test_dropped_chunk_stops(self):
  d=self.manifest();d['parts'].pop()
  with self.assertRaises(ValueError):list(m.jobs(d))
 def test_wrong_chunk_count_stops(self):
  d=self.manifest();d['parts'][0]['jobs']=1
  with self.assertRaises(ValueError):list(m.jobs(d))
 def test_legacy_verified_input_still_reads(self):
  d=self.save('legacy.gz',[{'key':'a'}]);self.assertEqual(list(m.jobs(d)),[{'key':'a'}])
if __name__=='__main__':unittest.main()
