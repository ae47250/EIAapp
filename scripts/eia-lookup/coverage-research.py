"""Job 5 research collector. No app behavior; no OpenAI requests. Resume by safe URL."""
from pathlib import Path
import gzip,json,hashlib,urllib.request,urllib.parse,urllib.error,time,datetime,sys
ROOT=Path(__file__).resolve().parents[2]
EVIDENCE=ROOT/'evidence/eia-coverage'
RAW=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/raw'
KEYFILE=Path.home()/'Downloads/eia-api-key.txt'
LOG=EVIDENCE/'calls.jsonl'
def digest(b):return hashlib.sha256(b).hexdigest()
def read(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes())
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    temp=path.with_suffix(path.suffix+'.tmp')
    body=(json.dumps(data,separators=(',',':'))+'\n').encode() if path.suffix=='.gz' else (json.dumps(data,indent=2)+'\n').encode()
    temp.write_bytes(gzip.compress(body,mtime=0) if path.suffix=='.gz' else body);temp.replace(path)
class Collector:
    def __init__(self,max_new_calls=None):
        self.key=KEYFILE.read_text().strip()
        if not self.key:raise RuntimeError('Existing EIA key is empty')
        RAW.mkdir(parents=True,exist_ok=True)
        self.records=[json.loads(line) for line in LOG.read_text().splitlines()] if LOG.exists() else []
        self.cached={r['url']:r for r in self.records if r.get('status')==200 and not r.get('error')}
        self.last=0;self.blocks=sum(r.get('status') in [403,429] for r in self.records)
        self.call_limit=None if max_new_calls is None else len(self.records)+max_new_calls
    def get(self,route='',params=None,kind='metadata',fresh=False):
        if '..' in route or '?' in route or route.startswith('/'):raise ValueError('Unsafe route')
        pairs=list((params or {}).items()) if isinstance(params,dict) else (params or [])
        if any('api_key' in k.lower() for k,v in pairs):raise ValueError('Keys cannot appear in caller parameters')
        url='https://api.eia.gov/v2/'+route.strip('/')+'/'
        if not route:url='https://api.eia.gov/v2/'
        if pairs:url+='?'+urllib.parse.urlencode(pairs,doseq=True)
        if url in self.cached and not fresh:
            rec=self.cached[url];path=RAW/rec['file'];assert digest(path.read_bytes())==rec['sha256'];return json.loads(path.read_text()),rec
        for retry in range(3):
            if self.call_limit is not None and len(self.records)>=self.call_limit:raise RuntimeError('Authorized per-run call limit reached; no retry sent')
            if len(self.records)>=25000:raise RuntimeError('Job 5 25000-call stop reached')
            recent=[r for r in self.records if time.time()-r['timestamp']<3600]
            if len(recent)>=7900:raise RuntimeError('Hourly safety guard reached; resume after oldest calls expire')
            time.sleep(max(0,0.55-(time.monotonic()-self.last)))
            self.last=time.monotonic();stamp=time.time();status=0;error=None
            request_url=url+('&' if '?' in url else '?')+'api_key='+urllib.parse.quote(self.key)
            try:
                with urllib.request.urlopen(request_url,timeout=60) as res:status=res.status;body=res.read()
            except urllib.error.HTTPError as e:status=e.code;body=e.read()
            except Exception as e:body=json.dumps({'collector_error':type(e).__name__}).encode();error=type(e).__name__
            # API wrappers can echo api_key. Never persist a credential, even in local raw evidence.
            clean=body.replace(self.key.encode(),b'[REDACTED]')
            file=digest(url.encode())[:20]+f'-{len(self.records)+1:05d}.json'
            (RAW/file).write_bytes(clean)
            try:data=json.loads(clean)
            except Exception:data={};error=error or 'NonJSONResponse'
            if not isinstance(data,dict):data={};error=error or 'NonObjectJSONResponse'
            if 'error' in data:error=error or 'APIErrorResponse'
            response=data.get('response',{})
            if not isinstance(response,dict):response={};error=error or 'InvalidResponseWrapper'
            record={'id':len(self.records)+1,'timestamp':stamp,'time':datetime.datetime.fromtimestamp(stamp,datetime.timezone.utc).isoformat(),'kind':kind,'url':url,'status':status,'total':response.get('total',response.get('totalFacets')),'file':file,'sha256':digest(clean),'redactedKeyEcho':clean!=body}
            if error:record['error']=error
            with LOG.open('a') as f:f.write(json.dumps(record,separators=(',',':'))+'\n')
            self.records.append(record)
            if status in [403,429]:
                self.blocks+=1
                if self.blocks>=3:raise RuntimeError('EIA blocked key three times; required stop')
                time.sleep(20);continue
            if status!=200 or error or 'error' in data:raise RuntimeError(f'EIA call {record["id"]} failed: HTTP {status}, {error or "API error"}; inspect redacted local response')
            self.cached[url]=record;return data,record
        raise RuntimeError('EIA blocking retry limit')
def census():
    c=Collector();out=EVIDENCE/'route-census.json'
    state=json.loads(out.read_text()) if out.exists() else {'completeTraversal':False,'nodes':[],'excludedFamilies':[],'queue':[''],'notes':'Derived route definitions; full raw responses stored locally. Classification remains pending until metadata review.'}
    while state['queue']:
        route=state['queue'][0]
        data,rec=c.get(route);r=data.get('response',{})
        if not isinstance(r,dict):raise RuntimeError('Unexpected metadata response shape')
        node={'route':route,'name':r.get('name',r.get('id')),'description':r.get('description'),'metadataCall':rec['id'],'hasRoutesArray':isinstance(r.get('routes'),list)}
        if isinstance(r.get('routes'),list):
            node['children']=[str(ch['id']) for ch in r['routes']]
            if route in ['aeo','ieo']:
                state['excludedFamilies'].append({'route':route,'releaseSubtrees':node['children'],'releaseCount':len(node['children']),'classification':'DOES NOT FIT','reason':'forecast (STEO/AEO/IEO)','quote':{'field':'name','value':node['name']},'metadataCall':rec['id']})
            else:state['queue'] += [(route+'/' if route else '')+ch for ch in node['children']]
        else:
            node.update(frequencies=r.get('frequency',[]),facets=r.get('facets',[]),data=r.get('data',{}),classification='pending')
        state['nodes'].append(node);state['queue'].pop(0)
        state['completeTraversal']=not state['queue'];state['metadataCalls']=sum(r['kind']=='metadata' for r in c.records);state['facetCalls']=sum(r['kind']=='facet' for r in c.records)
        write(out,state)
        print(json.dumps({'route':route or '/', 'branch':node['hasRoutesArray'],'visited':len(state['nodes']),'pending':len(state['queue']),'calls':len(c.records)}),flush=True)
    print(json.dumps({'complete':True,'nodes':len(state['nodes']),'leaves':sum(not n['hasRoutesArray'] for n in state['nodes']),'excludedFamilies':len(state['excludedFamilies'])}),flush=True)
if __name__=='__main__':
    if sys.argv[1:]==['census']:census()
    else:raise SystemExit('Use census; other research is driven by reviewed metadata.')
