"""Conservative partial default selection from fully audited whole candidates.
No model, network, app-row generation, new vocabulary, or negative claims.
Scope constraints requiring a separate reconciliation remain not checked.
"""
import collections,datetime,gzip,hashlib,importlib.util,json,re
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
E=i.EVIDENCE;D=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/retrieval'
sha=lambda b:hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'))

def source_records(series,catalog):
 out=[r for r in catalog['dataColumns'] if r['id']==series['column']]
 for fid,rows in catalog['facets'].items():
  out.extend({**r,'sourceFacet':fid} for r in rows if series['frequency'] in r['frequencies'] and str(r['definition']['id'])==str(series['measureFacets'].get(fid)))
 return out

def constraints(records):
 blockers=[];scope='unspecified';notes=[];products=[]
 for r in records:
  if r.get('sourceFacet') in ['product','productId','fueltypeid','fuelTypeId','energysourceid'] and r.get('product'):
   label=r.get('definition',{}).get('name')
   if label:products.append(re.sub(r'[^a-z0-9]+',' ',label.lower()).strip())
  # These are explicit previously verified limitations, not new PDF research.
  for key in ['scopeConstraints','historicalFuelScope','broaderPublishedTotal','broaderCandidate','broaderMeasure']:
   if r.get(key):blockers.append({'field':key,'value':r[key]})
  if r.get('generationScope')=='utility-scale unless explicit all-size or small-scale fuel code':scope='utility-scale'
  elif r.get('generationScope') in ['utility-scale','small-scale only','all sizes']:scope=r['generationScope']
  if r.get('capacityScope')=='utility-scale':scope='utility-scale'
  if r.get('selectionPreference'):scope='all sizes'
  for key in ['basisRestriction','historicalScope','populationRestriction','scopeRestriction','sourcePeriodNote','scopeDecision','unitNote','sourceScope','frequencyBasis','sectorScope']:
   if r.get(key):notes.append({key:r[key]})
 return {'pending':blockers,'facilityScope':scope,'scopeNotes':notes,'nativeProductDefinitions':sorted(set(products))}

def selection_label(series,con,records):
 label=series['basis']['label']
 if con['facilityScope']=='all sizes':
  # A specific all-size native fuel definition overrides a generic utility-scale
  # column alias. Preserve the original alias separately in source evidence.
  generic=next((r for r in records if r.get('generationScope')=='utility-scale unless explicit all-size or small-scale fuel code'),None)
  if generic:
   alias=generic.get('definition',{}).get('alias');parts=label.split('; ');parts=[p for p in parts if p!=alias];label='; '.join(['Net electricity generation']+parts)
  label+='; all facility sizes (utility-scale and small-scale)'
 elif con['facilityScope']=='utility-scale':label+='; utility-scale (1 MW and larger)'
 return label

def span(first,last,frequency):
 if frequency=='annual':return int(last)-int(first)
 if frequency=='monthly':
  a,b=first.split('-'),last.split('-');return (int(b[0])-int(a[0]))*12+int(b[1])-int(a[1])
 if frequency=='quarterly':return (int(last[:4])-int(first[:4]))*4+int(last[-1])-int(first[-1])
 return (datetime.date.fromisoformat(last)-datetime.date.fromisoformat(first)).days

def choose(candidates,product):
 """Within one place and frequency only; no unit conversion or data stitching."""
 if not candidates:return None,'No numeric whole-product observation'
 if len({(c['place']['geographyCode'],c['series']['frequency']) for c in candidates})!=1:raise ValueError('Mixed place or frequency')
 # A broader total mentioned by verified metadata must be reconciled explicitly.
 if any(c['constraints']['pending'] for c in candidates):return None,'Explicit broader-total or historical-scope reconciliation pending'
 eligible=[c for c in candidates if c['constraints']['facilityScope']!='small-scale only']
 if not eligible:return None,'Only small-scale components'
 if any(c['constraints']['facilityScope']=='all sizes' for c in eligible):eligible=[c for c in eligible if c['constraints']['facilityScope']!='utility-scale']
 definitions={tuple(c['constraints'].get('nativeProductDefinitions',[])) for c in eligible if c['constraints'].get('nativeProductDefinitions')}
 if len(definitions)>1:return None,'Different native whole-product definitions; broader-scope comparison pending (no automatic preference by numeric size)'
 def score(c):
  ser=c['series'];place=c['place'];thermal='btu' in (ser['unit']+' '+ser.get('unitName','')).lower()
  unit_preferred=thermal if product=='total energy' else not thermal
  return (not unit_preferred,-span(place['firstNumeric'],place['lastNumeric'],ser['frequency']),-place['numeric'],ser['route'],ser['id'],canonical(place['nativePlaceFilters']))
 return min(eligible,key=score),None

def main():
 audit=i.read(E/'observation-audit.json')['groups'];plan=i.read(E/'reduced-request-plan.json');original={p['id']:p for p in i.read(E/'b1-request-plan.json')['plans']};grid=i.read(E/'cell-grid.json');catrefs=i.read(E/'series-catalog-summary.json')['routes'];catalogs={};needed=collections.defaultdict(set)
 for group in plan['groups']:
  for pid in group['originalPlanIds']:
   for c in original[pid]['cells']:
    if c['candidateStatus']=='whole product':needed[c['cellId']].add(group['id'])
 ready={c for c,gs in needed.items() if all(g in audit and audit[g]['validated'] and audit[g]['retrievalComplete'] for g in gs)}
 candidates=collections.defaultdict(list)
 for gid,summary in audit.items():
  if not summary['validated'] or not (set(summary['wholePositiveCells'])&ready):continue
  body=Path(summary['localFile']).expanduser().read_bytes();assert sha(body)==summary['sha256'];data=json.loads(gzip.decompress(body));route=summary['route']
  if route not in catalogs:catalogs[route]=i.read(E/catrefs[route]['file'])
  for series in data['series']:
   if series['cellId'] not in ready or series['candidateStatus']!='whole product':continue
   records=source_records(series,catalogs[route]);con=constraints(records);series={**series,'selectedBasisLabel':selection_label(series,con,records)}
   for place in series['places'].values():
    if not place['numeric']:continue
    if 'geographyCode' not in place:raise ValueError('Stale observation audit; refresh before selection')
    candidates[series['cellId']].append({'group':gid,'series':{k:v for k,v in series.items() if k!='places'},'place':place,'constraints':con})
 results=[];pending=[]
 for cell in grid['cells']:
  cid=cell['id']
  if cid not in ready:continue
  byplacefreq=collections.defaultdict(list)
  for c in candidates[cid]:byplacefreq[(c['place']['geographyCode'],c['series']['frequency'])].append(c)
  defaults=[];unresolved=[]
  for (place,freq),cs in sorted(byplacefreq.items()):
   chosen,reason=choose(cs,cell['product'])
   if chosen:
    ser=chosen['series'];p=chosen['place'];defaults.append({'geographyCode':place,'frequency':freq,'route':ser['route'],'dataColumn':ser['column'],'facets':{**ser['measureFacets'],**p['nativePlaceFilters']},'unit':ser['unit'],'unitName':ser['unitName'],'basisLabel':ser['selectedBasisLabel'],'sourceBasisLabel':ser['basis']['label'],'scopeNotes':ser['basis']['scopeNotes'],'firstPeriod':p['firstNumeric'],'lastPeriod':p['lastNumeric'],'numericObservations':p['numeric'],'reportedZeroCount':p['zero'],'symbols':p['symbols'],'firstCall':p['firstCall'],'lastCall':p['lastCall'],'group':chosen['group'],'seriesId':ser['id'],'alternativeCount':len(cs)-1,'tieRule':'Whole product and documented broader facility total, requested frequency, physical units (Btu for total energy), longest observed numeric history; deterministic route/native identity for ties.'})
   else:unresolved.append({'geographyCode':place,'frequency':freq,'reason':reason})
  record={'cellId':cid,'defaults':defaults,'unresolved':unresolved,'wholeGroups':sorted(needed[cid]),'candidateCount':len(candidates[cid]),'alternatives':candidates[cid]}
  if defaults and not unresolved:results.append(record)
  else:pending.append(record)
 output={'status':'Partial scope/default selection; requires existing row-checker verification before implementation use','mappedCandidateCells':results,'pendingCells':pending,'counts':{'scopeDefaultsSelected':len(results),'scopeReconciliationPending':sum(bool(c['unresolved']) for c in pending),'noNumericWholeObservationsAfterWholeGroupsAudited':sum(not c['defaults'] and not c['unresolved'] for c in pending)},'notAbsenceEvidence':'A missing candidate or numeric observation is not an EIA-does-not-publish decision; subset routes, exceptions and seeded rechecks remain separate.'}
 i.write_review(E/'coverage-selection-details.json',output)
 summary={'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'counts':output['counts'],'cells':[{'cellId':r['cellId'],'placeCodes':sorted({d['geographyCode'] for d in r['defaults']}),'frequencies':sorted({d['frequency'] for d in r['defaults']}),'routes':sorted({d['route'] for d in r['defaults']}),'defaults':len(r['defaults']),'rowCheckStatus':'pending'} for r in results],'details':'coverage-selection-details.json','status':output['status']}
 (E/'coverage-selection.json').write_text(json.dumps(summary,separators=(',',':'))+'\n');print(json.dumps({'counts':output['counts'],'defaults':sum(len(c['defaults']) for c in results),'readyForSelection':len(ready)}))
if __name__=='__main__':main()
