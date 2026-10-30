import test from 'node:test';
import assert from 'node:assert/strict';
import {buildXlsx} from '../lib/client/xlsx.js';
import {numericValue,formatNumber,formatLatestValue,formatLineChartValue,getCleanPoints,getRecentYears} from '../lib/client/formatting.js';
const missing=[null,undefined,'','  ','--','NA','W',false,true,[],[0],{},NaN,Infinity];
// The writer uses ZIP STORE; inspect the actual worksheet bytes, not a mock.
for(const value of missing)test('nonnumeric latest stays blank: '+String(value),async()=>{
 const series={lookup:true,title:'All nonnumeric',country:'Example',latestPeriod:'2020',latestValue:value,points:[],observations:[{period:'2020',value:null,symbol:'--',meaning:'Not applicable'}]};
 const xml=new TextDecoder().decode(await buildXlsx(series).arrayBuffer());
 assert.match(xml,/<c r="A10" t="inlineStr"><is><t>Latest value<\/t><\/is><\/c><c r="B10" t="inlineStr"><is><t><\/t><\/is><\/c>/);
 assert.match(xml,/Not applicable/);assert.match(xml,/>--</);
 assert.equal(Number.isFinite(numericValue(value)),false);
 assert.equal(formatNumber(value),'');assert.equal(formatLatestValue(value),'');assert.equal(formatLineChartValue(value),'Not available');
 assert.deepEqual(getCleanPoints([{period:'2020',value}]),[]);assert.deepEqual(getRecentYears([{period:'2020',value}],4),[]);
});
for(const value of [0,'0',-0,' 0 '])test('numeric zero survives: '+JSON.stringify(value),async()=>{
 const xml=new TextDecoder().decode(await buildXlsx({points:[{period:'2020',value}],latestValue:value}).arrayBuffer());
 assert.match(xml,/<c r="B10"><v>0<\/v><\/c>/);assert.equal(formatNumber(value),Object.is(value,-0)?'-0':'0');
 assert.equal(getCleanPoints([{period:'2020',value}]).length,1);assert.equal(getRecentYears([{period:'2020',value}],4).length,1);
});
