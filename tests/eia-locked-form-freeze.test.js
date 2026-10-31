import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scoreMeaning, firstRunPass } from '../scripts/eia-locked-form/score.js';
import { buildLockedFormSchema, schemaCounts, checkLockedFormShape, geographyCode } from '../lib/sources/eia/locked-form-schema.js';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const keys = JSON.parse(read('./fixtures/eia/locked-form/answer-key.json'));
const forms = JSON.parse(read('./fixtures/eia/locked-form/gold-forms.json'));
const mutate = (form, fn) => { const copy = structuredClone(form); fn(copy); return copy; };
test('frozen original JSON answer key agrees with original expectation table and policies', () => {
 const text=read('../evidence/eia-locked-form/original-expectations.md');
 const rows=text.split('\n').filter(x=>/^\|\d+\|/.test(x)); assert.equal(rows.length,10);
 for(const row of rows){const [id,query,geo,pairs,freq,excluded,clarify]=row.slice(1,-1).split('|');const k=keys.find(k=>k.id==='O'+id);
  assert.equal(k.query,query);assert.deepEqual(k.geographies,geo.split(', '));
  const expectedPairs=pairs.split('; ').map(x=>x.split(' / ').map(v=>v==='unresolved gas'?null:v));assert.deepEqual(k.pairs,expectedPairs);
  assert.equal(k.frequency,freq.split(';')[0]);assert.equal(k.explicit,freq.includes('explicit=true'));assert.equal(k.sector,null);
  assert.deepEqual(k.excludedGeographies,excluded==='none'?[]:[excluded]);assert.deepEqual(k.excludedTopics,[]);
  assert.equal(k.clarification,clarify==='no'?null:'product');assert.deepEqual(k.options,clarify==='no'?[]:['natural gas','petroleum']);
 }
 assert.match(text,/#10 may use an empty pairs array/);
});
test('fresh JSON answer key agrees with every cell of the user supplied table', () => {
 const rows=read('../evidence/eia-locked-form/fresh-expectations.txt').trim().split('\n');assert.equal(rows.length,14);
 for(const row of rows){const [first,geo,pairs,freq,excluded,clarification]=row.split('|').map(x=>x.trim());const [,id,query]=first.match(/^(F\d+)\s+(.*)$/);const k=keys.find(x=>x.id===id);
  assert.equal(k.query,query);assert.deepEqual(k.geographies,geo==='(none)'?[]:geo.split(', '));
  assert.deepEqual(k.pairs,[pairs.split('/').map(x=>x==='(unresolved)'?null:x)]);assert.equal(k.frequency,freq.split(',')[0]);assert.equal(k.explicit,freq.includes('explicit=true'));assert.equal(k.sector,null);
  const [type,value]=excluded.split(' ');assert.deepEqual(k.excludedGeographies,type==='geography'?[value]:[]);assert.deepEqual(k.excludedTopics,type==='product'?[[type,value]]:[]);
  assert.equal(k.clarification,clarification.startsWith('yes: product')?'product':clarification==='yes: geography'?'geography':null);
  assert.deepEqual(k.options,k.clarification==='product'?['natural gas','petroleum']:[]);
 }
});
test('runtime schema meets every documented count limit and references each vocabulary once', () => {
 const schema=buildLockedFormSchema(),c=schemaCounts(schema);
 assert.ok(c.objectProperties<=5000);assert.ok(c.maximumNesting<=10);assert.ok(c.totalStringCharacters<=120000);assert.ok(c.enumValues<=1000);assert.ok(c.largeEnums.every(x=>x.characters<=15000));
 assert.equal(schema.type,'object');assert.equal(schema.anyOf,undefined);
 assert.equal(schema.$defs.geography.enum.filter(x=>geographyCode(x)==='US').length,0);
 assert.equal(schema.$defs.geography.enum.filter(x=>geographyCode(x)==='USA').length,1);
 assert.match(schema.$defs.geography.enum.find(x=>geographyCode(x)==='GA'),/Georgia \| US state/);
 assert.match(schema.$defs.geography.enum.find(x=>geographyCode(x)==='GEO'),/Georgia \| country/);
 assert.deepEqual(Object.keys(schema.$defs),['geography','product','activity','sector','frequency']);
 function walk(x){if(!x||typeof x!=='object')return;if(x.type==='object'){assert.equal(x.additionalProperties,false);assert.deepEqual(x.required,Object.keys(x.properties));}Object.values(x).forEach(walk);}walk(schema);
});
test('schema counting includes named constants and follows references for nesting',()=>{
 const schema={type:'object',properties:{x:{$ref:'#/$defs/v'}},required:['x'],additionalProperties:false,$defs:{v:{type:'object',properties:{z:{const:'ok',type:'string'}},required:['z'],additionalProperties:false}}};
 assert.deepEqual(schemaCounts(schema),{objectProperties:2,enumValues:0,totalStringCharacters:5,maximumNesting:2,largeEnums:[]});
});
for(const [i,k] of keys.entries())test(`gold ${k.id}: correct meaning; independent wrong fields rejected`,()=>{
 const f=forms[i].form;assert.equal(forms[i].id,k.id);assert.equal(scoreMeaning(f,k).correct,true);assert.equal(checkLockedFormShape(f).valid,true);
 for(const change of [x=>x.frequency.explicit=!x.frequency.explicit,x=>x.sector.value='industrial',x=>x.clarification.needed=!x.clarification.needed,x=>x.topics[0].activity='invented'])assert.equal(scoreMeaning(mutate(f,change),k).correct,false);
 assert.equal(scoreMeaning(f,k,'timeout').correct,false);assert.equal(scoreMeaning(f,k,'rules').correct,false);
 // Incorrect quotes affect checks, never semantic scoring.
 assert.equal(scoreMeaning(mutate(f,x=>x.topics[0].quoted_words='not present'),k).correct,true);
});
test('scorer catches missing pairs, order, exclusions, gas guesses and wrong countries',()=>{
 const get=id=>forms.find(x=>x.id===id).form;const key=id=>keys.find(x=>x.id===id);
 for(const [id,fn] of [['O7',x=>x.topics.pop()],['O3',x=>x.geographies.reverse()],['O6',x=>x.excluded_geographies=[]],['F14',x=>x.excluded_topics=[]],['O10',x=>x.topics[0].product='natural gas'],['F9',x=>x.clarification.options=[]],['O1',x=>x.geographies[0].geography='IRL | Ireland | country']])assert.equal(scoreMeaning(mutate(get(id),fn),key(id)).correct,false);
 assert.equal(scoreMeaning(mutate(get('O1'),x=>x.geographies[0].geography='US | United States | national'),key('O1')).correct,true);
 assert.equal(scoreMeaning(mutate(get('O10'),x=>x.topics=[]),key('O10')).correct,true);
 assert.equal(scoreMeaning(null,key('O1')).correct,false);
});
test('pass gate requires full schedule, 44 first-attempt successes and mandatory clarification gates',()=>{
 const rows=keys.flatMap(k=>[1,2].map(repeat=>({id:k.id,repeat,meaning:{correct:true},checksPassed:true,clarificationNeeded:!!k.clarification})));
 assert.equal(firstRunPass(rows),true);assert.equal(firstRunPass(rows.slice(1)),false);
 const four=structuredClone(rows);for(const x of four.filter(x=>['F1','F2'].includes(x.id)))x.meaning.correct=false;assert.equal(firstRunPass(four),true);
 four.find(x=>x.id==='F3').meaning.correct=false;assert.equal(firstRunPass(four),false);
 for(const id of ['O10','F9','F13']){const r=structuredClone(rows);r.find(x=>x.id===id).meaning.correct=false;assert.equal(firstRunPass(r),false);}
 const unexpected=structuredClone(rows);unexpected[0].clarificationNeeded=true;assert.equal(firstRunPass(unexpected),false);
 const bad=structuredClone(rows);bad[0].id='bogus';assert.equal(firstRunPass(bad),false);
});
