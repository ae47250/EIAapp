import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {searchLookup,lookupSeries} from '../lib/sources/eia/lookup-search.js';
import {lookupCatalog,buildLookupSelector,lookupRequestFromIntent} from '../lib/sources/eia/lookup-list.js';
import {normalizeSubmittedIntent} from '../lib/sources/eia/interpret-query.js';
import {appendIntentParams,appendLookupChoice} from '../lib/eia-intent-payload.js';
import {buildXlsx,buildComparisonXlsx} from '../lib/client/xlsx.js';
import {getCleanPoints} from '../lib/client/formatting.js';
import {scoreData} from '../scripts/eia-lookup/score-data.js';
import {GET,POST} from '../app/api/search-eia/route.js';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url)));
const keys=read('tests/fixtures/eia/locked-form/answer-key.json');
const gold=read('tests/fixtures/eia/locked-form/gold-forms.json');
const oracle=read('evidence/eia-lookup-list/expected-data.json');
const checks=[...read('evidence/eia-lookup-list/row-checks-1.json').records,...read('evidence/eia-lookup-list/row-checks-2.json').records];
const key=id=>keys.find(k=>k.id===id);
const payload=id=>({interpreter:'openai_locked_form',lockedForm:structuredClone(gold.find(g=>g.id===id).form)});
const calls=[];
async function recorded(selector){
 calls.push(selector);
 const row=lookupCatalog.rows.find(row=>row.route===selector.route&&row.dataColumn===selector.dataColumn&&Object.entries(row.fixedFacets).every(([k,v])=>selector.facets[k]===v));
 const record=checks.find(record=>record.key===row.key&&record.checks.some(c=>c.frequency===selector.frequency));
 const sample=record.checks.find(c=>c.frequency===selector.frequency).sample;
 // Offline boundary fixture: values/names/units from recorded EIA row checks;
 // requested facets are substituted to exercise ordered geography plumbing.
 return {rows:[{...sample,...selector.facets,period:'2023'},{...sample,...selector.facets,period:'2024'}],total:2,complete:true,frequency:selector.frequency};
}
const run=(id,action={})=>searchLookup(key(id).query,payload(id),action,{fetchData:recorded});
for(const k of keys)test('full lookup path with injected EIA observations '+k.id,async()=>{
 const before=calls.length,result=await run(k.id),score=scoreData(result,oracle.questions.find(q=>q.id===k.id));
 assert.deepEqual(score.errors,[]);assert.equal(score.unlabelledWrongData,false);
 assert.deepEqual(result.intent.lockedForm,payload(k.id).lockedForm);
 if(k.clarification)assert.equal(calls.length,before);
 else assert.equal(result.results.length,k.pairs.length);
});
test('gasoline and natural-gas buttons resubmit the unchanged source form and fetch only the chosen measure',async()=>{
 const initial=await run('O10');assert.equal(initial.choices.length,2);
 for(const button of initial.choices){
  const params=appendLookupChoice(new URLSearchParams({q:key('O10').query}),initial.intent,button);
  assert.deepEqual(JSON.parse(params.get('intentPayload')).lockedForm,payload('O10').lockedForm);
  const selected=await searchLookup(key('O10').query,JSON.parse(params.get('intentPayload')),{choice:JSON.parse(params.get('choice')),lookupRowKey:params.get('lookupRowKey')||undefined},{fetchData:recorded});
  assert.equal(selected.needsClarification,false);assert.ok(selected.selectedSeries.points.length);
  assert.equal(selected.selectedSeries.product,button.choice.value);
  if(button.choice.value==='petroleum'){assert.equal(selected.selectedSeries.lookupRowKey,'us-gasoline-consumption');assert.match(selected.selectedSeries.basisLabel,/gasoline/i);}
 }
});
test('not-available alternatives remain opt-in and labelled after the click',async()=>{
 calls.length=0;const initial=await run('F2');assert.equal(calls.length,0);
 const button=initial.results[0].countries[0].alternatives[0];assert.match(button.label,/Crude oil including lease condensate exports/);
 const selected=await run('F2',button);assert.equal(calls.length,2);
 assert.deepEqual(selected.intent.lockedForm,initial.intent.lockedForm);
 for(const country of selected.selectedComparison.countries){assert.equal(country.series.alternative,true);assert.equal(country.series.selector.facets.productId,'57');}
});
test('invalid, unverified and wrong-geography row keys cannot trigger calls',async()=>{
 const before=calls.length;
 for(const lookupRowKey of ['absent','state-electricity-consumption'])await assert.rejects(run('O3',{lookupRowKey}),/choice is not available/);
 const catalog=structuredClone(lookupCatalog);catalog.rows.forEach(row=>row.verification='pending');
 await assert.rejects(searchLookup(key('O1').query,payload('O1'),{lookupRowKey:'us-total-energy-consumption'},{catalog,fetchData:recorded}),/choice is not available/);
 await assert.rejects(run('O10',{choice:{about:'product',value:'coal'}}),/choice is not available/);
 assert.equal(calls.length,before);
});
test('explicit geography exclusions also apply to alternative buttons',async()=>{
 const submitted=payload('F12');submitted.lockedForm.excluded_geographies.push({...submitted.lockedForm.geographies[0]});
 const result=await searchLookup(key('F12').query,submitted,{},{fetchData:recorded});assert.equal(result.needsClarification,true);assert.deepEqual(result.results,[]);
});
test('comparison and series shapes are accepted by chart helpers and Excel, with provenance labels',async()=>{
 for(const id of ['O7','O3','F6','O8']){
  const result=await run(id);
  for(const group of result.results){
   for(const country of group.countries){const s=country.series;assert.equal(s.certainty,null);assert.match(s.candidateId,/^lookup:/);assert.equal(getCleanPoints(s.points).length,2);
    const text=new TextDecoder().decode(await buildXlsx(s).arrayBuffer());for(const value of [s.title,s.basisLabel,s.unit,s.regionLabel,s.fallbackLabel].filter(Boolean))assert.ok(text.includes(value.replaceAll('&','&amp;')),value);
   }
   if(group.selectedComparison){const text=new TextDecoder().decode(await buildComparisonXlsx([group.selectedComparison]).arrayBuffer());assert.match(text,/no ranking or certainty/);assert.match(text,/no conversion/);for(const country of group.countries)assert.ok(text.includes(country.geography.name));}
  }
 }
});
test('different units, definitions or frequencies never share a comparison chart',async()=>{
 const submitted=payload('O3');submitted.lockedForm.geographies=[{geography:'USA | United States | national',quoted_words:'USA'},{geography:'TX | Texas | US state',quoted_words:'Texas'}];
 submitted.lockedForm.topics[0].quoted_words='electricity consumption';
 const result=await searchLookup('USA and Texas electricity consumption',submitted,{},{fetchData:recorded});assert.equal(result.selectedComparison.chartCompatible,false);assert.equal(result.selectedComparison.countries.length,2);assert.ok(result.selectedComparison.warnings.some(w=>w.code==='different_measures'));
 const total=payload('O1');total.lockedForm.geographies.push({geography:'ISL | Iceland | country',quoted_words:'Iceland'});
 const common=await searchLookup('united states and Iceland energy consumption',total,{},{fetchData:recorded});assert.equal(common.selectedComparison.chartCompatible,true);assert.ok(common.selectedComparison.countries.every(c=>c.series.unit==='quadrillion Btu'));
});
test('no result for an unchecked concept is not called EIA nonpublication',async()=>{
 const p=payload('O1');p.lockedForm.topics[0]={product:'coal',activity:'prices',quoted_words:'coal prices'};
 const result=await searchLookup('united states coal prices',p,{},{fetchData:recorded});const entry=result.results[0].countries[0];assert.equal(entry.status,'not_supported');assert.match(entry.message,/We don't have/);assert.ok(entry.alternatives.length<=3);
});
test('rules outage path keeps explicit qualifiers and clarifies ambiguous gas',async()=>{
 const fallback={interpreter:'rules',outageReason:'openai_not_configured'};
 const crude=await searchLookup('crude oil production north dakota',fallback,{},{fetchData:recorded});assert.equal(crude.selectedSeries.lookupRowKey,'state-crude-oil-production');
 const gas=await searchLookup('gas prices in michigan',fallback,{},{fetchData:recorded});assert.equal(gas.needsClarification,true);assert.equal(gas.choices.length,2);
});
test('observation cleanup retains missingness, rejects wrong facets/units and conflicting duplicates',async()=>{
 const r=await run('O8'),s=r.selectedSeries,row=lookupCatalog.rows.find(row=>row.key===s.lookupRowKey),request=lookupRequestFromIntent(r.intent),geo=request.geographies[0],response=await recorded(s.selector),sample=response.rows[0];
 const cleaned=lookupSeries(row,geo,request,s.selector,{...response,complete:false,total:5,rows:[{...sample,period:'2022',sales:null},sample,sample]});assert.equal(cleaned.points.length,1);assert.equal(cleaned.missingValues,1);assert.equal(cleaned.duplicateRows,1);assert.match(cleaned.completenessNote,/Incomplete/);
 for(const bad of [{...sample,stateid:'TX'},{...sample,'sales-units':'wrong'}])assert.throws(()=>lookupSeries(row,geo,request,s.selector,{...response,rows:[bad]}));
 assert.throws(()=>lookupSeries(row,geo,request,s.selector,{...response,rows:[sample,{...sample,sales:Number(sample.sales)+1}]}),/invalid response/);
});
test('data scorer rejects wrong geography, measure, basis, labels, omission and substituted totals',async()=>{
 const result=await run('O8'),expected=oracle.questions.find(q=>q.id==='O8');
 for(const mutate of [r=>r.results=[],r=>r.results[0].countries[0].geography.code='TX',r=>r.results[0].countries[0].series.selector.dataColumn='price',r=>r.results[0].countries[0].series.basisLabel='Wrong basis',r=>r.results[0].countries[0].series.unit='wrong',r=>r.results[0].countries[0].series.complete=false]){const copy=structuredClone(result);mutate(copy);assert.equal(scoreData(copy,expected).correct,false);}
 const unavailable=await run('F2');unavailable.results[0].countries[0].series=result.selectedSeries;assert.equal(scoreData(unavailable,oracle.questions.find(q=>q.id==='F2')).unlabelledWrongData,true);
});
test('public route retains method/auth boundaries and displays clarification without external calls',async()=>{
 const login=process.env.LOGIN_REQUIRED;process.env.LOGIN_REQUIRED='off';
 try{
  assert.equal((await POST(new Request('http://localhost/api/search-eia',{method:'POST'}))).status,405);
  assert.equal((await GET(new Request('http://localhost/api/search-eia'))).status,400);
  const params=appendIntentParams(new URLSearchParams({q:key('O10').query}),payload('O10'));
  const result=await (await GET(new Request('http://localhost/api/search-eia?'+params))).json();assert.equal(result.mode,'lookup');assert.equal(result.needsClarification,true);assert.equal(result.choices.length,2);
  process.env.LOGIN_REQUIRED='on';assert.equal((await GET(new Request('http://localhost/api/search-eia?'+params))).status,401);
 }finally{if(login===undefined)delete process.env.LOGIN_REQUIRED;else process.env.LOGIN_REQUIRED=login;}
});
test('main route import graph excludes the old candidate/ranking pipeline and metadata cache',()=>{
 const visited=new Set();function walk(path){path=resolve(path);if(visited.has(path))return;visited.add(path);const source=readFileSync(path,'utf8');
  assert.doesNotMatch(path,/candidate-pipeline|candidate-search|metadata-cache|full-series-index/);
  assert.doesNotMatch(source,/['"]([^'"]*metadata-cache|[^'"]*full-series-index)[^'"]*['"]/);
  for(const match of source.matchAll(/(?:from\s+|import\s*)['"](\.[^'"]+\.js)['"]/g))walk(resolve(dirname(path),match[1]));
 }walk('app/api/search-eia/route.js');assert.ok(visited.has(resolve('lib/sources/eia/lookup-search.js')));
});
