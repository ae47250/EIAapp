import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { interpretQueryWithRules, validateAiInterpretation, normalizeSubmittedIntent } from '../lib/sources/eia/interpret-query.js';
import { buildLocalCandidatePipeline } from '../lib/sources/eia/candidate-pipeline.js';
import { retrieveLocalCandidates } from '../lib/sources/eia/local-retrieval.js';
import { normalizeBulkSeries } from '../scripts/eia-metadata/normalize.js';

const matrix = JSON.parse(readFileSync(new URL('./fixtures/eia/interpretation-audit.json', import.meta.url)));
const workspace = readFileSync(new URL('../components/search/SearchWorkspace.js', import.meta.url), 'utf8');
const serializerSource = workspace.slice(workspace.indexOf('function appendIntentParams('), workspace.indexOf('\nfunction formatInterpreter('));
const serialize = runInNewContext(`(${serializerSource})`);
function submit(intent, q) {
  const params = serialize(new URLSearchParams({q}), intent);
  return normalizeSubmittedIntent(JSON.parse(params.get('intentPayload')), params.get('q'));
}
function aiFor(expected) {
  const pairs=expected.pairs || [[expected.product === undefined ? 'total energy' : expected.product,'consumption']];
  return {confidence:0.99, geographies:expected.codes.map(value=>({value,confidence:0.99})), conceptPairs:pairs.map(([product,activity],order)=>({product,activity,order,confidence:0.99})), fields:{
    country:{value:expected.codes[0],confidence:0.99},product:{value:pairs[0][0],confidence:0.99},activity:{value:pairs[0][1],confidence:0.99},
    sector:{value:expected.injectedSector || expected.sector,confidence:0.99},frequency:{value:expected.injectedFrequency || expected.frequency,explicit:expected.explicit,confidence:0.99}
  }};
}
function signature(i){const s=i.structuredIntent;return {codes:s.geographies.map(g=>g.code),pairs:s.conceptPairs.map(p=>[p.product,p.activity]),frequency:i.frequency,explicit:i.frequencyExplicit,sector:i.sector,route:s.route.family,clarify:i.needsClarification,exclusions:i.exclusions.map(e=>[e.type,e.value])};}
for (const item of matrix.cases) test(`frozen ${item.id}: ${item.q}`,async(t)=>{
  const e=item.expected;
  if(e.unresolved) {t.skip(e.disputed);return;} // Disputed meaning is recorded, not scored against a guessed country.
  for (const mode of ['rules','injected']) {
    if(mode==='rules' && e.rulesUnresolvedAllowed) continue;
    const i=mode==='rules'?interpretQueryWithRules(item.q):validateAiInterpretation(aiFor(e),item.q);
    const s=signature(i);
    assert.deepEqual(s.codes,e.codes,mode+' geography');
    assert.equal(s.frequency,e.frequency,mode+' frequency');assert.equal(s.explicit,e.explicit,mode+' explicit');assert.equal(s.sector,e.sector,mode+' sector');
    if(e.route)assert.equal(s.route,e.route,mode+' route');
    if(e.clarify!==undefined)assert.equal(s.clarify,e.clarify,mode+' clarification');
    if(e.pairs)assert.deepEqual(s.pairs,e.pairs,mode+' complete ordered pairs');
    if(e.product!==undefined)assert.equal(i.product,e.product);
    if(e.alternatives)assert.deepEqual(i.fields.product.alternatives,e.alternatives);
    assert.deepEqual(signature(submit(i,item.q)),s,mode+' browser round trip');
    if(e.clarify || e.empty || e.candidate){
      const p=await buildLocalCandidatePipeline(i);
      if(e.clarify)assert.equal(p.diagnostics.clarificationBlocked,true);
      if(e.empty)assert.equal(p.retrievals.flatMap(r=>r.displayCandidates).length,0);
      if(e.candidate){const raw=await retrieveLocalCandidates(i);assert.ok(raw.retrievals.some(r=>[...r.primaryCandidates,...r.fallbackCandidates].some(c=>c.series_id===e.candidate)));assert.ok(p.retrievals.some(r=>r.displayCandidates.some(c=>c.title.startsWith('Total energy consumption,'))));}
    }
  }
});
// The frozen approved dictionary is independent of interpreter output. Same-name state/country
// ambiguity is tested separately against the documented context rule.
test('every approved complete geography name survives exact and fuzzy competition',()=>{
 const names=new Map();for(const g of matrix.properties.exactNames){const codes=names.get(g.name)||new Set();codes.add(g.code);names.set(g.name,codes);}
 for(const [name,codes] of names){if(codes.size>1)continue;const code=[...codes][0];for(const q of [`energy consumption ${name}`,`please show the energy consumption for ${name}`]){
 const e={codes:[code],frequency:'annual',explicit:false,sector:null};const i=validateAiInterpretation(aiFor(e),q);
 assert.deepEqual(signature(i).codes,[code],q);assert.deepEqual(signature(submit(i,q)),signature(i),q+' submission');}}
});
test('supported aliases remain ordered and wording adds no countries',()=>{
 for(const [name,code] of Object.entries(matrix.properties.aliases)){const q=`please show the energy consumption for ${name}`;const i=validateAiInterpretation(aiFor({codes:[code],frequency:'annual',explicit:false}),q);assert.deepEqual(signature(i).codes,[code],q);}
});
function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}
test(`seed ${matrix.seed}: exact, excluded and filler invariants`,()=>{
 const rng=random(matrix.seed);const pool=matrix.properties.exactNames.filter(g=>g.type==='country' && /^[A-Z]{3}$/.test(g.code) && g.name!=='Georgia');
 for(let n=0;n<matrix.properties.seededSampleSize;n++){
  const a=pool[Math.floor(rng()*pool.length)];let b=pool[Math.floor(rng()*pool.length)];if(a.code===b.code){n--;continue;}
  const marker=matrix.properties.negationMarkers[n%matrix.properties.negationMarkers.length];const filler=matrix.properties.filler[n%matrix.properties.filler.length];
  const q=`${filler} energy consumption ${a.name} ${marker} ${b.name}`;const i=validateAiInterpretation(aiFor({codes:[a.code],frequency:'annual',explicit:false}),q);
  assert.deepEqual(signature(i).codes,[a.code],q);assert.deepEqual(signature(submit(i,q)),signature(i),q+' submission');
 }
});
test('builder preserves comma-bearing official geography labels and product punctuation',()=>{
 for(const [code,name] of [['GMB','Gambia, The'],['DDR','Germany, East'],['DEUW','Germany, West'],['CAN','Canada']]){
 const raw={series_id:`INTL.44-2-${code}-QBTU.A`,name:`Crude oil, NGPL, and other liquids consumption, ${name}, Annual`,geography:code,f:'A',units:'quadrillion Btu',start:'1980',end:'2024'};
 assert.equal(normalizeBulkSeries(raw,{routeFamily:'international'}).geography.name,name);
 }
});

function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old;}}return row[b.length];}
test(`seed ${matrix.seed}: spelling ties may remain unresolved and exact names win`,()=>{
 const rng=random(matrix.seed);const names=[...new Set(matrix.properties.exactNames.map(g=>g.name.toLowerCase()).filter(n=>/^[a-z]{4,}$/.test(n)))];
 const codes=new Map(names.map(n=>[n,matrix.properties.exactNames.filter(g=>g.name.toLowerCase()===n).map(g=>g.code)]));
 const failures=[];
 for(let n=0;n<80;n++){
  const name=names[Math.floor(rng()*names.length)];const at=Math.floor(rng()*(name.length-1));
  const typo=n%2?name.slice(0,at)+name[at+1]+name[at]+name.slice(at+2):name.slice(0,at)+name.slice(at+1);
  const matches=names.map(candidate=>({candidate,d:distance(typo,candidate)})).sort((a,b)=>a.d-b.d);
  const best=matches.filter(m=>m.d===matches[0].d);const exact=names.includes(typo);
  const allowed=exact?codes.get(typo):best.length===1?codes.get(best[0].candidate):[];
  // The short-token and state/country rules may legitimately decline to resolve an edit.
  const q=`energy consumption ${typo}`;const i=validateAiInterpretation(aiFor({codes:[codes.get(name)[0]],frequency:'annual',explicit:false}),q);
  const actual=signature(i).codes;
  if(actual.length && !actual.every(code=>allowed.includes(code)))failures.push({q,allowed,actual});
  assert.deepEqual(signature(submit(i,q)),signature(i),q+' resubmission');
 }
 assert.deepEqual(failures,[],JSON.stringify(failures));
});
test('complete candidate labels retain raw artifact hashes and narrower coverage',async()=>{
 const i=interpretQueryWithRules('Gambia, The energy consumption');const p=await buildLocalCandidatePipeline(i);
 assert.ok(p.retrievals[0].displayCandidates.length>0);
 assert.ok(p.retrievals[0].displayCandidates.every(c=>c.geography.name==='Gambia, The' && c.metadata_hash));
});

test('bounded retrieval leaves room for every valid activity in a multiple-request search',async()=>{
 const q='In Texas, show natural gas production, natural gas consumption, and electricity generation.';
 const result=await buildLocalCandidatePipeline(interpretQueryWithRules(q));
 assert.equal(result.retrievals.length,3);
 for(const retrieval of result.retrievals){assert.ok(retrieval.displayCandidates.length>0,retrieval.concept.activity);assert.ok(retrieval.diagnostics.totalCount<=50);}
 assert.ok(result.retrievals[1].displayCandidates.some(c=>c.series_id==='NG.NA1490_STX_2.A'));
});

test('official source and description product evidence prevent inexact scopes from scoring as exact',async()=>{
 const {rankLocalCandidates}=await import('../lib/sources/eia/local-ranking.js');
 const i=interpretQueryWithRules('In Texas, show natural gas production, natural gas consumption, and electricity generation.');
 const records=['domestic','natural-gas'].flatMap(name=>gunzipSync(readFileSync(new URL('../data/eia/builds/phase1b/'+name+'.jsonl.gz',import.meta.url))).toString().trim().split('\n').map(JSON.parse));
 const selected=records.filter(c=>['ELEC.CONS_TOT_BTU.NG-TX-1.A','ELEC.CONS_TOT_BTU.NG-TX-2.A','NG.NA1490_STX_2.A'].includes(c.series_id));
 assert.equal(selected.length,3);
 const raw=await retrieveLocalCandidates(i,{records:selected,enforceVersion:false});
 const ranked=rankLocalCandidates(i,raw).retrievals.find(r=>r.concept.activity==='consumption');
 const electricity=ranked.rankedCandidates.filter(c=>c.series_id.startsWith('ELEC.'));
 assert.equal(electricity.length,2);
 assert.ok(electricity.every(c=>c.ranking.signals.detectedProducts.includes('electricity') && c.ranking.signals.productCompatibility<1));
 assert.equal(ranked.displayCandidates[0].series_id,'NG.NA1490_STX_2.A');
});
