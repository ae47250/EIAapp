"""Build owner Set D from the checked correspondence and saved EIA observations.
No model, network or app execution. Prior answer keys are read only. This builder
must not run after Set D is frozen without a recorded owner expectation change.
"""
import collections,copy,datetime,gzip,hashlib,importlib.util,json,random,re
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
E=i.EVIDENCE;ROOT=i.ROOT;SEED=20261030
sha=lambda b:hashlib.sha256(b).hexdigest()
def numeric(v):
 if isinstance(v,bool) or v is None:return None
 if isinstance(v,str) and not re.fullmatch(r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?',v.strip()):return None
 try:return float(v)
 except (ValueError,TypeError):return None
SYMBOLS={'--':'Not applicable','NA':'Not available','W':'Withheld','Not Available':'Not available','NA.':'Not available','NM':'Not meaningful','(s)':'Less than half the unit shown','*':'Less than half the unit shown'}
def point(r,column):
 value=numeric(r.get(column));out={'period':r['period'],'value':value}
 if value is None:
  raw=r.get(column)
  if raw is not None:
   out['symbol']=str(raw);out['meaning']=SYMBOLS.get(str(raw))
   if not out['meaning']:raise ValueError('Unverified symbol in Set D: '+repr(raw))
 return out

def main():
 if (E/'set-d-freeze.json').exists():raise SystemExit('Set D already frozen; owner change required before regeneration')
 coverage=i.read(E/'coverage-table.json');cells={c['id']:c for c in coverage['cells']};selection=i.read(E/'coverage-selection-details.json');selected={c['cellId']:c for c in selection['mappedCandidateCells']}
 manifest=i.read(E/'row-replay-input.json')
 rs=importlib.util.spec_from_file_location('replayinput',Path(__file__).with_name('coverage-replay-input.py'));rm=importlib.util.module_from_spec(rs);rs.loader.exec_module(rm)
 sample_pool=sorted(c['id'] for c in cells.values() if c['group']=='base' and c['status']=='mapped' and any(d['frequency']=='annual' for d in selected[c['id']]['defaults']))
 wanted=set(i.read(E/'execution-window-2.json')['priorityCells'])|set(random.Random(SEED).sample(sample_pool,8))|{'US|coal|production||'}
 jobs={(j['cellId'],j['default']['geographyCode'],j['default']['frequency']):j for j in rm.jobs(manifest) if j['cellId'] in wanted}
 available={(c['cellId'],d['geographyCode'],d['frequency']) for c in selected.values() for d in c['defaults']}
 config=i.read(ROOT/'data/eia/phase4-routing-config.json')['vocabulary'];geos={}
 for g in i.read(ROOT/'data/eia/routing-metadata.json')['geographies']:
  if g['code'] not in geos or g['type']=='national':geos[g['code']]=g
 calls={r['id']:r for r in map(json.loads,(E/'retrieval-calls.jsonl').read_text().splitlines())} if (E/'retrieval-calls.jsonl').exists() else {}
 ps=importlib.util.spec_from_file_location('placeproof',Path(__file__).with_name('coverage-place-proof.py'));pm=importlib.util.module_from_spec(ps);ps.loader.exec_module(pm);placeproof=pm.Proof()
 cases=[];provenance={};unresolved=[]
 def geography(code,quote=None,default=False):
  g=geos[code];kind='US state' if g['type']=='state' else g['type'];return {'geography':f"{code} | {g['name']} | {kind}",'quoted_words':g['name'] if quote is None else quote,'is_default':default}
 def form(places,topics,sector=None,frequency='annual',explicit=False,start=None,end=None,yearquote=None,about=None,excluded=(),quotes=None):
  return {'geographies':[geography(c,(quotes or {}).get(c)) for c in places],'excluded_geographies':[geography(c,(quotes or {}).get(c)) for c in excluded],'topics':[{'product':p,'activity':a,'quoted_words':q} for p,a,q in topics],'excluded_topics':[],'sector':{'value':sector,'quoted_words':sector},'frequency':{'value':frequency,'explicit':explicit,'quoted_words':frequency if explicit else None},'years':{'start':start,'end':end,'quoted_words':yearquote},'unsupported_words':[],'clarification':{'needed':bool(about),'about':about,'options':[]}}
 def cellid(code,p,a,sector=None,qualifier=None):
  kind='US' if code=='USA' else 'World' if code=='WLD' else geos[code]['type'];return '|'.join([kind,p,a,sector or '',qualifier or ''])
 def entry(code,p,a,f,frequency=None,qualifier=None):
  cid=cellid(code,p,a,f['sector']['value'],qualifier);c=cells[cid];out={'geographyCode':code,'geographyName':geos[code]['name'],'product':p,'activity':a,'cellId':cid}
  if c['status']!='mapped':
   proof=placeproof.get(cid,code,frequency or f['frequency']['value'])
   if proof['verified']:return {**out,'outcome':'missing','statusLabel':'No data for these years','absenceEvidence':proof}
   return {**out,'outcome':'unresolved','reason':proof['reason']}
  fq=frequency or f['frequency']['value'];job=jobs.get((cid,code,fq))
  if not job:
   # A mapped cell is not evidence of a requested frequency or place's absence.
   proof=placeproof.get(cid,code,fq)
   if proof['verified']:return {**out,'outcome':'missing','statusLabel':'No data for these years','absenceEvidence':proof}
   return {**out,'outcome':'unresolved','reason':proof['reason']}
  d=job['default'];start,end=f['years']['start'],f['years']['end'];pts=[point(r,d['dataColumn']) for r in job['observations'] if (start is None or int(r['period'][:4])>=start) and (not isinstance(end,int) or int(r['period'][:4])<=end)]
  if not pts:return {**out,'outcome':'unresolved','reason':'No observation in requested years; absence proof pending.'}
  nums=[p['value'] for p in pts if p['value'] is not None];status='No data for these years' if not nums else 'Reported as zero every year' if all(v==0 for v in nums) else 'Available'
  out.update(outcome='data',route=d['route'],measure=d['dataColumn'],facets=d['facets'],unit=d['unitName'],unitWords=d['unitName'],frequency=fq,acceptableMeasurementBases=[d['basisLabel']],requiredLabels=[d['basisLabel']],firstPeriod=pts[0]['period'],lastPeriod=pts[-1]['period'] if isinstance(end,int) else 'latest',snapshotLastPeriod=pts[-1]['period'],snapshotPoints=pts,statusLabel=status,sourceCalls=job['sourceCalls'],sourceGroup=d['group'],sourceSeriesId=d['seriesId'],otherBasesExist=d['alternativeCount']>0)
  out['headlineConcepts']=[list(dict.fromkeys([p]+config['products'][p].get('broadTerms',config['products'][p]['terms']))),list(dict.fromkeys([a]+config['activities'][a]['terms']))]
  if qualifier:out['requiredLabels'].append(qualifier.title()+' (part of '+p+')')
  unit_words={'$/MCF':'dollars per thousand cubic feet','$/GAL':'dollars per gallon','BCF':'billion cubic feet','MMCF':'million cubic feet','MST':'million short tons','TST':'thousand short tons'}
  out['unitWords']=unit_words.get(d['unitName'],d['unitName'])
  if p=='electricity' and a=='consumption' and geos[code]['type']=='state':out['requiredLabels'].append('Retail sales; excludes electricity generated and used on-site')
  key='|'.join([code,p,a]);provenance[key+'|'+str(start)+'|'+str(end)]={'cell':cid,'rowReplayKey':job['key'],'calls':job['sourceCalls'],'snapshotSHA256':sha(json.dumps(pts,sort_keys=True,separators=(',',':')).encode()),'selection':d,'latestEvidencePolicy':'At scored execution, independently retrieve this exact selector and range; compare current points, first/last periods and latest headline. Do not accept a different series.'}
  return out
 def add(id,query,f,**kwargs):
  c={'id':id,'query':query,'form':f,'entries':[],'understoodContains':[],**kwargs};cases.append(c);return c
 def data(id,query,places,topics,**kwargs):
  extra={k:kwargs.pop(k) for k in list(kwargs) if k in ['typedReply','clicks','parentId','qualifier','dataFrequency','switchButton','forbidPlaceSwitch']};f=form(places,topics,**kwargs);c=add(id,query,f,**{k:v for k,v in extra.items() if k not in ['qualifier','dataFrequency']})
  c['understoodContains']=[geos[code]['name'] for code in places]+list(dict.fromkeys(x for p,a,q in topics for x in [p,a] if x))
  c['entries']=[entry(code,p,a,f,extra.get('dataFrequency'),extra.get('qualifier')) for p,a,q in topics for code in places]
  counts=collections.Counter()
  for en in c['entries']:
   k=(en['product'],en['activity']);counts[k]+=1;en['headlineRequired']=counts[k]<=3
  if len(places)>3:c['headlineRemainder']=f'and {len(places)-3} more in the table'
  if c['entries'] and all(e['outcome']=='missing' for e in c['entries']):
   buttons=[p.title()+' '+a for p,a,q in topics for a in config['activities'] if a!=topics[0][1] and all(cells[cellid(code,p,a,f['sector']['value'])]['status']=='mapped' and (cellid(code,p,a,f['sector']['value']),code,f['frequency']['value']) in available for code in places)]
   name=', '.join(geos[x]['name']+(' (country)' if x=='GEO' else '') for x in places)
   c['unavailableQuestion']={'text':f"EIA has no checked {topics[0][0]} {topics[0][1]} data for {name}.",'buttons':buttons,'freeText':True}
   c['checkChoiceUniqueness']=True;c['noEmptyCards']=True
   for en in c['entries']:en['tableRequired']=False
  if 'GA' in places:c['understoodContains'].append('(US state)')
  if 'GEO' in places:c['understoodContains'].append('(country)')
  return c
 q1='Brazil erngy production';data('D1',q1,['BRA'],[('total energy','production','erngy production')])
 q2='how much oil does Japan us';data('D2',q2,['JPN'],[('petroleum','consumption','oil does Japan us')])
 q3='Looking for data USA prdouction and consumption of nuclear energy';data('D3',q3,['USA'],[('nuclear','generation','prdouction and consumption of nuclear energy'),('nuclear','consumption','prdouction and consumption of nuclear energy')],quotes={'USA':'USA'})
 q4='electricity prices in georgia';data('D4',q4,['GA'],[('electricity','prices','electricity prices')],quotes={'GA':'georgia'},switchButton='Did you mean Georgia the country?')
 for id,steps in [('D4a',{'clicks':['Did you mean Georgia the country?']}),('D4b',{'typedReply':'no, I meant the country'})]:
  data(id,q4,['GEO'],[('electricity','prices','electricity prices')],parentId='D4',quotes={'GEO':steps.get('typedReply',steps.get('clicks',[''])[0])},**steps)
 q5='coal production for some countries';f=form([],[('coal','production','coal production')],about='geography');add('D5',q5,f,question={'text':'Which place should I look up?','buttons':['World total','All countries in a region','Type countries'],'freeText':True})
 f=copy.deepcopy(f);add('D5a',q5,f,parentId='D5',clicks=['All countries in a region'],question={'text':'Which region should I look up?','buttons':['Africa','Asia & Oceania','Central & South America','Eurasia','Europe','Middle East','North America'],'freeText':True})
 north=next(g for g in geos.values() if g['name']=='North America');members=north['code'].split('+');c=data('D5b',q5,members,[('coal','production','coal production')],parentId='D5a',clicks=['North America'],quotes={x:'North America' for x in members});c['form']['geographies']=[geography(north['code'],'North America')]
 q6='natural gas reserves for all the US states except alaska';f=form([],[('natural gas','reserves','natural gas reserves')],about='geography',excluded=['AK'],quotes={'AK':'alaska'});add('D6',q6,f,question={'text':'Which place should I look up?','buttons':['All US states','Type states'],'freeText':True})
 # EIA labels federal offshore waters separately; they and the national total are not states.
 states=sorted(g['code'] for g in geos.values() if g['type']=='state' and g['code']!='AK' and not g['name'].startswith('Federal Offshore'))
 data('D6a',q6,states,[('natural gas','reserves','natural gas reserves')],parentId='D6',clicks=['All US states'],excluded=['AK'],quotes={**{x:'All US states' for x in states},'AK':'alaska'})
 q7='compare georgia and armenia natural gas imports';data('D7',q7,['GEO','ARM'],[('natural gas','imports','natural gas imports')],quotes={'GEO':'georgia','ARM':'armenia'},forbidPlaceSwitch=True)
 # The owner explicitly allows an activity-null reading; test its question separately, never count it as the direct-data outcome.
 acts=[a for a in config['activities'] if all(cells[cellid(g,'natural gas',a)]['status']=='mapped' and (cellid(g,'natural gas',a),g,'annual') in available for g in ['GEO','ARM'])]
 f=form(['GEO','ARM'],[('natural gas',None,'natural gas')],about='activity',quotes={'GEO':'georgia','ARM':'armenia'});add('D7q',q7,f,setup='Injected activity-null form; offline clarification regression only; not an additional live-model outcome.',question={'text':'Which activity should I look up?','buttons':[a.title() for a in acts],'freeText':True},understoodContains=['Georgia','Armenia','natural gas','(country)'],forbidPlaceSwitch=True)
 products=[p for p in config['products'] if any(c['status']=='mapped' and c['product']==p and c['group']=='base' for c in cells.values())]
 f=form([],[(None,None,'energy stuff')],about='product');f['unsupported_words']=['stuff'];add('D8','energy stuff',f,question={'text':'Which product should I look up?','buttons':[p.title() for p in products],'freeText':True},ownerChange='Job 5 D8 requires product choices before activity. Earlier frozen C6 remains unchanged; any C6 score difference must be reported.')
 acts=[a for a in config['activities'] if any(c['status']=='mapped' and c['product']=='coal' and c['activity']==a and c['group']=='base' for c in cells.values())];f=form([],[('coal',None,'Coal')],about='activity');add('D8a','energy stuff',f,parentId='D8',clicks=['Coal'],question={'text':'Which activity should I look up?','buttons':[a.title() for a in acts],'freeText':True},understoodContains=['coal'])
 data('D9','coal consumption in Japan and Ohio since 2010',['JPN','OH'],[('coal','consumption','coal consumption')],start=2010,end='latest',yearquote='since 2010')
 data('D10','natural gas consumption in Georgia and Armenia',['GEO','ARM'],[('natural gas','consumption','natural gas consumption')],forbidPlaceSwitch=True)
 data('D11','Texas, residential electricity consumption, 2015 to 2020',['TX'],[('electricity','consumption','electricity consumption')],sector='residential',start=2015,end=2020,yearquote='2015 to 2020')
 q12='Looking for data on energy consumption for many countries from 2000-2019';f=form([],[('total energy','consumption','energy consumption')],start=2000,end=2019,yearquote='2000-2019',about='geography');add('D12',q12,f,question={'text':'Which place should I look up?','buttons':['World total','All countries in a region','Type countries'],'freeText':True})
 c=data('D12a',q12,['JPN','KOR'],[('total energy','consumption','energy consumption')],parentId='D12',typedReply='Japan and Korea, only from 2005',start=2005,end=2019,yearquote='from 2005',quotes={'JPN':'Japan','KOR':'Korea'});c['yearSlotEvidence']={'start':'typed reply: from 2005','end':'original: 2000-2019','rule':'Start and end are independent slots, per owner amendment; do not reset an unstated end.'}
 data('D13','monthly natural gas prices in Pennsylvania',['PA'],[('natural gas','prices','natural gas prices')],frequency='monthly',explicit=True)
 year=datetime.datetime.now(datetime.timezone.utc).year;c=data('D14','gasoline prices this year',['USA'],[('petroleum','prices','gasoline prices')],start=year,end='latest',yearquote='this year',qualifier='gasoline',dataFrequency='monthly');c['form']['geographies'][0]=geography('USA','',True);c['frequencyPolicy']='Annual remains the unstated form default; owner D14 explicitly requires a labelled native monthly/weekly current-year retail series, no annual aggregation.'
 # Seeded simple random sample without replacement of mapped base cells with annual data;
 # the specified query template has no sector, qualifier or frequency slot.
 pool=sorted(c['id'] for c in cells.values() if c['group']=='base' and c['status']=='mapped' and any(d['frequency']=='annual' for d in selected[c['id']]['defaults']))
 rng=random.Random(SEED);sample=rng.sample(pool,8);sampling=[]
 for n,cid in enumerate(sample,15):
  defaults=sorted([d for d in selected[cid]['defaults'] if d['frequency']=='annual'],key=lambda d:d['geographyCode']);d=rng.choice(defaults);p,a=cid.split('|')[1:3];code=d['geographyCode'];canonical=f'{p} {a} in {geos[code]["name"]}'
  edits=[k for k in range(len(canonical)-1) if canonical[k].isalpha() and canonical[k+1].isalpha() and canonical[k].lower()!=canonical[k+1].lower()];k=rng.choice(edits);query=canonical[:k]+canonical[k+1]+canonical[k]+canonical[k+2:]
  c=data('D'+str(n),query,[code],[(p,a,query)],quotes={code:query});sampling.append({'case':c['id'],'cell':cid,'place':code,'canonicalQuery':canonical,'query':query,'edit':{'kind':'adjacent transposition','index':k}})
 nuclear=i.read(E/'nuclear-basis-comparison.json');d3=next(c for c in cases if c['id']=='D3');d3['nuclearBasisEvidence']='nuclear-basis-comparison.json'
 if nuclear.get('sameWithinPublishedRounding'):
  for en in d3['entries']:
   if en['activity']=='consumption' and en['outcome']=='data':en['requiredLabels'].append(nuclear['displayNote'])
 next(c for c in cases if c['id']=='D7')['acceptableAlternatives']=[copy.deepcopy(next(c for c in cases if c['id']=='D7q'))]
 for c in cases:
  bad=[{'identity':'|'.join([e['geographyCode'],e['product'],e['activity']]),'reason':e['reason']} for e in c['entries'] if e['outcome']=='unresolved']
  if bad:c['unresolved']=bad;unresolved.append({'case':c['id'],'items':bad})
 result={'schemaVersion':2,'baseCommit':'bbff3bf4edf76935b5700b6ca702fa93071d624e','status':'DRAFT until freeze commit; unresolved expectations never pass and stay in denominator','source':'Owner Job 5 and subsequent explicit scope/year/coverage amendments; checked EIA correspondence and saved complete observations, not app output.','sampling':{'seed':SEED,'method':'Python random.Random simple random sample without replacement; sorted mapped base-cell IDs with annual data. Random place and adjacent character transposition.','pool':pool,'sample':sampling},'passMarks':{'minimumFractionCorrectFormAndOutcome':0.9,'D1D2D3BothRuns':True,'runs':2,'coverageNotChecked':0,'deadEnds':0,'unlabelledWrongData':0},'questions':cases,'unresolved':unresolved,'evidence':{'coverageTableSHA256':sha((E/'coverage-table.json').read_bytes()),'selectionPointerSHA256':sha((E/'coverage-selection-details.json').read_bytes()),'rowReplayManifestSHA256':sha((E/'row-replay-input.json').read_bytes())},'presentationContract':'Capture actual rendered understood line, status labels, chart/table inclusion, buttons and headline text in options.presentation; never create it from expectations. Missing UI evidence fails. Latest observations require independent complete exact-selector EIA evidence.'}
 (E/'set-d.json').write_text(json.dumps(result,indent=2)+'\n');(E/'set-d-source-index.json').write_text(json.dumps(provenance,indent=2)+'\n');print(json.dumps({'cases':len(cases),'liveOutcomes':sum(not c.get('setup') for c in cases),'unresolvedCases':len(unresolved),'unresolvedEntries':sum(len(x['items']) for x in unresolved),'sampleSeed':SEED}))
if __name__=='__main__':main()
