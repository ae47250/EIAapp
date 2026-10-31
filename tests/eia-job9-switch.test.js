import test from 'node:test';
import assert from 'node:assert/strict';
import {typoRepairEnabled,placeInjectionEnabled,namedPartRestoreEnabled} from '../lib/sources/eia/text-repair.js';
import {resolveQuotedPlaces,ordinaryPlaceMentions} from '../lib/sources/eia/lookup-geography.js';
import {repairProductNearMisses,normalizeLinkingWords,normalizeAmbiguity} from '../lib/sources/eia/lookup-ambiguity.js';
import {restoreNamedParts,quotedNamedParts} from '../lib/sources/eia/locked-form-evidence.js';
import {normalizeLockedFormV2,interpretLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
const f=()=>({geographies:[{geography:'TX | Texas | US state',quoted_words:'Texas',is_default:false}],excluded_geographies:[],topics:[{product:'petroleum',activity:'production',quoted_words:'oil production'}],excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},unsupported_words:[],clarification:{needed:false,about:null,options:[]}});
const withFlags=(values,fn)=>{const keys=['EIA_REPAIR_G1','EIA_REPAIR_G2','EIA_REPAIR_G3'],old=keys.map(k=>process.env[k]);try{keys.forEach((k,i)=>process.env[k]=values[i]);return fn();}finally{keys.forEach((k,i)=>old[i]===undefined?delete process.env[k]:process.env[k]=old[i]);}};
test('G1 reaches one-edit place repair, product repair and linker repair',()=>{
 for(const on of [true,false])withFlags([on?'on':'OFF','off','off'],()=>{
  assert.equal(typoRepairEnabled(),on);
  assert.equal(resolveQuotedPlaces([],[],'coal production in Arkansa').items.length,on?1:0);
  const a=f();a.topics=[{product:null,activity:'production',quoted_words:'antural gas production'}];assert.equal(repairProductNearMisses(a,'antural gas production'),on);
  const b=f();b.unsupported_words=['ni'];b.clarification={needed:true,about:'other',options:[]};normalizeLinkingWords(b,'oil production ni Texas');assert.equal(b.unsupported_words.length,on?0:1);
 });
});
test('G2 reaches full-name and capital-code place injection',()=>{
 for(const on of [true,false])withFlags(['off',on?'on':'OFF','off'],()=>{
  assert.equal(placeInjectionEnabled(),on);
  assert.equal(resolveQuotedPlaces([],[],'coal production in Michigan').items.length,on?1:0);
  assert.equal(ordinaryPlaceMentions('coal in OH').find(m=>m.geo.code==='OH').accept,on);
 });
});
test('G3 reaches question-text named-part restoration; quote-path is always on',()=>{
 for(const on of [true,false])withFlags(['off','off',on?'on':'OFF'],()=>{
  assert.equal(namedPartRestoreEnabled(),on);
  const a=f();restoreNamedParts(a,'crude oil production in Texas');assert.equal(quotedNamedParts(a.topics[0]).includes('crude oil'),on);
  const b=f();b.topics[0].quoted_words='crude oil production';restoreNamedParts(b,'crude oil production in Texas');assert.deepEqual(quotedNamedParts(b.topics[0]),['crude oil']);
 });
});
test('owner ambiguity, state-group, typed kind and outage rules remain with every group off',async()=>{
 await withFlags(['off','off','off'],async()=>{
  const a=f();a.geographies=[];a.clarification={needed:true,about:'geography',options:[]};assert.match(normalizeLockedFormV2(a,'oil production Georgia').geographies[0].geography,/^GA/);
  const g=f();g.geographies=[{geography:'USA | United States | national',quoted_words:'US',is_default:false}];assert.equal(normalizeLockedFormV2(g,'oil production for all US states').geographies.length,0);
  const amb=f();amb.topics=[{product:'coal',activity:'production',quoted_words:'coal or oil production'}];normalizeAmbiguity(amb,'coal or oil production');assert.equal(amb.topics[0].product,null);
  const b=f();b.geographies=[{geography:'GA | Georgia | US state',quoted_words:'Georgia',is_default:false}];b.clarification={needed:true,about:'geography',options:[]};
  const empty={geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[{about:'geography',quoted_words:'country'}]};
  assert.match(applyReplyUpdate(b,'oil production Georgia',{about:'geography',reply:'country',answer:empty}).form.geographies[0].geography,/^GEO/);
  const outage=await interpretLockedFormV2('coal production in Texas',{apiKey:'',log:()=>{},rules:()=>({needsClarification:true,product:'coal'})});assert.equal(outage.product,'coal');
 });
});
