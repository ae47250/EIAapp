// Mechanical source normalization. This is not an application-derived answer key.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p));
const sources={C:'evidence/eia-coverage/set-c-revision-2.json.gz',D:'evidence/eia-polish/set-d-polish.json.gz',E:'evidence/eia-finish/set-e.json',F:'evidence/eia-job8b/set-f-revision.json',I:'evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz',Q1:'evidence/eia-job8/q1-freeze-revision-2.json',Q4:'evidence/eia-job8b/q4-freeze.json'};
const supplemental={I:'evidence/eia-finish/independent-data-revision.json.gz',E:'evidence/eia-polish/set-e-policy.json'};
const independent=read(supplemental.I),epolicy=read(supplemental.E);
const revisions={D6a:'evidence/eia-polish/set-d-d6a-revision-2.json.gz',D8a:'evidence/eia-job8b/set-d-d8a-revision.json'};
const catalog={rows:['data/eia/lookup-list.json','data/eia/lookup-coverage.json.gz','data/eia/lookup-us-coverage.json.gz'].flatMap(p=>read(p).rows)};
const fields=['places','product','activity','sector','frequency','years','question','buttons','lookupRowKeys'];
const codes=items=>items.flatMap(g=>g.geography.split('|')[0].trim().split('+'));
const cases=[];
for(const [set,path]of Object.entries(sources)){
 const data=read(path),items=Array.isArray(data)?data:data.questions||data.cases;
 for(let source of items){
  if(set==='D'&&revisions[source.id])source=read(revisions[source.id]).question;
  const referenceData=set==='I'?independent.questions.find(q=>q.id===source.id):null;
  const referenceSelectors=set==='E'?epolicy.selectors[source.id]||null:null;
  const f=source.form,e=source.expected||{},expect=Object.fromEntries(fields.map(k=>[k,null]));
  const steps=(source.clicks||e.clicks||[]).map(label=>({type:'click',label}));
  if(source.typedReply||e.reply)steps.push({type:'reply',text:source.typedReply||e.reply});
  if(e.buttonPath)steps.push({type:'click',label:e.buttonPath});
  const q=source.question||source.unavailableQuestion;
  if(f){Object.assign(expect,{places:codes(f.geographies),product:f.topics.map(t=>t.product),activity:f.topics.map(t=>t.activity),sector:f.sector.value,frequency:f.frequency.value,years:[f.years.start,f.years.end],question:q?.text??'',buttons:q?.buttons??(source.switchButton?[source.switchButton]:null),clarification:f.clarification.needed?f.clarification.about:null,excludedPlaces:codes(f.excluded_geographies),excludedTopics:f.excluded_topics.map(t=>[t.product,t.activity,t.sector])});}
  if(set==='I')Object.assign(expect,{places:source.geographies,product:source.pairs.map(t=>t[0]),activity:source.pairs.map(t=>t[1]),sector:source.sector,frequency:source.frequency,question:source.clarification?`Which ${source.clarification==='geography'?'place':source.clarification} should I look up?`:'',clarification:source.clarification,excludedPlaces:source.excludedGeographies,excludedTopics:source.excludedTopics});
  if(set==='E'||set==='F')Object.assign(expect,{places:e.places??null,product:e.product?[e.product]:null,activity:e.activity?[e.activity]:null,frequency:e.annual?'annual':null,years:e.years??null,question:e.question?`Which ${e.question==='geography'?'place':e.question} should I look up?`:e.noQuestion?'':null,buttons:Array.isArray(e.buttons)?e.buttons:null,clarification:e.question??null,data:e.data??null});
  if(set==='Q1')Object.assign(expect,{places:source.place?[source.place]:null,product:source.topics?.map(t=>t[0])??(source.product?[source.product]:null),activity:source.topics?.map(t=>t[1])??null,question:source.activityQuestion??(source.kind==='gas_product_question'?'Which product should I look up?':null),buttons:source.kind==='gas_product_question'?['Natural Gas','Gasoline']:null,data:source.kind==='typo_product_to_data'?true:null});
  if(set==='Q4')Object.assign(expect,{places:source.injectedForm.geography?[source.injectedForm.geography]:[],product:[source.injectedForm.product],activity:source.allowedInitialActivities?null:[source.injectedForm.activity],sector:source.injectedForm.sector??null,question:source.placeQuestion??null});
  // Nulls stay unscored. Exact route/facet expectations can be mechanically
  // translated into row keys; unspecified data semantics are never invented.
  const entries=source.entries||referenceData?.entries;
  if(entries?.some(e=>e.outcome==='data'))expect.lookupRowKeys=entries.filter(e=>e.outcome==='data').map(e=>{
   const rows=catalog.rows.filter(r=>r.route===e.route&&r.dataColumn===e.measure&&r.product===e.product&&r.activity===e.activity&&Object.entries(r.fixedFacets||{}).every(([k,v])=>JSON.stringify(e.facets?.[k])===JSON.stringify(v)));
   return {place:e.geographyCode,product:e.product,activity:e.activity,keys:rows.map(r=>r.key)};
  });
  const natural=source.query==='natural gasoline production in Texas';
  cases.push({id:`${set}-${source.id}`,set,originalId:source.id,source:revisions[source.id]||path,query:source.query,parentId:source.parentId?`${set}-${source.parentId}`:null,steps,expected:expect,excludedFromJointAccuracy:natural,policy:natural?'natural-gasoline-notice':null,sourceCase:source,referenceData,referenceSelectors,referenceStates:e.states?epolicy.states:null});
 }
}
const result={version:1,sources,revisions,supplemental,sourceHashes:Object.fromEntries([...Object.values(sources),...Object.values(revisions),...Object.values(supplemental)].map(p=>[p,createHash('sha256').update(readFileSync(p)).digest('hex')])),fields,nullCounts:Object.fromEntries(fields.map(f=>[f,cases.filter(c=>c.expected[f]===null).length])),contentChanges:[{case:'Q1-Q1-natural-gasoline',reason:'Job 9 ordered correction: judge screen/lookup; natural gas fails; product question or petroleum requires cannot-look-up notice; exclude from all joint totals and flag decision.'}],normalizationNotes:['All source cases retained once, including D7q and duplicate queries. Historical repeat counts do not duplicate cases; ON/ON2 provide repetition.','Null fields are not scored. A source null sector remains null, as requested.','C1a/C1b execute their recorded clicks after their own initial query; no parent was recorded in their source.','Incomplete button subsets and descriptive predicates remain in sourceCase; no exact set is invented.','Row keys are all catalog rows matching the source route, measure, product, activity and fixed facets.'],cases};
writeFileSync('tests/golden/eia-suite.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({count:cases.length,sets:Object.fromEntries(Object.keys(sources).map(s=>[s,cases.filter(c=>c.set===s).length])),nullCounts:result.nullCounts}));
