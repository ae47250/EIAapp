"""Save all frozen cells with honest partial coverage state; no API or app edits.
Observation evidence is distinct from final scope/default and row-check approval.
No incomplete, metadata-only or excluded-code evidence establishes nonpublication.
"""
import collections,datetime,hashlib,importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
E=i.EVIDENCE

def build(grid,original,plan,audit,selected=None,checks=None):
 expected=collections.defaultdict(set);whole=collections.defaultdict(set)
 for g in plan['groups']:
  for pid in g['originalPlanIds']:
   for c in original[pid]['cells']:
    expected[c['cellId']].add(g['id'])
    if c['candidateStatus']=='whole product':whole[c['cellId']].add(g['id'])
 positive=collections.defaultdict(set);subset=collections.defaultdict(set)
 for gid,g in audit['groups'].items():
  if not (g['validated'] and g['retrievalComplete']):continue
  for cid in g['wholePositiveCells']:positive[cid].add(gid)
  for cid in g['subsetPositiveCells']:subset[cid].add(gid)
 selected={r['cellId']:r for r in (selected or {}).get('mappedCandidateCells',[])};checkedrows=collections.defaultdict(list)
 for row in (checks or {}).get('records',[]):checkedrows[row['cellId']].append(row)
 cells=[]
 for c in grid['cells']:
  cid=c['id'];checked={g for g in expected[cid] if g in audit['groups'] and audit['groups'][g]['validated'] and audit['groups'][g]['retrievalComplete']}
  reason='Candidate retrieval/observation audit incomplete'
  if not expected[cid]:reason='No eligible metadata candidate; nonpublication evidence not certified'
  elif expected[cid]<=checked:reason='Observation audit complete; scope/default selection and required row checks pending'
  elif positive[cid] and whole[cid]<=checked:reason='Whole-product groups audited; scope/default selection and required row checks pending; subset groups may remain incomplete'
  cells.append({**c,'status':'not checked','pendingReason':reason,'candidateGroups':len(expected[cid]),'auditedGroups':len(checked),'remainingGroupIds':sorted(expected[cid]-checked),'wholeCandidateGroups':len(whole[cid]),'wholeGroupsAudited':len(whole[cid]&checked),'wholeProductObservationGroupIds':sorted(positive[cid]),'subsetObservationGroupIds':sorted(subset[cid])})
  selection=selected.get(cid);rowchecks=checkedrows[cid]
  if selection and len(rowchecks)==len(selection['defaults']) and rowchecks and all(r['pass'] for r in rowchecks):
   ds=selection['defaults'];cells[-1].update({'status':'mapped','pendingReason':None,'placeCodes':sorted({d['geographyCode'] for d in ds}),'routes':sorted({d['route'] for d in ds}),'frequencies':sorted({d['frequency'] for d in ds}),'units':sorted({d['unit'] for d in ds}),'sampleDefault':ds[0],'completeDefaultsAndAlternatives':'coverage-selection-details.json#'+cid,'rowChecks':{'mode':checks['mode'],'passed':len(rowchecks),'record':'row-replay-checks.json'}})
 return {'status':'Partial research table; unverified cells remain not checked; no negative claims','updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':dict(collections.Counter(c['status'] for c in cells)),'progress':{'cellsWithWholeProductObservations':sum(bool(v) for v in positive.values()),'cellsWithSubsetObservations':sum(bool(v) for v in subset.values()),'cellsWithAllCandidateGroupsAudited':sum(c['candidateGroups']>0 and not c['remainingGroupIds'] for c in cells),'cellsWithAllWholeGroupsAuditedAndPositive':sum(c['wholeCandidateGroups']>0 and c['wholeCandidateGroups']==c['wholeGroupsAudited'] and bool(c['wholeProductObservationGroupIds']) for c in cells),'cellsWithoutEligibleMetadataCandidates':sum(not c['candidateGroups'] for c in cells)},'evidence':'observation-audit.json links hash-verified per-series/place histories, units, scope annotations and call IDs stored locally. Native place aliases and units remain separate.','unresolvedExceptions':{'codes':['OB2','OBW','95'],'resultsAllowed':False,'nonpublicationEvidenceAllowed':False},'cells':cells}

def main():
 grid=i.read(E/'cell-grid.json');freeze=i.read(E/'cell-grid-freeze.json');assert hashlib.sha256((E/'cell-grid.json').read_bytes()).hexdigest()==freeze['files']['cell-grid.json']
 original={p['id']:p for p in i.read(E/'b1-request-plan.json')['plans']};plan=i.read(E/'reduced-request-plan.json');audit=i.read(E/'observation-audit.json')
 selected=i.read(E/'coverage-selection-details.json') if (E/'coverage-selection-details.json').exists() else None;checks=i.read(E/'row-replay-checks.json') if (E/'row-replay-checks.json').exists() else None
 if checks and checks['selectionPointerSHA256']!=hashlib.sha256((E/'coverage-selection-details.json').read_bytes()).hexdigest():raise ValueError('Row checks are for an earlier selection; refresh replay')
 result=build(grid,original,plan,audit,selected,checks);result['frozenGridSHA256']=freeze['files']['cell-grid.json']
 (E/'coverage-table.json').write_text(json.dumps(result,separators=(',',':'))+'\n');print(json.dumps({'counts':result['counts'],'progress':result['progress']}))
if __name__=='__main__':main()
