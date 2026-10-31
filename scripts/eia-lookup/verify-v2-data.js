import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {lookupCatalog} from '../../lib/sources/eia/lookup-list.js';
import {upgradeV1Form} from '../../lib/sources/eia/locked-form-schema-v2.js';
import {geographyLabel} from '../../lib/sources/eia/locked-form-schema.js';
import {lookupRegions} from '../../lib/sources/eia/lookup-context.js';
import {fetchEiaData,fetchEiaMetadata} from '../../lib/sources/eia/eia-fetch.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {checkLookupRows} from './check-rows.js';
import {scoreData} from './score-data.js';
import {scoreC,isDeadEnd} from './score-c.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const dir=resolve(root,'evidence/eia-no-dead-ends/data-live-v2');
if(existsSync(dir))throw new Error('The live data evidence folder already exists; do not repeat the run.');
for(const [path,hash] of Object.entries(read('evidence/eia-no-dead-ends/freeze-manifest.json').sha256))if(createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex')!==hash)throw new Error('Frozen file changed: '+path);
const apiKey=readFileSync(resolve(homedir(),'Downloads/eia-api-key.txt'),'utf8').trim();
if(!apiKey)throw new Error('Existing EIA key is unavailable.');
mkdirSync(dir,{mode:0o700});
const save=(name,data)=>writeFileSync(resolve(dir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const opts={apiKey,paceMs:600,retries:0,timeoutMs:30000};
const metadata=new Map();
const meta=async path=>{if(!metadata.has(path))metadata.set(path,await fetchEiaMetadata(path,opts));return metadata.get(path);};
const rowCheck=await checkLookupRows(lookupCatalog,{...opts,only:['world-total-energy-consumption'],fetchMetadata:meta});
save('world-row-check.json',rowCheck);
if(!rowCheck.complete || rowCheck.records.some(r=>!r.pass))throw new Error('World row checker failed; evidence saved.');
console.log(JSON.stringify({phase:'World row checker',pass:true}));
const cset=read('tests/fixtures/eia/no-dead-ends/set-c.json').questions;
const get=id=>cset.find(c=>c.id===id);
const records=[];
for(const region of lookupRegions) {
 const form=structuredClone(get('C1b').form);form.geographies=[{geography:geographyLabel(region),quoted_words:region.name,is_default:false}];
 const query=`total energy consumption in ${region.name} 2000-2019`,responses=[];
 const result=await searchLookup(query,{interpreter:'openai_locked_form',lockedForm:form},{},{...opts,fetchData:async(selector)=>{const response=await fetchEiaData(selector,opts);responses.push({selector,response});return response;}});
 save(`region-${region.name.replaceAll(/[^a-zA-Z]+/g,'-')}.json`,{query,result,responses});
 if(result.results.some(r=>r.countries.some(c=>c.errorKind==='busy')))throw new Error('EIA rate limits blocked region checks.');
 const countries=result.results.flatMap(r=>r.countries),available=countries.filter(c=>c.series);
 const row=lookupCatalog.rows.find(r=>r.key==='country-total-energy-consumption');
 const catalog={...lookupCatalog,rows:available.map(c=>({...row,key:row.key+':'+c.geography.code,sampleGeography:c.geography.code}))};
 const checked=await checkLookupRows(catalog,{...opts,fetchMetadata:meta,fetchData:async selector=>{
   const response=responses.find(r=>r.selector.route===selector.route).response;
   const rows=response.rows.filter(item=>Object.entries(selector.facets).every(([k,v])=>String(item[k])===String(v)));
   return {...response,rows,total:rows.length};
 }});
 const pass=countries.length===region.code.split('+').length && !countries.some(c=>c.status==='error') && available.length>0 && checked.complete && checked.records.every(c=>c.pass);
 save(`region-check-${region.name.replaceAll(/[^a-zA-Z]+/g,'-')}.json`,checked);
 records.push({region:region.name,pass,members:countries.length,available:available.length,missing:countries.filter(c=>!c.series).map(c=>({code:c.geography.code,name:c.geography.name,status:c.status})),requests:responses.length});
 console.log(JSON.stringify({phase:'region checker',...records.at(-1)}));
 if(!pass){save('regions-summary.json',records);throw new Error('Region verification failed; do not repeat or push.');}
}
save('regions-summary.json',records);
const gold=read('tests/fixtures/eia/locked-form/gold-forms.json'),keys=read('tests/fixtures/eia/locked-form/answer-key.json'),expected=read('evidence/eia-lookup-list/expected-data.json');
const originals=[];
for(const k of keys){
 const form=upgradeV1Form(gold.find(g=>g.id===k.id).form);
 const result=await searchLookup(k.query,{interpreter:'openai_locked_form',lockedForm:form},{},opts);
 const score=scoreData(result,expected.questions.find(q=>q.id===k.id));
 const record={id:k.id,score,deadEnd:isDeadEnd(result)};originals.push(record);save(`gold-${k.id}.json`,{query:k.query,result,...record});console.log(JSON.stringify({phase:'original gold',id:k.id,correct:score.correct,errors:score.errors}));
 if(!score.correct || score.unlabelledWrongData || record.deadEnd){save('gold-summary.json',originals);throw new Error('Original gold pass mark failed; do not repeat or push.');}
}
save('gold-summary.json',originals);
const cRecords=[];
for(const c of cset){
 let result;
 if(c.id==='C1a' || c.id==='C1b'){
   const first=await searchLookup(get('C1').query,{interpreter:'openai_locked_form',lockedForm:get('C1').form},{},opts);
   if(c.id==='C1a')result=await searchLookup(get('C1').query,sourceIntentPayload(first.intent),first.choices[0],opts);
   else{const regions=await searchLookup(get('C1').query,sourceIntentPayload(first.intent),first.choices[1],opts);result=await searchLookup(get('C1').query,sourceIntentPayload(regions.intent),regions.choices.find(x=>x.label==='Europe'),opts);}
 }else result=await searchLookup(c.query,{interpreter:'openai_locked_form',lockedForm:c.form},{},opts);
 let latestEvidence;
 if(c.id==='C3'){
  const selector=result.selectedSeries?.selector;
  if(selector){const response=await fetchEiaData(selector,opts);latestEvidence={retrievedAt:new Date().toISOString(),selector,lastPeriod:response.rows.filter(x=>x.price!==null&&String(x.price).trim()&&Number.isFinite(Number(x.price))).map(x=>x.period).sort().at(-1),response};save('latest-C3.json',latestEvidence);}
 }
 const score=scoreC(result,c,{latestEvidence});cRecords.push({id:c.id,...score});save(`C-data-${c.id}.json`,{query:c.query,result,score});console.log(JSON.stringify({phase:'C real data',id:c.id,correct:score.correct,errors:[...score.formErrors,...score.outcomeErrors]}));
 if(!score.correct){save('c-data-summary.json',cRecords);throw new Error('C data preflight failed; do not repeat or push.');}
}
save('c-data-summary.json',cRecords);
save('summary.json',{finishedAt:new Date().toISOString(),world:true,regions:records.length,originalsCorrect:originals.filter(x=>x.score.correct).length,originals:originals.length,cDataCorrect:cRecords.filter(x=>x.correct).length,cData:cRecords.length,pass:true});
console.log(JSON.stringify({pass:true,originals:originals.length,cData:cRecords.length,regions:records.length}));
