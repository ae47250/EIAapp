import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync,readdirSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {interpretQuery,interpretClarification} from '../../lib/sources/eia/interpret-query.js';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {findEvaluationChoice} from './evaluation-choice.js';
import {scoreCase,scorecard,snapshot} from './score-suite.mjs';
import {createCoverageBrowser} from './coverage-browser-polish.js';
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const prices={'gpt-6-luna':{input:.125,output:.5},'gpt-6.1-terra':{input:1,output:5},'gpt-6.1-sol':{input:2,output:10}};
export const suite=JSON.parse(readFileSync(new URL('../../tests/golden/eia-suite.json',import.meta.url)));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export const modelTurns=k=>(k.parentId?0:1)+k.steps.filter(s=>s.type==='reply').length;
export function runBudget(cases,model,counts,maxOutput=2048){
 const initial=cases.filter(k=>!k.parentId).length,replies=cases.reduce((n,k)=>n+k.steps.filter(s=>s.type==='reply').length,0);
 const calls=2*(initial+replies),attempts=calls*4,p=prices[model];
 const maximumUSD=8*(initial*(counts.initial*p.input+maxOutput*p.output)+replies*(counts.reply*p.input+maxOutput*p.output))/1e6;
 return {initial,replies,calls,attempts,counts,maxOutput,prices:p,maximumUSD,method:'Two allowed model calls per turn; four transport attempts per call; measured prompt bounds and full output allowance.'};
}
export const transportStreak = (previous,failed) => failed?previous+1:0;
export async function retryTransport(send,{wait=sleep,onAttempt=()=>{},maxRetries=3,timeoutMs=90000}={}){
 for(let retry=0;retry<=maxRetries;retry++){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs),started=Date.now();let response,data,error;
  try{response=await send(controller.signal);data=await response.json();}catch(e){error=e.name||'Error';}finally{clearTimeout(timer);}
  const transient=Boolean(error)||response?.status===429||response?.status>=500;
  const record={retry,status:response?.status??null,response:data,error,elapsedMs:Date.now()-started,success:Boolean(response?.ok&&!error),transient};
  await onAttempt(record);
  if(!transient||retry===maxRetries)return {response,data,error,record};
  await wait(1000*2**retry);
 }
}
export async function executeCase(k,parent,dependencies,eiaOptions,trace=()=>{}){
 let result=parent;
 if(!k.parentId){const intent=await interpretQuery(k.query,[],dependencies);result=await searchLookup(k.query,sourceIntentPayload(intent),{},eiaOptions);}
 else if(!parent?.intent?.lockedForm)throw new Error('Required parent outcome unavailable: '+k.parentId);
 const initial=result;
 try{
 for(const step of k.steps){
  if(step.type==='click'){
   const button=findEvaluationChoice(result,step.label);trace({type:'click',label:step.label,button});
   result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);
  }else if(step.type==='reply'){
   const about=result.intent.lockedForm.clarification.about||result.intent.replyAbout||'geography';trace({type:'reply',about,text:step.text});
   const intent=await interpretClarification(k.query,sourceIntentPayload(result.intent),about,step.text,dependencies);
   result=await searchLookup(k.query,sourceIntentPayload(intent),{},eiaOptions);
  }else throw new Error('Unknown recorded step');
 }
 if(k.set==='Q4'&&k.sourceCase.dropButton){
  const button=findEvaluationChoice(result,k.sourceCase.dropButton);trace({type:'click',label:k.sourceCase.dropButton,button});
  result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);
 }
 return {result,initial};
 }catch(error){error.result=result;error.initial=initial;throw error;}
}
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const safeURL=url=>{const u=new URL(url);u.searchParams.delete('api_key');u.searchParams.sort();return u.toString();};
export function historicalFixtures(){
 const roots=['20261031/job8b/scored-complete-1','20261030/polish/scored-resumed','20261030/polish/scored-live'].map(s=>homedir()+'/Documents/EIAapp-Evidence/'+s);
 const records=[];for(const root of roots){if(!existsSync(root))throw new Error('Missing saved response archive '+root);for(const name of readdirSync(root).filter(n=>/attempt-\d+\.json$/.test(n))){const r=read(root+'/'+name);if(r.body&&r.response)records.push({path:root+'/'+name,...r});}}
 return records;
}
export function frozenHashes(){const files=execFileSync('git',['ls-files','--cached','--others','--exclude-standard','--','app','components','lib','data','scripts','tests','package.json','package-lock.json','next.config.mjs','proxy.js'],{encoding:'utf8'}).trim().split('\n').filter(Boolean);return Object.fromEntries(files.sort().map(p=>[p,hash(readFileSync(p))]));}
export function verifyFreeze(freeze){if(JSON.stringify(Object.keys(frozenHashes()))!==JSON.stringify(Object.keys(freeze.files)))throw new Error('Frozen file inventory changed');for(const [p,h]of Object.entries(freeze.files))if(hash(readFileSync(p))!==h)throw new Error('Frozen file changed: '+p);}
export async function main(args=process.argv.slice(2)){
 const opts={};for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||args[i+1]===undefined)throw new Error('Arguments must be --name value');opts[args[i].slice(2)]=args[i+1];}
 const {name,model='gpt-6-luna',effort='low',repair='on',mode='offline',from}=opts;
 if(!name||!prices[model]||!['low','medium','high'].includes(effort)||!['on','off'].includes(repair)||!['offline','live','replay'].includes(mode))throw new Error('Invalid runner arguments');
 process.env.EIA_TEXT_REPAIR=repair;
 const base=homedir()+'/Documents/EIAapp-Evidence/20261031/job9',dir=base+'/'+name;
 if(existsSync(dir))throw new Error('Preserve existing evidence folder: '+dir);
 mkdirSync(dir,{recursive:true,mode:0o700});mkdirSync(dir+'/browser');
 const secrets=[];const serialize=(value,pretty)=>{let text=JSON.stringify(value,null,pretty);for(const secret of secrets)text=text.replaceAll(secret,'[REDACTED]');return text;};
 const save=(name,value)=>writeFileSync(dir+'/'+name,serialize(value,2)+'\n',{flag:'wx',mode:0o600});
 const append=(name,value)=>appendFileSync(dir+'/'+name,serialize(value)+'\n',{mode:0o600});
 const smoke=opts.smoke==='true',cases=smoke?['C-C2','D-D20','E-E4','F-F1','I-I8'].map(id=>suite.cases.find(k=>k.id===id)):suite.cases;
 const options={model,reasoning:{effort},maxOutputTokens:2048};
 const freezePath='evidence/eia-job9/freeze.json';
 if(existsSync(freezePath))verifyFreeze(read(freezePath));
 const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
 const promptHash=hash(readFileSync('lib/sources/eia/locked-form-instructions-v2.txt')+readFileSync('lib/sources/eia/locked-form-reply.js'));
 const started={name,model,effort,repair,mode,from:from||null,smoke,startedAt:new Date().toISOString(),head,promptHash,scheduled:cases.length,suiteHash:hash(readFileSync('tests/golden/eia-suite.json'))};
 save('started.json',started);
 const ledger=base+'/spend.jsonl',prior=existsSync(ledger)?readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse).reduce((n,r)=>n+r.costUSD,0):0;
 let missingFixture=false;
 let key,eiaKey,budget,browser,stopReason=null,consecutiveErrors=0,totalCalls=0,activeId='',diverged=false,networkLive=false,modelTransportError=null;
 const calls=[],rows=[],parents=new Map();
 const deadline=Number(execFileSync('git',['reflog','show','--format=%ct','codex/eia-measure'],{encoding:'utf8'}).trim().split('\n').at(-1))*1000+6*3600000;
 const checkDeadline=()=>{if(Date.now()>=deadline)throw new Error('Six-hour limit reached');};
 const scheduledMax=cases.reduce((n,k)=>n+modelTurns(k)*2,0);
 if(mode!=='offline'){
  const gate=read('evidence/eia-job9/offline-gate.json');if(!gate.pass)throw new Error('Complete offline gate must pass');verifyFreeze(gate);
  if(!smoke&&!existsSync(freezePath))throw new Error('Smoke freeze required before scored runs');
  key=readFileSync(homedir()+'/Downloads/openai-api-key.txt','utf8').trim();eiaKey=readFileSync(homedir()+'/Downloads/eia-api-key.txt','utf8').trim();
  secrets.push(key,eiaKey);
  const access=await fetch('https://api.openai.com/v1/models',{headers:{Authorization:`Bearer ${key}`}});const models=await access.json();
  const modelAccess=Object.keys(prices).map(id=>({id,available:models.data?.some(m=>m.id===id)||false}));save('models.json',{status:access.status,models:modelAccess});
  if(!access.ok||!modelAccess.find(m=>m.id===model).available){save('summary.json',{...started,status:'not run',reason:'model unavailable',costUSD:0});return;}
  checkDeadline();
  // Count the longest exact initial request, including the schema, and the reply
  // template. Reserve one token per possible byte in a dynamic submitted form.
  const longest=cases.reduce((a,k)=>k.query.length>a.length?k.query:a,'');
  const measurements={};
  for(const [kind,body]of [['initial',lockedFormRequestV2(longest,options,true)],['reply',fieldReplyRequest({},'geography','x'.repeat(240),options,true)]]){
   const {max_output_tokens,...countBody}=body;
   const r=await fetch('https://api.openai.com/v1/responses/input_tokens',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(countBody)});const data=await r.json();
   if(!r.ok||!Number.isInteger(data.input_tokens))throw new Error('Input token measurement unavailable');
   measurements[kind]={inputTokens:data.input_tokens,requestHash:hash(JSON.stringify(countBody)),additionalBound:kind==='reply'?12000:240};
  }
  const counts=Object.fromEntries(Object.entries(measurements).map(([k,v])=>[k,v.inputTokens+v.additionalBound]));
  budget=runBudget(cases,model,counts);save('budget.json',{...budget,measurements,priorUSD:prior,remainingUSD:20-prior,capUSD:20});
  if(budget.maximumUSD>20-prior||smoke&&budget.maximumUSD>=.5){save('summary.json',{...started,status:'not run',reason:'whole run exceeds worst-case budget',budget,priorUSD:prior,costUSD:0});return;}
 }
 const replayRecords=from?readFileSync(from+'/model-attempts.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];
 const history=mode==='offline'?historicalFixtures():[];
 let eiaNext=Promise.resolve();const eiaMemory=new Map();
 const historicalEia=[];
 if(mode==='offline')for(const root of [...new Set(history.map(r=>r.path.slice(0,r.path.lastIndexOf('/'))))]){
  const path=root+'/records/eia-calls.jsonl';if(existsSync(path))for(const line of readFileSync(path,'utf8').trim().split('\n').filter(Boolean)){const r=JSON.parse(line);if(r.url&&existsSync(root+'/eia-'+r.n+'.json'))historicalEia.push({...r,path:root+'/eia-'+r.n+'.json'});}
 }
 const eiaOptions={apiKey:mode==='offline'?'offline-placeholder':eiaKey,paceMs:0,retries:0,timeoutMs:300000,fetch:async(url,init)=>{
  const safe=safeURL(String(url));if(new URL(safe).hostname!=='api.eia.gov')throw new Error('Unexpected data host');
  if(eiaMemory.has(safe))return Response.json(eiaMemory.get(safe));
  if(mode==='offline'){
   const r=historicalEia.find(r=>safeURL(r.url)===safe);if(!r){missingFixture=true;throw Object.assign(new Error('No saved EIA response'),{noFixture:true});}
   const payload={response:read(r.path)};eiaMemory.set(safe,payload);append('eia.jsonl',{id:activeId,url:safe,replayed:true,path:r.path});return Response.json(payload,{status:r.status||200});
  }
  // Serialize start times across concurrent lookup rows: <= 4 EIA calls/second.
  const sent=await retryTransport(async signal=>{const previous=eiaNext;eiaNext=previous.then(()=>sleep(260));await previous;checkDeadline();return fetch(url,{...init,signal});},{onAttempt:r=>append('eia.jsonl',{id:activeId,url:safe,...r})});
  if(!sent.response)throw new Error('EIA transport error');
  if(sent.response.ok)eiaMemory.set(safe,sent.data);
  return Response.json(sent.data,{status:sent.response.status});
 }};
 function dependencies(k){let turn=0,callInTurn=0,lastKind=null;
  return {apiKey:mode==='offline'?'offline-placeholder':key,...options,timeoutMs:600000,log:event=>append('validation.jsonl',{id:k.id,...event}),rules:()=>{throw new Error('Model outage');},
   fetch:async(url,init)=>{
    if(url!=='https://api.openai.com/v1/responses')throw new Error('Unexpected model host');
    const body=JSON.parse(init.body),kind=body.text.format.name;
    const reask=body.input.includes('previous field answer failed')||body.input.includes('The previous response failed local form checks');
    if(kind!==lastKind||!reask){turn++;callInTurn=0;lastKind=kind;}
    callInTurn++;totalCalls++;if(callInTurn>2||totalCalls>scheduledMax)throw new Error('Model call bound exceeded');
    const ordinal=callInTurn,requestHash=hash(init.body);
    append('requests.jsonl',{id:k.id,turn,ordinal,requestHash,body});
    let saved;
    if(mode==='replay'&&!networkLive)saved=replayRecords.find(r=>r.id===k.id&&r.turn===turn&&r.ordinal===ordinal&&r.success&&r.requestHash===requestHash);
    if(mode==='offline'){
     saved=history.find(r=>JSON.stringify(r.body)===init.body);
     if(!saved){const queryMarker='Raw query: '+JSON.stringify(k.query);saved=history.find(r=>r.body.text?.format?.name===kind&&r.body.input.includes(kind==='eia_search_v2'?queryMarker:'Typed reply: '+JSON.stringify(k.steps.find(s=>s.type==='reply')?.text))&&r.attempt===ordinal-1);}
    }
    if(saved){
     const record={id:k.id,turn,ordinal,requestHash,body,response:saved.response,status:saved.status||200,success:true,replayed:true,stale:JSON.stringify(saved.body)!==init.body,sourceCostUSD:saved.response?.usage?(saved.response.usage.input_tokens*prices[model].input+saved.response.usage.output_tokens*prices[model].output)/1e6:null,sourceElapsedMs:saved.elapsedMs??null,costUSD:0,retry:0,elapsedMs:null};calls.push(record);append('model-attempts.jsonl',record);return Response.json(saved.response,{status:saved.status||200});
    }
    if(mode==='offline'){missingFixture=true;throw Object.assign(new Error('No saved model response'),{noFixture:true});}
    if(mode==='replay'){diverged=true;networkLive=true;}
    checkDeadline();
    const bound=kind==='eia_search_v2'?budget.counts.initial:budget.counts.reply;
    // Runtime byte guards keep dynamic prompts within the pre-run reservation.
    if(kind==='eia_reply_update'&&Buffer.byteLength(body.input)>budget.counts.reply*4)throw new Error('Reply exceeded reserved prompt bound');
    const result=await retryTransport(signal=>fetch(url,{...init,signal}),{onAttempt:r=>{
     const usage=r.response?.usage,p=prices[model],costUSD=usage?(usage.input_tokens*p.input+usage.output_tokens*p.output)/1e6:(r.transient?(bound*p.input+2048*p.output)/1e6:0);
     const record={id:k.id,turn,ordinal,requestHash,body,...r,replayed:false,costUSD,costBasis:usage?'measured usage':r.transient?'conservative unknown-usage reserve':'no usage',model:r.response?.model};
     calls.push(record);append('model-attempts.jsonl',record);appendFileSync(ledger,JSON.stringify({name,id:k.id,costUSD,basis:record.costBasis})+'\n',{mode:0o600});
    }});
    if(result.record.transient){consecutiveErrors=transportStreak(consecutiveErrors,true);modelTransportError='Model transport failed after three retries';if(consecutiveErrors>=5)stopReason='Five consecutive model calls exhausted transport retries';}
    else consecutiveErrors=transportStreak(consecutiveErrors,false);
    if(!result.response)throw new Error('Model transport error');
    return Response.json(result.data,{status:result.response.status});
   }};
 }
 try{
  if(opts.browser!=='false'){
   process.env.EIA_PLAYWRIGHT_PATH||=homedir()+'/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
   process.env.EIA_CHROME_PATH||='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
   browser=await createCoverageBrowser(dir+'/browser');
  }
  for(const k of cases){
   activeId=k.id;missingFixture=false;diverged=false;networkLive=mode==='live';modelTransportError=null;checkDeadline();
   let result,initial,error,noFixture=false;
   const beforeCalls=calls.length;
   try{({result,initial}=await executeCase(k,parents.get(k.parentId),dependencies(k),eiaOptions,e=>append('steps.jsonl',{id:k.id,...e})));}
   catch(e){error=e.message;noFixture=mode==='offline'&&(/No saved|Required parent/.test(error));initial=e.initial;result=e.result||parents.get(k.parentId)||{query:k.query,intent:{},results:[],choices:[]};}
   noFixture ||= missingFixture;
   if(error&&!noFixture&&!/Required button|Required parent|reply context|clarification field|Model outage|transport/i.test(error))stopReason='Harness/application defect: '+error;
   if(mode==='offline'&&calls.slice(beforeCalls).some(c=>c.stale))append('stale.jsonl',{id:k.id,reason:'Saved response does not test the new prompt/context reading.'});
   if(modelTransportError)error=modelTransportError;
   parents.set(k.id,result);
   save(k.id+'-result.json',{result,initial,error});
   let ui;if(browser&&result?.intent?.lockedForm)ui=await browser.render({...result,query:k.query},k.id,{screenshot:smoke});
   const score=scoreCase(k,result,{initial,ui,executionError:error,noFixture});
   const row={id:k.id,set:k.set,excludedFromJointAccuracy:k.excludedFromJointAccuracy,diverged,score};rows.push(row);append('scores.jsonl',row);
   console.log(JSON.stringify({id:k.id,status:score.status,correct:score.correct,kind:score.kind,diverged}));
   if(stopReason)break;
  }
  if(smoke&&!stopReason){
   const replayParents=new Map();
   for(const k of cases){
    const saved=calls.filter(c=>c.id===k.id&&c.success);let cursor=0;
    const deps={apiKey:'smoke-replay',...options,log:()=>{},rules:()=>{throw new Error('Smoke replay outage');},fetch:async(_url,init)=>{const record=saved[cursor++];if(!record||record.requestHash!==hash(init.body))throw new Error('Smoke replay prompt mismatch');return Response.json(record.response,{status:record.status});}};
    let replayed,initial,error;try{({result:replayed,initial}=await executeCase(k,replayParents.get(k.parentId),deps,eiaOptions));}catch(e){replayed=e.result;initial=e.initial;error=e.message;}
    if(cursor!==saved.length||!replayed||JSON.stringify(snapshot(replayed))!==JSON.stringify(rows.find(r=>r.id===k.id).score.actual))throw new Error('Smoke replay outcome mismatch '+k.id);
    replayParents.set(k.id,replayed);save(k.id+'-smoke-replay.json',{matched:true,modelCalls:cursor,error});
   }
  }
 }catch(e){stopReason=e.message;}finally{await browser?.close();}
 const summary={...started,completedAt:new Date().toISOString(),status:stopReason?'not run':'complete',stopReason,scheduled:cases.length,executed:rows.length,budget,priorUSD:prior,...scorecard(rows,calls),consoleErrors:browser?.consoleErrors||[],rows};
 summary.harnessPass=!stopReason&&rows.length===cases.length&&!summary.consoleErrors.length;
 save('summary.json',summary);
 writeFileSync('evidence/eia-job9/'+name+'-scorecard.json',JSON.stringify({...summary,rows:summary.rows.map(r=>({...r,score:{...r.score,actual:undefined}}))},null,2)+'\n');
 if(smoke&&summary.harnessPass){const freeze={createdAt:new Date().toISOString(),smoke:name,promptHash,files:frozenHashes()};writeFileSync(freezePath,JSON.stringify(freeze,null,2)+'\n',{flag:'wx'});}
 console.log(JSON.stringify({...summary,rows:undefined,naturalGasoline:undefined}));
 if(!summary.harnessPass)process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
