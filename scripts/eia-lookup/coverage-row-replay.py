"""Prepare exact offline replay fixtures for the unchanged existing row checker.
Fixtures contain official observations and stay outside Git; no network or app edits.
"""
import collections,gzip,hashlib,importlib.util,json,itertools
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
E=i.EVIDENCE;RUN=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/retrieval';OUT=RUN/'row-replay'
sha=lambda b:hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'))
def main():
 selections=i.read(E/'coverage-selection-details.json');state=json.loads((RUN/'state.json').read_text());groups={g['id']:g for g in state['groups']};cross=i.read(E/'place-crosswalk.json')['routes'];nodes={n['route']:n for n in i.read(E/'route-census.json')['nodes'] if n.get('classification')=='FITS'};calls={c['id']:c for c in map(json.loads,(E/'calls.jsonl').read_text().splitlines())};jobs=[];unsupported=[];OUT.mkdir(exist_ok=True)
 bygroup=collections.defaultdict(list)
 for cell in selections['mappedCandidateCells']:
  for d in cell['defaults']:
   fid=next((fid for fid,rows in cross[d['route']]['facets'].items() if fid in d['facets'] and any(r['status']=='mapped' and r['geographyCode']==d['geographyCode'] and str(r['definition']['id'])==str(d['facets'][fid]) and d['frequency'] in r['frequencies'] for r in rows)),None)
   scope=cross[d['route']].get('scopeEvidence',{})
   if fid is None and not (cell['cellId'].startswith('US|') and d['geographyCode']=='USA' and scope.get('placeKind')=='US' and scope.get('quote') and scope.get('url')):unsupported.append({'cellId':cell['cellId'],'route':d['route'],'reason':'No verified place mapping or documented US-only scope.'});continue
   cid=cell['cellId'].split('|');key=sha(canonical([cell['cellId'],d]).encode())[:24];sector=cid[3] or None
   row={'key':key,'required':False,'route':d['route'],'dataColumn':d['dataColumn'],'sampleGeography':d['geographyCode'],'fixedFacets':d['facets'],'frequencies':[d['frequency']],'sectorSupported':bool(sector),'sectorMapping':{sector:{}} if sector else {},'unit':d['unitName'],'reportedUnits':sorted({d['unitName'],d['unit']}),'product':cid[1],'activity':cid[2],'basisLabel':d['basisLabel']}
   job={'key':key,'cellId':cell['cellId'],'group':d['group'],'default':d,'row':row,'mapping':{'geographyFacet':fid,'geographies':{d['geographyCode']:d['facets'][fid]}} if fid else None,'researchScope':scope if fid is None else None,'observations':[],'sourceCalls':[]};bygroup[d['group']].append(job);jobs.append(job)
 metadata={}
 for gid,items in bygroup.items():
  group=groups[gid]
  if group['status']!='complete':raise ValueError('Cannot replay incomplete group')
  route=group['route'];record=calls[nodes[route]['metadataCall']];raw=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/raw'/record['file'];body=raw.read_bytes();assert sha(body)==record['sha256'];metadata[route]=json.loads(body)['response']
  inv=i.inventory(route)
  for fid,rs in inv.items():metadata[route+'/facet/'+fid]={'facets':[r['definition'] for r in rs]}
  index=collections.defaultdict(lambda:collections.defaultdict(list))
  for item in items:
   facets=item['default']['facets'];keys=tuple(sorted(facets));index[keys][tuple(str(facets[k]) for k in keys)].append(item)
  for part in group['parts']:
   for page in part['pages']:
    body=(RUN/page['file']).read_bytes();assert sha(body)==page['sha256'];rows=json.loads(gzip.decompress(body))['response']['data']
    for row in rows:
     for keys,lookup in index.items():
      for item in lookup.get(tuple(str(row.get(k)) for k in keys),[]):item['observations'].append(row)
    for item in items:item['sourceCalls'].append(page['id'])
 for job in jobs:job['observations'].sort(key=lambda r:r['period'])
 payload={'mode':'OFFLINE REPLAY of complete live EIA responses; no new network calls; existing checker plus documented-US research checker','selectionPointerSHA256':sha((E/'coverage-selection-details.json').read_bytes()),'jobs':jobs,'metadata':metadata,'unsupported':unsupported}
 def save(value):
  body=gzip.compress((canonical(value)+'\n').encode(),mtime=0);digest=sha(body);target=OUT/(digest+'.json.gz');target.write_bytes(body)
  return {'localFile':str(target).replace(str(Path.home()),'~',1),'sha256':digest,'bytes':len(body)}
 metadata_ref=save(metadata);parts=[];batch=[];size=0
 for job in jobs:
  job_size=len(canonical(job).encode())
  if batch and size+job_size>32*1024*1024:
   parts.append({**save({'jobs':batch}),'jobs':len(batch)});batch=[];size=0
  if job_size>32*1024*1024:raise ValueError('Single replay job exceeds bounded chunk size')
  batch.append(job);size+=job_size
 if batch:parts.append({**save({'jobs':batch}),'jobs':len(batch)})
 manifest={'format':'bounded-replay-chunks-v1','mode':payload['mode'],'selectionPointerSHA256':payload['selectionPointerSHA256'],'metadata':metadata_ref,'parts':parts,'jobs':len(jobs),'unsupported':unsupported}
 (E/'row-replay-input.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'jobs':len(jobs),'chunks':len(parts),'bytes':sum(p['bytes'] for p in parts)+metadata_ref['bytes'],'unsupported':len(unsupported)}))

if __name__=='__main__':main()
