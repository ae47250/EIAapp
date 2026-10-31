import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveQuotedPlaces,ordinaryPlaceMentions,placeSwitches} from '../lib/sources/eia/lookup-geography.js';
import {normalizeAmbiguity} from '../lib/sources/eia/lookup-ambiguity.js';
import {quotedNamedParts} from '../lib/sources/eia/locked-form-evidence.js';
import {normalizeLockedFormV2,interpretLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
const f=()=>({geographies:[{geography:'TX | Texas | US state',quoted_words:'Texas',is_default:false}],excluded_geographies:[],topics:[{product:'petroleum',activity:'production',quoted_words:'oil production'}],excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},unsupported_words:[],clarification:{needed:false,about:null,options:[]}});
test('removed G1 does not repair one-edit places, product typos or linking words',()=>{
 assert.equal(resolveQuotedPlaces([],[],'coal production in Arkansa').items.length,0);
 const a=f();a.topics=[{product:null,activity:'production',quoted_words:'antural gas production'}];normalizeAmbiguity(a,'antural gas production');assert.equal(a.topics[0].product,null);
 const b=f();b.unsupported_words=['ni'];b.clarification={needed:true,about:'other',options:[]};normalizeLockedFormV2(b,'oil production ni Texas');assert.deepEqual(b.unsupported_words,['ni']);
});
test('kept G2 always injects full-name and capital-code places',()=>{
 assert.equal(resolveQuotedPlaces([],[],'coal production in Michigan').items.length,1);
 assert.equal(ordinaryPlaceMentions('coal in OH').find(m=>m.geo.code==='OH').accept,true);
});
test('removed G3 leaves question-text named parts untouched; quote evidence remains',()=>{
 const a=f();normalizeLockedFormV2(a,'crude oil production in Texas');assert.deepEqual(quotedNamedParts(a.topics[0]),[]);
 const b=f();b.topics[0].quoted_words='crude oil production';assert.deepEqual(quotedNamedParts(b.topics[0]),['crude oil']);
});
test('owner ambiguity, state-group, typed kind and outage rules remain',async()=>{
  const a=f();a.geographies=[];a.clarification={needed:true,about:'geography',options:[]};assert.match(normalizeLockedFormV2(a,'oil production Georgia').geographies[0].geography,/^GA/);
  const korea=resolveQuotedPlaces([],[],'coal consumption Korea').items;
  assert.match(korea[0].geography,/^KOR/);
  assert.ok(placeSwitches({...f(),geographies:korea},undefined,'coal consumption Korea').some(c=>c.label.includes('North Korea')));
  const region=resolveQuotedPlaces([],[],'coal consumption Europe').items;
  assert.equal(region.length,1);assert.equal(region[0].geography.split(' | ')[1],'Europe');
  const tie=f();tie.geographies=[{geography:'NAM | Namibia | country',quoted_words:'Nambia',is_default:false}];
  normalizeAmbiguity(tie,'Nambia energy use');assert.equal(tie.clarification.about,'geography');assert.equal(tie.clarification.options.length,3);assert.equal(tie.geographies.length,0);
  const gas=f();normalizeAmbiguity(gas,'gas production in Texas');assert.equal(gas.clarification.about,'product');assert.equal(gas.clarification.options.length,2);
  assert.equal(ordinaryPlaceMentions('electricity prices in Ohio vs us average').find(m=>m.geo.code==='USA').accept,true);
  const g=f();g.geographies=[{geography:'USA | United States | national',quoted_words:'US',is_default:false}];assert.equal(normalizeLockedFormV2(g,'oil production for all US states').geographies.length,0);
  const amb=f();amb.topics=[{product:'coal',activity:'production',quoted_words:'coal or oil production'}];normalizeAmbiguity(amb,'coal or oil production');assert.equal(amb.topics[0].product,null);
  const b=f();b.geographies=[{geography:'GA | Georgia | US state',quoted_words:'Georgia',is_default:false}];b.clarification={needed:true,about:'geography',options:[]};
  const empty={geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[{about:'geography',quoted_words:'country'}]};
  assert.match(applyReplyUpdate(b,'oil production Georgia',{about:'geography',reply:'country',answer:empty}).form.geographies[0].geography,/^GEO/);
  const states=f();states.geographies=[];states.topics=[{product:'coal',activity:'generation',quoted_words:'coal generation'}];states.clarification={needed:true,about:'geography',options:[]};
  assert.equal(applyReplyUpdate(states,'coal generation',{about:'geography',reply:'all US states',answer:{...empty,unresolved:[{about:'geography',quoted_words:'all US states'}]}}).form.geographies.length,51);
  const outage=await interpretLockedFormV2('coal production in Texas',{apiKey:'',log:()=>{},rules:()=>({needsClarification:true,product:'coal'})});assert.equal(outage.product,'coal');
});
