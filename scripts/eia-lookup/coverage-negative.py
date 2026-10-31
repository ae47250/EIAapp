"""Conservative negative-coverage proof candidates; no network or app edits.
Candidates do not become coverage statuses until a frozen seeded live recheck
passes. A missing plan, incomplete retrieval or metadata gap is never data absence.
"""
import collections,datetime,gzip,hashlib,importlib.util,json,random
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
E=i.EVIDENCE;R=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/retrieval'
sha=lambda b:hashlib.sha256(b).hexdigest()
def blocked(cell,gaps):
 return [g['key'] for g in gaps if cell['placeKind'] in g['placeKinds'] and cell['product'] in g['products'] and cell['activity'] in g['activities'] and (not g.get('qualifier') or cell.get('qualifier') in [None,g['qualifier']])]
def decision(cell,groups,audits,gaps):
 blockers=blocked(cell,gaps)
 if blockers:return {'status':'not checked','reason':'Unresolved metadata could fit','gaps':blockers}
 if not groups:return {'status':"not in EIA's catalogue",'reason':'No eligible whole or subset candidate in complete checked native code lists','evidence':'catalogue-absence-evidence-index.json'}
 if any(g not in audits or not audits[g]['validated'] or not audits[g]['retrievalComplete'] for g in groups):return {'status':'not checked','reason':'Candidate groups incomplete or invalid'}
 cid=cell['id']
 if any(cid in audits[g]['wholePositiveCells'] for g in groups):return {'status':'not checked','reason':'Whole observations exist; scope/default reconciliation pending'}
 subset=any(cid in audits[g]['subsetPositiveCells'] for g in groups)
 return {'status':'subset only' if subset else 'EIA returns no data','reason':'No numeric whole-product observations after complete exact candidate joins; subset observations exist' if subset else 'No numeric whole or subset observations after complete exact candidate joins','groups':sorted(groups),'evidence':'negative-source-groups.json','wholeProductComparison':'Every whole-product candidate in the source plan was checked; if none is listed, none exists in the checked catalogue.'}
def main():
 if (E/'negative-recheck-freeze.json').exists():raise SystemExit('Negative recheck population already frozen; do not resample')
 census=i.read(E/'route-census.json');assert census['completeTraversal'];index=i.read(E/'catalogue-absence-evidence-index.json');assert index['routeCount']==154
 plan=i.read(E/'b1-request-plan.json');shared=i.read(E/'reduced-request-plan.json');cross=i.read(E/'place-crosswalk.json');assert cross['complete'];table=i.read(E/'coverage-table.json');audit=i.read(E/'observation-audit.json')['groups'];refs=i.read(E/'series-catalog-summary.json')['routes'];catalogs={r:i.read(E/v['file']) for r,v in refs.items()};geos={g['code']:g for g in i.read(i.ROOT/'data/eia/routing-metadata.json')['geographies']};vocab=i.read(i.ROOT/'data/eia/phase4-routing-config.json')['vocabulary']
 for route in refs:i.inventory(route) # verifies all advertised-frequency lists and totals
 gaps=[]
 for route,cat in catalogs.items():
  records=cat['dataColumns']+[r for rs in cat['facets'].values() for r in rs]
  products=sorted({r['product'] for r in records if r.get('product')}) or list(vocab['products'])
  activities=sorted({a for r in records for a in r.get('activities',[r.get('activity')]) if a}) or list(vocab['activities'])
  kinds=set()
  if cross['routes'][route].get('scopeEvidence',{}).get('placeKind')=='US':kinds.add('US')
  for rows in cross['routes'][route]['facets'].values():
   for x in rows:
    if x['status']=='mapped':g=x['geographyCode'];kinds.add('US' if g=='USA' else 'World' if g=='WLD' else geos[g]['type'])
  for fid,rows in [('dataColumn',cat['dataColumns'])]+list(cat['facets'].items()):
   for r in rows:
    if not (r.get('coverageEligible') is False or r.get('ownerException') or r.get('classification')=='pending'):continue
    code=str(r.get('definition',{}).get('id',r.get('id')));k=r.get('subjectPlaceKind');rs=r.get('activities',[r.get('activity')]);rs=[a for a in rs if a]
    gaps.append({'key':route+'|'+fid+'|'+code,'route':route,'facet':fid,'code':code,'definition':r.get('definition'),'placeKinds':[k] if k else sorted(kinds),'products':[r['product']] if r.get('product') else products,'activities':rs or activities,'qualifier':r.get('qualifier'),'reason':r.get('coverageEligibilityReason',r.get('reason')),'effect':'Blocks absence; never supplies data. Unknown dimensions are conservatively widened to this route\'s documented product/activity/place scope.'})
 original={p['id']:p for p in plan['plans']};groups=collections.defaultdict(set)
 for g in shared['groups']:
  for pid in g['originalPlanIds']:
   for c in original[pid]['cells']:groups[c['cellId']].add(g['id'])
 candidates=[];pending=[]
 for cell in table['cells']:
  if cell['status']=='mapped':continue
  d=decision(cell,groups[cell['id']],audit,gaps);row={k:cell[k] for k in ['id','group','placeKind','product','activity','sector','qualifier']};row.update(d)
  (pending if d['status']=='not checked' else candidates).append(row)
 used={gid for c in candidates for gid in c.get('groups',[])};sources={};state=json.loads((R/'state.json').read_text());states={g['id']:g for g in state['groups']}
 for gid in sorted(used):
  g=states[gid];a=audit[gid];assert g['status']=='complete'
  ps=[original[pid] for pid in next(x for x in shared['groups'] if x['id']==gid)['originalPlanIds']]
  sources[gid]={'route':g['route'],'frequency':g['frequency'],'columns':g['columns'],'auditSHA256':a['sha256'],'auditLocalFile':a['localFile'],'url':'https://api.eia.gov/v2/'+g['route']+'/data/','requestParts':[{'params':p['params'],'responseTotal':p['total'],'calls':[x['id'] for x in p['pages']]} for p in g['parts']], 'nativeWholeCandidatePlanIds':sorted(p['id'] for p in ps if any(c['candidateStatus']=='whole product' for c in p['cells']))}
 result={'status':'PROPOSED negative classifications; not certified until frozen seeded 5% live recheck passes','time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Complete official catalogue correspondence; complete paginated observations joined by every native measure and place dimension; unresolved definitions conservatively block absence. No numeric 0 treated as missing.','counts':dict(collections.Counter(c['status'] for c in candidates)),'candidates':candidates,'pending':pending,'gaps':gaps,'inputSHA256':{n:sha((E/n).read_bytes()) for n in ['coverage-table.json','b1-request-plan.json','reduced-request-plan.json','place-crosswalk.json','observation-audit.json','catalogue-absence-evidence-index.json']}}
 (E/'negative-candidates.json').write_text(json.dumps(result,separators=(',',':'))+'\n');i.write_review(E/'negative-source-groups.json',sources);print(json.dumps({'counts':result['counts'],'pending':len(pending),'gaps':len(gaps)}))
if __name__=='__main__':main()
