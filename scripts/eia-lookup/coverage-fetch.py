"""Resumable research fetcher: one global limiter, four I/O workers, one log writer.
Only approved filtered groups; no app imports, model calls, or computed values.
"""
import concurrent.futures,datetime,gzip,hashlib,importlib.util,itertools,json,math,os,sys,threading,time,urllib.request,urllib.error,urllib.parse
from pathlib import Path
HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('inventory',HERE/'coverage-inventory.py');i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
E=i.EVIDENCE;D=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage';RUN=D/'retrieval';PAGE=5000
sha=lambda b:hashlib.sha256(b).hexdigest()
def atomic(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix(path.suffix+'.tmp');temp.write_text(json.dumps(value,separators=(',',':'))+'\n');temp.replace(path)
def read_lines(path):return [json.loads(x) for x in path.read_text().splitlines()] if path.exists() else []
def base_params(group,nodes):
    return {'frequency':group['frequency'],'data':group['columns'],'facets':group['filters'],'sort':[{'column':k,'direction':'asc'} for k in ['period']+[f['id'] for f in nodes[group['route']]['facets']]],'offset':0,'length':PAGE}
def split_filters(params,limit=6000):
    """Disjoint rectangular partitions only for transport header size, not scope."""
    if len(json.dumps(params,separators=(',',':')).encode())<=limit:return [params]
    options=[(len(json.dumps(v)),k) for k,v in params['facets'].items() if len(v)>1]
    if not options:raise ValueError('Request header cannot be partitioned within size limit')
    _,key=max(options);values=params['facets'][key];mid=len(values)//2;out=[]
    for part in [values[:mid],values[mid:]]:
        clone={**params,'facets':{**params['facets'],key:part}};out.extend(split_filters(clone,limit))
    return out
class StopWork(RuntimeError):pass
class Limiter:
    def __init__(self,prior,starts,deadline,clock=time.time,sleep=time.sleep):
        self.clock=clock;self.sleep=sleep;self.deadline=deadline;self.times=sorted(r['timestamp'] for r in prior+starts);self.next_id=max([r['id'] for r in prior+starts]+[0])+1;self.last=max(self.times,default=0);self.lock=threading.Lock();self.stop=threading.Event();self.starts=starts;self.prior_count=len(prior)
    def acquire(self,request_id,start_path=None):
        with self.lock:
            while True:
                now=self.clock()
                if self.stop.is_set() or now>=self.deadline-60:raise StopWork('Time limit or stop; no new request')
                if self.prior_count+len(self.starts)>=25000:raise StopWork('25000 job-call cap')
                recent=[t for t in self.times if now-t<3600]
                delay=max(0,self.last+.55-now)
                if len(recent)>=7900:delay=max(delay,recent[-7900]+3600-now+.01)
                if delay<=0:break
                self.sleep(min(delay,.25))
            stamp=self.clock();record={'id':self.next_id,'timestamp':stamp,'requestId':request_id};self.next_id+=1;self.last=stamp;self.times.append(stamp);self.starts.append(record)
            if start_path:
                with start_path.open('a') as f:f.write(json.dumps(record,separators=(',',':'))+'\n');f.flush()
            return record

def prepare():
    approval=i.read(E/'execution-approval.json');plan=i.read(E/'reduced-request-plan.json');frozen=i.read(E/'cell-grid-freeze.json')
    assert plan['frozenGridSHA256']==sha((E/'cell-grid.json').read_bytes())==frozen['files']['cell-grid.json']
    assert approval['planPointerSHA256']==sha((E/'reduced-request-plan.json').read_bytes())
    nodes={n['route']:n for n in i.read(E/'route-census.json')['nodes'] if n.get('classification')=='FITS'}
    RUN.mkdir(exist_ok=True);(RUN/'raw').mkdir(exist_ok=True);(RUN/'requests').mkdir(exist_ok=True)
    groups=[]
    for group in plan['groups']:
        parts=split_filters(base_params(group,nodes));rows=[]
        for params in parts:
            identity={'route':group['route'],'params':params};partid=sha(json.dumps(identity,sort_keys=True,separators=(',',':')).encode())[:24]
            rows.append({'id':partid,'params':params,'status':'not checked','nextOffset':0,'total':None,'pages':[],'attempts':0})
        groups.append({'id':group['id'],'route':group['route'],'frequency':group['frequency'],'columns':group['columns'],'projectedPages':group['pageProjection'],'parts':rows,'status':'not checked'})
    target=RUN/'state.json'
    if target.exists():
        state=json.loads(target.read_text());assert state['planPointerSHA256']==approval['planPointerSHA256'];return state,approval
    state={'planPointerSHA256':approval['planPointerSHA256'],'startedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'deadlineUTC':approval['deadlineUTC'],'groups':groups,'complete':False,'stopReason':None}
    atomic(target,state);return state,approval

def fetch_one(group,part,offset,limiter,key):
    params={**part['params'],'offset':offset};request={'route':group['route'],'params':params};encoded=json.dumps(request,sort_keys=True,separators=(',',':')).encode();requestid=sha(encoded);request_file=RUN/'requests'/(requestid+'.json')
    if request_file.exists():assert request_file.read_bytes()==encoded
    else:request_file.write_bytes(encoded)
    start=limiter.acquire(requestid,RUN/'starts.jsonl');url='https://api.eia.gov/v2/'+group['route']+'/data/'
    status=0;error=None;body=b'';started=time.monotonic()
    try:
        req=urllib.request.Request(url+'?api_key='+urllib.parse.quote(key),headers={'X-Params':json.dumps(params,separators=(',',':')),'User-Agent':'EIAapp-coverage-research'})
        with urllib.request.urlopen(req,timeout=40) as response:
            status=response.status;chunks=[]
            while True:
                if time.time()>=limiter.deadline:raise StopWork('Deadline during response')
                chunk=response.read(65536)
                if not chunk:break
                chunks.append(chunk)
            body=b''.join(chunks)
    except urllib.error.HTTPError as exc:status=exc.code;body=exc.read()
    except Exception as exc:error=type(exc).__name__;body=json.dumps({'fetchError':error}).encode()
    clean=body.replace(key.encode(),b'[REDACTED]');compressed=gzip.compress(clean,mtime=0);filename=f'{start["id"]:05d}-{requestid[:20]}.json.gz';(RUN/'raw'/filename).write_bytes(compressed)
    try:
        data=json.loads(clean)
        if not isinstance(data,dict):raise ValueError('Not object')
    except Exception:data={};error=error or 'NonJSONResponse'
    if 'error' in data:error=error or 'APIErrorResponse'
    response=data.get('response',{})
    if not isinstance(response,dict):response={};error=error or 'InvalidResponseWrapper'
    rec={**start,'kind':'coverage-page','url':url,'requestFile':'requests/'+requestid+'.json','requestSHA256':requestid,'group':group['id'],'part':part['id'],'offset':offset,'status':status,'total':response.get('total'),'rows':len(response.get('data',[])),'file':'raw/'+filename,'sha256':sha(compressed),'elapsedSeconds':round(time.monotonic()-started,3),'redactedKeyEcho':clean!=body}
    if error:rec['error']=error
    return rec,response

def progress(state,limiter):
    parts=[p for g in state['groups'] for p in g['parts']];calls=len(limiter.starts);complete=sum(g['status']=='complete' for g in state['groups']);known=sum(math.ceil(p['total']/PAGE) if p['total'] else (1 if p['total']==0 else 0) for p in parts)
    info={'updatedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'deadlineUTC':state['deadlineUTC'],'groupsComplete':complete,'groupsTotal':len(state['groups']),'partsComplete':sum(p['status']=='complete' for p in parts),'partsTotal':len(parts),'coverageAttempts':calls,'totalEIAcalls':limiter.prior_count+calls,'pagesSaved':sum(len(p['pages']) for p in parts),'rowsSaved':sum(p.get('rowsSaved',0) for p in parts),'knownProjectedPages':known,'complete':state['complete'],'stopReason':state['stopReason'],'stateLocalFile':str(RUN/'state.json').replace(str(Path.home()),'~',1)}
    atomic(E/'retrieval-progress.json',info);return info

def run(max_new_pages=None):
    state,approval=prepare();deadline=datetime.datetime.fromisoformat(approval['deadlineUTC'].replace('Z','+00:00')).timestamp()
    key=(Path.home()/'Downloads/eia-api-key.txt').read_text().strip();assert key
    prior=read_lines(E/'calls.jsonl');starts=read_lines(RUN/'starts.jsonl');limiter=Limiter(prior,starts,deadline);log=RUN/'calls.jsonl'
    # Successful out-of-order pages survive interruptions in the append-only log.
    terminal=read_lines(log);buffer={};taskmap={p['id']:(g,p) for g in state['groups'] for p in g['parts']}
    for r in terminal:
        g,p=taskmap[r['part']]
        if not replayable(p,r):continue
        body=(RUN/r['file']).read_bytes();assert sha(body)==r['sha256'];response=json.loads(gzip.decompress(body)).get('response',{})
        buffer.setdefault(p['id'],{})[r['offset']]=(r,response)
    for g,p in taskmap.values():
        drain_pages(p,buffer.setdefault(p['id'],{}))
    for g in state['groups']:
        if all(p['status']=='complete' for p in g['parts']):g['status']='complete'
    state['stopReason']=None
    running={};new_pages=0;errors=[]
    def priority(g,p):
        # Preserve all groups; small complete groups give resumable evidence early.
        tier=approval.get('priorityGroups',{}).get(g['id'],2)
        return (tier,g['projectedPages'],g['route'],p['id'])
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
            while True:
                if time.time()>=deadline-60:state['stopReason']='Authorized retrieval cutoff; saved partial coverage';limiter.stop.set()
                if max_new_pages is not None and new_pages>=max_new_pages:state['stopReason']='Bounded transport check complete';limiter.stop.set()
                candidates=sorted([(g,p) for g in state['groups'] for p in g['parts'] if p['status'] not in ['complete','error']],key=lambda pair:priority(*pair))
                for g,p in candidates:
                    if len(running)>=4 or limiter.stop.is_set():break
                    occupied={offset for gg,pp,offset in running.values() if pp['id']==p['id']}|set(buffer.setdefault(p['id'],{}))
                    for offset in available_offsets(p,occupied,4-len(running)):
                        p['status']='running';future=pool.submit(fetch_one,g,p,offset,limiter,key);running[future]=(g,p,offset)
                if not running:break
                done,_=concurrent.futures.wait(running,timeout=1,return_when=concurrent.futures.FIRST_COMPLETED)
                for future in done:
                    g,p,offset=running.pop(future)
                    try:rec,response=future.result()
                    except StopWork as exc:
                        if p['status']!='error':p['status']='not checked'
                        state['stopReason']=str(exc);limiter.stop.set();continue
                    with log.open('a') as f:f.write(json.dumps(rec,separators=(',',':'))+'\n');f.flush()
                    p['attempts']+=1
                    if rec['status'] in [403,429]:
                        state['stopReason']='EIA blocking response; retrieval stopped';limiter.stop.set();p['status']='error';p['errorCall']=rec['id'];continue
                    if rec['status']!=200 or rec.get('error'):
                        p['status']='error';p['errorCall']=rec['id'];errors.append(rec['id']);state['stopReason']='Request failure; preserve and inspect before continuing';limiter.stop.set();continue
                    buffer[p['id']][rec['offset']]=(rec,response)
                    try:accepted=drain_pages(p,buffer[p['id']])
                    except Exception as exc:
                        p['status']='error';p['errorCall']=buffer[p['id']].get(p['nextOffset'],(rec,None))[0]['id'];p['validationError']=str(exc);state['stopReason']='Response validation failure';limiter.stop.set();continue
                    new_pages+=accepted
                    if all(x['status']=='complete' for x in g['parts']):g['status']='complete'
                    atomic(RUN/'state.json',state);info=progress(state,limiter)
                    if new_pages%10==0 or g['status']=='complete':print(json.dumps(info),flush=True)
                    # Update forecast from actual totals; retain unobserved group forecasts.
                    estimate=sum(sum(max(1,math.ceil(x['total']/PAGE)) for x in gg['parts']) if all(x['total'] is not None for x in gg['parts']) else gg['projectedPages'] for gg in state['groups'])+1000
                    if estimate>20000:state['stopReason']='Updated call projection exceeds 20000';limiter.stop.set()
            state['complete']=all(g['status']=='complete' for g in state['groups'])
            if state['complete']:state['stopReason']=None
    finally:
        for g in state['groups']:
            for p in g['parts']:
                if p['status']=='running':p['status']='not checked'
        atomic(RUN/'state.json',state);print(json.dumps(progress(state,limiter)),flush=True)
        if log.exists():(E/'coverage-calls.jsonl.gz').write_bytes(gzip.compress(log.read_bytes(),mtime=0))

def replayable(part,record):
    # A fresh attempt after a source revision must not import older pages.
    return (part['status'] not in ['error','complete'] and record['status']==200
        and not record.get('error') and record['id']>=part.get('minimumReplayCall',0)
        and record['offset']>=part['nextOffset']
        and not any(page['id']==record['id'] for page in part['pages']))

def available_offsets(part,occupied,slots):
    if part['status'] in ['error','complete']:return []
    offsets=[];offset=part['nextOffset'];total=part['total']
    # First page must establish the exact total before pages can run concurrently.
    if total is None:return [offset] if offset not in occupied and slots else []
    while offset<total and len(offsets)<slots:
        if offset not in occupied:offsets.append(offset)
        offset+=PAGE
    return offsets

def drain_pages(part,pending):
    count=0
    while part['nextOffset'] in pending and part['status']!='error':
        record,response=pending[part['nextOffset']]
        accept_page(part,record,response);pending.pop(record['offset']);count+=1
    return count

def accept_page(part,record,response):
    if part.get('status')=='complete':raise ValueError('Part already complete; cannot replay page twice')
    rows=response.get('data');total=int(response['total']);offset=record['offset']
    if not isinstance(rows,list):raise ValueError('Missing data array')
    if part['total'] is not None and part['total']!=total:raise ValueError('Response total changed during pagination')
    if offset!=part['nextOffset']:raise ValueError('Noncontiguous page offset')
    if len(rows)!=min(PAGE,max(0,total-offset)):raise ValueError('Truncated or unexpected page length')
    if total<0:raise ValueError('Negative row count')
    part['total']=total;part['pages'].append({k:record[k] for k in ['id','offset','rows','file','sha256']});part['rowsSaved']=part.get('rowsSaved',0)+len(rows);part['nextOffset']=offset+len(rows);part['status']='complete' if part['nextOffset']>=total else 'not checked'
if __name__=='__main__':
    if sys.argv[1:]==['prepare']:state,_=prepare();print(json.dumps({'groups':len(state['groups']),'parts':sum(len(g['parts']) for g in state['groups'])}))
    elif sys.argv[1:]==['probe']:run(max_new_pages=4)
    elif sys.argv[1:]==['run']:run()
    else:raise SystemExit('Use prepare, probe, or run')
