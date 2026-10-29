import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {applyReplyUpdate,buildReplyUpdateSchema} from '../lib/sources/eia/locked-form-reply-update.js';
import {fieldReplyRequest} from '../lib/sources/eia/locked-form-reply.js';
import {lockedFormVocabulary,geographyCode,schemaCounts} from '../lib/sources/eia/locked-form-schema.js';
import {convertLockedFormV2,checkLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {interpretClarification} from '../lib/sources/eia/interpret-query.js';
import {sourceIntentPayload,clarificationReplyPayload} from '../lib/eia-intent-payload.js';
import {searchLookup,submittedContext} from '../lib/sources/eia/lookup-search.js';
import {POST} from '../app/api/interpret-query/route.js';
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const cases=read('tests/fixtures/eia/typed-reply-updates.json').cases;
const vocabulary=lockedFormVocabulary();
const item=(value,quoted_words=value)=>({value,quoted_words});
const geo=(code,quote)=>item(vocabulary.geography.find(g=>geographyCode(g)===code),quote);
const empty=()=>({geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]});
function answerFor(c){const a=empty();
 if(c.id==='activity-rich-answer')Object.assign(a,{geographies:[geo('AUS','Australia')],topics:[{product:item('coal'),activity:item('production')}],resolved_words:[{original_words:'stuff',quoted_words:'coal production'}]});
 if(c.id==='place-exact')a.geographies=[geo('ISL','iceland'),geo('NOR','norway')];
 if(c.id==='product')a.topics=[{product:item('natural gas'),activity:null}];
 if(c.id==='place-years-replacement')Object.assign(a,{geographies:[geo('JPN','Japan')],years:{start:2005,end:'latest',quoted_words:'from 2005'}});
 return a;
}
const response=answer=>Response.json({status:'completed',model:'offline-injected',output_text:JSON.stringify(answer)});
const apply=(c,answer=answerFor(c))=>applyReplyUpdate(c.form,c.query,{about:c.about,reply:c.reply,answer});
const syntheticData=async selector=>({rows:[{...selector.facets,period:String(selector.start || '2010'),[selector.dataColumn]:'1',unitName:selector.route==='natural-gas/cons/sum'?'MMCF':selector.facets.unit==='QBTU'?'quadrillion Btu':'thousand short tons'}],complete:true,total:1});
for(const c of cases)test('multi-field reply -> checked serialization -> data: '+c.id,async()=>{
 const before=JSON.stringify(c.form);let calls=0;
 const request=clarificationReplyPayload(c.query,convertLockedFormV2(c.form,c.query),c.reply);
 const intent=await interpretClarification(request.query,request.intentPayload,request.about,request.reply,{apiKey:'offline-placeholder',log:()=>{},fetch:async(_url,init)=>{
  calls++;const body=JSON.parse(init.body);assert.equal(body.text.format.name,'eia_reply_update');assert.ok(!body.input.includes(c.query));return response(answerFor(c));
 }});
 assert.equal(calls,1);assert.equal(JSON.stringify(c.form),before);assert.equal(intent.originalQuery,c.query);
 assert.deepEqual(intent.validatedGeographies.map(g=>g.code),c.expected.geographies);assert.equal(intent.product,c.expected.product);assert.equal(intent.activity,c.expected.activity);
 assert.deepEqual({start:intent.years.start,end:intent.years.end},c.expected.years);assert.equal(intent.lockedForm.clarification.about,null);
 assert.deepEqual(intent.lockedForm.sector,c.form.sector);assert.deepEqual(intent.lockedForm.frequency,c.form.frequency);
 assert.equal(intent.choiceHistory[0].type,'reply-update');
 const result=await searchLookup(c.query,sourceIntentPayload(intent),{},{fetchData:syntheticData});
 assert.equal(result.query,c.query);assert.equal(Boolean(result.needsClarification),false);assert.ok(result.results[0].countries.every(g=>g.series?.points.length));
 const replay=submittedContext(c.query,JSON.parse(JSON.stringify(sourceIntentPayload(result.intent))));
 assert.deepEqual(replay.intent.lockedForm,intent.lockedForm);assert.equal(replay.effectiveQuery,c.query);
});
test('all six fields may change together and every updated quote is checked against reply',()=>{
 const c={...cases[1],reply:'coal production in Japan residential monthly from 2005'};
 const a={...empty(),geographies:[geo('JPN','Japan')],topics:[{product:item('coal'),activity:item('production')}],sector:item('residential'),frequency:item('monthly'),years:{start:2005,end:'latest',quoted_words:'from 2005'}};
 const merged=apply(c,a);assert.equal(checkLockedFormV2(merged.form,c.query,merged.quoteSources).valid,true);
 assert.deepEqual(merged.form.topics,[{product:'coal',activity:'production',quoted_words:'coal'}]);assert.equal(merged.form.frequency.explicit,true);
 for(const [key,path] of [['geographies',0],['topics','product'],['sector',null],['frequency',null],['years',null]]){
  const bad=structuredClone(a),target=key==='topics'?bad.topics[0][path]:path===null?bad[key]:bad[key][path];target.quoted_words='energy consumption';
  assert.throws(()=>apply(c,bad),e=>e.code==='reply_quote_not_in_answer');
 }
});
test('unstated fields are unchanged across seeded single-field updates (seed 29102026)',()=>{
 let seed=29102026;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const variants=[['geographies',[geo('JPN','Japan')],'Japan'],['topics',[{product:item('coal'),activity:null}],'coal'],['topics',[{product:null,activity:item('production')}],'production'],['sector',item('residential'),'residential'],['frequency',item('monthly'),'monthly'],['years',{start:2005,end:'latest',quoted_words:'from 2005'},'from 2005']];
 for(let i=0;i<120;i++){
  const [key,value,reply]=variants[random()%variants.length],c={...cases[1],reply},a={...empty(),[key]:value};const merged=apply(c,a);
  for(const preserved of ['geographies','excluded_geographies','topics','excluded_topics','sector','frequency','years','unsupported_words'])if(preserved!==key)assert.deepEqual(merged.form[preserved],c.form[preserved],preserved);
  if(key==='topics'){const field=value[0].product?'activity':'product';assert.equal(merged.form.topics[0][field],c.form.topics[0][field]);}
 }
});
test('stated countries replace earlier countries in mention order; exclusions cannot turn positive',()=>{
 const c=structuredClone(cases[1]);c.form.geographies=[{geography:geo('FRA','France').value,quoted_words:'France',is_default:false}];c.query+=' France not Ireland';c.form.excluded_geographies=[{geography:geo('IRL','Ireland').value,quoted_words:'Ireland',is_default:false}];
 const merged=apply(c);assert.deepEqual(merged.form.geographies.map(g=>geographyCode(g.geography)),['ISL','NOR']);assert.deepEqual(merged.form.excluded_geographies,c.form.excluded_geographies);
 assert.throws(()=>apply({...c,reply:'Ireland'},{...empty(),geographies:[geo('IRL','Ireland')]}),e=>e.code.includes('included_and_excluded'));
});
test('partial topic updates retain every unstated activity; complete pairs keep their relationships',()=>{
 const c=structuredClone(cases[1]);c.query+=' coal imports';c.form.topics.push({product:'coal',activity:'imports',quoted_words:'coal imports'});
 const partial=apply({...c,reply:'natural gas'},{...empty(),topics:[{product:item('natural gas'),activity:null}]});
 assert.deepEqual(partial.form.topics.map(t=>[t.product,t.activity]),[['natural gas','consumption'],['natural gas','imports']]);
 const complete=apply({...c,reply:'coal production and natural gas imports'},{...empty(),topics:[{product:item('coal'),activity:item('production')},{product:item('natural gas'),activity:item('imports')}]});
 assert.deepEqual(complete.form.topics.map(t=>[t.product,t.activity]),[['coal','production'],['natural gas','imports']]);
});
test('unresolved wording and unrelated constraints survive other field updates',()=>{
 const c=structuredClone(cases[1]);c.form.unsupported_words=['per capita'];c.query+=' per capita';
 const merged=apply(c);assert.equal(merged.form.clarification.about,'other');assert.deepEqual(merged.form.unsupported_words,['per capita']);
 const vague=apply({...cases[1],reply:'iceland and somewhere else'},{...empty(),geographies:[geo('ISL','iceland')],unresolved:[{about:'geography',quoted_words:'somewhere else'}]});assert.equal(vague.form.clarification.about,'geography');
});
test('year range replacement rejects inherited end dates without reply evidence and supports all available',()=>{
 const c=cases[3],bad=answerFor(c);bad.years.end=2019;assert.throws(()=>apply(c,bad),e=>e.code.includes('year_not_in_quote'));
 const all=apply({...c,reply:'Japan all available years'},{...empty(),geographies:[geo('JPN','Japan')],years:{start:null,end:null,quoted_words:'all available years'}});
 assert.deepEqual(all.form.years,{start:null,end:null,quoted_words:null});
});
test('unambiguous country spelling corrections still work and strict schema rejects extra fields',()=>{
 const c={...cases[1],reply:'icelnd and norwy'},a={...empty(),geographies:[geo('ISL','icelnd'),geo('NOR','norwy')]};
 assert.deepEqual(apply(c,a).form.geographies.map(g=>geographyCode(g.geography)),['ISL','NOR']);
 assert.throws(()=>apply(c,{...a,query:'injected'}),e=>e.code==='reply_shape');assert.ok(schemaCounts(buildReplyUpdateSchema()).enumValues<=1000);
});
test('current HTTP POST accepts multi-field updates; client-derived fields cannot override replay',async t=>{
 const before={LOGIN_REQUIRED:process.env.LOGIN_REQUIRED,OPENAI_API_KEY:process.env.OPENAI_API_KEY};process.env.LOGIN_REQUIRED='off';process.env.OPENAI_API_KEY='offline-placeholder';
 t.after(()=>{for(const [key,value] of Object.entries(before))if(value===undefined)delete process.env[key];else process.env[key]=value;});
 const c=cases[0];t.mock.method(globalThis,'fetch',async()=>response(answerFor(c)));
 const body=clarificationReplyPayload(c.query,convertLockedFormV2(c.form,c.query),c.reply);
 const result=await POST(new Request('http://localhost/api/interpret-query',{method:'POST',body:JSON.stringify(body)}));assert.equal(result.status,200);
 const {intent}=await result.json();assert.equal(intent.countryCode,'AUS');assert.equal(intent.product,'coal');assert.equal(intent.needsClarification,false);
 const submitted=structuredClone(sourceIntentPayload(intent));submitted.lockedForm.years={start:1900,end:1901,quoted_words:'1900-1901'};
 assert.deepEqual(submittedContext(c.query,submitted).intent.lockedForm,intent.lockedForm);
});
test('new expectations and historical frozen files remain unchanged',()=>{
 for(const file of ['evidence/eia-typed-reply-updates/expectations-freeze.json','evidence/eia-typed-clarification/expectations-freeze.json','evidence/eia-no-dead-ends/freeze-manifest.json'])for(const [path,hash] of Object.entries(read(file).sha256))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+path,import.meta.url))).digest('hex'),hash,path);
 assert.equal(fieldReplyRequest(cases[0].form,'activity',cases[0].reply).reasoning.effort,'low');
});

test('a volunteered field does not erase a still-unanswered clarification',()=>{
 const c=structuredClone(cases[1]);c.query+=' France';c.form.geographies=[{geography:geo('FRA','France').value,quoted_words:'France',is_default:false}];c.reply='monthly';
 const result=apply(c,{...empty(),frequency:item('monthly')});assert.equal(result.form.clarification.about,'geography');assert.deepEqual(result.form.geographies,c.form.geographies);
});
