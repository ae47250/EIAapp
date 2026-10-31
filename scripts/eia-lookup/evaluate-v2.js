import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {interpretQuery} from '../../lib/sources/eia/interpret-query.js';
import {checkLockedFormV2} from '../../lib/sources/eia/locked-form-v2.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {fetchEiaData} from '../../lib/sources/eia/eia-fetch.js';
import {scoreC,isDeadEnd} from './score-c.js';
import {scoreData} from './score-data.js';
import {scoreMeaning} from '../eia-locked-form/score.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),dir=resolve(root,'evidence/eia-no-dead-ends/live-v2');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const frozen=read('evidence/eia-no-dead-ends/request-freeze-v2-revision-1/requests.json'),budget=read('evidence/eia-no-dead-ends/request-freeze-v2-revision-1/budget.json');
if(existsSync(dir))throw new Error('The scored run already exists; never repeat it.');
if(!budget.permitted || budget.maximumUSD>1 || budget.model!=='gpt-6-luna' || budget.maxGenerationCalls!==80)throw new Error('Budget does not permit this run.');
if(hash(readFileSync(resolve(root,'evidence/eia-no-dead-ends/request-freeze-v2-revision-1/requests.json')))!==budget.requestFileSHA256)throw new Error('Frozen requests changed.');
for(const [p,h] of Object.entries({...read('evidence/eia-no-dead-ends/freeze-manifest.json').sha256,...budget.codeSHA256}))if(hash(readFileSync(resolve(root,p)))!==h)throw new Error('Frozen file changed: '+p);
const openai=readFileSync(resolve(homedir(),'Downloads/openai-api-key.txt'),'utf8').trim(),eia=readFileSync(resolve(homedir(),'Downloads/eia-api-key.txt'),'utf8').trim();
if(!openai || !eia)throw new Error('An existing key is unavailable.');
mkdirSync(dir,{mode:0o700});const save=(name,data)=>writeFileSync(resolve(dir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
save('started.json',{startedAt:new Date().toISOString(),runnerSHA256:hash(readFileSync(fileURLToPath(import.meta.url))),requestSHA256:budget.requestFileSHA256,maximumUSD:budget.maximumUSD,model:budget.model,reasoning:budget.reasoning});
const cset=read('tests/fixtures/eia/no-dead-ends/set-c.json').questions,independent=read('tests/fixtures/eia/lookup-list/independent-key.json'),oracle=read('evidence/eia-lookup-list/expected-data.json');
const all=[...cset.filter(c=>!['C1a','C1b'].includes(c.id)),...independent];
const opts={apiKey:eia,paceMs:600,retries:0,timeoutMs:30000};
let calls=0;const outcomes=[],attemptsAll=[],eventsAll=[];
async function scoreResult(k,result,repeat,meta={}) {
 let latestEvidence;
 if(k.id==='C3' && result.selectedSeries?.selector){
  const selector=result.selectedSeries.selector,response=await fetchEiaData(selector,opts);
  latestEvidence={retrievedAt:new Date().toISOString(),selector,lastPeriod:response.rows.filter(x=>x.price!==null && String(x.price).trim() && Number.isFinite(Number(x.price))).map(x=>x.period).sort().at(-1),response};save(`C3-${repeat}-latest.json`,latestEvidence);
 }
 const isC=k.id.startsWith('C');
 const meaning=isC?null:scoreMeaning(result.intent?.lockedForm,k);
 const data=isC?scoreC(result,k,{latestEvidence}):scoreData(result,oracle.questions.find(q=>q.id===k.id));
 const row={id:k.id,repeat,query:k.query,correct:isC?data.correct:meaning.correct&&data.correct,meaning,data,deadEnd:isDeadEnd(result),unlabelledWrongData:data.unlabelledWrongData,...meta};
 outcomes.push(row);save(`${k.id}-${repeat}-scored.json`,{...row,result});
 console.log(JSON.stringify({id:k.id,repeat,correct:row.correct,deadEnd:row.deadEnd,unlabelledWrongData:row.unlabelledWrongData,errors:isC?[...data.formErrors,...data.outcomeErrors]:[...meaning.errors,...data.errors]}));
 return row;
}
for(let repeat=1;repeat<=2;repeat++)for(const k of all){
 const attempts=[],events=[];let guardFailed=false;
 const intent=await interpretQuery(k.query,[],{apiKey:openai,model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:16000,timeoutMs:90000,
  rules:()=>{throw new Error('AI outage in scored run; no unscored rule substitution.');},
  fetch:async(url,init)=>{
   const body=JSON.parse(init.body),expected=frozen.requests.find(r=>r.id===k.id && r.reask===(attempts.length>0));
   if(url!=='https://api.openai.com/v1/responses' || hash(JSON.stringify(body))!==expected?.sha256 || calls>=80){guardFailed=true;throw new Error('Frozen request boundary violated.');}
   calls++;return fetch(url,init);
  },onAttempt:record=>{attempts.push(record);attemptsAll.push(record);save(`${k.id}-${repeat}-attempt-${attempts.length}.json`,{id:k.id,repeat,requestSHA256:hash(JSON.stringify(record.body)),...record});},log:event=>{events.push(event);eventsAll.push(event);}});
 if(guardFailed)throw new Error('Frozen request boundary violated; stopped.');
 const result=await searchLookup(k.query,sourceIntentPayload(intent),{},opts);
 const raw=attempts.at(-1),meta={attempts:attempts.length,events,rawChecks:raw?.checks,returnedModel:raw?.response?.model,appFormCheck:checkLockedFormV2(intent.lockedForm,k.query),...(k.id.startsWith('I')?{rawMeaning:scoreMeaning(raw?.form,k,raw?.reason || 'answer')}:{})};
 await scoreResult(k,result,repeat,meta);
 if(k.id==='C1'){
  for(const [id,label] of [['C1a','World total'],['C1b','All countries in a region']]){
   const expected=cset.find(c=>c.id===id),button=result.choices?.find(x=>x.label===label);let clicked;
   if(button){clicked=await searchLookup(k.query,sourceIntentPayload(result.intent),button,opts);if(id==='C1b'){const europe=clicked.choices?.find(x=>x.label==='Europe');clicked=europe?await searchLookup(k.query,sourceIntentPayload(clicked.intent),europe,opts):{...clicked,stepUnavailable:true};}}
   else clicked={...result,stepUnavailable:true};
   await scoreResult(expected,clicked,repeat,{clickOnly:true});
  }
 }
 if(result.results?.some(r=>r.countries.some(c=>c.errorKind==='busy')))throw new Error('EIA rate limits blocked scoring; stop without a repeat.');
}
const C=outcomes.filter(r=>r.id.startsWith('C')),I=outcomes.filter(r=>r.id.startsWith('I'));
const step0=read('evidence/eia-no-dead-ends/step0/summary.json');
const usages=attemptsAll.map(a=>a.response?.usage).filter(Boolean),priorUsage=step0.summaries.flatMap(s=>s.usage.map(usage=>({model:s.model,usage})));
const actualGenerationUpperUSD=usages.reduce((n,u)=>n+((u.input_tokens||0)*.25+(u.output_tokens||0)*.50)/1e6,0)+priorUsage.reduce((n,{model,usage:u})=>n+((u.input_tokens||0)*(model==='gpt-6-luna'?.25:.20)+(u.output_tokens||0)*(model==='gpt-6-luna'?.50:1.25))/1e6,0);
const counts={};for(const event of eventsAll)for(const check of event.checks || []){const key=event.event+':'+check;counts[key]=(counts[key]||0)+1;}
const checks={zeroDeadEnds:outcomes.every(r=>!r.deadEnd),setC:C.length===20&&C.filter(r=>r.correct).length>=18,originals:read('evidence/eia-no-dead-ends/data-live-v2/summary.json').originalsCorrect===24,secondSet:I.length===24&&I.filter(r=>r.correct).length>=21,zeroUnlabelledWrongData:outcomes.every(r=>!r.unlabelledWrongData),modelIdentity:attemptsAll.every(a=>a.body.model==='gpt-6-luna'&&/^gpt-6-luna/.test(a.response?.model || ''))};
const summary={completedAt:new Date().toISOString(),scheduledSearches:40,generationCalls:calls,reasks:calls-40,C:{correct:C.filter(r=>r.correct).length,total:C.length},I:{correct:I.filter(r=>r.correct).length,total:I.length},checks,pass:Object.values(checks).every(Boolean),events:counts,actualGenerationUpperUSD,countingReserveUSD:step0.countCalls*32048*.25/1e6+(budget.totalCountingCalls-step0.countCalls)*32048*.25/1e6,totalSpentUpperIncludingCountReserveUSD:actualGenerationUpperUSD+4*32048*.25/1e6,budgetMaximumUSD:budget.maximumUSD,outcomes};
save('summary.json',summary);console.log(JSON.stringify({...summary,outcomes:undefined}));
if(!summary.pass)process.exitCode=2;
