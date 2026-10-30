import {scoreD as historicalScoreD} from '../scripts/eia-lookup/score-d.js';
import {scoreD as revisedScoreD} from '../scripts/eia-lookup/score-d-revision-2.js';
import {findEvaluationChoice} from '../scripts/eia-lookup/evaluation-choice.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {normalizeLockedFormV2,convertLockedFormV2,checkLockedFormV2,interpretLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {resolveAmbiguousPlaces,placeSwitches} from '../lib/sources/eia/lookup-geography.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
import {geographyLabel,geographyCode} from '../lib/sources/eia/locked-form-schema.js';
import {resolveApprovedGeography} from '../lib/sources/eia/intent-routing.js';
import {submittedContext,searchLookup} from '../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../lib/eia-intent-payload.js';
import {clarificationFor} from '../lib/sources/eia/lookup-context.js';
const d=JSON.parse(gunzipSync(readFileSync(new URL('../evidence/eia-coverage/set-d-revision-3.json.gz',import.meta.url)))).questions;
const get=id=>structuredClone(d.find(c=>c.id===id));
const geo=(code,quote)=>({geography:geographyLabel(resolveApprovedGeography(code)),quoted_words:quote,is_default:false});
const codes=f=>f.geographies.map(g=>geographyCode(g.geography));
const empty=()=>({geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]});
test('empty topics normalize before conversion and survive browser resubmission',async()=>{
 const c=get('D8');c.form.topics=[];c.form.clarification.options=clarificationFor(c.form).choices.map(c=>({value:c.choice.value,label:c.label.toLowerCase()}));
 const intent=await interpretLockedFormV2(c.query,{apiKey:'offline-placeholder',fetch:async()=>Response.json({status:'completed',output_text:JSON.stringify(c.form)}),rules:()=>{throw Error('unexpected rules');}});
 assert.deepEqual(intent.lockedForm.topics.map(t=>[t.product,t.activity]),[[null,null]]);
 const r=await searchLookup(c.query,sourceIntentPayload(intent),{});assert.deepEqual(r.choices.map(c=>c.label),get('D8').question.buttons);
 const clicked=await searchLookup(c.query,sourceIntentPayload(r.intent),r.choices.find(c=>c.choice.value==='coal'));
 assert.equal(clicked.intent.lockedForm.topics[0].product,'coal');assert.equal(clicked.intent.lockedForm.clarification.about,'activity');
 assert.deepEqual(clicked.choices.map(c=>c.label),get('D8a').question.buttons);
});
for(const [query,items,want] of [
 ['coal production Korea',[geo('PRK','Korea')],['KOR']],
 ['coal production Japan and Korea',[geo('JPN','Japan')],['JPN','KOR']],
 ['coal production Korea and Japan',[geo('JPN','Japan')],['KOR','JPN']],
 ['coal production North Korea',[geo('PRK','North Korea')],['PRK']],
 ['coal production South Korea',[geo('KOR','South Korea')],['KOR']],
 ['coal production North Korea and Korea',[geo('PRK','North Korea')],['PRK','KOR']],
 ['coal production Georgia',[geo('GEO','Georgia')],['GA']],
 ['coal production Georgia and France',[geo('GA','Georgia'),geo('FRA','France')],['GEO','FRA']],
 ['coal production state of Georgia and France',[geo('GA','Georgia'),geo('FRA','France')],['GA','FRA']],
 ['coal production country of Georgia',[geo('GA','Georgia')],['GEO']],
 ['coal production Japan, not Korea',[geo('JPN','Japan')],['JPN']],
 ['coal production Japan without Korea',[geo('JPN','Japan')],['JPN']],
 ['coal production Japan, not sure about Korea',[geo('JPN','Japan')],['JPN']]
])test('metadata ambiguity: '+query,()=>{
 const r=resolveAmbiguousPlaces(items,[],query);assert.deepEqual(r.items.map(g=>geographyCode(g.geography)),want);
 assert.deepEqual(resolveAmbiguousPlaces(r.items,[],query).items,r.items,'idempotent');
});
test('synthetic ambiguity policy demonstrates no Korea-specific branch',()=>{
 const places=[{code:'X1',name:'East Example',type:'country'},{code:'X2',name:'West Example',type:'country'}],policies=[{word:'Example',codes:['X1','X2'],defaultCode:'X2'}];
 const r=resolveAmbiguousPlaces([],[],'coal in Example',[],policies,places);assert.equal(geographyCode(r.items[0].geography),'X2');
 assert.deepEqual(resolveAmbiguousPlaces([],[],'coal not Example',[],policies,places).items,[]);
});
test('typed unresolved place and initial place choice use the same default and switch',async()=>{
 const c=get('D12'),reply='Japan and Korea, only from 2005',a={...empty(),geographies:[{value:geo('JPN','Japan').geography,quoted_words:'Japan'}],years:{start:2005,end:null,quoted_words:'from 2005'},unresolved:[{about:'geography',quoted_words:'Korea'}]};
 const step={type:'reply-update',about:'geography',reply,answer:a},merged=applyReplyUpdate(c.form,c.query,step);
 assert.deepEqual(codes(merged.form),['JPN','KOR']);assert.deepEqual(merged.form.years,{start:2005,end:2019,quoted_words:'from 2005'});assert.equal(merged.form.clarification.needed,false);
 assert.equal(checkLockedFormV2(merged.form,c.query,merged.quoteSources).valid,true);assert.deepEqual(placeSwitches(merged.form).map(c=>c.label),['Did you mean North Korea?']);
 const submitted={interpreter:'openai_locked_form',originForm:c.form,lockedForm:merged.form,choiceHistory:[step]};
 const resubmitted=submittedContext(c.query,submitted);assert.deepEqual(resubmitted.intent.lockedForm,merged.form);
 const switched=submittedContext(c.query,submitted,placeSwitches(merged.form)[0]);assert.deepEqual(codes(switched.intent.lockedForm),['JPN','PRK']);assert.equal(placeSwitches(switched.intent.lockedForm).length,0);
 const initial=get('D12a').form;initial.geographies=[geo('JPN','Japan')];initial.years={start:null,end:null,quoted_words:null};initial.clarification={needed:true,about:'geography',options:['KOR','PRK'].map(code=>({value:geo(code,'Korea').geography,label:code}))};
 const n=normalizeLockedFormV2(initial,'energy consumption Japan and Korea');assert.deepEqual(codes(n),['JPN','KOR']);assert.equal(n.clarification.needed,false);assert.equal(placeSwitches(n)[0].label,'Did you mean North Korea?');
});
test('a later country update never resurrects the original ambiguous place',()=>{
 const query='coal production Korea',f=get('D12a').form;f.geographies=[geo('KOR','Korea')];f.topics=[{product:'coal',activity:'production',quoted_words:'coal production'}];f.years={start:null,end:null,quoted_words:null};
 const step={type:'reply-update',about:'geography',reply:'France',answer:{...empty(),geographies:[{value:geo('FRA','France').geography,quoted_words:'France'}]}};
 const m=applyReplyUpdate(f,query,step);const result=submittedContext(query,{interpreter:'openai_locked_form',originForm:f,lockedForm:m.form,choiceHistory:[step]});assert.deepEqual(codes(result.intent.lockedForm),['FRA']);
});
test('approved qualifier labels retain gasoline without arbitrary model text',()=>{
 const f=get('D8').form;f.clarification.options=[{value:'petroleum',label:'please pick gasoline now'},{value:'natural gas',label:'made up model label'}];
 assert.deepEqual(clarificationFor(f).choices.map(c=>c.label),['Gasoline','Natural Gas']);
});

test('harness button matching is case-insensitive but rejects absent or duplicate choices',()=>{
 const result={choices:[{label:'coal',choice:{about:'product',value:'coal'}}]};
 assert.equal(findEvaluationChoice(result,'Coal'),result.choices[0]);assert.equal(findEvaluationChoice(result,' COAL '),result.choices[0]);
 assert.throws(()=>findEvaluationChoice(result,'Gas'));assert.throws(()=>findEvaluationChoice({choices:[...result.choices,{label:'Coal'}]},'coal'));
});

test('excluding the alternative does not prevent the default; excluding the default never selects it',()=>{
 assert.deepEqual(resolveAmbiguousPlaces([],[geo('PRK','North Korea')],'Korea').items.map(g=>geographyCode(g.geography)),['KOR']);
 assert.deepEqual(resolveAmbiguousPlaces([],[geo('KOR','South Korea')],'Korea').items,[]);
});

test('chart scorer revision retains all non-chart scoring and rejects lost chart/table/Excel entries',()=>{
 for(const c of d)assert.deepEqual(revisedScoreD({},c),historicalScoreD({},c),c.id);
 const form=get('D12a').form;form.years={start:2000,end:2000,quoted_words:'2000'};
 const entries=['A','B'].map(code=>({geographyCode:code,geographyName:code,product:'coal',activity:'production',outcome:'data',route:'test',measure:'value',facets:{country:code},unit:'TST',frequency:'annual',acceptableMeasurementBases:['test'],firstPeriod:'2000',lastPeriod:'2000',headlineRequired:false,snapshotPoints:[{period:'2000',value:1}]}));
 const expected={form,entries,chartPolicy:{codes:['A'],requireExcel:true}};
 const result={intent:{lockedForm:form},results:[{countries:entries.map(e=>({geography:{code:e.geographyCode,name:e.geographyName},product:e.product,activity:e.activity,series:{selector:{route:e.route,dataColumn:e.measure,facets:e.facets,frequency:e.frequency},unit:e.unit,frequency:e.frequency,basisLabel:'test',complete:true,points:e.snapshotPoints,coverage:{start:'2000',end:'2000'}}}))}]};
 const presentation={entries:entries.map(e=>({geographyCode:e.geographyCode,product:e.product,activity:e.activity,statusLabel:'Available',inChart:e.geographyCode==='A',inTable:true,inExcel:true}))};
 assert.equal(revisedScoreD(result,expected,{presentation}).correct,true);
 for(const field of ['inChart','inTable','inExcel']){const bad=structuredClone(presentation);bad.entries[0][field]=false;assert.equal(revisedScoreD(result,expected,{presentation:bad}).correct,false,field);}
 const tooMany=structuredClone(presentation);tooMany.entries[1].inChart=true;assert.equal(revisedScoreD(result,expected,{presentation:tooMany}).correct,false);
});
