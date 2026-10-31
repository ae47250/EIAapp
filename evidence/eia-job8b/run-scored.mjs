import {scoreQ1} from './score-q1.mjs';
import {scoreQ4} from './score-q4.mjs';
// One complete scored run. Dialogue steps and model calls have separate inventories.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {isDeepStrictEqual as same} from 'node:util';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {fetchEiaData} from '../../lib/sources/eia/eia-fetch.js';
import {findEvaluationChoice} from '../../scripts/eia-lookup/evaluation-choice.js';
import {scoreD} from './score-d.mjs';
import {deadEndD} from '../../scripts/eia-lookup/score-d-polish.js';
import {scoreF,scoreEveryOutput} from '../../scripts/eia-lookup/score-polish-output.js';
import {createCoverageBrowser} from '../../scripts/eia-lookup/coverage-browser-polish.js';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
import {dialogueKind,executeDialogueStep} from '../eia-job8/dialogue-step-revision-4.mjs';

const root='evidence/eia-job8b',freezePath=root+'/run-freeze.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=path=>JSON.parse(path.endsWith('.gz')?gunzipSync(readFileSync(path)):readFileSync(path));
const freeze=read(freezePath),local=homedir()+'/'+freeze.localEvidenceDirectory,publicDir=local+'/records';
const modelOptions={model:freeze.model,reasoning:freeze.reasoning,maxOutputTokens:freeze.maximumOutputTokens};
const scheduledOutcomes=78,scheduledCalls=68,maxValidationReasks=68,maximumGenerationCalls=136;
if(freeze.budget.totalMaximumUSD>.40||freeze.budget.cumulativeMaximumUSD>.40||freeze.schedule.outcomes!==scheduledOutcomes||freeze.schedule.modelTurns!==scheduledCalls||freeze.schedule.maximumGenerationCalls!==maximumGenerationCalls)throw new Error('Frozen run is not permitted.');
if(existsSync(local))throw new Error('Scored evidence directory exists; refusing to repeat the run.');
for(const key of ['EIA_PLAYWRIGHT_PATH','EIA_CHROME_PATH'])if(!process.env[key]||!existsSync(process.env[key]))throw new Error('Browser runtime unavailable: '+key);
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const branch=git('branch','--show-current'),commit=git('rev-parse','HEAD');
if(branch!==freeze.branch||!freeze.codeCommit||freeze.baseCommit!=='db12e1cef63aefa391fffdcb2803d3f00f6061dd')throw new Error('Wrong code identity or branch.');
git('diff','--exit-code',freeze.codeCommit,'--','app','components','lib','data','scripts','tests','package.json','package-lock.json','next.config.mjs','proxy.js');
for(const [path,expected]of Object.entries(freeze.filesSHA256))if(hash(readFileSync(path))!==expected)throw new Error('Frozen source changed: '+path);
const openai=readFileSync(homedir()+'/Downloads/openai-api-key.txt','utf8').trim();
const eia=readFileSync(homedir()+'/Downloads/eia-api-key.txt','utf8').trim();
if(!openai||!eia)throw new Error('Existing local key unavailable.');
const revisedD8a=read(root+'/set-d-d8a-revision.json').question;
const revisedD6a=read('evidence/eia-polish/set-d-d6a-revision-2.json.gz').question;
const D=read('evidence/eia-polish/set-d-polish.json.gz').questions.filter(x=>x.id!=='D7q').map(x=>x.id==='D6a'?revisedD6a:x.id==='D8a'?revisedD8a:x);
const F=read('evidence/eia-job8b/set-f-revision.json').cases,Fpolicy=read('evidence/eia-polish/set-e-policy.json');
const Q1=read('evidence/eia-job8/q1-freeze-revision-2.json').cases,Q4=read(root+'/q4-freeze.json').cases;
const cases=new Map([...D.map(x=>['D:'+x.id,x]),...F.map(x=>['F:'+x.id,x]),...Q1.map(x=>['Q1:'+x.id,x]),...Q4.map(x=>['Q4:'+x.id,x])]);
const schedule=freeze.steps;
const seen=new Set();
for(const entry of schedule){
 const k=cases.get(`${entry.set}:${entry.id}`),key=`${entry.set}:${entry.id}:${entry.repeat}`;
 if(!k||seen.has(key)||entry.query!==k.query||entry.kind!==dialogueKind(k)||!same(entry.clicks,k.clicks)||entry.typedReply!==k.typedReply||entry.parentId!==k.parentId)throw new Error('Frozen dialogue mismatch: '+key);
 if(entry.parentId&&!seen.has(`${entry.set}:${entry.parentId}:${entry.repeat}`))throw new Error('Parent must precede child: '+key);
 seen.add(key);
 if(entry.kind==='initial')for(const reask of [false,true])if(hash(JSON.stringify(lockedFormRequestV2(k.query,modelOptions,reask)))!==entry[reask?'reaskSHA256':'requestSHA256'])throw new Error('Initial request changed: '+key);
}
if(D.length!==29||F.length!==8||Q1.length!==9||Q4.length!==3||schedule.length!==78||schedule.filter(x=>x.kind==='initial').length!==64||schedule.filter(x=>x.kind==='reply').length!==4||schedule.filter(x=>x.kind==='click').length!==10)throw new Error('Wrong schedule counts.');
const {max_output_tokens,...replyBase}=fieldReplyRequest({},'geography','',modelOptions,true);
if(hash(JSON.stringify(replyBase))!==freeze.inputTokenMeasurement.reply.requestSHA256)throw new Error('Measured reply template changed.');
if(process.env.EIA_JOB8B_PREFLIGHT==='1'){
 console.log(JSON.stringify({preflight:true,branch,codeCommit:freeze.codeCommit,evidenceHead:commit,outcomes:78,initialTurns:64,replyTurns:4,buttonOnlyOutcomes:10,maximumGenerationCalls,maximumUSD:freeze.budget.totalMaximumUSD,cumulativeMaximumUSD:freeze.budget.cumulativeMaximumUSD,ceilingUSD:.40,existingKeysAvailable:true,outputDirectoryAbsent:true}));process.exit(0);
}
mkdirSync(local,{recursive:true,mode:0o700});mkdirSync(publicDir,{mode:0o700});mkdirSync(local+'/browser',{mode:0o700});
const save=(dir,name,value)=>{const data=JSON.stringify(value,null,2)+'\n';if(data.includes(openai)||data.includes(eia))throw new Error('Credential detected; write refused.');writeFileSync(dir+'/'+name,data,{flag:'wx',mode:0o600});};
const append=(name,value)=>{const data=JSON.stringify(value)+'\n';if(data.includes(openai)||data.includes(eia))throw new Error('Credential detected; append refused.');appendFileSync(publicDir+'/'+name,data,{mode:0o600});};
let generationCalls=0,attempts=0,validationReasksUsed=0,blockedModelCalls=0,eiaCalls=0,actualGenerationUSD=0,remainingReservationUSD=freeze.budget.generationMaximumUSD,fatalStop=null,activeLabel='',activeSet='',browser;
const modelRecords=[],outcomes=[],sourceCache=new Map(),results=new Map();
save(publicDir,'started.json',{startedAt:new Date().toISOString(),branch,codeCommit:freeze.codeCommit,evidenceHead:commit,freezeSHA256:hash(readFileSync(freezePath)),runnerSHA256:hash(readFileSync(new URL(import.meta.url))),model:freeze.model,reasoning:freeze.reasoning,scheduledOutcomes,scheduledCalls,maximumGenerationCalls,budget:freeze.budget});
const nativeFetch=globalThis.fetch;
const eiaOptions={apiKey:eia,paceMs:freeze.dataRetrieval.paceMs,retries:0,timeoutMs:30000,fetch:async(url,init)=>{
 const parsed=new URL(String(url));if(parsed.hostname!=='api.eia.gov')throw new Error('Non-EIA retrieval blocked.');
 const safe=new URL(parsed);safe.searchParams.delete('api_key');const n=++eiaCalls;
 let response;try{response=await nativeFetch(url,init);}catch(error){append('eia-calls.jsonl',{n,label:activeLabel,set:activeSet,url:safe.toString(),networkError:error.name});throw error;}
 let payload;try{const body=await response.clone().json();payload=body.response??{upstreamError:true};}catch{payload={invalidJSON:true};}
 const responseSHA256=hash(JSON.stringify(payload));save(local,`eia-${n}.json`,payload);
 append('eia-calls.jsonl',{n,label:activeLabel,set:activeSet,url:safe.toString(),status:response.status,total:payload.total??null,responseSHA256,retrievedAt:new Date().toISOString()});return response;
}};
function dependencies(k,entry,parent){
 let callsForCase=0,sentForAttempt=false;
 const isReply=entry.kind==='reply',callMaximum=freeze.budget.perCallMaximumUSD[isReply?'reply':'initial'];
 return {apiKey:openai,...modelOptions,timeoutMs:90000,rules:()=>{throw new Error('Model outage; no substitute allowed in scored run');},
 fetch:async(url,init)=>{
  callsForCase++;attempts++;sentForAttempt=false;
  const reject=message=>{blockedModelCalls++;fatalStop=message;throw new Error(message);};
  if(entry.kind==='click'||callsForCase>2||url!=='https://api.openai.com/v1/responses'||generationCalls>=maximumGenerationCalls)return reject('Frozen model request boundary violated');
  const reask=callsForCase===2,body=JSON.parse(init.body);let expected;
  if(isReply){
   const form=parent.intent.lockedForm,about=form.clarification.about||parent.intent.replyAbout||'geography';
   if(Buffer.byteLength(JSON.stringify(form))>freeze.inputTokenMeasurement.maximumReplyFormBytes||Buffer.byteLength(k.typedReply)>freeze.inputTokenMeasurement.maximumReplyBytes)return reject('Reply input exceeds its reserved byte allowance');
   expected=fieldReplyRequest(form,about,k.typedReply,modelOptions,reask);
  }else expected=lockedFormRequestV2(k.query,modelOptions,reask);
  const requestSHA256=hash(JSON.stringify(body));
  if(requestSHA256!==hash(JSON.stringify(expected))||(!isReply&&requestSHA256!==entry[reask?'reaskSHA256':'requestSHA256']))return reject('Frozen request or model settings changed');
  if(reask&&validationReasksUsed>=maxValidationReasks)return reject('Per-turn re-ask count exceeded');
  const upper=freeze.budget.priorRunActualUSD+freeze.budget.countingReserveUSD+actualGenerationUSD+remainingReservationUSD;
  if(upper>freeze.budget.ceilingUSD+1e-12)return reject('Budget reserve exceeds ceiling');
  if(reask)validationReasksUsed++;
  remainingReservationUSD-=callMaximum;generationCalls++;sentForAttempt=true;
  append('model-requests.jsonl',{call:generationCalls,set:entry.set,id:entry.id,repeat:entry.repeat,kind:entry.kind,attempt:callsForCase-1,reask,requestSHA256,requestBytes:Buffer.byteLength(JSON.stringify(body)),recordedBeforeCall:new Date().toISOString()});
  return nativeFetch(url,init);
 },onAttempt:record=>{
  const usage=record.response?.usage;
  if(sentForAttempt){
   const actual=usage&&Number.isInteger(usage.input_tokens)&&Number.isInteger(usage.output_tokens)?(usage.input_tokens*.125+usage.output_tokens*.50)/1e6:callMaximum;
   actualGenerationUSD+=actual;
   if(usage&&(usage.input_tokens>freeze.inputTokenMeasurement[isReply?'replyInputBound':'initialInputBound']||usage.output_tokens>freeze.maximumOutputTokens))fatalStop='Observed tokens exceed frozen allowance';
  }
  const row={set:entry.set,id:entry.id,repeat:entry.repeat,kind:entry.kind,attempt:record.attempt,networkSent:sentForAttempt,status:record.status,reason:record.reason,checks:record.checks,model:record.response?.model,usage,requestSHA256:hash(JSON.stringify(record.body)),responseSHA256:record.response?hash(JSON.stringify(record.response)):null,elapsedMs:record.elapsedMs};
  modelRecords.push(row);save(local,`${entry.set}-${entry.id}-${entry.repeat}-attempt-${record.attempt+1}.json`,record);append('model-attempts.jsonl',row);
 },log:event=>append('model-events.jsonl',{set:entry.set,id:entry.id,repeat:entry.repeat,...event})};
}

const eiaSymbols={'--':'Not applicable','NA':'Not available','NA.':'Not available','Not Available':'Not available','W':'Withheld','-':'No data reported'};
function sourceObservations(response,column){
 const byPeriod=new Map();
 for(const row of response.rows){const raw=row[column],numeric=(typeof raw==='number'||typeof raw==='string')&&String(raw).trim()!==''&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(raw).trim())&&Number.isFinite(Number(raw));
  const point={period:row.period,value:numeric?Number(raw):null,...(!numeric&&raw!=null?{symbol:String(raw),meaning:eiaSymbols[String(raw)]||'EIA symbol (meaning not verified)'}:{})};
  if(byPeriod.has(point.period)&&!same(byPeriod.get(point.period),point))throw new Error('Independent EIA source returned conflicting observations.');byPeriod.set(point.period,point);
 }
 return [...byPeriod.values()].sort((a,b)=>a.period.localeCompare(b.period));
}
function expectedSelector(entry,form){
 const selector={route:entry.route,dataColumn:entry.measure,frequency:entry.frequency,facets:entry.facets},years=form.years||{};
 const edge=(year,last)=>entry.frequency==='annual'?String(year):entry.frequency==='monthly'?`${year}-${last?'12':'01'}`:entry.frequency==='quarterly'?`${year}-Q${last?'4':'1'}`:`${year}-${last?'12-31':'01-01'}`;
 if(years.start!=null)selector.start=edge(years.start,false);if(Number.isInteger(years.end))selector.end=edge(years.end,true);return selector;
}
async function independentSource(entry,form){
 const selector=expectedSelector(entry,form),key=JSON.stringify(selector);if(sourceCache.has(key))return sourceCache.get(key);
 activeSet='D independent source';const response=await fetchEiaData(selector,eiaOptions),observations=sourceObservations(response,entry.measure);
 const evidence={selector:{route:entry.route,dataColumn:entry.measure,frequency:entry.frequency,facets:entry.facets},retrievedAt:new Date().toISOString(),complete:response.complete,observations,points:observations.filter(p=>Number.isFinite(p.value))};
 sourceCache.set(key,evidence);save(local,'source-'+hash(key)+'.json',evidence);return evidence;
}


async function execute(entry){
 const testCase=cases.get(`${entry.set}:${entry.id}`);if(!testCase)throw new Error(`Missing frozen case ${entry.set}:${entry.id}`);
 activeLabel=`${entry.set}-${entry.id}-${entry.repeat}`;activeSet=entry.set;
 let result,score,presentation,observationErrors=[];
 try{
  const parent=testCase.parentId?results.get(`${entry.set}:${testCase.parentId}:${entry.repeat}`):undefined;
  result=await executeDialogueStep(testCase,parent,entry.kind==='click'?undefined:dependencies(testCase,entry,parent),eiaOptions,event=>append('dialogue-steps.jsonl',{set:entry.set,id:entry.id,repeat:entry.repeat,...event}));
  if(entry.set==='D'){
   const evidence={};
   for(const item of testCase.entries||[]){if(!item.route||item.outcome==='missing')continue;const key=[item.geographyCode,item.product,item.activity].join('|');
    try{const source=await independentSource(item,testCase.form);evidence[key]=source;const actual=result.results.flatMap(g=>g.countries||[]).find(c=>[c.geography.code,c.product,c.activity].join('|')===key);
     if(!same(actual?.series?.observations,source.observations))observationErrors.push(key+':independent_observations_differ');if(!source.complete)observationErrors.push(key+':independent_source_incomplete');
    }catch(error){observationErrors.push(key+':independent_source_error:'+error.message);}
   }
   presentation=await browser.render(result,activeLabel,{screenshot:['D1','D2','D3','D6a'].includes(entry.id)&&entry.repeat===1});
   score=scoreD(result,testCase,{presentation,liveEvidence:evidence});
  }else if(entry.set==='F'){
   const expected=testCase.expected;
   for(const label of expected.clicks||[]){const button=findEvaluationChoice(result,label);result=await searchLookup(testCase.query,sourceIntentPayload(result.intent),button,eiaOptions);}
   if(expected.buttonPath){const button=findEvaluationChoice(result,expected.buttonPath);result=await searchLookup(testCase.query,sourceIntentPayload(result.intent),button,eiaOptions);result.statePathVerified=true;}
   presentation=await browser.render(result,activeLabel,{screenshot:true});score=scoreF(result,testCase,presentation,Fpolicy);
  }else if(entry.set==='Q1'){
   presentation=await browser.render(result,activeLabel,{screenshot:false});score=scoreQ1(result,testCase);
  }else{
   const q4=await scoreQ4(result,testCase,entry,{browser,eiaOptions});result=q4.result;presentation=q4.presentation;score={correct:q4.correct,errors:q4.errors,initialResult:q4.initialResult};
  }
 }catch(error){result={...(result||{mode:'lookup',query:testCase.query,intent:{},results:[],choices:[],freeText:false}),executionError:error.message};score={correct:false,errors:['execution:'+error.message]};}
 results.set(`${entry.set}:${entry.id}:${entry.repeat}`,result);
 const everyOutput=presentation?scoreEveryOutput(result,presentation):{correct:false,errors:['missing_browser_evidence']};
 const row={set:entry.set,id:entry.id,repeat:entry.repeat,query:testCase.query,correct:Boolean(score.correct&&everyOutput.correct&&!observationErrors.length&&!result.executionError),score,everyOutput,observationErrors,deadEnd:deadEndD(result),unlabelledWrongData:Boolean(score.unlabelledWrongData),model:freeze.model,returnedModel:modelRecords.filter(m=>m.set===entry.set&&m.id===entry.id&&m.repeat===entry.repeat).at(-1)?.model,
  understood:result.understood||result.intent?.understood,question:result.userMessage,unsupportedMessage:result.unsupportedMessage||undefined,choices:result.choices?.map(c=>c.label),shown:(result.results||[]).flatMap(g=>(g.countries||[]).map(c=>({place:c.geography.code,product:c.product,activity:c.activity,status:c.status,statusLabel:c.statusLabel,selector:c.series?.selector,unit:c.series?.unit,points:c.series?.points?.length,unsupportedNotice:c.unsupportedNotice}))),executionError:result.executionError||null};
 outcomes.push(row);save(publicDir,`${entry.set}-${entry.id}-${entry.repeat}-score.json`,row);save(local,`${entry.set}-${entry.id}-${entry.repeat}-result.json`,result);
 console.log(JSON.stringify({set:entry.set,id:entry.id,repeat:entry.repeat,correct:row.correct,errors:score.errors||score.formErrors||score.outcomeErrors||[],presentationErrors:everyOutput.errors,observationErrors}));
 if(fatalStop)throw new Error(fatalStop);
 if(result.results?.some(g=>(g.countries||[]).some(c=>c.errorKind==='busy')))throw new Error('EIA rate limit reached; stopping with no retry.');
}

let failure;
try{
 browser=await createCoverageBrowser(local+'/browser');
 for(const entry of schedule)await execute(entry);
}catch(error){failure=error.message;console.log(JSON.stringify({stopped:failure}));}
finally{await browser?.close();}
const counts=Object.fromEntries(['D','F','Q1','Q4'].map(set=>{const rows=outcomes.filter(x=>x.set===set);return [set,{correct:rows.filter(x=>x.correct).length,total:rows.length}];}));
const dRows=outcomes.filter(x=>x.set==='D'),front=['D1','D2','D3','D21'].map(id=>dRows.filter(x=>x.id===id));
const checks={complete:!failure&&outcomes.length===scheduledOutcomes,modelIdentity:modelRecords.length===generationCalls&&modelRecords.every(x=>x.networkSent&&x.status===200&&/^gpt-6-luna/.test(x.model||'')),boundedCalls:noDuplicateAttempts(),setD:counts.D.total===58&&counts.D.correct>=53,frontPageAndD21:front.length===4&&front.every(rows=>rows.length===2&&rows.every(x=>x.correct)),setF:counts.F.total===8&&counts.F.correct===8,setQ1:counts.Q1.total===9&&counts.Q1.correct===9,setQ4:counts.Q4.total===3&&counts.Q4.correct===3,zeroDeadEnds:outcomes.every(x=>!x.deadEnd),zeroUnlabelledWrongData:outcomes.every(x=>!x.unlabelledWrongData),withinBudget:freeze.budget.priorRunActualUSD+freeze.budget.countingReserveUSD+actualGenerationUSD<=freeze.budget.ceilingUSD+1e-12,noFatalStop:!fatalStop&&blockedModelCalls===0};
function noDuplicateAttempts(){
 const countsByCase=new Map();for(const row of modelRecords){const key=[row.set,row.id,row.repeat].join('|');countsByCase.set(key,(countsByCase.get(key)||0)+1);}
 return validationReasksUsed<=maxValidationReasks&&modelRecords.every(x=>x.attempt===0||x.attempt===1)&&[...countsByCase.values()].every(count=>count<=2)&&attempts===generationCalls&&modelRecords.every(x=>x.kind!=='click')&&generationCalls<=maximumGenerationCalls;
}
const cumulativeActualUSD=freeze.budget.priorRunActualUSD+freeze.budget.countingReserveUSD+actualGenerationUSD;
const summary={codeCommit:freeze.codeCommit,evidenceHead:commit,completedAt:new Date().toISOString(),failure,counts,checks,pass:Object.values(checks).every(Boolean),scheduledOutcomes:schedule.length,scheduledCalls,maximumGenerationCalls,generationCalls,validationReasksUsed,blockedModelCalls,attempts,eiaCalls,modelAttempts:modelRecords,actualGenerationUSD,countingReserveUSD:freeze.budget.countingReserveUSD,cumulativeActualUSD,budgetMaximumUSD:freeze.budget.totalMaximumUSD,cumulativeMaximumUSD:freeze.budget.cumulativeMaximumUSD,ceilingUSD:freeze.budget.ceilingUSD,model:freeze.model,reasoning:freeze.reasoning,failedCases:outcomes.filter(x=>!x.correct).map(x=>({set:x.set,id:x.id,repeat:x.repeat})),consoleErrors:browser?.consoleErrors,outcomes};
save(publicDir,'summary.json',summary);console.log(JSON.stringify({...summary,modelAttempts:undefined,outcomes:undefined}));if(!summary.pass)process.exitCode=2;
