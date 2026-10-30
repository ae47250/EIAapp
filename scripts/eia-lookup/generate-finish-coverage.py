"""Regenerate the additive US rows and compact status lookup from verified evidence."""
import importlib.util,json,gzip,hashlib,collections
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
E=i.ROOT/'evidence/eia-finish';review=json.loads((E/'us-review.json').read_text());v=json.loads((E/'us-verified.json').read_text());assert hashlib.sha256((E/'us-review.json').read_bytes()).hexdigest()==v['reviewSHA256']
t=i.read(i.EVIDENCE/'coverage-table.json');statuses={c['id']:c['status'] for c in t['cells']};changed=[]
for row,check in zip(v['rows'],v['checks'],strict=True):
 cid=row['generatedFrom'];assert cid.startswith('US|') and statuses[cid]=='not checked' and row['geographyKind']=='united_states' and set(row['placeFacets'])=={'USA'};assert check['cellId']==cid and check['complete'] and check['numericRows']>0
 raw=Path(check['localFile']).expanduser().read_bytes();assert hashlib.sha256(raw).hexdigest()==check['rawSHA256'];d=json.loads(gzip.decompress(raw));assert len(d['rows'])==check['rows']
 assert row['verification']=='verified';row.update(sampleGeography='USA',required=False);statuses[cid]='mapped';changed.append(cid)
for path,value in [('data/eia/lookup-us-coverage.json.gz',{'rows':v['rows'],'reviewSHA256':v['reviewSHA256']}),('data/eia/lookup-status.json.gz',statuses)]:
 (i.ROOT/path).write_bytes(gzip.compress((json.dumps(value,sort_keys=True,separators=(',',':'))+'\n').encode(),mtime=0))
u=[c for c in t['cells'] if c['placeKind']=='US'];out={'before':review['before'],'after':{'all':dict(collections.Counter(statuses[c['id']] for c in u)),'base':dict(collections.Counter(statuses[c['id']] for c in u if c['group']=='base'))},'changedCells':changed,'nonUSCellsUnchanged':all(statuses[c['id']]==c['status'] for c in t['cells'] if c['placeKind']!='US'),'remainingNotChecked':review['remaining'],'freeEiaCalls':v['calls'],'elapsedResearchMinutes':None,'method':'Seven base then 21 sector cells verified with complete native histories. No negative claim created. Broader or unresolved definitions remain not checked; use labelled country-USA fallback only where approved country rows exist.'};(E/'us-coverage-result.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:out[k] for k in ['after','nonUSCellsUnchanged','freeEiaCalls']}))
