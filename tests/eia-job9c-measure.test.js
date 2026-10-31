import test from 'node:test';
import assert from 'node:assert/strict';
import {pairDifference,decisionFromRuns,sourceRuns,settings} from '../scripts/eia-lookup/measure-job9c.mjs';
const ids=['D-D1','D-D2','D-D3'];
const make=(wrong=[],name='ON')=>({name,status:'complete',harnessPass:true,scheduled:3,executed:3,comparisonCostUSD:1,comparisonLatencyP90Ms:1000,notReplayed:[],rows:ids.map(id=>({id,set:'D',excludedFromJointAccuracy:false,score:{status:'scored',correct:!wrong.includes(id),kind:wrong.includes(id)?'wrong value shown':null,fields:{},errors:[]}}))});
test('Job9c W counts wrong-value creation minus fixes; N counts losses minus wins',()=>{
 const x=pairDifference(make(['D-D2']),make(['D-D1']));
 assert.deepEqual(x.losses,['D-D1']);assert.deepEqual(x.wins,['D-D2']);assert.equal(x.W,0);assert.equal(x.N,0);
});
test('Job9c decision keeps a group that prevents wrong values and exempts only LUNA-MED D3',()=>{
 const runs=Object.fromEntries(sourceRuns.map(name=>[name,Object.fromEntries(settings.map(bits=>{
  const wrong=[...(name==='LUNA-MED'?['D-D3']:[]),...(bits[0]==='0'?['D-D1']:[])];
  return [bits,make(wrong,name)];
 }))]));
 const d=decisionFromRuns(runs);
 assert.equal(d.single.G1.W,5);assert.equal(d.single.G1.keep,true);
 assert.equal(d.single.G2.keep,false);assert.equal(d.single.G3.keep,false);
 assert.equal(d.chosen,'100');assert.equal(d.frontPagePass,true);
 assert.deepEqual(d.passExceptions,[{run:'LUNA-MED',id:'D-D3',reason:'valid alternative reading; expectation too narrow'}]);
});
test('Job9c combination restores removed groups when their joint removal fails',()=>{
 const runs=Object.fromEntries(sourceRuns.map(name=>[name,Object.fromEntries(settings.map(bits=>[bits,make(bits[1]==='0'&&bits[2]==='0'?['D-D1']:[],name)]))]));
 const d=decisionFromRuns(runs);
 assert.equal(d.combined.keep,true);assert.deepEqual(d.restored,['G1','G2']);assert.equal(d.chosen,'110');
});
