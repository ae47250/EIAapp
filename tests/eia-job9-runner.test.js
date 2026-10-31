import test from 'node:test';
import assert from 'node:assert/strict';
import {retryTransport,runBudget,executeCase,suite} from '../scripts/eia-lookup/run-suite.mjs';
import {exactSet,scoreCase,scorecard} from '../scripts/eia-lookup/score-suite.mjs';
import {findEvaluationChoice} from '../scripts/eia-lookup/evaluation-choice.js';
import {interpretLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
test('Job9 suite schedule contains every source case exactly once',()=>{assert.equal(suite.cases.length,86);assert.equal(new Set(suite.cases.map(k=>k.id)).size,86);assert.equal(suite.cases.filter(k=>k.excludedFromJointAccuracy).length,1);assert.equal(suite.cases.find(k=>k.id==='Q1-Q1-natural-gasoline').excludedFromJointAccuracy,true);});
test('Job9 buttons match as exact sets ignoring case and order',()=>{assert.equal(exactSet(['Coal','Gas'],['gas','COAL']),true);assert.equal(exactSet(['Coal'],['Coal','Gas']),false);assert.equal(findEvaluationChoice({choices:[{label:'Coal',choice:{value:'coal'}}]},'COAL').choice.value,'coal');});
test('Job9 absent fixture is not scored as a failure',()=>{const score=scoreCase(suite.cases[0],null,{noFixture:true});assert.equal(score.status,'no fixture');assert.equal(score.correct,null);assert.equal(scorecard([{set:'C',score}]).total,0);});
test('Job9 transport retries exactly three times with backoff',async()=>{let n=0;const waits=[],records=[];const r=await retryTransport(async()=>Response.json({},{status:++n<4?429:200}),{wait:async ms=>waits.push(ms),onAttempt:r=>records.push(r)});assert.equal(n,4);assert.deepEqual(waits,[1000,2000,4000]);assert.equal(r.record.success,true);assert.equal(records.length,4);assert.equal(r.record.retry,3);});
test('Job9 exhausted transport returns a failure; nontransport errors are not retried',async()=>{let n=0;const r=await retryTransport(async()=>{n++;throw new Error('network');},{wait:async()=>{}});assert.equal(n,4);assert.equal(r.record.success,false);n=0;await retryTransport(async()=>{n++;return Response.json({},{status:400});},{wait:async()=>{}});assert.equal(n,1);});
test('Job9 budget includes both validation calls and four attempts',()=>{const b=runBudget([{parentId:null,steps:[{type:'reply'}]}],'gpt-6-luna',{initial:100,reply:200},2048);assert.equal(b.calls,4);assert.equal(b.attempts,16);assert.equal(b.maximumUSD,8*((100*.125+2048*.5)+(200*.125+2048*.5))/1e6);});
test('Job9 application permits at most one validation re-call per turn',async()=>{let n=0;await interpretLockedFormV2('coal',{apiKey:'fixture',fetch:async()=>{n++;return Response.json({output_text:'{}'});},log:()=>{}});assert.equal(n,2);});
test('Job9 recorded clicks and typed replies use the parent dialogue',async()=>{
 const base=suite.cases.find(k=>k.id==='C-C1');let calls=0;
 const deps={apiKey:'fixture',log:()=>{},fetch:async()=>{calls++;return Response.json({output_text:JSON.stringify(base.sourceCase.form)});}};
 const data={fetchData:async()=>({rows:[],complete:true,total:0})};
 const first=await executeCase({...base,steps:[]},null,deps,data);
 const clicked=await executeCase({...base,id:'child',parentId:base.id,steps:[{type:'click',label:'WORLD TOTAL'}]},first.result,deps,data);
 assert.equal(calls,1);assert.match(clicked.result.intent.lockedForm.geographies[0].geography,/^WLD/);
 const answer={geographies:[{value:'JPN | Japan | country',quoted_words:'Japan'}],excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]};
 const replied=await executeCase({...base,id:'reply',parentId:base.id,steps:[{type:'reply',text:'Japan'}]},first.result,{...deps,fetch:async(_u,i)=>{calls++;assert.match(JSON.parse(i.body).input,/Typed reply: "Japan"/);return Response.json({output_text:JSON.stringify(answer)});}},data);
 assert.equal(calls,2);assert.match(replied.result.intent.lockedForm.geographies[0].geography,/^JPN/);
});
import {flagDecision,modelRecommendation} from '../scripts/eia-lookup/measure-decisions.mjs';
test('Job9 flag decision uses strict gain, noise, completeness and wrong-value veto',()=>{
 const r=(name,right,rows=[])=>({name,right,status:'complete',executed:86,scheduled:86,harnessPass:true,rows});
 assert.equal(flagDecision(r('ON',70),r('ON2',70),r('OFF',69),r('OFF2',69)).setting,'off');
 assert.equal(flagDecision(r('ON',71),r('ON2',71),r('OFF',69),r('OFF2',69)).setting,'on');
 const on=r('ON',71,[{id:'x',score:{kind:'wrong value shown'}}]),off=r('OFF',69,[{id:'x',score:{correct:true}}]);
 assert.equal(flagDecision(on,r('ON2',71),off,r('OFF2',69)).setting,'off');
 assert.equal(flagDecision({...on,status:'not run'},r('ON2',71),off,r('OFF2',69)).setting,'off');
});
test('Job9 model recommendation chooses measured cheapest within noise and below 8 seconds',()=>{
 const a={name:'a',status:'complete',harnessPass:true,model:'a',effort:'low',right:70,costUSD:1,latencyP90Ms:7000};
 const b={...a,name:'b',model:'b',right:71,costUSD:2},c={...a,name:'c',model:'c',costUSD:.5,latencyP90Ms:8000};
 assert.equal(modelRecommendation([a,b,c],1).recommendation.model,'a');
 assert.equal(modelRecommendation([{...a,latencyP90Ms:8000}],1).recommendation,null);
});
test('Job9 scorer labels no-data in place of data as wrong value shown',()=>{
 const k={expected:{places:['TX'],data:true},sourceCase:{},set:'F'};
 const r={intent:{lockedForm:{geographies:[{geography:'TX | Texas | US state'}],topics:[],sector:{value:null},frequency:{value:'annual'},years:{start:null,end:null},clarification:{needed:false}}},results:[],userMessage:'No data',needsClarification:false};
 assert.equal(scoreCase(k,r).kind,'wrong value shown');
});
test('Job9 natural gasoline is scored from visible meaning and requires the unsupported notice',()=>{
 const k=suite.cases.find(k=>k.excludedFromJointAccuracy);
 const form={geographies:[{geography:'TX | Texas | US state'}],topics:[{product:null,activity:'production'}],sector:{value:null},frequency:{value:'annual'},years:{start:null,end:null},clarification:{needed:true,about:'product'}};
 const r={intent:{lockedForm:form},needsClarification:true,results:[],choices:[],userMessage:'Which product should I look up?',unsupportedMessage:"We can't look up 'natural gasoline' yet."};
 assert.equal(scoreCase(k,r).correct,true);
 assert.equal(scoreCase(k,{...r,unsupportedMessage:''}).correct,false);
 assert.equal(scoreCase(k,{...r,intent:{lockedForm:{...form,topics:[{product:'natural gas',activity:'production'}]}}}).correct,false);
});
import {transportStreak} from '../scripts/eia-lookup/run-suite.mjs';
test('Job9 five consecutive exhausted calls abort; success resets the streak',()=>{let streak=0;for(let i=1;i<=5;i++){streak=transportStreak(streak,true);assert.equal(streak>=5,i===5);}assert.equal(transportStreak(streak,false),0);});
import {quantile} from '../scripts/eia-lookup/score-suite.mjs';
test('Job9 median and replay comparison retain measured source-call cost and latency',()=>{
 assert.equal(quantile([1,3],.5),2);assert.equal(quantile([1,2,3,4,5,6,7,8,9,10],.9),9);
 const card=scorecard([],[{success:true,replayed:true,sourceCostUSD:.02,sourceElapsedMs:4000,costUSD:0,retry:0}]);assert.equal(card.costUSD,0);assert.equal(card.comparisonCostUSD,.02);assert.equal(card.latencyP90Ms,null);assert.equal(card.comparisonLatencyP90Ms,4000);
});
