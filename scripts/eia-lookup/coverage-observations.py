"""Offline observation audit of approved shared requests; no network or app writes.
Uses exact metadata correspondence joins, never title matching or component sums.
Raw pages and detailed per-series/place summaries stay in durable local evidence.
"""
import collections,datetime,gzip,hashlib,importlib.util,itertools,json,math,re,sys,time
from pathlib import Path
HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('inventory',HERE/'coverage-inventory.py');i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
E=i.EVIDENCE;RUN=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/retrieval';OUT=RUN/'observations'
sha=lambda b:hashlib.sha256(b).hexdigest()
def canonical(v):return json.dumps(v,sort_keys=True,separators=(',',':'))
def atomic(path,value):
 path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+'.tmp');tmp.write_text(canonical(value)+'\n');tmp.replace(path)
def numeric(value):
 if value is None or isinstance(value,bool):return None
 if isinstance(value,str) and not re.fullmatch(r'[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?',value.strip()):return None
 try:n=float(value)
 except (ValueError,TypeError):return None
 return n if math.isfinite(n) else None
def period_valid(period,frequency):
 patterns={'annual':r'\d{4}','monthly':r'\d{4}-(?:0[1-9]|1[0-2])','quarterly':r'\d{4}-Q[1-4]','weekly':r'\d{4}-\d{2}-\d{2}','daily':r'\d{4}-\d{2}-\d{2}'}
 return bool(re.fullmatch(patterns[frequency],str(period)))
def matches(row,filters):return all(str(row.get(k)) in {str(x) for x in vs} for k,vs in filters.items())
def unit_for(row,column,catalog=None):
 if column+'-units' in row:return str(row[column+'-units']) if row[column+'-units'] is not None else None
 if column=='value':
  v=row.get('unit',row.get('units'))
  if v is not None:return str(v)
 if catalog:
  col=next((r for r in catalog['dataColumns'] if r['id']==column),{})
  definition=col.get('definition',{})
  if isinstance(definition,dict):
   value=definition.get('units',definition.get('unit'))
   if value:return str(value)
 return None
class Matcher:
 def __init__(self,plans,cross,frequency):
  self.index=collections.defaultdict(lambda:collections.defaultdict(list));self.cross=cross;self.frequency=frequency
  self.place_index={}
  for fid,rows in cross.get('facets',{}).items():
   for r in rows:
    if r['status']=='mapped' and frequency in r['frequencies']:self.place_index.setdefault((fid,str(r['definition']['id'])),[]).append(r)
  for p in plans:
   # Precompile approved place/filter sets without loosening any dimension.
   filters={k:set(map(str,v)) for k,v in p['filters'].items()}
   for c in p['cells']:
    for allowed in c['allowedMeasureFilters']:
     keys=tuple(sorted(allowed))
     for values in itertools.product(*(list(map(str,allowed[k])) for k in keys)):
      self.index[keys][values].append((p,c,filters))
 def places(self,row,p):
  if not p['placeFacetKeys']:
   return ['USA'] if self.cross.get('scopeEvidence',{}).get('placeKind')=='US' and p['cellId'].split('|')[0]=='US' else []
  codes=set()
  for fid in p['placeFacetKeys']:
   for r in self.place_index.get((fid,str(row.get(fid))),[]):
    if r['status']=='mapped' and self.frequency in r['frequencies'] and str(r['definition']['id'])==str(row.get(fid)) and matches(row,r.get('requiredFilters',{})) and r['geographyCode'] in p['placeCodes']:codes.add(r['geographyCode'])
  return sorted(codes)
 def find(self,row):
  found=set()
  for keys,lookup in self.index.items():
   for p,c,filters in lookup.get(tuple(str(row.get(k)) for k in keys),[]):
    if not all(str(row.get(k)) in values for k,values in filters.items()):continue
    for place in self.places(row,p):
     key=(c['cellId'],c['candidateStatus'],p['column'],place)
     if key not in found:found.add(key);yield key

def basis(row,column,catalog,frequency):
 labels=[];notes=[];sources=[]
 col=next((x for x in catalog['dataColumns'] if x['id']==column),{})
 records=[col]
 for fid,rs in catalog['facets'].items():records.extend(r for r in rs if frequency in r['frequencies'] and str(r['definition']['id'])==str(row.get(fid)))
 for r in records:
  label=r.get('basisLabel')
  if not label:
   definition=r.get('definition',{});label=(definition.get('name') or definition.get('alias')) if isinstance(definition,dict) else None
  if not label:
   activity=r.get('activity') or ' / '.join(r.get('activities',[]))
   if activity:label=' '.join(x for x in [r.get('product'),activity] if x)
  if label and label not in labels:labels.append(label)
  for key in ['basisRestriction','selectionConstraint','selectionPreference','generationScope','scopeNote','scopeWarning','scopeConstraints','historicalScope','capacityScope','broaderPublishedTotal','omittedSmallScaleEstimate','historicalFuelScope','populationRestriction','unitNote','sourcePeriodNote','sourceScope','broaderCandidate','capacityBasis','frequencyBasis','geographicScope','scopeRestriction','broaderMeasure','broaderComparison','referenceTime','sectorScope','restrictions']:
   if r.get(key) and str(r[key]) not in notes:notes.append(str(r[key]))
  sources.extend(r.get('calls',[]))
 return {'label':'; '.join(labels),'scopeNotes':notes,'metadataCalls':sorted(set(sources))}

def audit_group(group,original,cross,node,catalog,attributes=None):
 plans=[original[x] for x in group['originalPlanIds']];matcher=Matcher(plans,cross,group['frequency']);series={};errors=[];counts=collections.Counter();symbols=collections.Counter();calls=[]
 facetkeys=[f['id'] for f in node['facets']]
 if attributes is None:attributes=i.read(E/'observation-attributes.json')['routes'].get(group['route'],{}).get('attributes',[])
 attribute_fields={a['field'] for a in attributes};identitykeys=[k for k in facetkeys if k not in attribute_fields]
 placekeys=set(cross.get('facets',{}))
 # Place crosswalk includes some non-subject dimensions. Retain every native
 # dimension in identity and summaries; only grouping approved subject varies.
 subjectkeys={k for p in plans for k in p['placeFacetKeys']}
 for part in group['parts']:
  seen=set()
  expectedoffset=0
  for page in part['pages']:
   body=(RUN/page['file']).read_bytes()
   if sha(body)!=page['sha256']:raise ValueError('Raw response hash mismatch')
   response=json.loads(gzip.decompress(body)).get('response',{});rows=response.get('data',[]);calls.append(page['id'])
   if page['offset']!=expectedoffset:errors.append({'call':page['id'],'error':'noncontiguous page'})
   expectedoffset+=len(rows)
   if response.get('frequency')!=group['frequency']:errors.append({'call':page['id'],'error':'frequency mismatch','actual':response.get('frequency')})
   if len(rows)!=page['rows']:errors.append({'call':page['id'],'error':'row count mismatch'})
   for rownum,row in enumerate(rows):
    counts['rows']+=1
    if not matches(row,part['params']['facets']):
     counts['rowsOutsideRequestedFilters']+=1
     if counts['rowsOutsideRequestedFilters']<=3:errors.append({'call':page['id'],'row':rownum,'error':'row outside requested filters'})
     continue
    if not period_valid(row.get('period'),group['frequency']):
     counts['invalidPeriods']+=1
     if counts['invalidPeriods']<=3:errors.append({'call':page['id'],'row':rownum,'error':'invalid period'})
     continue
    identity=sha(canonical([row['period']]+[row.get(k) for k in identitykeys]).encode())
    if identity in seen:
     counts['duplicateIdentities']+=1
     if counts['duplicateIdentities']<=3:errors.append({'call':page['id'],'row':rownum,'error':'duplicate native observation identity'})
     continue
    seen.add(identity)
    attribute_conflict=False
    for attr in attributes:
     value=row.get(attr['field']);known={str(r['definition']['id']) for r in attr['definitions']}
     if value is not None and str(value) not in known:
      counts['unknownObservationFlags']+=1;attribute_conflict=True
      if counts['unknownObservationFlags']<=3:errors.append({'call':page['id'],'row':rownum,'error':'unknown observation flag','field':attr['field'],'code':value})
     if str(value) in attr.get('nonnumericStatusCodes',[]) and any(numeric(row.get(column)) is not None for column in group['columns']):
      counts['flagValueConflicts']+=1;attribute_conflict=True
      if counts['flagValueConflicts']<=3:errors.append({'call':page['id'],'row':rownum,'error':'numeric value with EIA nonnumeric-status flag','field':attr['field'],'code':value})
    if attribute_conflict:continue
    accepted=list(matcher.find(row))
    if not accepted:counts['extraCrossCombinations']+=1;continue
    counts['rowsMatchingOriginalPlans']+=1
    for cid,status,column,place in accepted:
     if column not in row:counts['missingMeasureColumn']+=1;continue
     unit=unit_for(row,column,catalog)
     if unit and unit_for(row,column) is None:counts['unitsFromVerifiedColumnMetadata']+=1
     if not unit or unit.lower() in ['none','null','undefined','']:
      counts['missingUnits']+=1;continue
     dims={k:row.get(k) for k in facetkeys if k not in subjectkeys and k not in attribute_fields}
     # Unit remains part of identity even where EIA does not expose it as a facet.
     sid=sha(canonical([cid,status,column,dims,unit]).encode())[:24]
     if sid not in series:series[sid]={'id':sid,'cellId':cid,'candidateStatus':status,'route':group['route'],'frequency':group['frequency'],'column':column,'measureFacets':dims,'unit':unit,'unitName':row.get('unitName',unit),'basis':basis(row,column,catalog,group['frequency']),'places':{}}
     s=series[sid];native={k:str(row[k]) for k in subjectkeys if k in row};placeid=canonical([place,native]);a=s['places'].setdefault(placeid,{'geographyCode':place,'nativePlaceFilters':native,'observationFlags':{},'rows':0,'numeric':0,'zero':0,'symbols':{},'first':None,'last':None,'firstNumeric':None,'lastNumeric':None,'firstCall':page['id'],'lastCall':page['id'],'nativePlaces':{}})
     a['rows']+=1;a['lastCall']=page['id'];period=str(row['period']);a['first']=min(a['first'],period) if a['first'] else period;a['last']=max(a['last'],period) if a['last'] else period
     for k in subjectkeys:
      if k in row:
       vals=a['nativePlaces'].setdefault(k,[])
       if str(row[k]) not in vals:vals.append(str(row[k]))
     for attr in attributes:
      if row.get(attr['field']) is not None:
       flag=canonical({attr['field']:row.get(attr['field']),attr['descriptionField']:row.get(attr['descriptionField'])});a['observationFlags'][flag]=a['observationFlags'].get(flag,0)+1
     value=numeric(row[column])
     if value is None:
      symbol=str(row[column]) if row[column] is not None else '<null>';a['symbols'][symbol]=a['symbols'].get(symbol,0)+1;symbols[symbol]+=1
     else:
      a['numeric']+=1;a['zero']+=value==0
      if a['firstNumeric'] is None or period<a['firstNumeric']:a['firstNumeric']=period;a['firstValue']=row[column]
      if a['lastNumeric'] is None or period>a['lastNumeric']:a['lastNumeric']=period;a['lastValue']=row[column]
  if part['status']=='complete' and expectedoffset!=part['total']:errors.append({'part':part['id'],'error':'completed part total mismatch'})
 return {'group':group['id'],'route':group['route'],'frequency':group['frequency'],'retrievalComplete':all(p['status']=='complete' for p in group['parts']),'validated':not errors and not any(counts[k] for k in ['missingUnits','missingMeasureColumn']),'counts':dict(counts),'errors':errors,'symbols':dict(symbols),'calls':calls,'series':list(series.values())}

def main():
 state=json.loads((RUN/'state.json').read_text());plan=i.read(E/'reduced-request-plan.json');groups={g['id']:g for g in plan['groups']};original={p['id']:p for p in i.read(E/'b1-request-plan.json')['plans']};cross=i.read(E/'place-crosswalk.json')['routes'];nodes={n['route']:n for n in i.read(E/'route-census.json')['nodes'] if n.get('classification')=='FITS'};catalog=i.read(E/'series-catalog-summary.json')['routes'];OUT.mkdir(exist_ok=True)
 partial_mode='--partial' in sys.argv;manifestpath=E/('observation-audit-partial.json' if partial_mode else 'observation-audit.json');manifest=json.loads(manifestpath.read_text()) if manifestpath.exists() else {'groups':{},'status':'partial; not a coverage certification'}
 for g in state['groups']:
  if partial_mode:
   if g['status']=='complete' or not any(p['pages'] for p in g['parts']):continue
  elif g['status']!='complete':continue
  stamp=sha(canonical([g,sha(Path(__file__).read_bytes())]).encode());old=manifest['groups'].get(g['id'])
  if old and old['stateSHA256']==stamp:
   if sha(Path(old['localFile']).expanduser().read_bytes())!=old['sha256']:raise ValueError('Audit summary hash mismatch')
   continue
  result=audit_group({**groups[g['id']],**g},original,cross[g['route']],nodes[g['route']],i.read(E/catalog[g['route']]['file']));body=gzip.compress((canonical(result)+'\n').encode(),mtime=0);digest=sha(body);target=OUT/(g['id']+'-'+digest+'.json.gz');target.write_bytes(body)
  summary={k:v for k,v in result.items() if k not in ['series','calls','errors']};summary['errors']=result['errors'][:12];summary.update({'stateSHA256':stamp,'localFile':str(target).replace(str(Path.home()),'~',1),'sha256':digest,'bytes':len(body),'seriesCount':len(result['series']),'wholePositiveCells':sorted({r['cellId'] for r in result['series'] if r['candidateStatus']=='whole product' and any(p['numeric'] for p in r['places'].values())}),'subsetPositiveCells':sorted({r['cellId'] for r in result['series'] if r['candidateStatus']=='subset' and any(p['numeric'] for p in r['places'].values())})})
  manifest['groups'][g['id']]=summary;manifest['updatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();atomic(manifestpath,manifest);print(json.dumps({'group':g['id'],'route':g['route'],'validated':result['validated'],'counts':result['counts'],'errors':result['errors'][:2]}),flush=True)
 print(json.dumps({'groupsAudited':len(manifest['groups']),'valid':sum(g['validated'] for g in manifest['groups'].values())}),flush=True)
if __name__=='__main__':main()
