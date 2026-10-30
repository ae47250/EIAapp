"""Owner-authorized maximum 40 one-row requests. These are sizing, not coverage.
Original and proposed shared-fetch plans remain separate; no B1 execution here.
"""
import collections,datetime,hashlib,importlib.util,json,math,sys,time
from pathlib import Path
BASE=Path(__file__).parent
def module(name):
 spec=importlib.util.spec_from_file_location(name,BASE/(name+'.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
i=module('coverage-inventory');research=module('coverage-research')
LIMIT=40
DEADLINE=datetime.datetime.fromisoformat('2026-10-30T06:23:21+00:00').timestamp()

def group_plan(plan):
    groups={}
    for p in plan['plans']:
        key=(p['route'],p['frequency'],p['column'])
        group=groups.setdefault(key,{'route':p['route'],'frequency':p['frequency'],'column':p['column'],'originalRequests':0,'originalPageBound':0,'originalPlanIds':[],'filters':{},'seriesFacet':p['seriesFacet'],'cells':set()})
        group['originalRequests']+=1;group['originalPageBound']+=p['rectangularPages'];group['originalPlanIds'].append(p['id'])
        group['cells'].update(c['cellId'] for c in p['cells'])
        for fid,vals in p['filters'].items():group['filters'].setdefault(fid,set()).update(vals)
    for g in groups.values():
        g['filters']={k:sorted(v) for k,v in sorted(g['filters'].items())};g['cells']=sorted(g['cells'])
        g['id']=hashlib.sha256(json.dumps([g['route'],g['frequency'],g['column']],separators=(',',':')).encode()).hexdigest()[:20]
    return sorted(groups.values(),key=lambda g:(-g['originalPageBound'],g['route'],g['frequency'],g['column']))

def sizing_params(group):
    # Broad route totals bound all filtered requests for the same measure/frequency.
    # No geography or component interpretation is inferred from the one returned row.
    return [('frequency',group['frequency']),('data[0]',group['column']),('offset',0),('length',1)]

def prepare():
    plan=i.read(i.EVIDENCE/'b1-request-plan.json');groups=group_plan(plan)
    chosen=groups[:LIMIT]
    doc={'authorization':'Owner approves up to 40 one-row sizing calls, then recalculate. If still over 20000, propose reduced plan and await approval. Cap, deadline, implementation gate unchanged.','limit':LIMIT,'deadlineUTC':'2026-10-30T06:23:21Z','purpose':'Row-count sizing only. No paged coverage, publication or absence claims. Unresolved definitions never supply result data.','queries':[{k:g[k] for k in ['id','route','frequency','column','originalRequests','originalPageBound']} for g in chosen],'selection':'Largest original summed page bounds by route/frequency/measure; deterministic tie-breaks. All existing approved places remain in planned coverage. Broad sizing totals include extra places/components, so bound rather than underestimate filtered queries.'}
    target=i.EVIDENCE/'sizing-plan.json'
    if target.exists() and json.loads(target.read_text())!=doc:raise ValueError('Existing sizing plan differs; no silent replacement')
    target.write_text(json.dumps(doc,indent=2)+'\n')
    return doc

def run():
    doc=prepare();collector=research.Collector();target=i.EVIDENCE/'sizing-results.json'
    state=json.loads(target.read_text()) if target.exists() else {'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'initialCallCount':len(collector.records),'purpose':'Sizing only; observations not paged and not coverage evidence.','results':[]}
    done={x['id'] for x in state['results']}
    for g in doc['queries']:
        if g['id'] in done:continue
        if time.time()>=DEADLINE:raise RuntimeError('Owner four-hour deadline reached; stop')
        # Collector may retry an HTTP block up to three times. Reserve all attempts
        # so the authorization cannot be exceeded even on that error path.
        if len(collector.records)-state['initialCallCount']>LIMIT-3:break
        started=time.monotonic();data,rec=collector.get(g['route']+'/data',sizing_params(g),kind='coverage-sizing')
        response=data.get('response',{});rows=response.get('data',[]);total=int(response['total'])
        if len(rows)>1:raise ValueError('Sizing response exceeded requested one row')
        result={**g,'call':rec['id'],'totalRows':total,'returnedRows':len(rows),'unfilteredPages5000':max(1,math.ceil(total/5000)),'elapsedSeconds':round(time.monotonic()-started,3),'url':rec['url'],'rawSHA256':rec['sha256']}
        state['results'].append(result);state['actualNewCalls']=len(collector.records)-state['initialCallCount'];state['lastUpdatedAt']=datetime.datetime.now(datetime.timezone.utc).isoformat();target.write_text(json.dumps(state,indent=2)+'\n')
        print(json.dumps({k:result[k] for k in ['route','frequency','column','totalRows','call','elapsedSeconds']}),flush=True)
    state['completedQueries']=len(state['results']);state['actualNewCalls']=len(collector.records)-state['initialCallCount'];state['completed']=len(state['results'])==len(doc['queries']);state['limitRespected']=state['actualNewCalls']<=LIMIT;target.write_text(json.dumps(state,indent=2)+'\n')
    assert state['limitRespected'];print(json.dumps({'sizingCompleted':state['completed'],'queries':len(state['results']),'newCalls':state['actualNewCalls']}))

if __name__=='__main__':
    if sys.argv[1:]==['prepare']:print(json.dumps({'planned':len(prepare()['queries'])}))
    elif sys.argv[1:]==['run']:run()
    else:raise SystemExit('Use prepare or run')
