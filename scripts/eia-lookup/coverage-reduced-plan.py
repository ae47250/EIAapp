"""Proposal only: share native API retrieval across cells without reducing scope.
EIA documents selectable data columns and header parameters. Live sizing call
1463 confirms ten electricity columns in one row with the same total count.
No network calls or application imports.
"""
import collections,datetime,hashlib,importlib.util,json,math,statistics
from pathlib import Path
spec=importlib.util.spec_from_file_location('sizing',Path(__file__).with_name('coverage-sizing.py'));s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);i=s.i
OPS='electricity/electric-power-operational-data'
FACTORS={'annual':1,'quarterly':4,'monthly':12,'weekly':53,'daily':366}

def build(plan,sizing):
    measured={(r['route'],r['frequency'],r['column']):r for r in sizing['results'] if 'column' in r}
    joint=next(r for r in sizing['results'] if r['id']=='joint-measure-columns')
    if set(joint['columns'])!=set(joint['returnedRequestedColumns']):raise ValueError('Combined columns not returned')
    groups={}
    for g in s.group_plan(plan):
        bundle='combined-electricity-columns' if g['route']==OPS else g['column']
        key=(g['route'],g['frequency'],bundle)
        r=groups.setdefault(key,{'route':g['route'],'frequency':g['frequency'],'columns':[],'filters':{},'seriesFacet':g['seriesFacet'],'originalPlanIds':[],'cells':set()})
        r['columns'].append(g['column']);r['originalPlanIds']+=g['originalPlanIds'];r['cells'].update(g['cells'])
        for fid,values in g['filters'].items():r['filters'].setdefault(fid,set()).update(values)
    default_latency=statistics.median(r['elapsedSeconds'] for r in sizing['results'])
    projection=0;seconds=0;byroute=collections.Counter();out=[]
    for _,g in sorted(groups.items()):
        g['columns']=sorted(g['columns']);g['filters']={k:sorted(v) for k,v in sorted(g['filters'].items())};g['cells']=sorted(g['cells']);g['originalPlanIds']=sorted(g['originalPlanIds'])
        f=g['filters'];sf=g['seriesFacet']
        if sf=='seriesId':dimensions=len(f[sf])*len(f['stateId'])
        elif sf:dimensions=len(f[sf])
        else:dimensions=math.prod(len(v) for v in f.values())
        period_count=plan['metadataRanges'][g['route']]['years']*FACTORS[g['frequency']]
        metadata_pages=max(1,math.ceil(dimensions*period_count/5000))
        observations=[measured[(g['route'],g['frequency'],c)] for c in g['columns'] if (g['route'],g['frequency'],c) in measured]
        pages=min(metadata_pages,max(r['unfilteredPages5000'] for r in observations)) if observations else metadata_pages
        latency=max(r['elapsedSeconds'] for r in observations) if observations else default_latency
        g.update(metadataPageProjection=metadata_pages,pageProjection=pages,sizingCalls=[r['call'] for r in observations],oneRowLatencySeconds=latency,
                 acceptance='Only exact native filter combinations in each referenced original plan may support its cells. Match every dimension, unit and frequency; never accept crossed combinations or sum components. Preserve all approved place aliases.')
        if g['route']==OPS:
            assert not set(g['filters'].get('fueltypeid',[]))&{'OB2','OBW'}
            assert '95' not in g['filters'].get('sectorid',[])
            g['combinedColumnsEvidenceCall']=joint['call']
        g['id']=hashlib.sha256(json.dumps([g['route'],g['frequency'],g['columns'],g['filters']],sort_keys=True).encode()).hexdigest()[:20]
        projection+=pages;seconds+=pages*latency;byroute[g['route']]+=pages;out.append(g)
    original_projection=sum(min(p['rectangularPages'],measured[(p['route'],p['frequency'],p['column'])]['unfilteredPages5000']) if (p['route'],p['frequency'],p['column']) in measured else p['rectangularPages'] for p in plan['plans'])
    return {'status':'PROPOSED ONLY — awaiting owner approval; no coverage checks started','frozenGridSHA256':plan['frozenGridSHA256'],'groups':out,
            'originalRecalculatedCalls':original_projection,'sharedFetchGroups':len(out),'retrievalCallProjection':projection,'verificationAndRetryAllowance':1000,'totalPlanningAllowance':projection+1000,
            'perRouteRetrievalProjection':dict(byroute),'sequentialOneRowLatencyProjectionHours':seconds/3600,
            'fourConcurrentOneRowLatencyProjectionHours':seconds/4/3600,'withVerificationAllowanceHours':(seconds+1000*default_latency)/4/3600,
            'measurementLimitation':'Page estimates combine saved metadata ranges with measured broad-route totals. These are estimates, not guaranteed maxima. One-row request timing does not prove 5000-row page timing; full pages and checks may take longer.',
            'scope':'Retain all 2088 frozen cells and every original candidate, including all sector cells. No all-sector prerequisite is imposed on a legitimate sector-only request. No query/geography exceptions or component totals invented.',
            'proposalAmendment':'Change B.0e retrieval granularity: fetch native series/filter groups once for all dependent cells, with all approved places and every supported requested frequency. Electricity returns ten required value columns in one request; keep each measure and unit separate.',
            'transport':'Use native EIA X-Params header for large facet lists, keeping API key only in URL in memory and redacting logs. No new dependencies.',
            'concurrencyProposal':{'inFlightRequests':4,'minimumStartIntervalSeconds':0.55,'maximumStartsPerSecond':1/0.55,'hourlyGuard':7900,'singleCallLogWriter':True},
            'limits':['No API coverage calls until owner approves this reduced plan.','All requests length 5000 and fully page to response.total; sizing rows do not count as coverage.','Every successful raw page stays outside Git with hash and redacted call log.','Unknown OB2/OBW/sector95 never supply results or nonpublication evidence.','Retain uncertain scope notes and metadata gaps; no unchecked cell claimed checked.','Stop if updated estimate exceeds 20000 calls or 6 hours, actual job calls reach 25000, source blocking rule fires, or owner deadline arrives.','Stop at 2026-10-30T06:23:21Z even if coverage/checkpoint unfinished; report exact remaining work.','No app implementation until later checkpoint and separate owner go.'],
            'methodSource':{'url':'https://www.eia.gov/opendata/documentation.php','checked':'2026-10-30','support':'Native selectable data columns, facet filters, pagination and HTTP-header parameters. Request sharing changes transport, not statistical definitions.'}}

def main():
    plan=i.read(i.EVIDENCE/'b1-request-plan.json');sizes=i.read(i.EVIDENCE/'sizing-results.json');assert sizes['actualNewCalls']<=40
    result=build(plan,sizes)
    result['originalPlanPointerSHA256']=hashlib.sha256((i.EVIDENCE/'b1-request-plan.json').read_bytes()).hexdigest()
    i.write_review(i.EVIDENCE/'reduced-request-plan.json',result)
    report={k:v for k,v in result.items() if k!='groups'};report['actualEIAcallsSoFar']=len((i.EVIDENCE/'calls.jsonl').read_text().splitlines());report['sizingCalls']=sizes['actualNewCalls'];report['details']='reduced-request-plan.json'
    (i.EVIDENCE/'reduced-plan-proposal.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:report[k] for k in ['status','originalRecalculatedCalls','sharedFetchGroups','retrievalCallProjection','verificationAndRetryAllowance','totalPlanningAllowance','withVerificationAllowanceHours','actualEIAcallsSoFar']}))
if __name__=='__main__':main()
