import test from 'node:test';import assert from 'node:assert/strict';
import {textRepairEnabled} from '../lib/sources/eia/text-repair.js';
import {resolveQuotedPlaces,ordinaryPlaceMentions,reconcileExcludedPlaceQuotes} from '../lib/sources/eia/lookup-geography.js';
import {repairProductNearMisses,normalizeLinkingWords,normalizeAmbiguity} from '../lib/sources/eia/lookup-ambiguity.js';
import {restoreNamedParts,quotedNamedParts} from '../lib/sources/eia/locked-form-evidence.js';
import {normalizeLockedFormV2,interpretLockedFormV2,checkLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
import {clarificationFor} from '../lib/sources/eia/lookup-context.js';
const f=()=>({geographies:[{geography:'TX | Texas | US state',quoted_words:'Texas',is_default:false}],excluded_geographies:[],topics:[{product:'petroleum',activity:'production',quoted_words:'oil production'}],excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},unsupported_words:[],clarification:{needed:false,about:null,options:[]}});
const flags=fn=>{const old=process.env.EIA_TEXT_REPAIR;try{for(const flag of ['on','OfF']){process.env.EIA_TEXT_REPAIR=flag;fn(flag==='on');}}finally{if(old===undefined)delete process.env.EIA_TEXT_REPAIR;else process.env.EIA_TEXT_REPAIR=old;}};
test('Job9 flag reaches exact place injection, oneEdit repair, ordinary acceptance and excluded reconciliation',()=>flags(on=>{
 assert.equal(textRepairEnabled(),on);
 for(const text of ['coal production in Texas','coal production in Arkansa'])assert.equal(resolveQuotedPlaces([],[],text).items.length,on?1:0);
 assert.equal(ordinaryPlaceMentions('coal in OH').find(m=>m.geo.code==='OH').accept,on);
 assert.equal(reconcileExcludedPlaceQuotes([{geography:'AL | Alabama | US state',quoted_words:'Canada',is_default:false}]).length,on?1:0);
}));
test('Job9 flag reaches product repair, linking words and ambiguity normalization',()=>flags(on=>{
 const a=f();a.topics=[{product:null,activity:'production',quoted_words:'antural gas production'}];assert.equal(repairProductNearMisses(a,'antural gas production'),on);assert.equal(a.topics[0].product,on?'natural gas':null);
 const b=f();b.unsupported_words=['ni'];b.clarification={needed:true,about:'other',options:[]};normalizeLinkingWords(b,'oil production ni Texas');assert.equal(b.unsupported_words.length,on?0:1);
 const c=f();c.topics=[{product:'coal',activity:'production',quoted_words:'coal or oil production'}];normalizeAmbiguity(c,'coal or oil production');assert.equal(c.topics[0].product,on?null:'coal');
}));
test('Job9 restoreNamedParts question path switches; quoted_words path stays on',()=>flags(on=>{
 const a=f();restoreNamedParts(a,'crude oil production in Texas');assert.equal(quotedNamedParts(a.topics[0]).includes('crude oil'),on);
 const b=f();b.topics[0].quoted_words='crude oil production';restoreNamedParts(b,'crude oil production in Texas');assert.deepEqual(quotedNamedParts(b.topics[0]),['crude oil']);
}));
test('Job9 group reset switches, while owner defaults and code-built buttons stay on',()=>flags(on=>{
 const a=f();a.geographies=[{geography:'USA | United States | national',quoted_words:'US',is_default:false}];const n=normalizeLockedFormV2(a,'oil production for all US states');if(on)assert.equal(n.geographies.length,0);
 const b=f();b.geographies=[];b.clarification={needed:true,about:'geography',options:[]};const g=normalizeLockedFormV2(b,'oil production Georgia');assert.match(g.geographies[0].geography,/^GA/);
 assert.ok(clarificationFor(b,null,{query:'oil production'}).choices.some(c=>c.label==='World total'));
 const wrong=f();wrong.topics[0].product='coal';assert.equal(checkLockedFormV2(wrong,'oil production in Texas').valid,false);
}));
test('Job9 typed kind-reference and state expansion are behind the flag',()=>flags(on=>{
 const a=f();a.geographies=[{geography:'GA | Georgia | US state',quoted_words:'Georgia',is_default:false}];a.clarification={needed:true,about:'geography',options:[]};
 const empty={geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[{about:'geography',quoted_words:'country'}]};
 const r=applyReplyUpdate(a,'oil production Georgia',{about:'geography',reply:'country',answer:empty});assert.match(r.form.geographies[0].geography,on?/^GEO/:/^GA/);
 const b=f();b.geographies=[];b.topics=[{product:'coal',activity:'generation',quoted_words:'coal generation'}];b.clarification={needed:true,about:'geography',options:[]};
 const s=applyReplyUpdate(b,'coal generation',{about:'geography',reply:'all US states',answer:{...empty,unresolved:[{about:'geography',quoted_words:'all US states'}]}});assert.equal(s.form.geographies.length,on?51:0);
}));
test('Job9 off disables outage raw-text rules',async()=>{const old=process.env.EIA_TEXT_REPAIR;process.env.EIA_TEXT_REPAIR='off';try{const r=await interpretLockedFormV2('coal production in Texas',{apiKey:'',log:()=>{},rules:()=>{throw new Error('must not choose from text');}});assert.equal(r.needsClarification,true);assert.equal(r.product,null);}finally{if(old===undefined)delete process.env.EIA_TEXT_REPAIR;else process.env.EIA_TEXT_REPAIR=old;}});
