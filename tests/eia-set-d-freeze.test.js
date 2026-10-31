import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {scoreD} from '../scripts/eia-lookup/score-d.js';
import {checkLockedFormShapeV2} from '../lib/sources/eia/locked-form-schema-v2.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
const root=new URL('../',import.meta.url),path='evidence/eia-coverage/set-d.json';
const d=JSON.parse(readFileSync(new URL(path,root)));
const byId=id=>d.questions.find(c=>c.id===id);
const identity=e=>[e.geographyCode,e.product,e.activity].join('|');
function renderFixture(e){
 const groups=[];const presentation={understoodLine:e.understoodContains.join('; '),buttons:e.question?.buttons||e.unavailableQuestion?.buttons||(e.switchButton?[e.switchButton]:[]),emptyResultCards:0,entries:[],headlineRemainder:e.headlineRemainder};const liveEvidence={};
 for(const x of e.entries){
  let g=groups.find(g=>g.product===x.product&&g.activity===x.activity);if(!g){g={product:x.product,activity:x.activity,countries:[]};groups.push(g);}
  const a={geography:{code:x.geographyCode,name:x.geographyName},product:x.product,activity:x.activity,status:x.outcome==='missing'?'empty':'available',series:null};g.countries.push(a);
  const ui={geographyCode:x.geographyCode,product:x.product,activity:x.activity,statusLabel:x.statusLabel,inChart:x.statusLabel==='Available',inTable:x.tableRequired!==false,symbolMeanings:[]};presentation.entries.push(ui);
  if(x.outcome!=='data')continue;
  const selector={route:x.route,dataColumn:x.measure,frequency:x.frequency,facets:structuredClone(x.facets)},points=structuredClone(x.snapshotPoints);
  a.series={selector,unit:x.unit,frequency:x.frequency,basisLabel:x.acceptableMeasurementBases[0],description:x.requiredLabels.join('; '),complete:true,points,coverage:{start:points[0].period,end:points.at(-1).period}};
  liveEvidence[identity(x)]={selector,complete:true,retrievedAt:'2026-10-30T00:00:00Z',points:structuredClone(points)};
  const last=[...points].reverse().find(p=>Number.isFinite(p.value));
  if(last)ui.headline=`${x.geographyName} ${x.product} ${x.activity}: ${last.value.toLocaleString('en-US',{maximumFractionDigits:4})} ${x.unitWords} in ${last.period.slice(0,4)} (EIA).`;
  ui.symbolMeanings=points.filter(p=>p.symbol).map(({period,meaning})=>({period,meaning}));
 }
 const q=e.question||e.unavailableQuestion;
 return {result:{intent:{lockedForm:structuredClone(e.form)},needsClarification:!!e.question,results:groups,...(q?{userMessage:q.text,choices:q.buttons.map(label=>({label})),freeText:true}:{}),presentation},options:{liveEvidence}};
}
test('every owner case and each separate step remains in Set D',()=>{for(let n=1;n<=22;n++)assert.ok(byId('D'+n));for(const id of ['D4a','D4b','D5a','D5b','D6a','D8a','D12a'])assert.ok(byId(id));assert.equal(d.passMarks.minimumFractionCorrectFormAndOutcome,.9);assert.equal(d.passMarks.runs,2);assert.equal(d.passMarks.coverageNotChecked,0);assert.equal(d.unresolved.length,0);});
test('all v2 forms fit the unchanged schema',()=>{for(const c of d.questions){const r=checkLockedFormShapeV2(c.form);assert.equal(r.valid,true,c.id+': '+r.errors.join(';'));}});
test('D1-D3 retain both requested nuclear activities and their actual native bases',()=>{assert.equal(byId('D1').entries[0].geographyCode,'BRA');assert.equal(byId('D2').entries[0].product,'petroleum');assert.deepEqual(byId('D3').entries.map(e=>e.activity),['generation','consumption']);assert.ok(byId('D3').entries.find(e=>e.activity==='consumption').requiredLabels.some(s=>s.includes('within published rounding')));});
test('D4 preserves state versus country and both switch workflows',()=>{assert.equal(byId('D4').entries[0].geographyCode,'GA');for(const id of ['D4a','D4b']){assert.equal(byId(id).entries[0].geographyCode,'GEO');assert.ok(byId(id).understoodContains.includes('(country)'));}assert.equal(byId('D4b').typedReply,'no, I meant the country');});
test('all three owner coal-zero places have actual numeric zero observations',()=>{for(const code of ['BMU','GRL','SPM']){const e=byId('D5b').entries.find(e=>e.geographyCode===code);assert.ok(e.snapshotPoints.length);assert.ok(e.snapshotPoints.every(p=>p.value===0&&!p.symbol));assert.equal(e.statusLabel,'Reported as zero every year');}});
test('state group preserves Alaska exclusion and every missing member with evidence',()=>{const c=byId('D6a');assert.ok(c.form.excluded_geographies.some(g=>g.geography.startsWith('AK |')));assert.ok(!c.entries.some(e=>e.geographyCode==='AK'));assert.ok(c.entries.some(e=>e.outcome==='missing'));for(const e of c.entries.filter(e=>e.outcome==='missing'))assert.equal(e.absenceEvidence.verified,true);assert.ok(!c.entries.some(e=>['USA','X3','X5'].includes(e.geographyCode)));});
test('D12 keeps an unstated old end and replaces only the start slot',()=>{const f=byId('D12a').form;assert.equal(f.years.start,2005);assert.equal(f.years.end,2019);assert.deepEqual(f.geographies.map(g=>g.geography.split(' | ')[0]),['JPN','KOR']);assert.equal(f.years.quoted_words,'from 2005');});
test('requested monthly price and qualified gasoline stay distinct from annual or whole petroleum',()=>{assert.equal(byId('D13').form.frequency.explicit,true);assert.equal(byId('D13').entries[0].frequency,'monthly');const c=byId('D14');assert.ok(['monthly','weekly'].includes(c.entries[0].frequency));assert.ok(c.entries[0].requiredLabels.includes('Gasoline (part of petroleum)'));});
test('seeded challenge cells remain eight distinct mapped annual base cells, one adjacent edit each',()=>{assert.equal(d.sampling.seed,20261030);assert.equal(d.sampling.sample.length,8);assert.equal(new Set(d.sampling.sample.map(x=>x.cell)).size,8);for(const s of d.sampling.sample){const k=s.edit.index;assert.equal(s.query,s.canonicalQuery.slice(0,k)+s.canonicalQuery[k+1]+s.canonicalQuery[k]+s.canonicalQuery.slice(k+2));assert.notEqual(s.query,s.canonicalQuery);}});
for(const e of d.questions)test('scorer consistency for source-derived expectation '+e.id,()=>{const {result,options}=renderFixture(e);const r=scoreD(result,e,options);assert.equal(r.correct,true,JSON.stringify(r));if(e.entries.some(x=>x.outcome==='data')){result.results.find(g=>g.countries.some(c=>c.series)).countries.find(c=>c.series).series.unit='wrong';assert.equal(scoreD(result,e,options).correct,false);}else if(e.question){result.choices=[];assert.equal(scoreD(result,e,options).correct,false);}});
test('frozen hashes remain unchanged when the freeze manifest exists',()=>{const f=new URL('evidence/eia-coverage/set-d-freeze.json',root);if(!existsSync(f)){assert.match(d.status,/DRAFT/);return;}const m=JSON.parse(readFileSync(f));for(const [name,hash]of Object.entries(m.sha256))assert.equal(createHash('sha256').update(readFileSync(new URL(name,root))).digest('hex'),hash,name);});

test('start-only reply with no previous end keeps the open interval: 2005 to latest',()=>{
 const before=structuredClone(byId('D12').form);before.years={start:null,end:null,quoted_words:null};
 const reply='from 2005',answer={geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:{start:2005,end:'latest',quoted_words:reply},resolved_words:[],unresolved:[]};
 const merged=applyReplyUpdate(before,'energy consumption for many countries',{about:'geography',reply,answer});
 assert.deepEqual(merged.form.years,{start:2005,end:'latest',quoted_words:reply});
});
