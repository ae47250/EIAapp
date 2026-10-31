import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { convertLockedForm } from '../lib/sources/eia/locked-form.js';
import { resolveApprovedGeography } from '../lib/sources/eia/intent-routing.js';
import { lookupCatalog, lookupRequestFromIntent, findLookupRows, findNotAvailable, buildLookupSelector, lexicalQualifiers, rowFitsGeography } from '../lib/sources/eia/lookup-list.js';
import { fetchEiaData, fetchEiaMetadata } from '../lib/sources/eia/eia-fetch.js';
import { periodBoundProblem } from '../lib/sources/eia/eia-period-bounds.js';
import { checkLookupRows } from '../scripts/eia-lookup/check-rows.js';
const json = path => JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const expected = json('evidence/eia-lookup-list/expected-data.json');
const original = json('tests/fixtures/eia/locked-form/answer-key.json');
const independent = json('tests/fixtures/eia/lookup-list/independent-key.json');
const gold = json('tests/fixtures/eia/locked-form/gold-forms.json');
const pages = json('tests/fixtures/eia/lookup-list/fetch-pages.json').pages;
const pending = { allowPending:true };
const reply = (response,status=200) => ({ok:status>=200&&status<300,status,text:async()=>JSON.stringify({response})});
const options = {apiKey:'offline-test-key',paceMs:0,retryDelayMs:0,sleep:async()=>{}};
const selector = {route:'electricity/retail-sales',dataColumn:'sales',facets:{stateid:'CA',sectorid:'ALL'},frequency:'annual',start:'2020',end:'2024'};
function fromKey(key) {
  const exclusions = key.excludedTopics;
  return {geographies:key.geographies.map(resolveApprovedGeography),topics:key.pairs.map(([product,activity])=>({product,activity,qualifiers:lexicalQualifiers(product,key.query)})),sector:key.sector,frequency:key.frequency,frequencyExplicit:key.explicit,
    excludedGeographies:key.excludedGeographies,excludedProducts:exclusions.filter(x=>x[0]==='product').map(x=>x[1]),excludedActivities:exclusions.filter(x=>x[0]==='activity').map(x=>x[1]),excludedSectors:exclusions.filter(x=>x[0]==='sector').map(x=>x[1]),clarification:{needed:Boolean(key.clarification),about:key.clarification}};
}
test('lookup freeze and mechanical form checks remain unchanged',()=>{
  const manifest=json('evidence/eia-lookup-list/freeze-manifest.json');
  for(const [path,hash] of Object.entries(manifest.sha256)) assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash,path);
  const source=readFileSync(new URL('../lib/sources/eia/locked-form.js',import.meta.url),'utf8');
  assert.equal(createHash('sha256').update(source.slice(source.indexOf('export function checkLockedForm('),source.indexOf('export function blockedLockedIntent('))).digest('hex'),manifest.lockedFormChecksSha256);
});
test('lookup rows have all required fields and only explicit checked combinations',()=>{
  assert.equal(new Set(lookupCatalog.rows.map(row=>row.key)).size,lookupCatalog.rows.length);
  const originals=JSON.parse(readFileSync(new URL('../data/eia/lookup-list.json',import.meta.url))).rows;
  assert.deepEqual(lookupCatalog.rows.slice(0,originals.length),originals);
  assert.ok(lookupCatalog.rows.slice(originals.length).every(row=>row.generatedFrom && row.verification==='verified'));
  for(const row of lookupCatalog.rows){
    for(const field of ['product','activity','geographyKind','route','dataColumn','unit','basisLabel','description','eiaName','verification']) assert.ok(row[field],row.key+':'+field);
    assert.ok(row.metadataReferences.length&&row.frequencies.length);assert.equal(typeof row.otherMeasuresExist,'boolean');
    assert.ok(row.generatedFrom ? Object.hasOwn(row.placeFacets,row.sampleGeography) : lookupCatalog.routes[row.route].geographies[row.region?.code||row.sampleGeography]);
    assert.ok(Object.hasOwn(row,'qualifier')&&Object.hasOwn(row,'sectorSupported')&&Object.hasOwn(row,'sectorMapping'));
  }
});
for(const key of [...original,...independent]) test('frozen lookup selection '+key.id,()=>{
  const g=gold.find(g=>g.id===key.id);
  const request=g?lookupRequestFromIntent(convertLockedForm(g.form,key.query)):fromKey(key);
  assert.deepEqual(request.geographies.map(g=>g.code),key.geographies);
  if(key.clarification){assert.equal(request.clarification.needed,true);return;}
  for(const e of expected.questions.find(q=>q.id===key.id).entries){
    const geo=request.geographies.find(g=>g.code===e.geographyCode),topic=request.topics.find(t=>t.product===e.product&&t.activity===e.activity);
    const rows=findLookupRows(request,geo,topic,pending);
    if(e.outcome==='not_available'){assert.equal(rows.length,0);assert.ok(findNotAvailable(request,geo,topic));continue;}
    assert.ok(rows.length,'Expected a compatible row.');const row=rows[0],s=buildLookupSelector(row,geo,request);
    assert.equal(s.route,e.route);assert.equal(s.dataColumn,e.measure);assert.equal(s.frequency,e.frequency);assert.equal(row.unit,e.unit);
    for(const [facet,value] of Object.entries(e.facets))assert.equal(s.facets[facet],value,facet);
  }
});
test('unverified rows cannot be selected on the main path',()=>{
  const request=fromKey(original[0]);const catalog=structuredClone(lookupCatalog);catalog.rows.forEach(row=>row.verification='pending');
  assert.deepEqual(findLookupRows(request,request.geographies[0],request.topics[0],{catalog}),[]);
});
test('explicit residential sector selects RES; absent sector stays ALL',()=>{
  const r=fromKey(independent[1]),geo=r.geographies[0],row=findLookupRows(r,geo,r.topics[0],pending)[0];
  assert.equal(buildLookupSelector(row,geo,r).facets.sectorid,'RES');r.sector=null;
  assert.equal(buildLookupSelector(row,geo,r).facets.sectorid,'ALL');
});
test('unsupported sector and unrelated qualifier never relax to the total',()=>{
  const r=fromKey(original[6]),g=r.geographies[0];r.sector='residential';assert.equal(findLookupRows(r,g,r.topics[0],pending).length,0);
  r.sector=null;r.topics[0].qualifiers=['dry natural gas'];assert.equal(findLookupRows(r,g,r.topics[0],pending).length,0);
});
test('crude exports require the qualifier and never answer whole petroleum automatically',()=>{
  const r=fromKey(independent[0]),g=r.geographies[0];assert.equal(findLookupRows(r,g,r.topics[0],pending)[0].qualifier,'crude oil');
  r.topics[0].qualifiers=[];assert.equal(findLookupRows(r,g,r.topics[0],pending).length,0);
});
test('non-hydro aggregate cannot silently answer an unqualified renewable request',()=>{
  const r=fromKey(original.find(x=>x.id==='F14')),g=r.geographies[0];assert.equal(findLookupRows(r,g,r.topics[0],pending).length,1);
  r.excludedProducts=[];assert.ok(findLookupRows(r,g,r.topics[0],pending).every(row=>!row.excludedProducts?.length));
});
test('Lower 48 can exclude Alaska but cannot exclude a state it includes',()=>{
  const r=fromKey(independent[6]),g=r.geographies[0],row=findLookupRows(r,g,r.topics[0],pending)[0];
  assert.equal(buildLookupSelector(row,g,r).facets.duoarea,'R48');assert.ok(row.region.label.includes('federal offshore'));
  r.excludedGeographies=['TX'];assert.equal(findLookupRows(r,g,r.topics[0],pending).length,0);
});
test('excluded positive geography and its national parent cannot be fetched',()=>{
  const r=fromKey(original.find(x=>x.id==='F12')),g=r.geographies[0],row=findLookupRows(r,g,r.topics[0],pending)[0];
  for(const excluded of ['TX','USA']){r.excludedGeographies=[excluded];assert.equal(rowFitsGeography(row,g,r),false);}
});
test('crude physical-unit mapping selects a catalogue series instead of mixing volumes and daily rates',()=>{
  const r=fromKey(original.find(x=>x.id==='F11')),g=r.geographies[0],row=findLookupRows(r,g,r.topics[0],pending)[0];
  assert.equal(buildLookupSelector(row,g,r).facets.series,'MCRFPND1');
});
test('recorded EIA pages are collected to the reported total with correct offsets',async()=>{
  const offsets=[];let n=0;const result=await fetchEiaData(selector,{...options,pageSize:2,fetch:async url=>{offsets.push(Number(url.searchParams.get('offset')));assert.equal(url.hostname,'api.eia.gov');return reply(pages[n++].response);}});
  assert.deepEqual(offsets,[0,2,4]);assert.equal(result.rows.length,5);assert.equal(result.total,5);assert.equal(result.complete,true);
  assert.deepEqual(result.rows.map(x=>x.period),['2020','2021','2022','2023','2024']);assert.equal(result.request,undefined);
});
test('EIA per-request limit is 5000 rows even when the caller asks for more',async()=>{
  await fetchEiaData(selector,{...options,pageSize:99999,fetch:async url=>{assert.equal(url.searchParams.get('length'),'5000');return reply({frequency:'annual',total:'0',data:[]});}});
});
test('page ceiling returns visible incompleteness, not a complete truncated answer',async()=>{
  const result=await fetchEiaData(selector,{...options,pageSize:2,maxPages:1,fetch:async()=>reply(pages[0].response)});
  assert.equal(result.complete,false);assert.equal(result.limitReached,true);assert.equal(result.rows.length,2);assert.equal(result.total,5);
});
test('changing totals and repeated pages are incomplete',async()=>{
  let n=0;const changed=await fetchEiaData(selector,{...options,pageSize:2,fetch:async()=>{const p=structuredClone(pages[Math.min(n++,2)].response);if(n>1)p.total='6';return reply(p);}});
  assert.equal(changed.complete,false);assert.equal(changed.totalChanged,true);
  const repeated=await fetchEiaData(selector,{...options,pageSize:2,fetch:async()=>reply(pages[0].response)});assert.equal(repeated.complete,false);assert.equal(repeated.repeatedPage,true);assert.equal(repeated.pages,2);
});
test('empty data is a complete empty response, not a transport error',async()=>{
  const result=await fetchEiaData(selector,{...options,fetch:async()=>reply({frequency:'annual',total:'0',data:[]})});assert.equal(result.complete,true);assert.deepEqual(result.rows,[]);
});
for(const [name,status,body,kind,reason] of [
 ['rate limit',429,'OVER_RATE_LIMIT','busy','rate_limited'],['body rate limit',200,JSON.stringify({response:'OVER_RATE_LIMIT'}),'busy','rate_limited'],
 ['outage',503,'outage','unavailable','upstream_unavailable'],['malformed',200,'not json','unavailable','upstream_invalid_response'],
 ['column',400,JSON.stringify({error:'Invalid data bogus provided.'}),'request_problem','invalid_column'],['long URI',414,'html','request_problem','uri_too_long']])
 test('classified EIA error: '+name,async()=>{let calls=0;await assert.rejects(fetchEiaData(selector,{...options,fetch:async()=>{calls++;return {ok:status===200,status,text:async()=>body};}}),e=>e.kind===kind&&e.reason===reason);assert.equal(calls,kind==='request_problem'?1:2);});
test('timeout is slow, bounded, and does not expose a request URL or key',async()=>{
  let calls=0;await assert.rejects(fetchEiaData(selector,{...options,timeoutMs:2,fetch:async(url,{signal})=>{calls++;return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error(String(url)))));}}),e=>e.kind==='slow'&&!e.message.includes('offline-test-key'));assert.equal(calls,2);
});
test('transport exceptions cannot echo sensitive URL details',async()=>{
 await assert.rejects(fetchEiaData(selector,{...options,fetch:async()=>{throw new Error('api_key=sensitive-transport-detail');}}),e=>e.reason==='upstream_unreachable'&&!e.message.includes('sensitive'));
});
test('metadata requests drop the credential-bearing request echo',async()=>{
 const value=await fetchEiaMetadata('seds',{...options,fetch:async()=>({ok:true,status:200,text:async()=>JSON.stringify({response:{id:'seds'},request:{api_key:'offline-test-key'}})})});assert.deepEqual(value,{id:'seds'});
});
for(const [start,end,frequency,problem] of [
 ['2023-02-29',null,'weekly','invalid_period'],['2024-02-29',null,'weekly',null],['2024-Q4','2024-10','monthly',null],['2024-12','2024','monthly','inverted_period_range'],['2024-12','2024','annual',null],['2024-01-01T02-06','2024-01-01T08+00','local-hourly',null],['2024-01-01',null,'local-hourly','invalid_period'],['2024-Q5',null,'quarterly','invalid_period']])
 test('frequency-aware bounds '+[start,end,frequency].join('/'),()=>assert.equal(periodBoundProblem({start,end,frequency}),problem));
test('invalid bounds fail before a network request',async()=>{
 let calls=0;await assert.rejects(fetchEiaData({...selector,frequency:'weekly',start:'2023-02-29'},{...options,fetch:async()=>{calls++;}}),e=>e.kind==='request_problem');assert.equal(calls,0);
});
test('row checker rejects empty data, wrong units and extra series even if the route exists',async()=>{
 const catalog=structuredClone(lookupCatalog);catalog.rows=catalog.rows.filter(r=>r.key==='country-total-energy-consumption');
 const route=json('evidence/eia-lookup-list/metadata/international-route.json').body.response;
 const sample=json('evidence/eia-lookup-list/metadata/sample-intl-44-2-ISL.json').body.response.data[0];
 const metadata=async path=>path.includes('/facet/')?{facets:[]}:route;
 const check=async rows=>checkLookupRows(catalog,{fetchMetadata:metadata,fetchData:async()=>({rows,complete:true,total:rows.length,frequency:'annual'})});
 assert.equal((await check([sample])).records[0].pass,true);
 for(const rows of [[],[{...sample,unitName:'wrong units'}],[sample,sample],[{...sample,countryRegionId:'IRL'}]])assert.equal((await check(rows)).records[0].pass,false);
});
