import {scoreE} from './score-e-finish.js';
import {findEvaluationChoice} from './evaluation-choice.js';
// One-shot Job 6 evaluation. Historical scorers remain unchanged; the R6-only revision is explicit.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {isDeepStrictEqual as same} from 'node:util';
import {interpretQuery,interpretClarification} from '../../lib/sources/eia/interpret-query.js';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {fetchEiaData} from '../../lib/sources/eia/eia-fetch.js';
import {scoreD,deadEndD} from './score-d-finish.js';
import {scoreC} from './score-c.js';
import {scoreData} from './score-data.js';
import {scoreMeaning} from '../eia-locked-form/score.js';
import {createCoverageBrowser} from './coverage-browser-finish.js';
const read=p=>{const b=readFileSync(p);return JSON.parse(p.endsWith('.gz')?gunzipSync(b):b);};
const sha=b=>createHash('sha256').update(b).digest('hex');
const freeze='evidence/eia-finish/run-freeze',publicDir='evidence/eia-finish/live';
const budget=read(freeze+'/budget.json'),frozen=read(freeze+'/requests.json');
const amendment={codeSHA256:{}};
if(!budget.permitted||budget.maximumUSD>.50||budget.maxGenerationCalls!==212)throw new Error('Budget not permitted');
if(sha(readFileSync(freeze+'/requests.json'))!==budget.requestFileSHA256)throw new Error('Request freeze changed');
for(const [p,h] of Object.entries({...budget.codeSHA256,...amendment.codeSHA256}))if(sha(readFileSync(p))!==h)throw new Error('Frozen file changed: '+p);
const local=homedir()+'/Documents/EIAapp-Evidence/20261030/finish/scored-live';
if(existsSync(publicDir)||existsSync(local))throw new Error('Scored run already exists; never repeat it');
const openai=readFileSync(homedir()+'/Downloads/openai-api-key.txt','utf8').trim(),eia=readFileSync(homedir()+'/Downloads/eia-api-key.txt','utf8').trim();
if(!openai||!eia)throw new Error('Existing keys unavailable');
mkdirSync(publicDir);mkdirSync(local,{recursive:true,mode:0o700});mkdirSync(local+'/browser');
const save=(dir,name,data)=>{const b=JSON.stringify(data,null,2)+'\n';if(b.includes(openai)||b.includes(eia))throw new Error('Credential found in evidence; refused');const compressed=dir===publicDir && name.endsWith('-score.json');writeFileSync(dir+'/'+name+(compressed?'.gz':''),compressed?gzipSync(b):b,{flag:'wx',mode:0o600});return sha(b);};
const append=(name,data)=>appendFileSync(publicDir+'/'+name,JSON.stringify(data)+'\n');
const deadline=Date.parse('2026-10-31T02:19:06Z');
const guardTime=()=>{if(Date.now()>=deadline)throw new Error('Owner time limit reached');};
const D=read('evidence/eia-coverage/followup-20261030/set-d-revision-4.json.gz').questions.filter(c=>c.id!=='D7q'),C=read('evidence/eia-coverage/set-c-revision-2.json.gz').questions,I=read('evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz'),oracle=read('evidence/eia-finish/independent-data-revision.json.gz');
const E=read('evidence/eia-finish/set-e.json').cases, Epolicy=read('evidence/eia-finish/set-e-policy.json');
let generationCalls=0,eiaCalls=0,activeLabel='',activeKind='',modelAttempts=[],allOutcomes=[],browser;
const results=new Map(),sourceCache=new Map();
save(publicDir,'started.json',{startedAt:new Date().toISOString(),budgetMaximumUSD:budget.maximumUSD,requestSHA256:budget.requestFileSHA256,runnerSHA256:sha(readFileSync(new URL(import.meta.url))),amendmentSHA256:null,localEvidence:'~/Documents/EIAapp-Evidence/20261030/finish/scored-live/',deadline:'2026-10-31T02:19:06Z'});
const eiaOptions={apiKey:eia,paceMs:500,retries:0,timeoutMs:30000,fetch:async(url,init)=>{
 guardTime();const n=++eiaCalls,r=await fetch(url,init);const safe=new URL(url);safe.searchParams.delete('api_key');
 let data;try{const raw=await r.clone().json();data=raw.response??{upstreamError:true};}catch{data={invalidJSON:true};}
 const responseSHA256=save(local,`eia-${n}.json`,data);
 append('eia-calls.jsonl',{n,label:activeLabel,kind:activeKind,url:safe.toString(),status:r.status,total:data.total??null,responseSHA256,retrievedAt:new Date().toISOString()});return r;
}};
function dependencies(k,repeat,parent){
 let attempts=0,guardError;
 return {apiKey:openai,...budget.options,timeoutMs:90000,
 rules:()=>{throw new Error('AI outage; no rule substitution in scored run');},
 fetch:async(url,init)=>{
  guardTime();const body=JSON.parse(init.body),reask=attempts++>0;
  let expected;
  if(parent){
   const form=parent.intent.lockedForm,about=form.clarification.about||parent.intent.replyAbout||'geography';
   if(Buffer.byteLength(JSON.stringify(form))>budget.maximumReplyFormBytes||Buffer.byteLength(k.typedReply)>budget.maximumReplyBytes)throw new Error('Reply input exceeds frozen bound');
   expected=sha(JSON.stringify(fieldReplyRequest(form,about,k.typedReply,budget.options,reask)));
  }else expected=frozen.requests.find(r=>r.id===k.id&&r.reask===reask)?.sha256;
  if(url!=='https://api.openai.com/v1/responses'||sha(JSON.stringify(body))!==expected||attempts>2||generationCalls>=budget.maxGenerationCalls)throw new Error('Frozen model request boundary violated');
  generationCalls++;append('model-requests.jsonl',{call:generationCalls,id:k.id,repeat,reask,requestSHA256:expected,frozenBeforeCall:new Date().toISOString()});
  // No automatic retries. One schema/evidence re-ask is handled by the unchanged app.
  return fetch(url,init);
 },onAttempt:record=>{
  const name=`${k.id}-${repeat}-${parent?'reply':'initial'}-attempt-${record.attempt+1}.json`,recordSHA256=save(local,name,record);
  const row={id:k.id,repeat,attempt:record.attempt,status:record.status,reason:record.reason,checks:record.checks,model:record.response?.model,usage:record.response?.usage,elapsedMs:record.elapsedMs,recordSHA256,requestSHA256:sha(JSON.stringify(record.body))};modelAttempts.push(row);append('model-attempts.jsonl',row);
 },log:event=>append('model-events.jsonl',{id:k.id,repeat,...event})};
}
const symbols={'--':'Not applicable','NA':'Not available','NA.':'Not available','Not Available':'Not available','W':'Withheld','-':'No data reported'};
function sourceObservations(response,column){
 const byPeriod=new Map();
 for(const r of response.rows){const raw=r[column],numeric=(typeof raw==='number'||typeof raw==='string')&&String(raw).trim()!==''&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(raw).trim())&&Number.isFinite(Number(raw));
 const p={period:r.period,value:numeric?Number(raw):null,...(!numeric&&raw!=null?{symbol:String(raw),meaning:symbols[String(raw)]||'EIA symbol (meaning not verified)'}:{})};
 if(byPeriod.has(p.period)&&!same(byPeriod.get(p.period),p))throw new Error('Conflicting source observations');byPeriod.set(p.period,p);}
 return [...byPeriod.values()].sort((a,b)=>a.period.localeCompare(b.period));
}
function expectedSelector(e,form){
 const s={route:e.route,dataColumn:e.measure,frequency:e.frequency,facets:e.facets};
 const years=form.years||{};const edge=(year,last)=>e.frequency==='annual'?String(year):e.frequency==='monthly'?`${year}-${last?'12':'01'}`:e.frequency==='quarterly'?`${year}-Q${last?'4':'1'}`:`${year}-${last?'12-31':'01-01'}`;
 if(years.start!=null)s.start=edge(years.start,false);if(Number.isInteger(years.end))s.end=edge(years.end,true);return s;
}
async function independentSource(e,form){
 const selector=expectedSelector(e,form),key=JSON.stringify(selector);if(sourceCache.has(key))return sourceCache.get(key);
 const response=await fetchEiaData(selector,eiaOptions),observations=sourceObservations(response,e.measure);
 const v={selector:{route:e.route,dataColumn:e.measure,frequency:e.frequency,facets:e.facets},retrievedAt:new Date().toISOString(),complete:response.complete,observations,points:observations.filter(p=>Number.isFinite(p.value))};
 sourceCache.set(key,v);save(local,'source-'+sha(key)+'.json',v);return v;
}
async function execute(k,repeat,set){
 activeLabel=`${k.id}-${repeat}`;activeKind='application';let result,parent;
 try{
  if(k.parentId){parent=results.get(`${k.parentId}-${repeat}`);if(!parent)throw new Error('Parent outcome missing');
   if(k.typedReply){const intent=await interpretClarification(k.query,sourceIntentPayload(parent.intent),parent.intent.lockedForm.clarification.about||parent.intent.replyAbout||'geography',k.typedReply,dependencies(k,repeat,parent));result=await searchLookup(k.query,sourceIntentPayload(intent),{},eiaOptions);}
   else {result=parent;for(const label of k.clicks){const button=findEvaluationChoice(result,label);result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);}}
  }else{const intent=await interpretQuery(k.query,[],dependencies(k,repeat));result=await searchLookup(k.query,sourceIntentPayload(intent),{},eiaOptions);}
  if(set==='E'){
   const e=k.expected;save(local,activeLabel+'-initial-result.json',result);
   for(const label of e.clicks||[]){const button=findEvaluationChoice(result,label);result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);}
   if(e.reply){const initial=result,replyCase={...k,typedReply:e.reply};const updated=await interpretClarification(k.query,sourceIntentPayload(initial.intent),initial.intent.lockedForm.clarification.about||initial.intent.replyAbout||'geography',e.reply,dependencies(replyCase,repeat,initial));result=await searchLookup(k.query,sourceIntentPayload(updated),{},eiaOptions);}
   if(e.buttonPath){const button=findEvaluationChoice(result,e.buttonPath);result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);result.statePathVerified=true;}
   if(e.states&&e.reply)result.statePathVerified=true;
  }
 }catch(error){result={...(result||parent||{mode:'lookup',query:k.query,intent:{},results:[],choices:[],freeText:false}),executionError:error.message};}
 results.set(activeLabel,result);const resultSHA256=save(local,activeLabel+'-result.json',result);
 let score,presentation,observationErrors=[],sourceEvidence={};
 if(set==='D'){
  activeKind='independent source';
  for(const e of k.entries||[]){if(!e.route||e.outcome==='missing')continue;const key=[e.geographyCode,e.product,e.activity].join('|');try{const source=await independentSource(e,k.form);sourceEvidence[key]=source;const actual=result.results.flatMap(g=>g.countries||[]).find(c=>[c.geography.code,c.product,c.activity].join('|')===key);if(!same(actual?.series?.observations,source.observations))observationErrors.push(key+':full_source_observations_differ');if(!source.complete)observationErrors.push(key+':source_incomplete');}catch(error){observationErrors.push(key+':independent_source_failed');}}
  presentation=await browser.render(result,activeLabel,{screenshot:repeat===1&&['D1','D2','D3','D4','D4a','D5b','D6a','D13'].includes(k.id),download:repeat===1&&k.id==='D5b'});
  score=scoreD(result,k,{presentation,liveEvidence:sourceEvidence});
 }else if(set==='E'){
  presentation=await browser.render(result,activeLabel,{screenshot:true});score=scoreE(result,k,Epolicy,presentation);
 }else if(set==='C'){
  let latestEvidence;if(k.id==='C3'){const e=k.entries[0],source=await independentSource(e,k.form);latestEvidence={...source,lastPeriod:source.points.at(-1)?.period};}
  score=scoreC(result,k,{latestEvidence});
 }else{
  const meaning=scoreMeaning(result.intent?.lockedForm,k),data=scoreData(result,oracle.questions.find(q=>q.id===k.id));score={correct:meaning.correct&&data.correct,meaning,data,deadEnd:deadEndD(result),unlabelledWrongData:data.unlabelledWrongData};
 }
 const row={id:k.id,repeat,set,query:k.query,correct:score.correct&&observationErrors.length===0&&!result.executionError,score,observationErrors,deadEnd:deadEndD(result),unlabelledWrongData:score.unlabelledWrongData,understood:result.understood||result.intent?.understood,resultSHA256,executionError:result.executionError,
  heads:presentation?.entries.filter(e=>e.headline).map(e=>e.headline),shown:(result.results||[]).flatMap(g=>(g.countries||[]).map(c=>({place:c.geography.code,product:c.product,activity:c.activity,status:c.status,label:c.statusLabel,selector:c.series?.selector,unit:c.series?.unit,basis:c.series?.basisLabel,points:c.series?.points?.length}))),question:result.userMessage,choices:result.choices?.map(c=>c.label),falseAvailable:(result.results||[]).some(g=>(g.countries||[]).some(c=>{const values=(c.series?.points||[]).map(p=>p.value).filter(Number.isFinite);return c.statusLabel==='Available'&&(!values.length||values.every(v=>v===0));}))};
 allOutcomes.push(row);save(publicDir,activeLabel+'-score.json',row);console.log(JSON.stringify({id:k.id,repeat,correct:row.correct,errors:score.formErrors||score.meaning?.errors,outcomeErrors:score.outcomeErrors||score.data?.errors,presentationErrors:score.presentationErrors,observationErrors}));
 if(result.executionError?.includes('time limit')||result.executionError?.includes('boundary'))throw new Error(result.executionError);
 if(result.results?.some(g=>g.countries?.some(c=>c.errorKind==='busy')))throw new Error('EIA rate limit encountered; stop without repeating scored outcomes');
}
let failure;
try{
 browser=await createCoverageBrowser(local+'/browser');
 for(const [set,cases] of [['D',D],['C',C.map(c=>c.id==='C1a'?{...c,parentId:'C1',clicks:['World total']}:c.id==='C1b'?{...c,parentId:'C1',clicks:['All countries in a region','Europe']}:c)],['I',I]])for(let repeat=1;repeat<=2;repeat++)for(const k of cases)await execute(k,repeat,set);
 for(const k of E)for(let repeat=1;repeat<=(k.expected.repetitions||1);repeat++)await execute(k,repeat,'E');
}catch(error){failure=error.message;console.log(JSON.stringify({stopped:failure}));}
finally{await browser?.close();}
const counts=Object.fromEntries(['D','C','I','E'].map(set=>{const rows=allOutcomes.filter(x=>x.set===set);return [set,{correct:rows.filter(x=>x.correct).length,total:rows.length}];}));
const generationUpperUSD=modelAttempts.reduce((n,a)=>n+((a.usage?.input_tokens||0)*.125+(a.usage?.output_tokens||0)*.5)/1e6,0);
const checks={setD:counts.D.total===58&&counts.D.correct/58>=.9,frontPage:allOutcomes.filter(x=>['D1','D2','D3'].includes(x.id)).length===6&&allOutcomes.filter(x=>['D1','D2','D3'].includes(x.id)).every(x=>x.correct),setC:counts.C.total===20&&counts.C.correct>=18,setI:counts.I.total===24&&counts.I.correct>=21,setE:counts.E.total===16&&counts.E.correct===16,zeroDeadEnds:allOutcomes.every(x=>!x.deadEnd),zeroUnlabelledWrongData:allOutcomes.every(x=>!x.unlabelledWrongData),modelIdentity:modelAttempts.length>0&&modelAttempts.every(a=>/^gpt-6-luna/.test(a.model||'')),withinBudget:generationUpperUSD+budget.countingReserveUSD<=.50,complete:!failure&&allOutcomes.length===118};
const summary={completedAt:new Date().toISOString(),failure,counts,checks,pass:Object.values(checks).every(Boolean),generationCalls,eiaCalls,generationUpperUSD,countingReserveUSD:budget.countingReserveUSD,totalUpperUSD:generationUpperUSD+budget.countingReserveUSD,budgetMaximumUSD:budget.maximumUSD,model:'gpt-6-luna',reasoning:'low',consoleErrors:browser?.consoleErrors,failedCases:allOutcomes.filter(x=>!x.correct).map(x=>({id:x.id,repeat:x.repeat}))};
save(publicDir,'summary.json',summary);console.log(JSON.stringify(summary));if(!summary.pass)process.exitCode=2;
