import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoreC,isDeadEnd} from '../scripts/eia-lookup/score-c.js';
const cases=JSON.parse(readFileSync(new URL('./fixtures/eia/no-dead-ends/set-c.json',import.meta.url))).questions;
const clone=structuredClone;
function question(id='C1') {const e=cases.find(c=>c.id===id);return{intent:{lockedForm:clone(e.form)},needsClarification:true,userMessage:e.question.text,choices:e.question.buttons.map(label=>({label})),freeText:true,results:[]};}
function data(id='C2') {
 const e=cases.find(c=>c.id===id);
 return{intent:{lockedForm:clone(e.form)},needsClarification:false,results:[{countries:e.entries.map(x=>x.outcome==='missing'
  ? {geography:{code:x.geographyCode,name:x.geographyName},product:x.product,activity:x.activity,status:'empty',series:null}
  : {geography:{code:x.geographyCode,name:x.geographyName},product:x.product,activity:x.activity,status:'available',series:{
    selector:{route:x.route,dataColumn:x.measure,frequency:x.frequency,facets:clone(x.facets)},unit:x.unit,frequency:x.frequency,
    basisLabel:x.acceptableMeasurementBases[0],regionLabel:(x.requiredLabels || []).join('; '),complete:true,
    points:[{period:x.firstPeriod,value:1},...(x.firstPeriod===x.lastPeriod?[]:[{period:x.lastPeriod==='latest'?'2025':x.lastPeriod,value:2}])],
    coverage:{start:x.firstPeriod,end:x.lastPeriod==='latest'?'2025':x.lastPeriod}}})}]};
}
test('C scorer accepts the frozen place question and ignores quotes and option values',()=>{
 const r=question();r.intent.lockedForm.topics[0].quoted_words='arbitrary';r.intent.lockedForm.clarification.options=[{label:'ignored',value:'ignored'}];
 assert.equal(scoreC(r,cases.find(c=>c.id==='C1')).correct,true);
});
for(const [name,change,error]of[
 ['missing free text',r=>delete r.freeText,'missing_free_text'],
 ['missing button',r=>r.choices.pop(),'wrong_buttons'],
 ['wrong label',r=>r.choices[0].label='All countries','wrong_buttons'],
 ['wrong question',r=>r.userMessage='Please try again','wrong_question'],
 ['wrong years',r=>r.intent.lockedForm.years.start=2001,'form:years'],
 ['wrong pair',r=>r.intent.lockedForm.topics[0].activity='production','form:pairs'],
 ['invented sector',r=>r.intent.lockedForm.sector.value='industrial','form:sector'],
 ['wrong clarification',r=>r.intent.lockedForm.clarification.about='product','form:clarificationAbout']])test('C scorer rejects '+name,()=>{
 const r=question();change(r);const s=scoreC(r,cases.find(c=>c.id==='C1'));assert.equal(s.correct,false);assert.ok([...s.formErrors,...s.outcomeErrors].includes(error));
});
test('C scorer accepts data with exact range and an entire named region including missing entries',()=>{
 for(const id of ['C1a','C1b','C2','C7','C8'])assert.equal(scoreC(data(id),cases.find(c=>c.id===id)).correct,true,id);
});
for(const [name,change]of[
 ['wrong route',s=>s.selector.route='seds'],['wrong facet',s=>s.selector.facets.productId='999'],
 ['wrong units',s=>s.unit='Btu'],['wrong frequency',s=>s.frequency='monthly'],['wrong basis',s=>s.basisLabel='Metallurgical coal'],
 ['wrong start',s=>s.coverage.start='2011'],['wrong end',s=>s.coverage.end='2019'],
 ['outside years',s=>s.points.splice(1,0,{period:'2009',value:1})],['duplicate period',s=>s.points.push(s.points[0])],
 ['partial fetch',s=>s.complete=false]])test('C scorer rejects '+name+' and marks unlabelled wrong data',()=>{
 const r=data();change(r.results[0].countries[0].series);const s=scoreC(r,cases.find(c=>c.id==='C2'));assert.equal(s.correct,false);assert.equal(s.unlabelledWrongData,true);
});
test('C scorer requires live latest evidence instead of freezing the current last year',()=>{
 const e=cases.find(c=>c.id==='C3'),r=data('C3');assert.equal(scoreC(r,e).correct,false);
 const latestEvidence={retrievedAt:new Date().toISOString(),lastPeriod:'2025',selector:r.results[0].countries[0].series.selector};
 assert.equal(scoreC(r,e,{latestEvidence}).correct,true);
 latestEvidence.lastPeriod='2026';assert.equal(scoreC(r,e,{latestEvidence}).correct,false);
});
test('C scorer detects a dropped or unnamed missing member',()=>{
 const e=cases.find(c=>c.id==='C1b'),r=data('C1b');
 const missing=r.results[0].countries.find(c=>!c.series);missing.geography.name='';assert.equal(scoreC(r,e).correct,false);
 r.results[0].countries=r.results[0].countries.filter(c=>c.series);assert.equal(scoreC(r,e).correct,false);
});
test('C scorer preserves geography order and default indicators',()=>{
 const e=cases.find(c=>c.id==='C1b'),r=data('C1b');r.intent.lockedForm.geographies[0].geography=r.intent.lockedForm.geographies[0].geography.split('|')[0].trim().split('+').reverse().join('+');assert.equal(scoreC(r,e).formCorrect,false);
 r.intent.lockedForm=clone(e.form);r.intent.lockedForm.geographies[0].is_default=true;assert.equal(scoreC(r,e).formCorrect,false);
});
test('empty messages, missing free text and buttonless questions are dead ends',()=>{
 assert.equal(isDeadEnd({}),true);assert.equal(isDeadEnd({userMessage:'Question',choices:[],freeText:true}),true);
 assert.equal(isDeadEnd({userMessage:'Question',choices:[{label:'World total'}]}),true);assert.equal(isDeadEnd(question()),false);assert.equal(isDeadEnd(data()),false);
});
test('a wrong fallback question cannot receive credit for merely avoiding a dead end',()=>{
 const r=question('C5');assert.equal(scoreC(r,cases.find(c=>c.id==='C6')).correct,false);
});
