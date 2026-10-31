import test from 'node:test';
import assert from 'node:assert/strict';
import {checkLockedFormV2,repairLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
import {resolvedPlaceQuoteSupports} from '../lib/sources/eia/lookup-geography.js';
const form=()=>({geographies:[{geography:'TX | Texas | US state',quoted_words:'Texas',is_default:false}],excluded_geographies:[],topics:[{product:'natural gas',activity:'production',quoted_words:'natural gas production'}],excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},unsupported_words:[],clarification:{needed:false,about:null,options:[]}});
const query='natural gas production in Texas monthly residential';
const wrong={product:'coal',activity:'imports',sector:'commercial',frequency:'weekly'};
for(const field of Object.keys(wrong)){
 test(`Job9 initial ${field}: unsupported quote is rejected and dropped`,()=>{
  const f=form();if(['product','activity'].includes(field))f.topics[0][field]=wrong[field];else f[field]={value:wrong[field],quoted_words:field==='sector'?'residential':'monthly',...(field==='frequency'?{explicit:true}:{})};
  assert.equal(checkLockedFormV2(f,query).valid,false);
  const r=repairLockedFormV2(f,query);assert.equal(['product','activity'].includes(field)?r.topics[0][field]:r[field].value,field==='frequency'?'annual':null);
  assert.equal(r.clarification.needed,true);
 });
 test(`Job9 typed reply ${field}: unsupported quote is dropped and asked`,()=>{
  const f=form();f.clarification={needed:true,about:'product',options:[]};
  const answer={geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]};
  const quote={product:'natural gas',activity:'production',sector:'residential',frequency:'monthly'}[field];
  if(['product','activity'].includes(field))answer.topics=[{product:null,activity:null,[field]:{value:wrong[field],quoted_words:quote}}];else answer[field]={value:wrong[field],quoted_words:quote};
  const r=applyReplyUpdate(f,query,{about:'product',reply:quote,answer});
  assert.equal(['product','activity'].includes(field)?r.form.topics[0][field]:r.form[field].value,field==='frequency'?'annual':null);
  assert.equal(r.form.clarification.needed,true);
 });
}
for(const [name,quote,want]of [['AR | Arkansas | US state','Arkansa',true],['OH | Ohio | US state','ohio',true],['ME | Maine | US state','marine',false],['IN | Indiana | US state','in',false],['AL | Alabama | US state','georgia',false]])test(`Job9 place evidence ${name} / ${quote}`,()=>assert.equal(resolvedPlaceQuoteSupports({geography:name,quoted_words:quote}),want));
for(const quote of ['antural gas','natrual gas','natual gas'])test(`Job9 accepts product evidence ${quote}`,()=>{const f=form();f.topics[0].quoted_words=quote+' production';assert.equal(checkLockedFormV2(f,quote+' production in Texas').valid,true);});
test('Job9 has is not evidence for natural gas',()=>{const f=form();f.topics[0].quoted_words='has production';assert.equal(checkLockedFormV2(f,'Texas has production').valid,false);});
import {clarificationFor} from '../lib/sources/eia/lookup-context.js';
import {sourceIntentPayload} from '../lib/eia-intent-payload.js';
import {searchLookup} from '../lib/sources/eia/lookup-search.js';
import {convertLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
test('Job9 sector rejection has code-built buttons and accepts a subsequent typed correction',()=>{
 const f=form();f.sector={value:'commercial',quoted_words:'residential'};const bad=repairLockedFormV2(f,query);
 const question=clarificationFor(bad,null,{query});assert.equal(question.userMessage,'Which sector should I look up?');assert.ok(question.choices.some(c=>c.label==='Residential'));
 const answer={geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:{value:'residential',quoted_words:'residential'},frequency:null,years:null,resolved_words:[],unresolved:[]};
 const fixed=applyReplyUpdate(bad,query,{about:'other',reply:'residential',answer});assert.equal(fixed.form.clarification.needed,false);assert.equal(fixed.form.sector.value,'residential');
});
test('Job9 frequency rejection offers only the mapped rows supported frequencies',()=>{
 const f=form();f.frequency={value:'weekly',explicit:true,quoted_words:'monthly'};const repaired=repairLockedFormV2(f,query),q=clarificationFor(repaired,null,{query});assert.equal(q.userMessage,'Which frequency should I look up?');assert.ok(q.choices.length);assert.ok(!q.choices.some(c=>c.label==='Weekly'));
});
test('Job9 topic components retain separate checked reply evidence through browser resubmission',async()=>{
 const f=form();f.clarification={needed:true,about:'product',options:[]};f.topics[0].product=null;
 const answer={geographies:null,excluded_geographies:null,topics:[{product:{value:'natural gas',quoted_words:'natural gas'},activity:null}],excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]};
 const fixed=applyReplyUpdate(f,query,{about:'product',reply:'natural gas',answer});assert.equal(checkLockedFormV2(fixed.form,query,fixed.quoteSources).valid,true);
 const payload={interpreter:'openai_locked_form',lockedForm:fixed.form,originForm:f,choiceHistory:[{type:'reply-update',about:'product',reply:'natural gas',answer}]};
 const result=await searchLookup(query,payload,{},{fetchData:async()=>({rows:[],complete:true,total:0})});assert.equal(result.intent.lockedForm.topics[0].product,'natural gas');assert.equal(result.intent.lockedForm.topics[0].activity,'production');
});
