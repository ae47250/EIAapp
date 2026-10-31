import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {interpretLockedFormV2} from '../../lib/sources/eia/locked-form-v2.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';

const revised=JSON.parse(readFileSync(new URL('./q1-freeze-revision-2.json',import.meta.url)));
const original=JSON.parse(readFileSync(new URL('./q1-freeze.json',import.meta.url)));
const query='coal and natual gas in Ohio';
const expected=revised.cases.find(item=>item.id==='Q1-coal-and-natual-gas');

test('owner correction preserves both products and expects an activity question',()=>{
 assert.equal(revised.supersedes,original.version);
 assert.equal(revised.passMark,'all 9 Q1 queries correct; unchanged');
 assert.equal(expected.kind,'typo_products_to_activity_question');
 assert.deepEqual(expected.topics,[['coal',null],['natural gas',null]]);
 assert.equal(expected.clarificationAbout,'activity');
 assert.equal(expected.activityQuestion,'Which activity should I look up?');
 assert.deepEqual(expected.forbiddenChoices,['Natural Gas','Gasoline']);
});

test('normal locked-form validation re-asks once, then shows the activity choices',async()=>{
 const form={
  geographies:[{geography:'OH | Ohio | US state',quoted_words:'Ohio',is_default:false}],
  excluded_geographies:[],
  topics:[{product:'coal',activity:null,quoted_words:'coal'},{product:'natural gas',activity:null,quoted_words:'natual gas'}],
  excluded_topics:[],sector:{value:null,quoted_words:null},
  frequency:{value:'annual',explicit:false,quoted_words:null},
  years:{start:null,end:null,quoted_words:null},unsupported_words:[],
  clarification:{needed:true,about:'activity',options:[]}
 };
 const requests=[];
 const interpreted=await interpretLockedFormV2(query,{
  apiKey:'offline-test-key',model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:2048,
  rules:()=>{throw new Error('Deterministic fallback must not replace the normal re-ask flow.');},
  log:()=>{},
  fetch:async(_url,init)=>{
   requests.push(JSON.parse(init.body));
   const body={id:`offline-${requests.length}`,status:'completed',model:'gpt-6-luna',usage:{input_tokens:100,output_tokens:50},
    output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(form)}]}]};
   return new Response(JSON.stringify(body),{status:200,headers:{'content-type':'application/json'}});
  }
 });
 assert.equal(requests.length,2,'the app should make exactly one validation re-ask');
 assert.ok(!requests[0].input.includes('The previous response failed local form checks'));
 assert.ok(requests[1].input.includes('The previous response failed local form checks'));
 const result=await searchLookup(query,sourceIntentPayload(interpreted),{});
 const locked=result.intent.lockedForm;
 assert.deepEqual(locked.topics.map(topic=>[topic.product,topic.activity]),expected.topics);
 assert.equal(locked.clarification.needed,true);
 assert.equal(locked.clarification.about,expected.clarificationAbout);
 assert.equal(result.userMessage,expected.activityQuestion);
 assert.ok(result.choices.length>0,'activity clarification must offer buttons');
 assert.ok(result.choices.every(choice=>choice.choice?.about==='activity'));
 assert.ok(!result.choices.some(choice=>expected.forbiddenChoices.includes(choice.label)));
 assert.equal(result.results.length,0,'no data is shown before the activity is chosen');
});
