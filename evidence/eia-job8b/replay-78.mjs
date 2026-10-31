// Replay the complete failed Job 8 run. External network is prohibited.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as same} from 'node:util';
import {executeDialogueStep} from '../eia-job8/dialogue-step-revision-4.mjs';
import {scoreQ1} from './score-q1.mjs';
import {scoreQ4} from './score-q4.mjs';
import {scoreD} from './score-d.mjs';
import {deadEndD} from '../../scripts/eia-lookup/score-d-polish.js';
import {scoreF,scoreEveryOutput} from '../../scripts/eia-lookup/score-polish-output.js';
import {createCoverageBrowser} from '../../scripts/eia-lookup/coverage-browser-polish.js';
import {lookupCatalog} from '../../lib/sources/eia/lookup-list.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {findEvaluationChoice} from '../../scripts/eia-lookup/evaluation-choice.js';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p));
const original=homedir()+'/Documents/EIAapp-Evidence/20261031/job8/scored-complete-4';
const local=homedir()+'/Documents/EIAapp-Evidence/20261031/job8b/replay-78-final';
if(existsSync(local))throw new Error('Preserve previous replay; output already exists');
mkdirSync(local,{recursive:true});mkdirSync(local+'/browser');
const save=(name,value)=>writeFileSync(local+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const nativeFetch=globalThis.fetch;globalThis.fetch=(url,init)=>{if(!['127.0.0.1','localhost'].includes(new URL(String(url)).hostname))throw new Error('External network blocked');return nativeFetch(url,init);};
const priorFreeze=read('evidence/eia-job8/run-freeze-revision-4.json'),D=read('evidence/eia-polish/set-d-polish.json.gz').questions;
const d6=read('evidence/eia-polish/set-d-d6a-revision-2.json.gz').question,d8=read('evidence/eia-job8b/set-d-d8a-revision.json').question;
const F=read('evidence/eia-job8b/set-f-revision.json').cases,policy=read('evidence/eia-polish/set-e-policy.json'),Q1=read('evidence/eia-job8/q1-freeze-revision-2.json').cases,Q4=read('evidence/eia-job8b/q4-freeze.json').cases;
const cases=new Map([...D.map(c=>['D:'+c.id,c.id==='D6a'?d6:c.id==='D8a'?d8:c]),...F.map(c=>['F:'+c.id,c]),...Q1.map(c=>['Q1:'+c.id,c]),...Q4.map(c=>['Q4:'+c.id,c])]);
const calls=readFileSync(original+'/records/eia-calls.jsonl','utf8').trim().split('\n').map(JSON.parse);
const canonical=url=>{const u=new URL(url);u.searchParams.delete('api_key');u.searchParams.sort();return u.toString();};
let modelResponses=0,eiaResponses=0,browser;const requestDifferences=[],outcomes=[],results=new Map();
const eiaOptions={apiKey:'offline-placeholder',paceMs:0,retries:0,fetch:async url=>{const c=calls.find(c=>canonical(c.url)===canonical(String(url)));if(!c)throw new Error('Saved EIA request missing: '+canonical(String(url)));eiaResponses++;return Response.json({response:read(original+'/eia-'+c.n+'.json')},{status:c.status});}};
const fixture={fetchData:async selector=>{const row=lookupCatalog.rows.find(r=>r.route===selector.route&&r.dataColumn===selector.dataColumn&&Object.entries(selector.facets).every(([k,v])=>JSON.stringify(r.fixedFacets?.[k])===JSON.stringify(v)));if(!row)throw new Error('No approved fixture row');return {complete:true,total:1,rows:[{...selector.facets,period:'2024',[selector.dataColumn]:12,unitName:row.unit,'series-description':row.eiaName}]};}};
function dependencies(e){let n=0;return {apiKey:'offline-placeholder',model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:2048,log:()=>{},rules:()=>{throw new Error('Unexpected outage fallback');},fetch:async(url,init)=>{const record=read(original+`/${e.set}-${e.id}-${e.repeat}-attempt-${++n}.json`);modelResponses++;if(!same(JSON.parse(init.body),record.body))requestDifferences.push({id:e.id,set:e.set,repeat:e.repeat,attempt:n});return Response.json(record.response,{status:record.status});}};}
function expectedSelector(entry,form){const selector={route:entry.route,dataColumn:entry.measure,frequency:entry.frequency,facets:entry.facets},years=form.years||{};const edge=(year,last)=>entry.frequency==='annual'?String(year):entry.frequency==='monthly'?`${year}-${last?'12':'01'}`:entry.frequency==='quarterly'?`${year}-Q${last?'4':'1'}`:`${year}-${last?'12-31':'01-01'}`;if(years.start!=null)selector.start=edge(years.start,false);if(Number.isInteger(years.end))selector.end=edge(years.end,true);return selector;}
try{
 browser=await createCoverageBrowser(local+'/browser');
 for(const e of priorFreeze.steps){
  const k=cases.get(e.set+':'+e.id),parent=k.parentId?results.get(`${e.set}:${k.parentId}:${e.repeat}`):undefined;
  let result,score,presentation;const before=modelResponses;
  try{
   result=await executeDialogueStep(k,parent,e.kind==='click'?undefined:dependencies(e),eiaOptions);
   if(e.kind==='click'&&before!==modelResponses)throw new Error('Button called model');
   if(e.set==='F'){
    for(const label of k.expected.clicks||[])result=await searchLookup(k.query,sourceIntentPayload(result.intent),findEvaluationChoice(result,label),eiaOptions);
    if(k.expected.buttonPath){result=await searchLookup(k.query,sourceIntentPayload(result.intent),findEvaluationChoice(result,k.expected.buttonPath),eiaOptions);result.statePathVerified=true;}
   }
   if(e.set==='Q4'){const scored=await scoreQ4(result,k,e,{browser,eiaOptions:fixture});result=scored.result;presentation=scored.presentation;score={correct:scored.correct,errors:scored.errors};}
   else{
    presentation=await browser.render(result,`${e.set}-${e.id}-${e.repeat}`,{screenshot:false});
    if(e.set==='D'){
     const evidence={};for(const entry of k.entries||[]){if(!entry.route||entry.outcome==='missing')continue;const selector=expectedSelector(entry,k.form),hash=createHash('sha256').update(JSON.stringify(selector)).digest('hex');evidence[[entry.geographyCode,entry.product,entry.activity].join('|')]=read(original+'/source-'+hash+'.json');}
     score=scoreD(result,k,{presentation,liveEvidence:evidence});
    }else if(e.set==='F')score=scoreF(result,k,presentation,policy);else score=scoreQ1(result,k);
   }
  }catch(error){result={...(result||parent||{mode:'lookup',query:k.query,intent:{},results:[],choices:[]}),executionError:error.message};score={correct:false,errors:[error.message]};}
  results.set(`${e.set}:${e.id}:${e.repeat}`,result);save(`${e.set}-${e.id}-${e.repeat}-result.json`,result);
  const output=presentation?scoreEveryOutput(result,presentation):{correct:false,errors:['missing presentation']};
  const row={set:e.set,id:e.id,repeat:e.repeat,correct:Boolean(score.correct&&output.correct),score,output,deadEnd:deadEndD(result),executionError:result.executionError||null};outcomes.push(row);console.log(JSON.stringify({id:e.id,repeat:e.repeat,correct:row.correct,errors:score.errors||score.formErrors||[]}));
 }
}finally{await browser?.close();}
const summary={kind:'Offline saved-response replay; Q4 alternative data injected from approved metadata',outcomes,modelResponses,eiaResponses,networkCalls:0,requestDifferences,consoleErrors:browser.consoleErrors,allCorrect:outcomes.length===78&&outcomes.every(x=>x.correct),counts:Object.fromEntries(['D','F','Q1','Q4'].map(s=>[s,{correct:outcomes.filter(x=>x.set===s&&x.correct).length,total:outcomes.filter(x=>x.set===s).length}]))};save('summary.json',summary);console.log(JSON.stringify({...summary,outcomes:undefined}));if(!summary.allCorrect)process.exitCode=1;
