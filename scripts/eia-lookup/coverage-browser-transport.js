// Local browser verification only. Exact replay through the real API handlers.
// Never imported by app code; denies unmatched upstream requests, makes no paid calls.
import {readFileSync,appendFileSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {createHash} from 'node:crypto';
const local=homedir()+'/Documents/EIAapp-Evidence/20261029/coverage/implementation-window/scored-live';
const sha=s=>createHash('sha256').update(s).digest('hex');
const key=b=>{const {max_output_tokens,...rest}=b;return sha(JSON.stringify(rest));};
const models=new Map();
for(const name of readdirSync(local).filter(n=>/-1-attempt-\d+\.json$/.test(n))){const a=JSON.parse(readFileSync(local+'/'+name));if(a.response)models.set(key(a.body),a);}
function canonical(raw){const u=new URL(raw);u.searchParams.delete('api_key');const pairs=[...u.searchParams].sort((a,b)=>(a[0]+'='+a[1]).localeCompare(b[0]+'='+b[1]));return u.origin+u.pathname+'?'+new URLSearchParams(pairs);}
const eia=new Map();for(const line of readFileSync('evidence/eia-coverage/live/eia-calls.jsonl','utf8').trim().split('\n')){const row=JSON.parse(line);if(!eia.has(canonical(row.url)))eia.set(canonical(row.url),row);}
const nativeFetch=globalThis.fetch;
const log=r=>appendFileSync(local+'/browser-route-replay.jsonl',JSON.stringify({...r,time:new Date().toISOString()})+'\n');
globalThis.fetch=async(url,init)=>{
 const u=new URL(String(url));
 if(u.origin==='https://api.openai.com'){
  const record=models.get(key(JSON.parse(init.body)));if(!record){log({kind:'model',matched:false});throw new Error('Unrecorded model request: replay denied');}log({kind:'model',matched:true,requestSHA256:key(record.body)});return Response.json(record.response,{status:record.status});
 }
 if(u.origin==='https://api.eia.gov'){
  const record=eia.get(canonical(url));if(!record){log({kind:'eia',matched:false,url:canonical(url)});throw new Error('Unrecorded EIA request: replay denied');}log({kind:'eia',matched:true,sourceCall:record.n,responseSHA256:record.responseSHA256});return Response.json({response:JSON.parse(readFileSync(local+'/eia-'+record.n+'.json'))},{status:record.status});
 }
 if(['127.0.0.1','localhost'].includes(u.hostname))return nativeFetch(url,init);
 log({kind:'other',matched:false});throw new Error('External request denied during replay');
};
