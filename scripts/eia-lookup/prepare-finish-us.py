"""Review only US not-checked cells; preserve the Job 5 grid and source records.
No API calls. Candidate codes come from the previously audited correspondence.
"""
import importlib.util,json,hashlib,collections
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
t=i.read(i.EVIDENCE/'coverage-table.json');selection=i.read(i.EVIDENCE/'coverage-selection-details.json');cross=i.read(i.EVIDENCE/'place-crosswalk.json')
choices=[('US|petroleum|consumption||','total-energy',{'msn':'PATCPUS'}),('US|natural gas|storage||','total-energy',{'msn':'NGUSPUS'}),('US|petroleum|generation||','total-energy',{'msn':'PAETPUS'}),('US|petroleum|storage||','total-energy',{'msn':'PAPSPUS'}),('US|hydro|generation||','seds',{'seriesId':'HYTCP'}),('US|wind|capacity||','electricity/state-electricity-profiles/capability',{'energysourceid':'WND','producertypeid':'TOT'}),('US|geothermal|capacity||','electricity/state-electricity-profiles/capability',{'energysourceid':'GEO','producertypeid':'TOT'})]
rows=[]
for cid,route,facets in choices:
 c=next(c for c in t['cells'] if c['id']==cid);assert c['status']=='not checked' and c['placeKind']=='US'
 pending=next(c for c in selection['pendingCells'] if c['cellId']==cid)
 matches=[a for a in pending['alternatives'] if a['series']['route']==route and a['series']['frequency']=='annual' and a['series']['measureFacets']==facets]
 assert len(matches)==1,(cid,len(matches));a=matches[0];assert not a['constraints']['pending'];assert a['place']['geographyCode']=='USA';assert a['series']['candidateStatus']=='whole product'
 rows.append({'cellId':cid,'candidate':a,'scope':cross['routes'][route].get('scopeEvidence'),'decision':'Owner standing scope rule: accept EIA headline whole-product measure, retain native scope; no summing or substitution by numeric magnitude. Capacity is labelled utility-scale; storage scope note not verified where metadata is incomplete. Other native bases remain alternatives, not inferred equal values.','otherCandidates':[{'route':x['series']['route'],'frequency':x['series']['frequency'],'facets':x['series']['measureFacets'],'unit':x['series']['unitName'],'basis':x['series']['basis']['label']} for x in pending['alternatives']]})
# Sector generation-capacity cells: accept only a native headline with no
# unresolved scope restriction. Broader solar/all-fuel totals remain pending.
for c in t['cells']:
 if c['placeKind']!='US' or c['status']!='not checked' or not c['sector'] or c['activity']!='capacity' or c['product'] in ['solar','electricity','renewable']:continue
 pending=next((x for x in selection['pendingCells'] if x['cellId']==c['id']),None)
 if not pending:continue
 matches=[a for a in pending['alternatives'] if a['series']['frequency']=='annual' and a['series']['route']=='total-energy' and all(p['field']=='historicalFuelScope' for p in a['constraints']['pending']) and a['series']['candidateStatus']=='whole product']
 if len(matches)!=1:continue
 a=matches[0];assert a['place']['geographyCode']=='USA';rows.append({'cellId':c['id'],'candidate':a,'scope':cross['routes'][a['series']['route']].get('scopeEvidence'),'decision':'Existing native headline sector generating-capacity total, utility-scale (1 MW and larger). Historical fuel-scope notes are retained verbatim; EIA scope note not verified. Broader solar/all-fuel measures excluded from this resolution.','otherCandidates':[]})
base=[c for c in t['cells'] if c['placeKind']=='US'];out={'baseline':'2968dd7','researchStartedUTC':'2026-10-30T22:31:18Z','researchDeadlineUTC':'2026-10-31T00:01:18Z','method':'Job 5 metadata correspondence + full pagination, unit/facet/duplicate checks and US-only guard; R5 scope only','before':{'all':dict(collections.Counter(c['status'] for c in base)),'base':dict(collections.Counter(c['status'] for c in base if c['group']=='base'))},'sourceHashes':{n:hashlib.sha256((i.EVIDENCE/n).read_bytes()).hexdigest() for n in ['coverage-table.json','coverage-selection-details.json','place-crosswalk.json']},'candidates':rows,'remaining':[{'cellId':c['id'],'reason':c.get('pendingReason'),'resolution':'No verified broader/compatible definition within bounded review; remain not checked. OB2/OBW/95 never support absence.'} for c in base if c['status']=='not checked' and c['id'] not in {r['cellId'] for r in rows}]}
p=i.ROOT/'evidence/eia-finish/us-review.json';p.write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({'proposedUSCells':len(rows),'remainingNotChecked':len(out['remaining']),'before':out['before']}))
