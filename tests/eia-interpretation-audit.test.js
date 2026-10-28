import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { test } from 'node:test';
import { gunzipSync } from 'node:zlib';
import { interpretQueryWithRules, normalizeSubmittedIntent } from '../lib/sources/eia/interpret-query.js';
import { buildLocalCandidatePipeline } from '../lib/sources/eia/candidate-pipeline.js';
import { retrieveLocalCandidates } from '../lib/sources/eia/local-retrieval.js';
import { normalizeBulkSeries } from '../scripts/eia-metadata/normalize.js';

const matrix = JSON.parse(readFileSync(new URL('./fixtures/eia/interpretation-audit.json', import.meta.url)));
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

// The frozen approved dictionary is independent of interpreter output. Same-name state/country
// ambiguity is tested separately against the documented context rule.


function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};}

test('builder preserves comma-bearing official geography labels and product punctuation',()=>{
 for(const [code,name] of [['GMB','Gambia, The'],['DDR','Germany, East'],['DEUW','Germany, West'],['CAN','Canada']]){
 const raw={series_id:`INTL.44-2-${code}-QBTU.A`,name:`Crude oil, NGPL, and other liquids consumption, ${name}, Annual`,geography:code,f:'A',units:'quadrillion Btu',start:'1980',end:'2024'};
 assert.equal(normalizeBulkSeries(raw,{routeFamily:'international'}).geography.name,name);
 }
});

function distance(a,b){const row=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=row[0];row[0]=i;for(let j=1;j<=b.length;j++){const old=row[j];row[j]=Math.min(row[j]+1,row[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old;}}return row[b.length];}

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
