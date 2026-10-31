// Local verification only; never imported into the application bundle.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const root=fileURLToPath(new URL('../../',import.meta.url)),read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const budget=read('evidence/eia-no-dead-ends/request-freeze-v2-revision-1/budget.json'),frozen=read('evidence/eia-no-dead-ends/request-freeze-v2-revision-1/requests.json');
if(!budget.permitted || budget.maximumUSD>1 || !read('evidence/eia-no-dead-ends/live-v2/summary.json').pass)throw new Error('Browser pass gates are not met.');
const hash=b=>createHash('sha256').update(b).digest('hex');
for(const [path,h] of Object.entries(budget.codeSHA256))if(hash(readFileSync(resolve(root,path)))!==h)throw new Error('App changed after scored-run freeze.');
const dir=resolve(root,'evidence/eia-no-dead-ends/browser-v2');if(existsSync(dir))throw new Error('Browser evidence already exists; no duplicate model calls.');mkdirSync(dir,{mode:0o700});
const save=(p,v)=>writeFileSync(resolve(dir,p),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const searches=new Map(),reasks=new Set(),nativeFetch=globalThis.fetch;let calls=0;
globalThis.fetch=async(url,init)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return nativeFetch(url,init);
 const body=JSON.parse(init.body);body.max_output_tokens=16000;
 const request=frozen.requests.find(r=>r.sha256===hash(JSON.stringify(body)) && ['C1','C7'].includes(r.id));
 if(!request || calls>=6)throw new Error('Browser frozen request or call boundary mismatch.');
 const id=request.id;
 if(!request.reask){const n=(searches.get(id)||0)+1;if(n>(id==='C1'?2:1))throw new Error('Browser search limit reached.');searches.set(id,n);}
 const number=searches.get(id),label=`${id}-${number}-${request.reask?'reask':'initial'}`;
 if(!number || request.reask && reasks.has(`${id}-${number}`))throw new Error('Browser re-ask limit reached.');
 if(request.reask)reasks.add(`${id}-${number}`);
 calls++;const started=Date.now();
 try{
  const response=await nativeFetch(url,{...init,body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
  const result=await response.clone().json();save(`${label}.json`,{id,number,reask:request.reask,requestSHA256:request.sha256,body,response:result,status:response.status,elapsedMs:Date.now()-started});return response;
 }catch(error){save(`${label}-error.json`,{id,number,reask:request.reask,error:error.name,elapsedMs:Date.now()-started});throw error;}
};
