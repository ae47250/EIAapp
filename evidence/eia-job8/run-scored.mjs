// One-shot Job 8 scored run. Frozen requests, single model call per scheduled case.
import {readFileSync,writeFileSync,appendFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {isDeepStrictEqual as same} from 'node:util';
import {interpretQuery} from '../../lib/sources/eia/interpret-query.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {fetchEiaData} from '../../lib/sources/eia/eia-fetch.js';
import {findEvaluationChoice} from '../../scripts/eia-lookup/evaluation-choice.js';
import {scoreD,deadEndD} from '../../scripts/eia-lookup/score-d-polish.js';
import {scoreF,scoreEveryOutput} from '../../scripts/eia-lookup/score-polish-output.js';
import {createCoverageBrowser} from '../../scripts/eia-lookup/coverage-browser-polish.js';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';

const root='evidence/eia-job8',freezePath=root+'/run-freeze.json';
const hash=value=>createHash('sha256').update(value).digest('hex');
const read=path=>JSON.parse(path.endsWith('.gz')?gunzipSync(readFileSync(path)):readFileSync(path));
const freeze=read(freezePath),local=homedir()+'/'+freeze.localEvidenceDirectory,publicDir=local+'/records';
if(!freeze.budget||freeze.budget.totalMaximumUSD>.15||freeze.schedule.totalGenerationCalls!==68)throw new Error('Frozen run is not permitted.');
if(existsSync(local)||existsSync(publicDir))throw new Error('Scored evidence directory exists; refusing to repeat the run.');
if(!process.env.EIA_PLAYWRIGHT_PATH||!existsSync(process.env.EIA_PLAYWRIGHT_PATH)||!process.env.EIA_CHROME_PATH||!existsSync(process.env.EIA_CHROME_PATH))throw new Error('Local browser runtime is unavailable.');
const branch=(await import('node:child_process')).execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const commit=(await import('node:child_process')).execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(branch!==freeze.branch||commit!==freeze.codeCommit)throw new Error('Branch or commit differs from the scored-run freeze.');
for(const [path,expected]of Object.entries(freeze.filesSHA256))if(hash(readFileSync(path))!==expected)throw new Error('Frozen source changed: '+path);
const openai=readFileSync(homedir()+'/Downloads/openai-api-key.txt','utf8').trim();
const eia=readFileSync(homedir()+'/Downloads/eia-api-key.txt','utf8').trim();
if(!openai||!eia)throw new Error('An existing local API key is unavailable.');
const Dall=read('evidence/eia-polish/set-d-polish.json.gz').questions;
const revisedD6a=read('evidence/eia-polish/set-d-d6a-revision-2.json.gz').question;
const excludedD=new Set(freeze.schedule.D.excluded);
const D=Dall.filter(q=>!excludedD.has(q.id)).map(q=>q.id==='D6a'?revisedD6a:q);
const F=read('evidence/eia-polish/set-f.json').cases;
const Fpolicy=read('evidence/eia-polish/set-e-policy.json');
const Q1=read(root+'/q1-freeze.json').cases,Q4=read(root+'/q4-freeze.json').cases;
const cases=new Map([...D.map(k=>['D:'+k.id,k]),...F.map(k=>['F:'+k.id,k]),...Q1.map(k=>['Q1:'+k.id,k]),...Q4.map(k=>['Q4:'+k.id,k])]);
const schedule=freeze.requests;
if(schedule.length!==68||new Set(schedule.map(x=>`${x.set}:${x.id}:${x.repeat}`)).size!==68)throw new Error('Frozen schedule is incomplete or duplicated.');
for(const entry of schedule){
 const testCase=cases.get(`${entry.set}:${entry.id}`);
 if(!testCase||entry.query!==testCase.query)throw new Error(`Frozen query mismatch for ${entry.set}:${entry.id}.`);
 const request=lockedFormRequestV2(testCase.query,modelOptions,false);
 if(hash(JSON.stringify(request))!==entry.requestSHA256)throw new Error(`Frozen request mismatch for ${entry.set}:${entry.id}:${entry.repeat}.`);
}
if(process.env.EIA_JOB8_PREFLIGHT==='1'){
 console.log(JSON.stringify({preflight:true,branch,commit,model:freeze.model,reasoning:freeze.reasoning,scheduleEntries:schedule.length,queriesMatch:true,requestHashesMatch:true,maximumUSD:freeze.budget.totalMaximumUSD,ceilingUSD:freeze.budget.ceilingUSD,outputDirectoryAbsent:!existsSync(local),existingKeysAvailable:Boolean(openai&&eia)}));
 process.exit(0);
}
mkdirSync(local,{recursive:true,mode:0o700});mkdirSync(publicDir,{mode:0o700});mkdirSync(local+'/browser',{mode:0o700});
const save=(dir,name,value)=>{const data=JSON.stringify(value,null,2)+'\n';if(data.includes(openai)||data.includes(eia))throw new Error('Credential detected in local evidence; write refused.');writeFileSync(dir+'/'+name,data,{flag:'wx',mode:0o600});};
const append=(name,value)=>{const data=JSON.stringify(value)+'\n';if(data.includes(openai)||data.includes(eia))throw new Error('Credential detected in local evidence; append refused.');appendFileSync(publicDir+'/'+name,data,{mode:0o600});};
const scheduledMaximum=freeze.budget.perCallMaximumUSD;
const modelOptions={model:freeze.model,reasoning:freeze.reasoning,maxOutputTokens:freeze.maximumOutputTokens};
let generationCalls=0,attempts=0,eiaCalls=0,actualGenerationUSD=0,fatalStop=null,activeLabel='',activeSet='',browser;
const modelRecords=[],outcomes=[],sourceCache=new Map(),results=new Map();
save(publicDir,'started.json',{startedAt:new Date().toISOString(),branch,commit,freezeSHA256:hash(readFileSync(freezePath)),runnerSHA256:hash(readFileSync(new URL(import.meta.url))),model:freeze.model,reasoning:freeze.reasoning,scheduledCalls:schedule.length,maximumUSD:freeze.budget.totalMaximumUSD,ceilingUSD:freeze.budget.ceilingUSD});

const nativeFetch=globalThis.fetch;
const eiaOptions={apiKey:eia,paceMs:freeze.dataRetrieval.paceMs,retries:0,timeoutMs:30000,fetch:async(url,init)=>{
 const parsed=new URL(String(url));if(parsed.hostname!=='api.eia.gov')throw new Error('Scored runner blocked a non-EIA request.');
 const safe=new URL(parsed);safe.searchParams.delete('api_key');const n=++eiaCalls;
 let response;try{response=await nativeFetch(url,init);}catch(error){append('eia-calls.jsonl',{n,label:activeLabel,set:activeSet,url:safe.toString(),networkError:error.name});throw error;}
 let payload;try{const body=await response.clone().json();payload=body.response??{upstreamError:true};}catch{payload={invalidJSON:true};}
 const responseSHA256=hash(JSON.stringify(payload));save(local,`eia-${n}.json`,payload);
 append('eia-calls.jsonl',{n,label:activeLabel,set:activeSet,url:safe.toString(),status:response.status,total:payload.total??null,responseSHA256,retrievedAt:new Date().toISOString()});
 return response;
}};
function dependencies(k,entry){
 let callsForCase=0;
 return {apiKey:openai,...modelOptions,timeoutMs:90000,
  rules:()=>{throw new Error('Scored model call failed; no deterministic substitute is allowed.');},
  fetch:async(url,init)=>{
   callsForCase++;attempts++;
   if(callsForCase!==1){fatalStop='Unscheduled validation re-ask blocked before network call.';throw new Error(fatalStop);}
   if(url!=='https://api.openai.com/v1/responses'||generationCalls>=schedule.length){fatalStop='Frozen model request boundary violated.';throw new Error(fatalStop);}
   const body=JSON.parse(init.body),actualHash=hash(JSON.stringify(body));
   if(actualHash!==entry.requestSHA256||body.model!==freeze.model||body.reasoning?.effort!==freeze.reasoning.effort||body.max_output_tokens!==freeze.maximumOutputTokens){fatalStop='Model input, settings, or output allowance differs from the freeze.';throw new Error(fatalStop);}
   const remaining=schedule.length-generationCalls;
   const upper=freeze.budget.countingReserveUSD+actualGenerationUSD+remaining*scheduledMaximum;
   if(upper>freeze.budget.ceilingUSD+1e-12){fatalStop='Budget reserve would exceed the authorized ceiling.';throw new Error(fatalStop);}
   generationCalls++;
   append('model-requests.jsonl',{call:generationCalls,set:entry.set,id:entry.id,repeat:entry.repeat,requestSHA256:actualHash,requestBytes:Buffer.byteLength(JSON.stringify(body)),frozenBeforeCall:new Date().toISOString()});
   return nativeFetch(url,init);
  },
  onAttempt:record=>{
   if(record.attempt!==0){fatalStop='Model attempted an unscheduled validation re-ask.';}
   const usage=record.response?.usage;
   const actual=usage&&Number.isInteger(usage.input_tokens)&&Number.isInteger(usage.output_tokens)
    ?(usage.input_tokens*freeze.budget.pricesPerMillionUSD.inputPerMillionUSD+usage.output_tokens*freeze.budget.pricesPerMillionUSD.outputPerMillionUSD)/1e6
    :scheduledMaximum;
   actualGenerationUSD+=actual;
   if(usage&&(usage.input_tokens>freeze.inputTokenMeasurement.inputBound||usage.output_tokens>freeze.maximumOutputTokens))fatalStop='Observed token usage exceeded the frozen allowance.';
   const row={set:entry.set,id:entry.id,repeat:entry.repeat,attempt:record.attempt,status:record.status,reason:record.reason,checks:record.checks,model:record.response?.model,usage:record.response?.usage,requestSHA256:hash(JSON.stringify(record.body)),responseSHA256:record.response?hash(JSON.stringify(record.response)):null,elapsedMs:record.elapsedMs};
   modelRecords.push(row);save(local,`${entry.set}-${entry.id}-${entry.repeat}-attempt-${record.attempt+1}.json`,record);append('model-attempts.jsonl',row);
  },
  log:event=>append('model-events.jsonl',{set:entry.set,id:entry.id,repeat:entry.repeat,...event})
 };
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
const placeCodes=form=>(form?.geographies||[]).flatMap(g=>g.geography.split('|')[0].trim().split('+'));
const topics=form=>(form?.topics||[]).map(t=>[t.product,t.activity]);
const numericData=result=>(result?.results||[]).flatMap(g=>g.countries||[]).filter(c=>c.series?.complete&&c.series.points?.some(p=>Number.isFinite(p.value)));
const productQuestion=result=>{
 const f=result?.intent?.lockedForm,choices=result?.choices||[],values=(f?.clarification?.options||[]).map(o=>o.value),labels=choices.map(c=>c.label);
 return result?.needsClarification===true&&f?.clarification?.about==='product'&&values.includes('natural gas')&&values.includes('petroleum')&&labels.includes('Natural Gas')&&labels.includes('Gasoline')&&!numericData(result).length;
};
function scoreQ1(result,testCase){
 const f=result?.intent?.lockedForm,e=testCase,errors=[];
 if(!f){return {correct:false,errors:['missing_form']};}
 const codes=placeCodes(f),pairs=topics(f);
 if(e.kind==='typo_product_to_data'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(!same(pairs,e.topics))errors.push('wrong_topics');
  if(f.clarification.needed)errors.push('unexpected_question');
  for(const [product,activity]of e.topics){if(!numericData(result).some(c=>c.geography.code===e.place&&c.product===product&&c.activity===activity))errors.push('missing_data:'+product+':'+activity);}
 }else if(e.kind==='gas_product_question'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(!productQuestion(result))errors.push('missing_natural_gas_gasoline_question');
 }else if(e.kind==='gasoline_or_product_question'){
  const gasoline=numericData(result).some(c=>c.product==='petroleum'&&c.series.qualifier==='gasoline');
  if(!productQuestion(result)&&!gasoline)errors.push('neither_gasoline_nor_approved_product_question');
  if(numericData(result).some(c=>c.product==='natural gas'))errors.push('wrong_natural_gas_result');
 }else if(e.kind==='not_natural_gas'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(f.clarification.needed)errors.push('unsupported_or_ambiguous_answer');
  if(pairs.some(([product])=>product===e.productMustNotBe)||numericData(result).some(c=>c.product===e.productMustNotBe))errors.push('natural_gas_misclassification');
 }else if(e.kind==='preserve_existing_natural_gas'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(!same(pairs,[[e.product,'production']]))errors.push('changed_existing_abbreviation');if(f.clarification.needed)errors.push('unexpected_question');
  if(!numericData(result).some(c=>c.geography.code===e.place&&c.product===e.product&&c.activity==='production'))errors.push('missing_data');
 }else errors.push('unknown_frozen_case_kind');
 return {correct:errors.length===0,errors,places:codes,pairs,clarification:f.clarification,shown:numericData(result).map(c=>({place:c.geography.code,product:c.product,activity:c.activity,qualifier:c.series.qualifier}))};
}
async function scoreQ4(initial,testCase,entry){
 const e=testCase,f=initial?.intent?.lockedForm,errors=[];
 if(!f)return {correct:false,errors:['missing_form'],result:initial,presentation:null};
 if(!e.questionMustQuote.every(word=>f.unsupported_words.includes(word)))errors.push('unsupported_words_missing_or_changed');
 if(f.clarification.needed!==true)errors.push('not_asked');
 if(e.injectedForm.geography){if(!same(placeCodes(f),[e.injectedForm.geography]))errors.push('place_changed');}
 else if(f.geographies.length||f.clarification.about!=='geography')errors.push('unresolved_East_Coast_not_preserved');
 if(!same(topics(f),[[e.injectedForm.product,e.injectedForm.activity]]))errors.push('topic_changed');
 if((f.sector?.value||null)!==(e.injectedForm.sector||null))errors.push('sector_changed');
 if(e.dropButton&&!initial.choices.some(c=>c.label===e.dropButton))errors.push('missing_labeled_drop_button');
 if(e.injectedForm.clarification.about&&f.clarification.about!==e.injectedForm.clarification.about)errors.push('wrong_clarification_field');
 if(e.placeQuestion&&initial.userMessage!==e.placeQuestion)errors.push('wrong_place_question');
 if(!initial.needsClarification||numericData(initial).length)errors.push('initial_result_before_choice');
 if(f.clarification.about==='other'&&initial.choices.some(c=>['product','activity'].includes(c.choice?.about)&&!/^Show .+ instead$/i.test(c.label)))errors.push('drop_button_not_explicit');
 const initialPresentation=await browser.render(initial,`${entry.id}-${entry.repeat}-initial`,{screenshot:true});
 const unsupportedVisible=e.questionMustQuote.every(word=>initialPresentation.text.includes(`We can't look up '${word}' yet`));
 if(!unsupportedVisible)errors.push('unsupported_question_not_visible');
 let result=initial,presentation=initialPresentation;
 if(e.dropToData){
  const button=initial.choices.find(c=>c.label===e.dropButton);
  if(button){try{result=await searchLookup(e.query,sourceIntentPayload(initial.intent),findEvaluationChoice(initial,e.dropButton),eiaOptions);presentation=await browser.render(result,`${entry.id}-${entry.repeat}-dropped`,{screenshot:true});}
   catch(error){errors.push('drop_path_error:'+error.message);}}
  const country=numericData(result).find(c=>c.series),unsupported=e.questionMustQuote[0],notice=country?.unsupportedNotice;
  if(!country)errors.push('drop_path_no_data');
  else {
   if(!/^This shows .+, not '.+'\.$/.test(notice||'')||!notice.endsWith(`not '${unsupported}'.`))errors.push('drop_path_notice_missing_or_wrong');
   if(!country.series.completenessNote?.includes(notice))errors.push('series_note_missing_notice');
   if(!presentation.text.includes(notice))errors.push('screen_notice_missing');
   const excelText=(presentation.workbooks||[]).map(w=>w.text||'').join('\n');if(!excelText.includes(notice))errors.push('excel_notice_missing');
   if(result.needsClarification)errors.push('drop_path_did_not_finish');
  }
 }else if(e.noResult&&(numericData(result).length||result.results.some(g=>(g.countries||[]).some(c=>c.series))))errors.push('unresolved_place_returned_data');
 return {correct:errors.length===0,errors,initialResult:initial,result,presentation,initialPresentation};
}

async function execute(entry){
 const testCase=cases.get(`${entry.set}:${entry.id}`);if(!testCase)throw new Error(`Missing frozen case ${entry.set}:${entry.id}`);
 activeLabel=`${entry.set}-${entry.id}-${entry.repeat}`;activeSet=entry.set;
 let result,score,presentation,observationErrors=[];
 try{
  const intent=await interpretQuery(testCase.query,[],dependencies(testCase,entry));
  result=await searchLookup(testCase.query,sourceIntentPayload(intent),{},eiaOptions);
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
   const q4=await scoreQ4(result,testCase,entry);result=q4.result;presentation=q4.presentation;score={correct:q4.correct,errors:q4.errors,initialResult:q4.initialResult};
  }
 }catch(error){result={...(result||{mode:'lookup',query:testCase.query,intent:{},results:[],choices:[],freeText:false}),executionError:error.message};score={correct:false,errors:['execution:'+error.message]};}
 const everyOutput=presentation?scoreEveryOutput(result,presentation):{correct:false,errors:['missing_browser_evidence']};
 const row={set:entry.set,id:entry.id,repeat:entry.repeat,query:testCase.query,correct:Boolean(score.correct&&everyOutput.correct&&!observationErrors.length&&!result.executionError),score,everyOutput,observationErrors,deadEnd:deadEndD(result),unlabelledWrongData:Boolean(score.unlabelledWrongData),model:freeze.model,returnedModel:modelRecords.find(m=>m.set===entry.set&&m.id===entry.id&&m.repeat===entry.repeat)?.model,
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
const dRows=outcomes.filter(x=>x.set==='D'),front=['D1','D2','D3'].map(id=>dRows.filter(x=>x.id===id));
const checks={complete:!failure&&outcomes.length===68&&generationCalls===68,modelIdentity:modelRecords.length===68&&modelRecords.every(x=>/^gpt-6-luna/.test(x.model||'')),singleCallPerSchedule:noDuplicateAttempts(),setD:counts.D.total===48&&counts.D.correct>=44,frontPage:front.length===3&&front.every(rows=>rows.length===2&&rows.every(x=>x.correct)),setF:counts.F.total===8&&counts.F.correct===8,setQ1:counts.Q1.total===9&&counts.Q1.correct===9,setQ4:counts.Q4.total===3&&counts.Q4.correct===3,zeroDeadEnds:outcomes.every(x=>!x.deadEnd),zeroUnlabelledWrongData:outcomes.every(x=>!x.unlabelledWrongData),withinBudget:freeze.budget.countingReserveUSD+actualGenerationUSD<=freeze.budget.ceilingUSD+1e-12,noFatalStop:!fatalStop};
function noDuplicateAttempts(){return !modelRecords.some(x=>x.attempt!==0)||attempts===generationCalls;}
const summary={completedAt:new Date().toISOString(),failure,counts,checks,pass:Object.values(checks).every(Boolean),generationCalls,attempts,eiaCalls,modelAttempts:modelRecords,actualGenerationUSD,countingReserveUSD:freeze.budget.countingReserveUSD,totalUpperUSD:actualGenerationUSD+freeze.budget.countingReserveUSD,budgetMaximumUSD:freeze.budget.totalMaximumUSD,ceilingUSD:freeze.budget.ceilingUSD,model:freeze.model,reasoning:freeze.reasoning,failedCases:outcomes.filter(x=>!x.correct).map(x=>({set:x.set,id:x.id,repeat:x.repeat})),consoleErrors:browser?.consoleErrors,outcomes};
save(publicDir,'summary.json',summary);console.log(JSON.stringify({...summary,modelAttempts:undefined,outcomes:undefined}));if(!summary.pass)process.exitCode=2;
