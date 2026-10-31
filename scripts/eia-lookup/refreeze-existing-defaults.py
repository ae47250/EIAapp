from pathlib import Path
import json,hashlib,gzip,copy,datetime,collections
R=Path.cwd();E=R/'evidence/eia-coverage';D=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage';sha=lambda b:hashlib.sha256(b).hexdigest();read=lambda p:json.loads(p.read_text());canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'))
assert read(E/'set-d-freeze.json')['revision']==1, 'Owner-authorized revision 1 input required; do not repeat a freeze'
old=read(E/'set-d.json');new=copy.deepcopy(old);cat=read(R/'data/eia/lookup-list.json');geos={g['code']:g for g in read(R/'data/eia/routing-metadata.json')['geographies']};originals=[]
for c in new['questions']:
 for en in c['entries']:
  if en['outcome']!='data':continue
  code=en['geographyCode'];kind=geos[code]['type'];sector=c['form']['sector']['value'];qualifier='gasoline' if 'Gasoline (part of petroleum)' in en['requiredLabels'] else None
  choices=[]
  for row in cat['rows']:
   if row['product']!=en['product'] or row['activity']!=en['activity'] or (row.get('qualifier') or None)!=qualifier or en['frequency'] not in row['frequencies'] or row.get('excludedProducts') or row.get('excludedSectors'):continue
   k=row['geographyKind'];fits=(k=='state' and kind=='state') or (k=='united_states' and code=='USA') or (k=='country' and (kind=='country' or code=='USA') and code!='WLD') or (k=='eia_region' and code in row.get('region',{}).get('requestedCodes',[]))
   if not fits:continue
   m=cat['routes'][row['route']];gcode=row.get('region',{}).get('code',code);value=m['geographies'].get(gcode)
   if not value:continue
   sf=row['sectorMapping'].get(sector or '') if row['sectorSupported'] else {} if sector is None else None
   if sf is None:continue
   facets={**row['fixedFacets'],m['geographyFacet']:value,**m.get('extraGeographyFacets',{}).get(gcode,{}),**sf}
   choices.append((row,facets))
  if not choices:continue
  choices.sort(key=lambda x:x[0]['geographyKind']!='united_states');row,facets=choices[0]
  before=copy.deepcopy(en);basis=row['basisLabel'].replace('{sector}',sector+' sector' if sector else 'all sectors')
  en.update(route=row['route'],measure=row['dataColumn'],facets=facets,unit=row['unit'],unitWords=row['unit'],acceptableMeasurementBases=[basis],requiredLabels=[basis],otherBasesExist=True)
  if row.get('region'):en['requiredLabels'].append(row['region']['label'])
  if qualifier:en['requiredLabels'].append(qualifier.title()+' (part of '+row['product']+')')
  originals.append({'case':c['id'],'entry':en,'before':before,'originalKey':row['key'],'rows':[],'calls':[],'groups':[],'years':c['form']['years']})
# Source observations only: fully paginated saved EIA groups, independent of application selection.
state=read(D/'retrieval/state.json')
for group in state['groups']:
 targets=[t for t in originals if t['entry']['route']==group['route'] and t['entry']['frequency']==group['frequency'] and t['entry']['measure'] in group['columns']]
 if not targets:continue
 if group['status']!='complete':continue
 for part in group['parts']:
  ts=[t for t in targets if all(k not in part['params'].get('facets',{}) or str(v) in map(str,part['params']['facets'][k]) for k,v in t['entry']['facets'].items())]
  if not ts:continue
  keys=collections.defaultdict(lambda:collections.defaultdict(list))
  for t in ts:
   facets=t['entry']['facets'];ks=tuple(sorted(facets));keys[ks][tuple(str(facets[k]) for k in ks)].append(t)
  for page in part['pages']:
   body=(D/'retrieval'/page['file']).read_bytes();assert sha(body)==page['sha256'];rows=json.loads(gzip.decompress(body))['response']['data']
   for r in rows:
    for ks,lookup in keys.items():
     for t in lookup.get(tuple(str(r.get(k)) for k in ks),[]):t['rows'].append(r)
   for t in ts:t['calls'].append(page['id']);t['groups'].append(group['id'])
changes=[];index=read(E/'set-d-source-index.json')
for t in originals:
 e=t['entry'];y=t['years'];rows=[r for r in t['rows'] if (y['start'] is None or int(r['period'][:4])>=y['start']) and (not isinstance(y['end'],int) or int(r['period'][:4])<=y['end'])]
 assert rows,(t['case'],t['originalKey'],'Missing required saved observations')
 pts=[]
 for r in sorted(rows,key=lambda r:r['period']):
  val=r[e['measure']];value=float(val) if val is not None and str(val).strip() and str(val).strip() not in ['--','NA','W'] else None
  p={'period':r['period'],'value':value}
  if value is None and val is not None:p.update(symbol=str(val),meaning={'--':'Not applicable','NA':'Not available','W':'Withheld'}[str(val)])
  if pts and pts[-1]['period']==p['period']:assert pts[-1]==p;continue
  pts.append(p)
 e.update(snapshotPoints=pts,firstPeriod=pts[0]['period'],snapshotLastPeriod=pts[-1]['period'],lastPeriod=pts[-1]['period'] if isinstance(y['end'],int) else 'latest',sourceCalls=sorted(set(t['calls'])),sourceGroup=','.join(sorted(set(t['groups']))),sourceSeriesId=t['originalKey'])
 nums=[p['value'] for p in pts if p['value'] is not None];e['statusLabel']='No data for these years' if not nums else 'Reported as zero every year' if all(v==0 for v in nums) else 'Available'
 before=t['before'];fields=[k for k in e if k not in ['sourceCalls','sourceGroup','sourceSeriesId'] and e.get(k)!=before.get(k)]
 if fields:changes.append({'case':t['case'],'place':e['geographyCode'],'product':e['product'],'activity':e['activity'],'originalRow':t['originalKey'],'changedFields':fields,'before':{k:before.get(k) for k in fields if k!='snapshotPoints'},'after':{k:e.get(k) for k in fields if k!='snapshotPoints'},'beforePointsSHA256':sha(canonical(before['snapshotPoints']).encode()),'afterPointsSHA256':sha(canonical(e['snapshotPoints']).encode())})
 key='|'.join([e['geographyCode'],e['product'],e['activity'],str(y['start']),str(y['end'])]);index[key]={'cell':e['cellId'],'originalRow':t['originalKey'],'calls':e['sourceCalls'],'snapshotSHA256':sha(canonical(pts).encode()),'selector':{k:e[k] for k in ['route','measure','facets','unit','frequency']},'latestEvidencePolicy':'Independently retrieve this exact selector at scored execution. Owner retained original eligible defaults.'}
record={'recordedAtUTC':datetime.datetime.now(datetime.timezone.utc).isoformat(),'ownerInstruction':'Existing rows and their defaults win; generated mappings only fill gaps. Re-freeze affected Set D selectors before paid runs; disclose other bases.','derivation':'Original 28 checked definitions and complete hash-verified EIA observations; no application output used. Frequency, sector, product qualifiers and geography scope remain required.','changedCases':sorted(set(x['case'] for x in changes)),'changes':changes,'previousSetDSHA256':sha((E/'set-d.json').read_bytes()),'scorerChanged':False,'earlierAnswerKeysChanged':False}
local=D/'implementation-window/existing-default-refreeze';local.mkdir(exist_ok=True)
for f in ['set-d.json','set-d-source-index.json','set-d-table.md','set-d-freeze.json']:
 b=(E/f).read_bytes();p=local/(sha(b)+'-'+f);p.write_bytes(b);assert sha(p.read_bytes())==sha(b)
manifest=read(E/'set-d-freeze.json');(E/'set-d-freeze-revision-1.json').write_text(json.dumps(manifest,indent=2)+'\n');new.setdefault('ownerAmendments',[]).append({'record':'existing-default-owner-change.json','change':'Original eligible defaults precede generated gap mappings.'})
(E/'set-d.json').write_text(json.dumps(new,indent=2)+'\n');(E/'set-d-source-index.json').write_text(json.dumps(index,indent=2)+'\n');(E/'existing-default-owner-change.json').write_text(json.dumps(record,indent=2)+'\n')
lines=['# Set D — owner revision 2, existing defaults first','','Earlier snapshots and hashes retained; scorer, sample, form meanings and pass marks unchanged.','','| Case | Question | Expected selector / question |','|---|---|---|']
for c in new['questions']:
 text=c.get('question',{}).get('text','')
 if c['entries']:text='; '.join(e['geographyName']+': '+(e['route']+' '+canonical(e['facets'])+'; '+e['unit']+'; '+e['frequency']+'; '+e['firstPeriod']+'–'+str(e['lastPeriod'])+'; '+e['acceptableMeasurementBases'][0] if e['outcome']=='data' else e['outcome']) for e in c['entries'])
 lines.append('| '+c['id']+' | '+c['query'].replace('|','/')+' | '+text.replace('|','/')+' |')
(E/'set-d-table.md').write_text('\n'.join(lines)+'\n');manifest.update(revision=2,ownerChangeRecord='existing-default-owner-change.json',frozenAtUTC=record['recordedAtUTC'])
for p in manifest['sha256']:manifest['sha256'][p]=sha((R/p).read_bytes())
(E/'set-d-freeze.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'changedCases':record['changedCases'],'changedEntries':len(changes)}))
