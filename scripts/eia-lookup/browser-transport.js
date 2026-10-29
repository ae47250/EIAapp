// Local bounded evaluation only; not imported by application code.
import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {root,read,verifyFreeze,sha256} from './freeze.js';
verifyFreeze();const budget=read('evidence/eia-lookup-list/budget.json');if(!budget.permitted||budget.maximumUSD>1)throw new Error('Browser budget unavailable');
const allowed=[...read('tests/fixtures/eia/lookup-list/independent-key.json'),...read('tests/fixtures/eia/locked-form/answer-key.json')].filter(k=>['I4','I6','O1','F1'].includes(k.id));
const directory=new URL('evidence/eia-lookup-list/browser/',root);if(existsSync(directory))throw new Error('Browser evaluation already started; refusing duplicate model calls');mkdirSync(directory);
const counts=new Map(),nativeFetch=globalThis.fetch;
globalThis.fetch=async(url,init)=>{
 if(String(url)!=='https://api.openai.com/v1/responses')return nativeFetch(url,init);
 const body=JSON.parse(init.body),query=JSON.parse(body.input.split('\nRaw query: ')[1]?.split('\n')[0]);
 const k=allowed.find(k=>k.query===query);if(!k||(counts.get(k.id)||0)>=2)throw new Error('Browser frozen-query call limit reached');
 const attempt=counts.get(k.id)||0;counts.set(k.id,attempt+1);
 body.max_output_tokens=budget.allowance;
 const expected=budget.counts.find(c=>c.id===k.id&&c.reask===(attempt>0));
 if(sha256(JSON.stringify(body))!==expected.bodySHA256)throw new Error('Browser model, reasoning, prompt or schema differs from frozen budget');
 const started=Date.now();
 try{
  const response=await nativeFetch(url,{...init,body:JSON.stringify(body),signal:AbortSignal.timeout(budget.timeoutMs)});
  const data=await response.clone().json();writeFileSync(new URL(`${k.id}-${attempt}-raw.json`,directory),JSON.stringify({id:k.id,query,attempt,body,status:response.status,response:data,elapsedMs:Date.now()-started},null,2)+'\n');return response;
 }catch(error){writeFileSync(new URL(`${k.id}-${attempt}-raw.json`,directory),JSON.stringify({id:k.id,query,attempt,body,error:error.name,elapsedMs:Date.now()-started},null,2)+'\n');throw error;}
};
