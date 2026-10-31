import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildFieldReplySchema,applyFieldReply,fieldReplyRequest} from '../lib/sources/eia/locked-form-reply.js';
import {convertLockedFormV2,lockedFormRequestV2,checkLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {lockedFormVocabulary,geographyCode,schemaCounts} from '../lib/sources/eia/locked-form-schema.js';
import {interpretClarification} from '../lib/sources/eia/interpret-query.js';
import {sourceIntentPayload,clarificationReplyPayload,canSearchIntent,appendLookupChoice} from '../lib/eia-intent-payload.js';
import {searchLookup,submittedContext} from '../lib/sources/eia/lookup-search.js';
import {POST as interpretationPost} from '../app/api/interpret-query/route.js';
import diagnosticHandler from '../lib/server/openai-diagnostic.js';
function env(t,key,value) { const before=process.env[key];process.env[key]=value;t.after(()=>{if(before===undefined)delete process.env[key];else process.env[key]=before;}); }
const read=path=>JSON.parse(readFileSync(new URL('../'+path,import.meta.url),'utf8'));
const cases=read('tests/fixtures/eia/typed-clarification.json').cases;
const vocab=lockedFormVocabulary();
const geo=(code,quote)=>({value:vocab.geography.find(g=>geographyCode(g)===code),quoted_words:quote});
const answerFor=c=>c.about==='geography'?{values:[geo('ISL',c.reply.split(' and ')[0]),geo('NOR',c.reply.split(' and ')[1])],excluded_values:[],unresolved:[]}
 :{updates:[{topic_index:0,values:[{value:c.about==='product'?'natural gas':'production',quoted_words:c.about==='product'?'natural gas':'production'}]}],unresolved:[]};
const response=answer=>Response.json({status:'completed',model:'offline-injected',output_text:JSON.stringify(answer)});
const noFetch=()=>{throw new Error('Unexpected network call');};
const dependencies=answer=>({apiKey:'offline-placeholder',fetch:async()=>response(answer),log:()=>{}});
const payload=c=>sourceIntentPayload(convertLockedFormV2(c.form,c.query));
async function recordedData(selector){
 const raw=read('evidence/eia-no-dead-ends/metadata/C1b-europe.json').response;
 const rows=raw.rows.filter(row=>Object.entries(selector.facets).every(([key,value])=>String(row[key])===String(value)));
 if(rows.length)return {...raw,rows,total:rows.length,complete:true};
 // Explicit synthetic observation verifies routing, not source availability.
 return {rows:[{...selector.facets,period:'2000',[selector.dataColumn]:'1',unitName:'MMcf'}],total:1,complete:true};
}
// These frozen expectations describe saved v1 reply history, not the active model contract.
const historicalIntent=c=>submittedContext(c.query,{...payload(c),originForm:c.form,choiceHistory:[{type:'reply',about:c.about,reply:c.reply,answer:answerFor(c)}]}).intent;
for(const c of cases)test('historical field-only reply replay: '+c.id,async()=>{
 const before=JSON.stringify(c.form),intent=historicalIntent(c);
 assert.equal(JSON.stringify(c.form),before);assert.equal(intent.originalQuery,c.query);
 assert.deepEqual(intent.validatedGeographies.map(g=>g.code),c.expected.geographies);
 assert.equal(intent.product,c.expected.product);assert.equal(intent.activity,c.expected.activity);
 assert.deepEqual({start:intent.years.start,end:intent.years.end},c.expected.years);
 assert.deepEqual(intent.lockedForm.sector,c.form.sector);assert.deepEqual(intent.lockedForm.frequency,c.form.frequency);assert.deepEqual(intent.lockedForm.years,c.form.years);
 assert.deepEqual(intent.lockedForm.excluded_topics,c.form.excluded_topics);
 assert.equal(intent.lockedForm.clarification.about,c.expected.nextQuestion);assert.notEqual(intent.lockedForm.clarification.about,c.about);
 if(c.about!=='geography')assert.deepEqual(intent.lockedForm.topics.map(t=>t.quoted_words),c.form.topics.map(t=>t.quoted_words));
 const result=await searchLookup(c.query,sourceIntentPayload(intent),{},{fetchData:recordedData});
 assert.equal(result.query,c.query);assert.deepEqual(result.intent.lockedForm,intent.lockedForm);
 assert.equal(Boolean(result.needsClarification),c.expected.outcome==='question');
 if(c.expected.outcome==='data')assert.ok(result.results[0].countries.every(country=>country.series?.points.length));
 else assert.equal(result.userMessage,'Which place should I look up?');
 const replay=await searchLookup(c.query,sourceIntentPayload(result.intent),{},{fetchData:recordedData});assert.deepEqual(replay.intent.lockedForm,intent.lockedForm);
});
test('field schemas stay strict and never permit unrelated model edits',()=>{
 for(const c of cases){const schema=buildFieldReplySchema(c.form,c.about);assert.equal(schema.additionalProperties,false);assert.ok(schemaCounts(schema).enumValues<=1000);
  assert.throws(()=>applyFieldReply(c.form,c.query,{about:c.about,reply:c.reply,answer:{...answerFor(c),years:{start:2010,end:2011}}}),/could not/);
 }
});
test('new quotes must be in reply, not borrowed from the original request; old fields cannot borrow reply text',()=>{
 const c=cases[0],answer=answerFor(c);answer.values[0].quoted_words='energy consumption';
 assert.throws(()=>applyFieldReply(c.form,c.query,{about:c.about,reply:c.reply,answer}),error=>error.code==='reply_quote_not_in_answer');
 const form=structuredClone(c.form);form.topics[0].quoted_words='iceland';
 assert.throws(()=>applyFieldReply(form,c.query,{about:c.about,reply:c.reply,answer:answerFor(c)}),error=>error.code.startsWith('merged_reply_'));
});
test('an invalid answer gets one reask, then preserves the current form and useful question',async()=>{
 const c=cases[0],answer=answerFor(c);answer.values[0].quoted_words='invented';let calls=0;const logs=[];
 const intent=await interpretClarification(c.query,payload(c),c.about,c.reply,{...dependencies(answer),fetch:async()=>{calls++;return response(answer);},log:event=>logs.push(event)});
 assert.equal(calls,2);assert.deepEqual(intent.lockedForm,c.form);assert.equal(canSearchIntent(intent),false);assert.equal(intent.freeText,true);assert.ok(intent.choices.length);assert.match(intent.userMessage,/couldn't use that answer/);
 for(const log of logs)assert.deepEqual(Object.keys(log).sort(),['checks','event','model','time']);
});
test('genuine ambiguity remains unresolved; a valid country does not erase unknown countries',()=>{
 const c=cases[0],answer={values:[geo('ISL','iceland')],excluded_values:[],unresolved:['somewhere else']};
 const result=applyFieldReply(c.form,c.query,{about:c.about,reply:'iceland and somewhere else',answer});
 assert.equal(result.form.clarification.about,'geography');assert.equal(result.form.geographies.length,1);
});
test('geography reply preserves earlier countries, ordered additions and explicit exclusions',()=>{
 const c=cases[0],form=structuredClone(c.form);form.geographies=[{geography:geo('FRA','France').value,quoted_words:'France',is_default:false}];form.excluded_geographies=[{geography:geo('IRL','Ireland').value,quoted_words:'Ireland',is_default:false}];
 const query=c.query+' France not Ireland';const result=applyFieldReply(form,query,{about:'geography',reply:c.reply,answer:answerFor(c)});
 assert.deepEqual(result.form.geographies.map(g=>geographyCode(g.geography)),['FRA','ISL','NOR']);assert.deepEqual(result.form.excluded_geographies,form.excluded_geographies);
 assert.throws(()=>applyFieldReply(form,query,{about:'geography',reply:'Ireland',answer:{values:[geo('IRL','Ireland')],excluded_values:[],unresolved:[]}}),error=>error.code==='reply_geography_excluded');
});
test('product reply updates missing topics only and retains other activities, topics and quotes',()=>{
 const c=cases[2],form=structuredClone(c.form);form.topics.push({product:'coal',activity:'production',quoted_words:'coal production'});
 const result=applyFieldReply(form,c.query+' coal production',{about:'product',reply:c.reply,answer:answerFor(c)});
 assert.deepEqual(result.form.topics[1],form.topics[1]);assert.equal(result.form.topics[0].activity,form.topics[0].activity);assert.equal(result.form.topics[0].quoted_words,form.topics[0].quoted_words);
 const bad=answerFor(c);bad.updates[0].topic_index=1;assert.throws(()=>applyFieldReply(form,c.query+' coal production',{about:'product',reply:c.reply,answer:bad}));
});
test('typed frequency answer preserves all other fields and retains its separate quote',()=>{
 const c=cases[0],form=structuredClone(c.form);form.clarification={needed:true,about:'frequency',options:[]};
 const result=applyFieldReply(form,c.query,{about:'frequency',reply:'monthly',answer:{value:'monthly',quoted_words:'monthly',unresolved:[]}});
 assert.deepEqual(result.form.frequency,{value:'monthly',explicit:true,quoted_words:'monthly'});assert.deepEqual(result.form.years,form.years);assert.equal(result.form.clarification.about,'geography');assert.equal(checkLockedFormV2(result.form,c.query,result.quoteSources).valid,true);
});
test('typed answer, next-question button and serialization preserve both evidence sources',async()=>{
 const c=cases[3],intent=historicalIntent(c);
 const first=await searchLookup(c.query,sourceIntentPayload(intent),{},{fetchData:noFetch});
 const regions=await searchLookup(c.query,sourceIntentPayload(first.intent),first.choices[1],{fetchData:noFetch});
 const params=appendLookupChoice(new URLSearchParams(),regions.intent,regions.choices.find(c=>c.label==='Europe'));
 const result=await searchLookup(c.query,JSON.parse(params.get('intentPayload')),{choice:JSON.parse(params.get('choice'))},{fetchData:async()=>({rows:[],complete:true,total:0})});
 assert.equal(result.intent.lockedForm.topics[0].activity,'production');assert.equal(result.intent.choiceHistory.length,3);assert.equal(result.intent.lockedForm.geographies.length,1);assert.equal(result.intent.needsClarification,true);assert.equal(result.intent.lockedForm.clarification.about,'other');assert.match(result.userMessage,/We can't look up 'stuff' yet/);
 const drop=result.choices.find(choice=>/^Show Total Energy production instead$/i.test(choice.label));assert.ok(drop);
 const resolved=await searchLookup(c.query,sourceIntentPayload(result.intent),drop,{fetchData:async()=>({rows:[],complete:true,total:0})});assert.equal(resolved.intent.needsClarification,false);assert.equal(resolved.intent.choiceHistory.length,4);assert.ok(resolved.results[0].unsupportedNotice.includes("not 'stuff'"));
});
test('unrelated fields in submitted merged form cannot override replayed history',async()=>{
 const c=cases[0],intent=historicalIntent(c);
 const submitted=sourceIntentPayload(intent);submitted.lockedForm.years={start:1900,end:1901,quoted_words:'1900-1901'};
 const result=await searchLookup(c.query,submitted,{},{fetchData:recordedData});assert.deepEqual(result.intent.lockedForm.years,c.form.years);
});
test('HTTP POST and client payload perform current interpretation without concatenation',async t=>{
 const c=cases[0];env(t,'LOGIN_REQUIRED','off');env(t,'OPENAI_API_KEY','offline-placeholder');
 t.mock.method(globalThis,'fetch',async(_url,init)=>{assert.equal(JSON.parse(init.body).text.format.name,'eia_reply_update');return response({geographies:answerFor(c).values,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]});});
 const request=clarificationReplyPayload(c.query,convertLockedFormV2(c.form,c.query),c.reply);
 const result=await interpretationPost(new Request('http://localhost/api/interpret-query',{method:'POST',body:JSON.stringify(request)}));assert.equal(result.status,200);const {intent}=await result.json();assert.equal(intent.originalQuery,c.query);assert.equal(intent.needsClarification,false);
 const invalid=await interpretationPost(new Request('http://localhost/api/interpret-query',{method:'POST',body:JSON.stringify({...request,about:'product'})}));assert.equal(invalid.status,400);
});
test('search and diagnostic use the same Luna default and honor OPENAI_MODEL',async t=>{
 env(t,'LOGIN_REQUIRED','off');env(t,'OPENAI_API_KEY','');env(t,'OPENAI_MODEL','');
 let body;const res={setHeader(){},status(){return this;},json(value){body=value;return this;}};
 await diagnosticHandler({method:'GET',headers:{}},res);assert.equal(body.model,'gpt-6-luna');assert.equal(body.model,lockedFormRequestV2('energy').model);assert.equal(body.model,fieldReplyRequest(cases[0].form,'geography','Iceland').model);
 env(t,'OPENAI_MODEL','owner-configured-model');await diagnosticHandler({method:'GET',headers:{}},res);assert.equal(body.model,lockedFormRequestV2('energy').model);assert.equal(body.model,'owner-configured-model');
});
test('typed-reply expected meanings remain frozen',()=>{
 const manifest=read('evidence/eia-typed-clarification/expectations-freeze.json');for(const [file,hash] of Object.entries(manifest.sha256))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash);
});

test('clarification POST keeps the existing authentication boundary',async t=>{
 env(t,'LOGIN_REQUIRED','on');
 t.mock.method(globalThis,'fetch',noFetch);
 const c=cases[0],body=clarificationReplyPayload(c.query,convertLockedFormV2(c.form,c.query),c.reply);
 const result=await interpretationPost(new Request('http://localhost/api/interpret-query',{method:'POST',body:JSON.stringify(body)}));
 assert.equal(result.status,401);
});
