"""Metadata-derived B1 request plan. No network; candidates are not results.
Preserves every native filter combination and separates candidate enumeration
from whole-product acceptance. Full detail lives in hash-verified local evidence.
"""
import collections,datetime,hashlib,importlib.util,itertools,json,math
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
KINDS=['country','World','US','state']
FREQUENCIES={'annual':1,'quarterly':4,'monthly':12,'weekly':53,'daily':366}
QUALIFIERS={'crude oil','gasoline'}

def meanings(r):
    """Statuses in the reviewed correspondence, never lexical inference."""
    if r.get('ownerException') or r.get('classification') in ['pending','out of vocabulary']:return []
    if r.get('coverageEligible') is False:return []
    if not r.get('product'):return []
    out=[]
    for activity in r.get('activities',[r.get('activity')]):
        if not activity:continue
        p=r['product']
        for sector,qualifier,key in [(None,None,'classification'),(r.get('sector'),None,'sectorCellClassification'),(None,r.get('qualifier'),'qualifierClassification'),(r.get('sector'),r.get('qualifier'),'qualifierSectorCellClassification')]:
            if key.startswith('sector') and not sector:continue
            if key.startswith('qualifier') and (qualifier not in QUALIFIERS or ('Sector' in key and not sector)):continue
            status=r.get(key)
            if status in ['whole product','subset']:out.append((p,activity,sector,qualifier,status))
    return list(dict.fromkeys(out))

def composed(column,parts):
    """Combine independent measure dimensions without erasing a restriction."""
    records=[column]+list(parts.values())
    if any(r.get('classification') in ['pending','out of vocabulary'] or r.get('coverageEligible') is False for r in records):return []
    product=next((r['product'] for r in reversed(records) if r.get('product')),None)
    if not product:return []
    activities=column.get('activities',[column.get('activity')])
    if column.get('activityFacet'):
        activities=[parts.get(column['activityFacet'],{}).get('activity')]
    if activities==[None]:activities=[next((r['activity'] for r in parts.values() if r.get('activity')),None)]
    sectors={None}|{r['sector'] for r in records if r.get('sector')}
    qualifiers={None}|{r['qualifier'] for r in records if r.get('qualifier') in QUALIFIERS}
    out=[]
    for a,sector,q in itertools.product(activities,sectors,qualifiers):
        if not a:continue
        statuses=[]
        for r in records:
            status=r['classification']
            if status.startswith('via '):status='whole product'
            if q and r.get('qualifier')==q:status=r.get('qualifierClassification',status)
            if sector:
                if r.get('sector') and r['sector']!=sector:status='subset'
                elif r.get('sector')==sector:
                    status=r.get('qualifierSectorCellClassification' if q else 'sectorCellClassification',status)
                elif r.get('sectorCellClassification')=='via sector facet':
                    status=r.get('sectorCellOverrides',{}).get(sector,'whole product')
                elif r.get('sectorCandidate','').startswith(sector+':') or r.get('sectorCandidate','').startswith(sector+','):
                    # Owner standing rule; API metadata supports named sector total.
                    # Scope notes remain explicitly unverified, never silently removed.
                    status='whole product'
            if status not in ['whole product','subset']:status='subset'
            statuses.append(status)
        p=product
        if a=='consumption':p=next((r['inputProduct'] for r in records if r.get('inputProduct')),p)
        out.append((p,a,sector,q,'subset' if 'subset' in statuses else 'whole product'))
    return list(dict.fromkeys(out))

def enumerate_candidates(route,data,node):
    """One item per native definition and frequency; no observed availability."""
    sf=next((f for f in ['series','seriesId','msn'] if f in data['facets']),None)
    if sf:
        for r in data['facets'][sf]:
            ms=meanings(r)
            for freq in r['frequencies']:
                if freq not in FREQUENCIES:continue
                if ms:yield {'route':route,'frequency':freq,'column':data['dataColumns'][0]['id'],'filters':{sf:[r['definition']['id']]},'meanings':ms,'source':r,'seriesFacet':sf}
        return
    facets=data['facets']
    for f in node['frequencies']:
        freq=f['id']
        if freq not in FREQUENCIES:continue
        choices={fid:[r for r in rows if freq in r['frequencies'] and r.get('classification') not in ['pending','out of vocabulary'] and r.get('coverageEligible') is not False] for fid,rows in facets.items()}
        for combo in itertools.product(*choices.values()):
            parts=dict(zip(choices,combo))
            filters={fid:[r['definition']['id']] for fid,r in parts.items()}
            for col in data['dataColumns']:
                ms=composed(col,parts)
                if not ms:continue
                full=dict(filters)
                for fid,value in col.get('requiredTotalFacets',{}).items():full[fid]=value if isinstance(value,list) else [value]
                yield {'route':route,'frequency':freq,'column':col['id'],'filters':full,'meanings':ms,'source':col,'facetSources':{fid:r for fid,r in parts.items()}}

def geography_kinds():
    d=i.read(i.ROOT/'data/eia/routing-metadata.json')
    # Inspect the authoritative schema rather than infer from code length.
    if isinstance(d,dict):d=d.get('geographies',d.get('places',[]))
    return {r['code']:('US' if r['code']=='USA' else 'World' if r['code']=='WLD' else r['type']) for r in d}

def place_options(route,cross,kinds,frequency):
    groups=collections.defaultdict(dict)
    for fid,rows in cross.get('facets',{}).items():
        for r in rows:
            if r['status']!='mapped' or frequency not in r['frequencies']:continue
            kind=kinds.get(r['geographyCode'])
            if kind not in KINDS:raise ValueError('Unrecognized mapped place kind: '+str(r['geographyCode']))
            extra=r.get('requiredFilters',{})
            signature=json.dumps(extra,sort_keys=True)
            key=(kind,fid,signature)
            group=groups[key];group.setdefault('codes',[]).append(r['definition']['id']);group.setdefault('places',[]).append(r['geographyCode']);group['extra']=extra
    if groups:
        return [{'kind':kind,'filters':{fid:sorted(set(g['codes'])),**g['extra']},'geographyFacet':fid,'placeCodes':sorted(set(g['places'])),'nativePlaceCount':len(set(g['codes']))} for (kind,fid,_),g in groups.items()]
    scope=cross.get('scopeEvidence',{})
    if scope.get('placeKind')=='US':return [{'kind':'US','filters':{},'geographyFacet':None,'placeCodes':['USA'],'nativePlaceCount':1}]
    return []

def cell_id(kind,meaning):return '|'.join([kind,meaning[0],meaning[1],meaning[2] or '',meaning[3] or ''])

def metadata_period_bound(node,logs):
    rec=logs[node['metadataCall']];raw=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/raw'/rec['file'];body=raw.read_bytes()
    if hashlib.sha256(body).hexdigest()!=rec['sha256']:raise ValueError('Metadata source hash mismatch')
    meta=json.loads(body)['response'];start=meta.get('startPeriod');end=meta.get('endPeriod')
    if not start or not end:raise ValueError('Missing metadata period range: '+node['route'])
    first=int(str(start)[:4]);last=int(str(end)[:4]);years=last-first+1
    if years<1:raise ValueError('Invalid metadata year range')
    return {'start':start,'end':end,'years':years,'warning':'Metadata end extends beyond current year; estimate only, not observation coverage.' if last>datetime.datetime.now().year else None}

def main():
    freeze=i.read(i.EVIDENCE/'cell-grid-freeze.json')
    gridbytes=(i.EVIDENCE/'cell-grid.json').read_bytes()
    if hashlib.sha256(gridbytes).hexdigest()!=freeze['files']['cell-grid.json']:raise ValueError('Frozen grid changed')
    grid=json.loads(gridbytes);cells={r['id'] for r in grid['cells']};kinds=geography_kinds()
    nodes={n['route']:n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS'}
    summary=i.read(i.EVIDENCE/'series-catalog-summary.json');cross=i.read(i.EVIDENCE/'place-crosswalk.json')['routes'];logs={r['id']:r for r in map(json.loads,(i.EVIDENCE/'calls.jsonl').read_text().splitlines())}
    candidates=[];gaps=[];ranges={};missing_cells=set()
    for route,ref in summary['routes'].items():
        data=i.read(i.EVIDENCE/ref['file']);ranges[route]=metadata_period_bound(nodes[route],logs)
        for fid,rs in data['facets'].items():
            gaps.extend({'route':route,'facet':fid,'code':r['definition']['id'],'reason':r.get('coverageEligibilityReason',r.get('reason'))} for r in rs if r.get('coverageEligible') is False or r.get('ownerException'))
        for candidate in enumerate_candidates(route,data,nodes[route]):
            r=candidate['source']
            for place in place_options(route,cross[route],kinds,candidate['frequency']):
                if r.get('placeKind') and r['placeKind']!=place['kind']:continue
                if r.get('subjectKind') and r['subjectKind']!=place['kind']:continue
                # Native series place, when parsed authoritatively, can avoid empty partner/region requests.
                native=r.get('nativePlace') or r.get('subjectNativePlace')
                if native and place['geographyFacet'] and native not in place['filters'][place['geographyFacet']]:continue
                filters=dict(candidate['filters'])
                collision=False
                for fid,values in place['filters'].items():
                    if fid in filters:
                        values=sorted(set(filters[fid])&set(values))
                        if not values:collision=True;break
                    filters[fid]=values
                if collision:continue
                for meaning in candidate['meanings']:
                    cid=cell_id(place['kind'],meaning)
                    if cid not in cells:missing_cells.add(cid);continue
                    candidates.append({**candidate,'filters':filters,'cellId':cid,'status':meaning[-1],'placeKind':place['kind'],'placeCodes':place['placeCodes'],'nativePlaceCount':place['nativePlaceCount'],'placeFilters':place['filters']})
    if missing_cells:raise ValueError('Derived cells missing from frozen grid: '+str(sorted(missing_cells)))
    wholecells={r['cellId'] for r in candidates if r['status']=='whole product'}
    # Whole candidates always checked. Component evidence is still planned separately
    # because a whole candidate may have no observations for a requested place.
    plans={}
    for c in candidates:
        sf=c.get('seriesFacet');filters=dict(c['placeFilters']);measure_filters={k:v for k,v in c['filters'].items() if k not in c['placeFilters']}
        signature=json.dumps([c['route'],c['frequency'],c['column'],c['cellId'],c['status'],filters],sort_keys=True)
        p=plans.setdefault(signature,{'route':c['route'],'frequency':c['frequency'],'column':c['column'],'cellId':c['cellId'],'candidateStatus':c['status'],'filters':filters,'seriesFacet':sf,'seriesIds':set(),'nativePlaceCount':c['nativePlaceCount'],'placeCodes':c['placeCodes'],'definitionCount':0,'placeFacetKeys':list(c['placeFilters']),'allowedMeasureFilters':set()})
        p['allowedMeasureFilters'].add(json.dumps(measure_filters,sort_keys=True))
        for fid,values in measure_filters.items():p['filters'][fid]=sorted(set(p['filters'].get(fid,[]))|set(values))
        if sf:p['seriesIds'].update(c['filters'][sf])
        p['definitionCount']+=1
    out=[]
    for p in plans.values():
        p['seriesIds']=sorted(p['seriesIds'])
        p['allowedMeasureFilters']=[json.loads(v) for v in sorted(p['allowedMeasureFilters'])]
        if p['seriesFacet']:p['filters'][p['seriesFacet']]=p['seriesIds']
        period_count=ranges[p['route']]['years']*FREQUENCIES[p['frequency']]
        dimensions=(len(p['seriesIds'])*(p['nativePlaceCount'] if p['seriesFacet']=='seriesId' else 1)) if p['seriesFacet'] else p['nativePlaceCount']*math.prod(len(values) for fid,values in p['filters'].items() if fid not in p['placeFacetKeys'])
        p['rectangularRowBound']=dimensions*period_count
        p['rectangularPages']=max(1,math.ceil(p['rectangularRowBound']/5000))
        p['id']=hashlib.sha256(json.dumps([p['route'],p['frequency'],p['column'],p['filters']],sort_keys=True).encode()).hexdigest()[:20]
        out.append(p)
    # Identical requests can satisfy several cell variants; never request twice solely for a label.
    requests={}
    for p in out:
        row=requests.setdefault(p['id'],{**p,'cells':[]});row['cells'].append({'cellId':p['cellId'],'candidateStatus':p['candidateStatus'],'allowedMeasureFilters':p['allowedMeasureFilters']})
    result={'frozenGridSHA256':freeze['files']['cell-grid.json'],'plans':list(requests.values()),'coverageGaps':gaps,'metadataRanges':ranges,'batching':'One request per route/column/frequency/cell candidate class, all mapped places together. Facet unions may return extra cross-combinations: only exact listed allowedMeasureFilters can support each cell. No component sums.', 'warning':'Rectangular bounds are not expected row counts. Invalid facet combinations and staggered histories reduce them; changing API data may increase them. This plan is not verified coverage.'}
    i.write_review(i.EVIDENCE/'b1-request-plan.json',result)
    totalpages=sum(p['rectangularPages'] for p in requests.values());wholepages=sum(p['rectangularPages'] for p in requests.values() if any(c['candidateStatus']=='whole product' for c in p['cells']))
    byroute=collections.Counter()
    for p in requests.values():byroute[p['route']]+=p['rectangularPages']
    report={'generatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'callsUsedBeforeB1':len(logs),'uniqueFirstPageRequests':len(requests),'rectangularPageBound':totalpages,'wholeCandidatePageBound':wholepages,'perRoutePageBounds':dict(byroute),'nativeDefinitionCandidates':len(candidates),'metadataGaps':len(gaps),'metadataPeriodWarnings':{r:v for r,v in ranges.items() if v['warning']},'fullPlan':'b1-request-plan.json','B1Started':False}
    (i.EVIDENCE/'b1-call-estimate.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k not in ['perRoutePageBounds','metadataPeriodWarnings']}))
if __name__=='__main__':main()
