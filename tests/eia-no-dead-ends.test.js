import test from 'node:test';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildLockedFormSchemaV2,checkLockedFormShapeV2,upgradeV1Form} from '../lib/sources/eia/locked-form-schema-v2.js';
import {checkLockedFormShape,schemaCounts} from '../lib/sources/eia/locked-form-schema.js';
import {checkLockedFormV2,repairLockedFormV2,interpretLockedFormV2,convertLockedFormV2,lockedFormRequestV2} from '../lib/sources/eia/locked-form-v2.js';
import {yearBounds,lookupRegions,expandGeographies,clarificationFor} from '../lib/sources/eia/lookup-context.js';
import {lookupCatalog,lookupRequestFromIntent,rowFitsGeography} from '../lib/sources/eia/lookup-list.js';
import {searchLookup} from '../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload,appendLookupChoice,canSearchIntent,clarificationResult} from '../lib/eia-intent-payload.js';
import {chartCountries,observationRows,exportContextRows,TOP_TEN_NOTE} from '../lib/client/lookup-display.js';
import {buildComparisonXlsx,buildXlsx} from '../lib/client/xlsx.js';
import {scoreC,isDeadEnd} from '../scripts/eia-lookup/score-c.js';
const read=p=>{const b=readFileSync(new URL('../'+p,import.meta.url));return JSON.parse(p.endsWith('.gz')?gunzipSync(b):b);};
const cases=read('evidence/eia-coverage/set-c-revision-2.json.gz').questions;
const get=id=>structuredClone(cases.find(c=>c.id===id));
const payload=form=>({interpreter:'openai_locked_form',lockedForm:form});
const answer=form=>Response.json({output_text:JSON.stringify(form),status:'completed'});
const noFetch=()=>{throw new Error('Unexpected network call');};
const quiet=()=>{};
function recorded(id) {if(id==='C4'){const entries=get('C4').entries.filter(e=>e.outcome==='data');const rows=entries.flatMap(e=>e.snapshotObservations.map(p=>({...e.facets,period:p.period,[e.measure]:p.symbol ?? p.value,unitName:e.unit})));return {rows,complete:true,total:rows.length,frequency:'annual'};}const names={C1a:'C1a-world',C1b:'C1b-europe',C2:'C2-australia',C3:'C3-ohio',C7:'C7-germany',C8:'C8-france'};return read(`evidence/eia-no-dead-ends/metadata/${names[id]}.json`).response;}
const options=id=>({fetchData:async()=>structuredClone(recorded(id))});

test('Job 3 freezes, earlier answer keys, v1 files and both scorers remain byte-identical',()=>{
 const manifest=read('evidence/eia-no-dead-ends/freeze-manifest.json');
 const amendments=read('evidence/eia-coverage/test-amendments.json');
 for(const [p,hash] of Object.entries(manifest.sha256)) assert.equal(createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex'),amendments.files[p]?.currentSHA256 || hash,p);
});
test('v2 schema fits documented Structured Outputs limits and upgrade preserves every original field',()=>{
 const counts=schemaCounts(buildLockedFormSchemaV2());assert.ok(counts.objectProperties<=5000 && counts.enumValues<=1000 && counts.totalStringCharacters<=120000 && counts.maximumNesting<=10);
 for(const item of read('tests/fixtures/eia/locked-form/gold-forms.json')) {
  const before=JSON.stringify(item.form),v2=upgradeV1Form(item.form);
  assert.equal(checkLockedFormShape(item.form).valid,true,item.id);assert.equal(checkLockedFormShapeV2(v2).valid,true,item.id);
  assert.deepEqual(v2.years,{start:null,end:null,quoted_words:null});assert.ok([...v2.geographies,...v2.excluded_geographies].every(g=>g.is_default===false));assert.equal(JSON.stringify(item.form),before);
  for (const [key,value] of Object.entries(item.form)) if(!['geographies','excluded_geographies'].includes(key))assert.deepEqual(v2[key],value);
 }
});
for(const [frequency,start,end] of [['annual','1995','2005'],['monthly','1995-01','2005-12'],['quarterly','1995-Q1','2005-Q4'],['weekly','1995-01-01','2005-12-31'],['daily','1995-01-01','2005-12-31']]) test('year conversion '+frequency,()=>{
 assert.deepEqual(yearBounds({start:1995,end:2005},frequency),{start,end});assert.deepEqual(yearBounds({start:1995,end:'latest'},frequency),{start});assert.deepEqual(yearBounds({start:null,end:null},frequency),{});
});
test('year validation requires explicit four-digit source evidence, bounds and order',()=>{
 const c=get('C7');assert.equal(checkLockedFormV2(c.form,c.query).valid,true);
 for(const years of [{start:2006,end:1995,quoted_words:'1995 and 2005'},{start:1899,end:2005,quoted_words:'1899 and 2005'},{start:1995,end:3000,quoted_words:'1995 and 3000'},{start:1995.5,end:2005,quoted_words:'1995.5 and 2005'},{start:'latest',end:'latest',quoted_words:'latest'},{start:1995,end:2005,quoted_words:'recently'},{start:1995,end:null,quoted_words:'1995'},{start:null,end:null,quoted_words:'recently'}]){
  const f={...c.form,years};assert.equal(checkLockedFormV2(f,c.query+' '+years.quoted_words).valid,false,JSON.stringify(years));
 }
 const recent={...c.form,years:{start:null,end:null,quoted_words:null}};assert.equal(checkLockedFormV2(recent,'electricity consumption in Germny recently').valid,true);
});
test('vague countries are not World, while all US states and named regions retain their scope',()=>{
 const c=get('C1'),f=get('C1a').form;f.geographies[0].quoted_words='many countries';assert.ok(checkLockedFormV2(f,c.query).errors.includes('vague_geography'));
 const region=get('C1b');assert.equal(checkLockedFormV2(region.form,region.query+' Europe').valid,true);
 const state=get('C3');state.form.geographies[0].quoted_words='all US states';assert.equal(checkLockedFormV2(state.form,state.query+' all US states').valid,true);
});

// Fixed seed mutates fields, not expected meanings. Retain every failure family as a regression.
const mutationFamilies=[
 ['missing geography',f=>{f.geographies=[];}],['unknown geography',f=>{f.geographies[0].geography='UNKNOWN';}],
 ['bad geography quote',f=>{f.geographies[0].quoted_words='invented';}],['overlap',f=>{f.excluded_geographies=structuredClone(f.geographies);}],
 ['unknown product',f=>{f.topics[0].product='unknown';}],['missing activity',f=>{f.topics[0].activity=null;}],['bad topic quote',f=>{f.topics[0].quoted_words='invented';}],
 ['sector evidence',f=>{f.sector={value:'industrial',quoted_words:'invented'};}],['frequency evidence',f=>{f.frequency={value:'monthly',explicit:true,quoted_words:null};}],
 ['extra field',f=>{f.extra=true;}],['unsupported',f=>{f.unsupported_words=['coal'];}],['bad option',f=>{f.clarification={needed:true,about:'product',options:[{label:'X',value:'x'}]};}],
 ['bad year',f=>{f.years={start:3000,end:3001,quoted_words:'3000 to 3001'};}],['invalid clarification',f=>{f.clarification={needed:false,about:'activity',options:[]};}],
 ['null geography item',f=>{f.geographies=[null];}],['null body',()=>null]
];
let seed=20261028;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
for(let n=0;n<64;n++)test(`seed 20261028 repaired form ${n+1}`,async()=>{
 const c=get('C2'),[name,mutate]=mutationFamilies[random()%mutationFamilies.length];let f=c.form;const changed=mutate(f);if(changed===null)f=null;
 const query=c.query+' 3000 to 3001';assert.equal(checkLockedFormV2(f,query).valid,false,name);
 const repaired=repairLockedFormV2(f,query);assert.equal(checkLockedFormV2(repaired,query).valid,true,name);
 const result=await searchLookup(query,payload(repaired),{},{fetchData:noFetch});assert.equal(result.needsClarification,true);assert.equal(isDeadEnd(result),false,name);assert.ok(result.userMessage.trim());assert.equal(result.freeText,true);
});
test('single re-ask then repaired question; valid fields survive; log contains only check names/model/time',async()=>{
 const c=get('C2');c.form.geographies[0].quoted_words='invented';const logs=[],attempts=[];
 const intent=await interpretLockedFormV2(c.query,{apiKey:'offline-placeholder',model:'gpt-6-luna',fetch:async()=>answer(c.form),rules:noFetch,log:e=>logs.push(e),onAttempt:a=>attempts.push(a)});
 assert.equal(attempts.length,2);assert.equal(checkLockedFormV2(intent.lockedForm,c.query).valid,true);assert.deepEqual(intent.lockedForm.years,c.form.years);assert.deepEqual(intent.lockedForm.topics,c.form.topics);assert.equal(intent.lockedForm.geographies.length,0);
 assert.equal(logs.length,3);for(const e of logs){assert.deepEqual(Object.keys(e).sort(),['checks','event','model','time']);assert.equal(e.model,'gpt-6-luna');assert.ok(Date.parse(e.time));assert.ok(!JSON.stringify(e).includes(c.query));}
 const question=clarificationResult(intent,c.query);assert.equal(canSearchIntent(intent),false);assert.equal(isDeadEnd(question),false);
 const clicked=await searchLookup(c.query,sourceIntentPayload(intent),question.choices[1],{fetchData:noFetch});assert.equal(isDeadEnd(clicked),false);assert.equal(clicked.choices.length,7);
});
test('invalid options are dropped without dropping the useful question or re-asking',async()=>{
 const c=get('C6');c.form.clarification.options.push({label:'bad',value:'bad'});let calls=0;
 const intent=await interpretLockedFormV2(c.query,{apiKey:'offline-placeholder',fetch:async()=>{calls++;return answer(c.form);},rules:noFetch,log:quiet});
 assert.equal(calls,1);assert.equal(intent.lockedForm.clarification.options.length,0);assert.deepEqual(intent.choices.map(c=>c.label),c.question.buttons);assert.equal(intent.freeText,true);assert.equal(checkLockedFormV2(intent.lockedForm,c.query).valid,true);
});
test('what comes before where, and the next click carries the repaired form',async()=>{
 const c=get('C6'),first=await searchLookup(c.query,payload(c.form),{},{fetchData:noFetch});
 const product=await searchLookup(c.query,sourceIntentPayload(first.intent),first.choices.find(x=>x.choice.value==='coal'),{fetchData:noFetch});
 const second=await searchLookup(c.query,sourceIntentPayload(product.intent),product.choices.find(x=>x.choice.value==='production'),{fetchData:noFetch});
 assert.equal(second.intent.lockedForm.topics[0].activity,'production');assert.equal(second.intent.lockedForm.clarification.about,'geography');assert.deepEqual(second.choices.map(c=>c.label),get('C1').question.buttons);assert.equal(isDeadEnd(second),false);
});
test('browser guard keeps blocked/missing forms away from search and displays clarification',()=>{
 for(const intent of [null,{}, {interpreter:'openai_locked_form'},{interpreter:'openai_locked_form',interpretationFailure:'bad',lockedForm:{}},convertLockedFormV2(get('C1').form,get('C1').query)]) assert.equal(canSearchIntent(intent),false);
 assert.equal(canSearchIntent(convertLockedFormV2(get('C2').form,get('C2').query)),true);
 const source=readFileSync(new URL('../components/search/SearchWorkspace.js',import.meta.url),'utf8');assert.ok(source.indexOf('if (!canSearchIntent(intent))')<source.indexOf('fetchJson(`/api/search-eia?${params}`)'));assert.ok(!source.includes('`${data.query} ${text}`'));assert.ok(source.includes('clarificationReplyPayload(data.query, data.intent, text)'));
});
for(const id of ['C1','C5','C6'])test('frozen question '+id,async()=>{
 const c=get(id),result=await searchLookup(c.query,payload(c.form),{},{fetchData:noFetch});assert.equal(scoreC(result,c).correct,true);
});
for(const id of ['C2','C4','C7','C8'])test('recorded EIA data respects exact coverage '+id,async()=>{
 const c=get(id),result=await searchLookup(c.query,payload(c.form),{},options(id));assert.equal(scoreC(result,c).correct,true);
});
test('World and Europe clicks preserve years and both selections through browser serialization',async()=>{
 const c=get('C1'),first=await searchLookup(c.query,payload(c.form));
 const world=await searchLookup(c.query,sourceIntentPayload(first.intent),first.choices[0],options('C1a'));assert.equal(scoreC(world,get('C1a')).correct,true);
 const regions=await searchLookup(c.query,sourceIntentPayload(first.intent),first.choices[1]);
 const button=regions.choices.find(x=>x.label==='Europe'),params=appendLookupChoice(new URLSearchParams(),regions.intent,button);
 let calls=0;
 const europe=await searchLookup(c.query,JSON.parse(params.get('intentPayload')),{choice:JSON.parse(params.get('choice'))},{fetchData:async selector=>{
  calls++;assert.equal(selector.facets.countryRegionId.length,45);assert.equal(selector.start,'2000');assert.equal(selector.end,'2019');return recorded('C1b');
 }});
 assert.equal(calls,1);assert.equal(scoreC(europe,get('C1b')).correct,true);assert.equal(europe.intent.choiceHistory.length,2);
 assert.equal(europe.results[0].countries.length,45);assert.equal(europe.results[0].countries.filter(c=>c.series).length,41);
 assert.ok(europe.results[0].countries.some(c=>c.series?.completenessNote.includes('starts in 2006')));
 const again=await searchLookup(c.query,sourceIntentPayload(europe.intent),{},options('C1b'));assert.equal(scoreC(again,get('C1b')).correct,true);
 assert.equal(JSON.stringify(sourceIntentPayload(europe.intent)).length<12000,true);
});
test('region alternatives are opt-in, batched, explicitly labelled and preserve membership',async()=>{
 const c=get('C4'),catalog=read('data/eia/lookup-list.json'),first=await searchLookup(c.query,payload(c.form),{},{catalog});let calls=0;
 const second=await searchLookup(c.query,sourceIntentPayload(first.intent),first.choices[0],{catalog,fetchData:async s=>{calls++;assert.equal(s.facets.countryRegionId.length,45);return read('evidence/eia-no-dead-ends/metadata/C4-europe-gas-imports.json').response;}});
 assert.equal(calls,1);assert.equal(second.results[0].countries.length,45);assert.ok(second.results[0].countries.filter(c=>c.series).every(c=>c.series.alternative && c.series.activity==='imports'));
});
test('every country row rejects World and metadata-defined aggregate codes without a World-specific exception',()=>{
 const c=get('C1a'),request=lookupRequestFromIntent(convertLockedFormV2(c.form,c.query+' World total')),world=request.geographies[0];
 for(const row of lookupCatalog.rows.filter(r=>r.geographyKind==='country'))assert.equal(rowFitsGeography(row,world,request),false,row.key);
 const catalog=structuredClone(lookupCatalog);catalog.rows.push({...catalog.rows.at(-1),region:{code:'AUS',requestedCodes:['AUS'],label:'Synthetic aggregate'}});
 for(const row of catalog.rows.filter(r=>r.geographyKind==='country'))assert.equal(rowFitsGeography(row,{code:'AUS',type:'country'},request,catalog),false,row.key);
 assert.ok(lookupRegions.every(r=>expandGeographies([{geography:r.code+' | '+r.name+' | country'}]).length===r.code.split('+').length));
});
test('top-ten chart leaves every observation in table and Excel and adds exactly three context rows',async()=>{
 const countries=Array.from({length:12},(_,i)=>({geography:{code:String(i),name:'Country '+i},series:{lookup:true,points:[{period:'2000',value:100-i},{period:'2019',value:i}],country:'Country '+i,unit:'Btu',frequency:'annual',coverage:{start:'2000',end:'2019'},downloadedAt:'2026-10-28T12:00:00Z'}}));
 const comparison={lookup:true,question:'original question',years:{start:2000,end:2019},countries};
 assert.deepEqual(chartCountries(countries).map(c=>c.geography.code),['11','10','9','8','7','6','5','4','3','2']);assert.equal(countries.length,12);assert.equal(observationRows(countries)[0].values.length,12);
 assert.match(TOP_TEN_NOTE,/all countries are in the table and Excel file/);
 const text=new TextDecoder().decode(await buildComparisonXlsx([comparison]).arrayBuffer());assert.match(text,/sheet name="Metadata"/);for(const c of countries)assert.ok(text.includes(c.geography.name));assert.match(text,/original question/);assert.match(text,/2000–2019/);assert.match(text,/Source: U.S. Energy Information Administration \(data retrieved 2026-10-28\)/);
 const series={...countries[0].series,question:'original question',years:{start:2000,end:2019}};assert.equal(exportContextRows(series).length,3);assert.match(new TextDecoder().decode(await buildXlsx(series).arrayBuffer()),/Question asked/);
});
test('v2 API requests retain one explicit model and low reasoning',()=>{
 const body=lockedFormRequestV2('words',{model:'gpt-6-luna',maxOutputTokens:16000});assert.equal(body.model,'gpt-6-luna');assert.equal(body.reasoning.effort,'low');assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,16000);
});

test('v2 strict schema has unique required keys even where v1 shares object nodes',()=>{
 function walk(node){if(!node || typeof node!=='object')return;if(node.required)assert.equal(node.required.length,new Set(node.required).size);for(const value of Object.values(node))if(Array.isArray(value))value.forEach(walk);else walk(value);}
 walk(buildLockedFormSchemaV2());
});
