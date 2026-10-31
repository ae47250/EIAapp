import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {normalizeLockedFormV2,convertLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {clarificationFor} from '../lib/sources/eia/lookup-context.js';
import {geographyLabel} from '../lib/sources/eia/locked-form-schema.js';
import {resolveApprovedGeography} from '../lib/sources/eia/intent-routing.js';
import {sourceIntentPayload,clarificationResult} from '../lib/eia-intent-payload.js';
import {searchLookup} from '../lib/sources/eia/lookup-search.js';
import {lexicalQualifiers,lookupCatalog} from '../lib/sources/eia/lookup-list.js';
import {buildXlsx} from '../lib/client/xlsx.js';
import {execFileSync} from 'node:child_process';

const geography=(code,quoted_words)=>({geography:geographyLabel(resolveApprovedGeography(code)),quoted_words,is_default:false});
function form(query,place,topics,about='product'){
 return {geographies:[geography(place,query.match(/Arkansas|Texas|Ohio|United States|US|Saudi Arabia/)?.[0]||'')],excluded_geographies:[],topics:topics.map(t=>({product:t.product,activity:t.activity,quoted_words:query})),excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},unsupported_words:[],clarification:{needed:about!==null,about,options:about==='product'?[{value:'natural gas',label:'Natural Gas'},{value:'petroleum',label:'Gasoline'}]:[]}};
}
const normalize=(q,f)=>normalizeLockedFormV2(f,q);
for(const [query,state,topics,want] of [
 ['antural gas reserves in Arkansas','AR',[{product:null,activity:'reserves'}],[['natural gas','reserves']]],
 ['natrual gas consumption in Texas','TX',[{product:null,activity:'consumption'}],[['natural gas','consumption']]],
 ['coal and natual gas in Ohio','OH',[{product:'coal',activity:'consumption'},{product:null,activity:'consumption'}],[['coal','consumption'],['natural gas','consumption']]],
]) test('Q1 fixes a first-word typo in an adjacent multi-word product: '+query,()=>{
 const f=normalize(query,form(query,state,topics));
 assert.deepEqual(f.topics.map(t=>[t.product,t.activity]),want);
 assert.equal(f.clarification.needed,false);
});
test('Q1 Arkansas typo reaches data without a product question',async()=>{
 const q='antural gas reserves in Arkansas',intent=convertLockedFormV2(normalize(q,form(q,'AR',[{product:null,activity:'reserves'}])) ,q);
 const r=await searchLookup(q,sourceIntentPayload(intent),{},{fetchData:async selector=>({complete:true,total:1,rows:[{...selector.facets,period:'2024',value:12,unitName:'Bcf'}]})});
 assert.equal(r.needsClarification,false);assert.equal(r.results.flatMap(g=>g.countries||[]).some(c=>c.series?.points?.length),true);
});
for(const q of ['gas prices in Ohio','gass prices in Ohio'])test('Q1 preserves required ambiguous gas question: '+q,()=>{
 const state=q.includes('Ohio')?'OH':'USA',f=normalize(q,form(q,state,[{product:null,activity:'prices'}]));
 assert.equal(f.clarification.needed,true);assert.equal(f.clarification.about,'product');
 assert.deepEqual(clarificationFor(f,null,{query:q}).choices.map(c=>c.label),['Natural Gas','Gasoline']);
});
for(const q of ['national gas prices','gas station prices'])test('Q1 accepts the gas question for '+q,()=>{
 const f=normalize(q,form(q,'USA',[{product:null,activity:'prices'}]));
 if(f.clarification.needed)assert.deepEqual(clarificationFor(f,null,{query:q}).choices.map(c=>c.label),['Natural Gas','Gasoline']);
 else assert.ok(f.topics.some(t=>t.product==='petroleum'&&lexicalQualifiers('petroleum',t.quoted_words||'').includes('gasoline')));
 assert.ok(!f.topics.some(t=>t.product==='natural gas'));
});
test('Q1 natural gasoline remains petroleum gasoline',()=>{
 const q='natural gasoline production in Texas',f=normalize(q,form(q,'TX',[{product:'petroleum',activity:'production'}],null));
 assert.equal(f.topics[0].product,'petroleum');assert.deepEqual(lexicalQualifiers('petroleum',q),['gasoline']);assert.equal(f.clarification.needed,false);
});
test('Q1 leaves the existing “nat gas” interpretation unchanged',()=>{
 const q='nat gas production in Texas',f=normalize(q,form(q,'TX',[{product:'natural gas',activity:'production'}],null));
 assert.equal(f.topics[0].product,'natural gas');assert.equal(f.clarification.needed,false);
});
test('Q1 typo detection does not treat “has” in ordinary text as gas',()=>{
 const q='how much crude oil does saudi arabia export? not sure if eia even has that',f=normalize(q,form(q,'SAU',[{product:'petroleum',activity:'exports'}],null));
 assert.equal(f.clarification.needed,false);assert.equal(f.topics[0].product,'petroleum');
});
test('Q2 D6a revision changes only status labels',()=>{
 const old=JSON.parse(gunzipSync(readFileSync('evidence/eia-polish/set-d-polish.json.gz')));
 const revised=JSON.parse(gunzipSync(readFileSync('evidence/eia-polish/set-d-d6a-revision-2.json.gz')));
 const before=old.questions.find(q=>q.id==='D6a'),after=revised.question;
 const labels=['Available','Reported as zero every year','No data for these years','Not yet in our checked list','EIA does not publish this',"Not in EIA's catalogue"];
 assert.deepEqual(revised.statusLabels,labels);
 const strip=x=>({...x,entries:x.entries.map(e=>({...e,statusLabel:null}))});
 assert.deepEqual(strip(after),strip(before));
 assert.deepEqual(after.entries.map(e=>e.statusLabel),before.entries.map(e=>e.statusLabel==='No data for these years (EIA returned none)'?'Not yet in our checked list':e.statusLabel));
});
test('Q3 exact pre-run replay rule is recorded in AGENTS.md',()=>{
 const text=readFileSync('AGENTS.md','utf8');
 assert.ok(text.includes("- Before any paid or scored test run, run the complete offline test suite against the final code, including replays of saved AI responses, and fix every failure first. If the AI's instructions or input format changed, say which saved responses are out of date. A scored run that fails on something the offline suite would have caught is a process failure; report it as one."));
});
const workBookText=async blob=>JSON.parse(execFileSync('python3',['-c',`import sys,io,zipfile,json,xml.etree.ElementTree as E
n={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read())) as z: print(json.dumps([ ''.join(c.itertext()) for p in z.namelist() if p.startswith('xl/worksheets/') for row in E.fromstring(z.read(p)).find('s:sheetData',n) for c in row]))`],{input:Buffer.from(await blob.arrayBuffer()),encoding:'utf8'}));
const q4=JSON.parse(readFileSync('evidence/eia-job8/q4-freeze.json','utf8')).cases;
function unsupportedForm(testCase){const x=testCase.injectedForm,f=form(testCase.query,x.geography||'USA',[{product:x.product,activity:x.activity}],null);f.geographies=x.geography?[{...f.geographies[0],quoted_words:x.geographyQuote}]:[];if(x.sector)f.sector={value:x.sector,quoted_words:x.sectorQuote};f.unsupported_words=x.unsupported_words;f.clarification=x.clarification;return f;}
const clarificationText=result=>[result.unsupportedMessage,result.userMessage].filter(Boolean).join(' ');
test('Q4 ash content asks before offering the correctly scoped alternative',()=>{const x=q4.find(c=>c.id==='Q4-ash'),f=unsupportedForm(x),c=clarificationFor(f,null,{query:x.query});for(const word of x.questionMustQuote)assert.ok(c.userMessage.includes(`We can't look up '${word}' yet`));assert.equal(f.topics[0].activity,'consumption');assert.equal(f.sector.value,'electric power');assert.ok(c.choices.some(o=>o.label===x.dropButton));});
test('Q4 East Coast remains unresolved and keeps the unsupported sulfur detail visible',async()=>{const x=q4.find(c=>c.id==='Q4-sulfur'),q=x.query,f=unsupportedForm(x),intent=convertLockedFormV2(f,q),r=await searchLookup(q,sourceIntentPayload(intent),{});assert.deepEqual(f.geographies,[]);assert.equal(r.userMessage,'Which activity should I look up?');assert.match(clarificationText(r),/We can't look up 'sulfur content' yet/);assert.equal(r.results.length,0);assert.ok(r.choices.some(c=>/^Show .+ consumption instead$/.test(c.label)));});
test('Q4 dropped ash detail stays visible in result and Excel',async()=>{const x=q4.find(c=>c.id==='Q4-ash'),q=x.query+' electric power consumption',f=normalize(q,unsupportedForm(x)),intent=convertLockedFormV2({...f,sector:{value:'electric power',quoted_words:'electric power'},topics:f.topics.map(t=>({...t,quoted_words:q}))},q),initial=await searchLookup(q,sourceIntentPayload(intent),{}),button=initial.choices.find(o=>o.label===x.dropButton);assert.ok(button);const result=await searchLookup(q,sourceIntentPayload(initial.intent),button,{fetchData:async selector=>{const row=lookupCatalog.rows.find(r=>r.route===selector.route&&r.dataColumn===selector.dataColumn&&Object.entries(selector.facets).every(([key,value])=>JSON.stringify(r.fixedFacets?.[key])===JSON.stringify(value)));assert.ok(row);return {complete:true,total:1,rows:[{...selector.facets,period:'2024',[selector.dataColumn]:12,unitName:row.unit,'series-description':row.eiaName}]};}});const c=result.results[0].countries[0],notice=c.unsupportedNotice;assert.match(notice,/^This shows .+, not 'ash content'\.$/);assert.equal(result.results[0].unsupportedNotice,notice);assert.ok(readFileSync('components/search/SearchWorkspace.js','utf8').includes('result.unsupportedNotice'));assert.ok((await workBookText(buildXlsx(c.series))).some(t=>t.includes(notice)));});
test('Q4 a non-dropping geography button keeps unsupported detail unresolved',async()=>{const q='ash content of coal generation',f=form(q,'USA',[{product:'coal',activity:'generation'}],null);f.unsupported_words=['ash content'];f.geographies=[];f.clarification={needed:true,about:'geography',options:[]};const initial=await searchLookup(q,sourceIntentPayload(convertLockedFormV2(f,q)),{});assert.match(clarificationText(initial),/We can't look up 'ash content' yet/);const world=initial.choices.find(x=>x.label==='World total');assert.ok(world);const next=await searchLookup(q,sourceIntentPayload(initial.intent),world,{});assert.equal(next.needsClarification,true);assert.match(clarificationText(next),/We can't look up 'ash content' yet/);assert.equal(next.results.length,0);});
test('Q4 unsupported detail accompanies a separate product question on screen',()=>{const q='energy stuff',f=form(q,'USA',[{product:null,activity:null}],'product');f.unsupported_words=['stuff'];const c=clarificationFor(f,null,{query:q});assert.equal(c.userMessage,'Which product should I look up?');assert.equal(c.unsupportedMessage,"We can't look up 'stuff' yet.");assert.equal(clarificationResult({...c,unsupportedMessage:c.unsupportedMessage},q).unsupportedMessage,c.unsupportedMessage);const ui=readFileSync('components/search/SearchWorkspace.js','utf8');assert.ok(ui.includes('nextData.unsupportedMessage, nextData.userMessage'));});
test('Q4 unknown reactor technology asks first and labels any explicit data alternative',async()=>{const x=q4.find(c=>c.id==='Q4-reactors'),q=x.query,f=normalize(q,unsupportedForm(x)),initial=await searchLookup(q,sourceIntentPayload(convertLockedFormV2(f,q)),{});assert.equal(initial.needsClarification,true);for(const word of x.questionMustQuote)assert.ok(initial.userMessage.includes(`We can't look up '${word}' yet`));assert.ok(initial.choices.some(c=>c.label===x.dropButton));assert.equal(initial.results.length,0);const button=initial.choices.find(c=>c.label===x.dropButton),result=await searchLookup(q,sourceIntentPayload(initial.intent),button,{fetchData:async selector=>{const row=lookupCatalog.rows.find(r=>r.route===selector.route&&r.dataColumn===selector.dataColumn&&Object.entries(selector.facets).every(([key,value])=>JSON.stringify(r.fixedFacets?.[key])===JSON.stringify(value)));assert.ok(row);return {complete:true,total:1,rows:[{...selector.facets,period:'2024',[selector.dataColumn]:12,unitName:row.unit,'series-description':row.eiaName}]};}});const country=result.results[0].countries[0],notice=country.unsupportedNotice;assert.match(notice,/^This shows .+, not 'quantum entanglement reactors'\.$/);assert.ok(country.series.completenessNote.includes(notice));});
