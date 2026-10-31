"""Seeded live counterexample probes for approved negative coverage statuses.
One broad all-place request per sampled cell, with native product/activity filters
only. Catalogue absence is proved by complete metadata; probes try to falsify it.
Truncated probes never establish data absence; full baseline pagination does.
"""
import collections,datetime,gzip,hashlib,importlib.util,itertools,json,math,random,sys,time
from pathlib import Path
HERE=Path(__file__).parent

def module(n):
 s=importlib.util.spec_from_file_location(n,HERE/(n+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
f=module('coverage-fetch');p=module('coverage-plan');o=module('coverage-observations');i=f.i;E=i.EVIDENCE
sha=lambda b:hashlib.sha256(b).hexdigest()
PRODUCT={'productId','product','fueltypeid','fuelTypeId','energysourceid'}
ACTIVITY={'activityId','process'}
def kinds(cross,geos):
 out=set()
 if cross.get('scopeEvidence',{}).get('placeKind')=='US':out.add('US')
 for rows in cross['facets'].values():
  for r in rows:
   if r['status']=='mapped':g=r['geographyCode'];out.add('US' if g=='USA' else 'World' if g=='WLD' else geos[g]['type'])
 return out

def prepare():
 target=E/'negative-recheck-freeze.json'
 if target.exists():return i.read(target)
 negatives=i.read(E/'negative-candidates.json');pool=sorted(negatives['candidates'],key=lambda c:c['id']);assert pool
 seed=20261030;sample=random.Random(seed).sample(pool,math.ceil(len(pool)*.05));refs=i.read(E/'series-catalog-summary.json')['routes'];catalogs={r:i.read(E/v['file']) for r,v in refs.items()};cross=i.read(E/'place-crosswalk.json')['routes'];geos={g['code']:g for g in i.read(i.ROOT/'data/eia/routing-metadata.json')['geographies']};nodes={n['route']:n for n in i.read(E/'route-census.json')['nodes'] if n.get('classification')=='FITS'}
 requests=[]
 for cell in sample:
  scored=[]
  for route,cat in catalogs.items():
   rs=cat['dataColumns']+[r for rows in cat['facets'].values() for r in rows];products={r.get('product') for r in rs};activities={a for r in rs for a in r.get('activities',[r.get('activity')])};fit=(cell['product'] in products,cell['activity'] in activities,cell['placeKind'] in kinds(cross[route],geos))
   score=5*fit[0]+2*fit[1]+4*fit[2];scored.append((-score,route,fit))
  _,route,fit=min(scored);cat=catalogs[route];node=nodes[route];freqs=node['frequencies'];freqs=[x['id'] if isinstance(x,dict) else x for x in freqs];frequency='annual' if 'annual' in freqs else freqs[0]
  filters={};reason=[]
  for fid,rs in cat['facets'].items():
   if fid not in PRODUCT|ACTIVITY:continue
   chosen=[r for r in rs if frequency in r['frequencies'] and (r.get('product')==cell['product'] if fid in PRODUCT else cell['activity'] in r.get('activities',[r.get('activity')]))]
   if chosen:filters[fid]=sorted(str(r['definition']['id']) for r in chosen);reason.append(fid+' chosen from exact product/activity correspondence')
  columns=[r['id'] for r in cat['dataColumns'] if cell['activity'] in r.get('activities',[r.get('activity')])]
  if not columns:columns=['value'] if any(r['id']=='value' for r in cat['dataColumns']) else [r['id'] for r in cat['dataColumns'] if r.get('classification')!='out of vocabulary']
  assert columns
  params={'frequency':frequency,'data':columns,'facets':filters,'sort':[{'column':'period','direction':'desc'}],'offset':0,'length':5000}
  requests.append({'cell':cell,'route':route,'params':params,'routeSelection':{'method':'Maximize exact product, activity and requested place-kind metadata fit (weights 5,2,4), then stable route name. No place or sector filter.','match':dict(zip(['product','activity','placeKind'],fit))},'filterEvidence':reason})
 doc={'seed':seed,'method':'Simple random sample without replacement from sorted frozen union of all negative statuses; ceil(5%); no resampling or replacing failures.','population':len(pool),'sampleSize':len(sample),'populationSHA256':sha((E/'negative-candidates.json').read_bytes()),'counts':dict(collections.Counter(c['status'] for c in pool)),'sampleCounts':dict(collections.Counter(c['status'] for c in sample)),'requests':requests,'sourceSHA256':{n:sha((E/n).read_bytes()) for n in ['place-crosswalk.json','b1-request-plan.json','reduced-request-plan.json','coverage-table.json','observation-audit.json']},'interpretation':'A broad probe is a counterexample search, not new exhaustive absence proof. Complete baseline native-code census and complete paginated source joins remain required. Unknown returned definitions or matching numeric whole data fail the recheck; a catalogue-absence cell also fails on a matching subset.'}
 target.write_text(json.dumps(doc,indent=2)+'\n');return doc

def compile_candidates(route,frequency,columns,cat,node):
 indexes=collections.defaultdict(lambda:collections.defaultdict(list))
 for c in p.enumerate_candidates(route,cat,node):
  if c['frequency']!=frequency or c['column'] not in columns:continue
  keys=tuple(sorted(c['filters']))
  for vals in itertools.product(*(map(str,c['filters'][k]) for k in keys)):indexes[keys][tuple(vals)].extend((c['column'],m) for m in c['meanings'])
 return indexes

def assess(request,response,cat,node,cross,geos):
 cell=request['cell'];freq=request['params']['frequency'];columns=request['params']['data'];rows=response.get('data',[]);unknown=set();missing=set();matches=[];index=compile_candidates(request['route'],freq,columns,cat,node)
 inventory=i.inventory(request['route']);allowed={fid:{str(x['definition']['id']) for x in rs if freq in x['frequencies']} for fid,rs in inventory.items()};places={fid:{str(x['definition']['id']):x for x in rs} for fid,rs in cross['facets'].items()}
 required=set(cat['facets'])|set(cross['facets'])|set(columns)|{'period'}
 for row in rows:
  missing.update(required-set(row))
  for fid,values in allowed.items():
   if fid in row and str(row[fid]) not in values:unknown.add((fid,str(row[fid])))
  rowkinds=set()
  if cross.get('scopeEvidence',{}).get('placeKind')=='US':rowkinds.add('US')
  for fid,rs in places.items():
   x=rs.get(str(row.get(fid)))
   if x and x['status']=='mapped':g=x['geographyCode'];rowkinds.add('US' if g=='USA' else 'World' if g=='WLD' else geos[g]['type'])
  if cell['placeKind'] not in rowkinds:continue
  for keys,lookup in index.items():
   for column,meaning in lookup.get(tuple(str(row.get(k)) for k in keys),[]):
    product,activity,sector,qualifier,status=meaning
    if (product,activity,sector,qualifier)!=(cell['product'],cell['activity'],cell['sector'],cell['qualifier']):continue
    if o.numeric(row.get(column)) is None:continue
    if status=='whole product' or cell['status']=="not in EIA's catalogue" or cell['status']=='EIA returns no data':matches.append({'period':row.get('period'),'column':column,'candidateStatus':status,'facets':{k:row[k] for k in keys},'valueIsNumeric':True})
 return {'pass':not unknown and not missing and not matches,'missingFields':sorted(missing),'unknownDefinitions':[{'facet':f,'code':c} for f,c in sorted(unknown)],'counterexamples':matches[:10],'counterexampleCount':len(matches),'returnedRows':len(rows),'responseTotal':response.get('total'),'probeTruncated':len(rows)<int(response.get('total',0)),'noExhaustiveClaimFromProbe':True}

def run():
 doc=prepare();assert sha((E/'negative-candidates.json').read_bytes())==doc['populationSHA256']
 for name,digest in doc['sourceSHA256'].items():assert sha((E/name).read_bytes())==digest,(name,'changed after sample freeze')
 # Run only when the shared downloader is idle, so its single ledger limiter is authoritative.
 import subprocess
 processes=subprocess.check_output(['ps','-Ao','comm=,args='],text=True).splitlines();assert not any(Path(x.split(None,1)[0]).name.lower().startswith('python') and 'coverage-fetch.py' in x.split(None,1)[-1] for x in processes),'Coverage downloader still active'
 prior=f.read_lines(E/'calls.jsonl');starts=f.read_lines(f.RUN/'starts.jsonl');terminal=f.read_lines(f.RUN/'calls.jsonl');assert {x['id'] for x in starts}=={x['id'] for x in terminal}
 deadline=datetime.datetime.fromisoformat(i.read(E/'execution-approval.json')['deadlineUTC'].replace('Z','+00:00')).timestamp();limiter=f.Limiter(prior,starts,deadline);key=(Path.home()/'Downloads/eia-api-key.txt').read_text().strip();assert key
 output=E/'negative-recheck-results.json';results=i.read(output) if output.exists() else {'freezeSHA256':sha((E/'negative-recheck-freeze.json').read_bytes()),'records':[]};assert results['freezeSHA256']==sha((E/'negative-recheck-freeze.json').read_bytes())
 completed={x['cellId'] for x in results['records']};refs=i.read(E/'series-catalog-summary.json')['routes'];cross=i.read(E/'place-crosswalk.json')['routes'];geos={g['code']:g for g in i.read(i.ROOT/'data/eia/routing-metadata.json')['geographies']};nodes={n['route']:n for n in i.read(E/'route-census.json')['nodes'] if n.get('classification')=='FITS'}
 for req in doc['requests']:
  cid=req['cell']['id']
  if cid in completed:continue
  rid=sha(json.dumps(req,sort_keys=True).encode());rec,response=f.fetch_one({'id':'negative-recheck:'+cid,'route':req['route']},{'id':rid,'params':req['params']},0,limiter,key);rec['kind']='negative-recheck';
  with (f.RUN/'calls.jsonl').open('a') as stream:stream.write(json.dumps(rec,separators=(',',':'))+'\n');stream.flush()
  if rec['status']!=200 or rec.get('error'):assessment={'pass':False,'error':'EIA probe failed','status':rec['status']}
  else:assessment=assess(req,response,i.read(E/refs[req['route']]['file']),nodes[req['route']],cross[req['route']],geos)
  result={'cellId':cid,'expectedStatus':req['cell']['status'],'call':rec['id'],'url':rec['url'],'rawSHA256':rec['sha256'],**assessment};results['records'].append(result);results.update({'complete':len(results['records'])==doc['sampleSize'],'pass':all(r['pass'] for r in results['records']) and len(results['records'])==doc['sampleSize'],'totalEIAcalls':len(prior)+len(limiter.starts)});f.atomic(output,results);print(json.dumps(result),flush=True)
  if not assessment['pass']:raise SystemExit('Negative live recheck failed; do not certify negatives or silently resample')
if __name__=='__main__':
 if sys.argv[1:]==['prepare']:d=prepare();print(json.dumps({k:d[k] for k in ['population','sampleSize','counts','sampleCounts']}))
 elif sys.argv[1:]==['run']:run()
 else:raise SystemExit('Use prepare or run')
