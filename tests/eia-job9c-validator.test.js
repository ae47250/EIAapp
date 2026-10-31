import test from 'node:test';
import assert from 'node:assert/strict';
import {fieldQuoteSupports,supportedTopicField} from '../lib/sources/eia/locked-form-support.js';
import {resolvedPlaceQuoteSupports} from '../lib/sources/eia/lookup-geography.js';
import {normalizeLockedFormV2,checkLockedFormV2,repairLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {readFileSync} from 'node:fs';

const place=(geography,quoted_words)=>resolvedPlaceQuoteSupports({geography,quoted_words});
test('Job9c: a typo that names no other place leaves the model reading standing',()=>assert.equal(place('PA | Pennsylvania | US state','pensilvania'),true));
test('Job9c: a whole Virginia quote is not swallowed by a separate West Virginia',()=>assert.equal(place('VA | Virginia | US state','Virginia'),true));
test('Job9c: a longer competing place wins its own quote',()=>{
 assert.equal(place('VA | Virginia | US state','west virginia'),false);
 assert.equal(place('AL | Alabama | US state','georgia'),false);
});
test('Job9c: a quote inside a longer product name widens to that name',()=>{
 assert.equal(fieldQuoteSupports('product','petroleum','gas','natural gas production'),false);
 assert.equal(fieldQuoteSupports('product','natural gas','gas','natural gas production'),true);
});
test('Job9c: broad and misspelled topic quotes do not erase valid model readings',()=>{
 assert.equal(supportedTopicField({product:'total energy',activity:'production',quoted_words:'erngy production'},'product','erngy production'),true);
 assert.equal(supportedTopicField({product:'petroleum',activity:'consumption',quoted_words:'how much oil does Japan us'},'activity','how much oil does Japan us'),true);
 assert.equal(supportedTopicField({product:'nuclear energy',activity:'generation',quoted_words:'prdouction and consumption of nuclear energy'},'activity','prdouction and consumption of nuclear energy',null,[{product:'nuclear energy',activity:'consumption'}]),true);
});
test('Job9c: a competing product inside a quote rejects only that item',()=>{
 assert.equal(fieldQuoteSupports('product','coal','natural gas production in Texas','natural gas production in Texas'),false);
 assert.equal(fieldQuoteSupports('product','coal','natural gas production in Texas and Oklahoma','natural gas production in Texas and Oklahoma',[{product:'natural gas'}]),false);
 assert.equal(fieldQuoteSupports('activity','generation','consumption in Texas and Oklahoma','consumption in Texas and Oklahoma',[{activity:'consumption'}]),false);
});
const saved=JSON.parse(readFileSync(new URL('./golden/eia-job9c-first-turns.json',import.meta.url)));
const suite=JSON.parse(readFileSync(new URL('./golden/eia-suite.json',import.meta.url)));
const expected={
 'D-D1':{places:['BRA'],topics:[['total energy','production']]},
 'D-D2':{places:['JPN'],topics:[['petroleum','consumption']]},
 'D-D3':{places:['USA'],topics:[['nuclear','generation'],['nuclear','consumption']]},
 'E-E1':{places:['JPN'],topics:[['petroleum','consumption']]},
 'F-F5':{places:['JPN'],topics:[['petroleum','consumption']]},
 'I-I2':{places:['PA'],topics:[['electricity','prices']]}
};
for(const {run,id,form} of saved)test(`Job9c saved ${run} ${id} first turn keeps the model's fields`,()=>{
 const query=suite.cases.find(c=>c.id===id).query;
 const normalized=normalizeLockedFormV2(form,query),check=checkLockedFormV2(normalized,query),result=check.valid?normalized:repairLockedFormV2(normalized,query);
 assert.deepEqual(result.geographies.map(g=>g.geography.split(' | ')[0]),expected[id].places);
 const topics=run==='LUNA-MED'&&id==='D-D3'?[['nuclear','production'],['nuclear','consumption']]:expected[id].topics;
 assert.deepEqual(result.topics.map(t=>[t.product,t.activity]),topics);
 assert.equal(result.clarification.needed,false);
});
test('Job9c LUNA-MED D3 is an ordinary model miss against the unchanged frozen suite',()=>{
 const source=saved.find(x=>x.run==='LUNA-MED'&&x.id==='D-D3');
 const frozen=suite.cases.find(x=>x.id==='D-D3');
 assert.equal(source.form.topics[0].activity,'production');
 assert.equal(frozen.expected.activity[0],'generation');
});
