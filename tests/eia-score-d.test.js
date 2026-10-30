import test from 'node:test';
import assert from 'node:assert/strict';
import {scoreD,statusD,deadEndD} from '../scripts/eia-lookup/score-d.js';
const clone=structuredClone;
function fixture(){
 const form={geographies:[{geography:'BRA | Brazil | country',quoted_words:'Brazil',is_default:false}],excluded_geographies:[],topics:[{product:'total energy',activity:'production',quoted_words:'energy production'}],excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:2020,end:2022,quoted_words:'2020 to 2022'},clarification:{needed:false,about:null,options:[]},unsupported_words:[]};
 const points=[{period:'2020',value:0},{period:'2021',value:null,symbol:'--',meaning:'Not applicable'},{period:'2022',value:1.23456789}];
 const e={form,understoodContains:['Brazil','total energy','production'],entries:[{geographyCode:'BRA',geographyName:'Brazil',product:'total energy',activity:'production',outcome:'data',route:'international',measure:'value',facets:{productId:'44',activityId:'1',countryRegionId:'BRA',unit:'QBTU'},frequency:'annual',unit:'quadrillion Btu',unitWords:'quadrillion Btu',acceptableMeasurementBases:['Primary energy production'],requiredLabels:['Primary energy production'],firstPeriod:'2020',lastPeriod:'2022',snapshotPoints:points}]};
 const entry=e.entries[0],selector={route:entry.route,dataColumn:entry.measure,frequency:entry.frequency,facets:clone(entry.facets)};
 const r={intent:{lockedForm:clone(form)},needsClarification:false,results:[{countries:[{geography:{code:'BRA',name:'Brazil'},product:'total energy',activity:'production',status:'available',series:{selector,frequency:'annual',unit:entry.unit,basisLabel:entry.acceptableMeasurementBases[0],complete:true,points:clone(points),coverage:{start:'2020',end:'2022'}}}]}],presentation:{understoodLine:'Brazil — total energy production',buttons:[],entries:[{geographyCode:'BRA',product:'total energy',activity:'production',statusLabel:'Available',inChart:true,inTable:true,headline:'Brazil total energy production: 1.2346 quadrillion Btu in 2022 (EIA).',symbolMeanings:[{period:'2021',meaning:'Not applicable'}]}]}};
 return {e,r};
}
const series=r=>r.results[0].countries[0].series;
test('D accepts independently specified source values and rendered evidence',()=>{const {r,e}=fixture();assert.equal(scoreD(r,e).correct,true);});
for(const [label,mutate] of [
 ['place',r=>r.intent.lockedForm.geographies[0].geography='ARM | Armenia | country'],
 ['default geography',r=>r.intent.lockedForm.geographies[0].is_default=true],
 ['topic',r=>r.intent.lockedForm.topics[0].activity='consumption'],
 ['sector',r=>r.intent.lockedForm.sector.value='industrial'],
 ['frequency explicit',r=>r.intent.lockedForm.frequency.explicit=true],
 ['years',r=>r.intent.lockedForm.years.end=2023],
 ['excluded place',r=>r.intent.lockedForm.excluded_geographies=[{geography:'BRA | Brazil | country',is_default:false}]],
 ['route',r=>series(r).selector.route='total-energy'],
 ['measure',r=>series(r).selector.dataColumn='price'],
 ['facet',r=>series(r).selector.facets.productId='7'],
 ['extra facet',r=>series(r).selector.facets.sector='residential'],
 ['unit',r=>series(r).unit='billion Btu'],
 ['frequency',r=>series(r).frequency='monthly'],
 ['selector frequency',r=>series(r).selector.frequency='monthly'],
 ['basis',r=>series(r).basisLabel='Crude oil only'],
 ['first period',r=>series(r).points[0].period='2019'],
 ['last period',r=>series(r).coverage.end='2023'],
 ['duplicate period',r=>series(r).points.push(clone(series(r).points[0]))],
 ['dropped observation',r=>series(r).points.splice(1,1)],
 ['wrong value',r=>series(r).points[2].value=123],
 ['string zero',r=>series(r).points[0].value='0'],
 ['NaN',r=>series(r).points[0].value=NaN],
 ['infinite',r=>series(r).points[0].value=Infinity],
 ['symbol coerced zero',r=>series(r).points[1].value=0],
 ['lost symbol',r=>delete series(r).points[1].symbol],
 ['lost symbol meaning',r=>delete series(r).points[1].meaning],
 ['incomplete',r=>series(r).complete=false],
 ['dropped entry',r=>r.results[0].countries=[]],
 ['duplicate entry',r=>r.results[0].countries.push(clone(r.results[0].countries[0]))],
 ['unexpected entry',r=>{const x=clone(r.results[0].countries[0]);x.geography.code='ARM';r.results[0].countries.push(x);}],
 ['place name',r=>r.results[0].countries[0].geography.name='Armenia'],
 ['status label',r=>r.presentation.entries[0].statusLabel='No data for these years'],
 ['hidden valid chart',r=>r.presentation.entries[0].inChart=false],
 ['missing table row',r=>r.presentation.entries[0].inTable=false],
 ['missing understood place',r=>r.presentation.understoodLine='total energy production'],
 ['missing understood product',r=>r.presentation.understoodLine='Brazil production'],
 ['missing understood activity',r=>r.presentation.understoodLine='Brazil total energy'],
 ['wrong headline number',r=>r.presentation.entries[0].headline='Brazil total energy production: 99 quadrillion Btu in 2022 (EIA)'],
 ['wrong headline unit',r=>r.presentation.entries[0].headline='Brazil total energy production: 1.2346 trillion Btu in 2022 (EIA)'],
 ['wrong headline year',r=>r.presentation.entries[0].headline='Brazil total energy production: 1.2346 quadrillion Btu in 2020 (EIA)'],
 ['missing symbol wording',r=>r.presentation.entries[0].symbolMeanings=[]],
 ['no UI capture',r=>delete r.presentation]
])test('D rejects '+label,()=>{const {r,e}=fixture();mutate(r);assert.equal(scoreD(r,e).correct,false);});
test('D meanings ignore quote choices but preserve ordered places and topics',()=>{const {r,e}=fixture();r.intent.lockedForm.topics[0].quoted_words='other words';assert.equal(scoreD(r,e).formCorrect,true);for(const target of [r.intent.lockedForm,e.form])target.geographies.push({geography:'ARM | Armenia | country',is_default:false});r.intent.lockedForm.geographies.reverse();assert.equal(scoreD(r,e).formCorrect,false);});
test('status uses numeric finite observations only and never coerces symbols or null to zero',()=>{
 for(const values of [[],[null],['--','NA','W'],[false,true],[NaN,Infinity]])assert.equal(statusD(values.map(value=>({value}))),'No data for these years');
 for(const values of [[0],[0,null],[null,0,0]])assert.equal(statusD(values.map(value=>({value}))),'Reported as zero every year');
 assert.equal(statusD([{value:0},{value:0.01}]),'Available');assert.equal(statusD([{value:-1}]),'Available');
});
test('zero and missing series are retained and excluded from charts',()=>{
 for(const value of [0,null]){const {r,e}=fixture();const pts=series(r).points.map(p=>({...p,value}));series(r).points=clone(pts);e.entries[0].snapshotPoints=clone(pts);e.entries[0].headlineRequired=false;const ui=r.presentation.entries[0];ui.statusLabel=statusD(pts);ui.inChart=false;r.userMessage='Other measures are available';r.choices=[{label:'Try another measure'}];r.freeText=true;assert.equal(scoreD(r,e).correct,true);ui.inChart=true;assert.equal(scoreD(r,e).correct,false);}
});
test('latest requires complete selector-matched independent evidence',()=>{const {r,e}=fixture();e.entries[0].lastPeriod='latest';e.form.years.end='latest';r.intent.lockedForm.years.end='latest';assert.equal(scoreD(r,e).correct,false);const source={retrievedAt:'2026-10-30T12:00:00Z',complete:true,selector:clone(series(r).selector),points:clone(series(r).points)};const options={liveEvidence:{'BRA|total energy|production':source}};assert.equal(scoreD(r,e,options).correct,true);source.selector.facets.productId='7';assert.equal(scoreD(r,e,options).correct,false);});
test('ambiguity type and switch must be visible, and settled context prohibits switch',()=>{const {r,e}=fixture();e.understoodContains.push('(country)');e.switchButton='Did you mean Brazil the state?';assert.equal(scoreD(r,e).correct,false);r.presentation.understoodLine+=' (country)';r.presentation.buttons=[e.switchButton];assert.equal(scoreD(r,e).correct,true);delete e.switchButton;e.forbidPlaceSwitch=true;assert.equal(scoreD(r,e).correct,false);});
test('question exact buttons and free text remain independently scored',()=>{const {r,e}=fixture();e.entries=[];e.question={text:'Which place should I look up?',buttons:['World total','Type countries'],freeText:true};r.results=[];r.needsClarification=true;r.userMessage=e.question.text;r.choices=e.question.buttons.map(label=>({label}));r.freeText=true;assert.equal(scoreD(r,e).correct,true);r.choices.reverse();assert.equal(scoreD(r,e).correct,false);r.choices.reverse();r.freeText=false;assert.equal(scoreD(r,e).deadEnd,true);});
test('missing entries must remain named, visible and nonnumeric',()=>{const {r,e}=fixture();e.entries[0]={...e.entries[0],outcome:'missing'};const a=r.results[0].countries[0];a.series=null;a.status='empty';Object.assign(r.presentation.entries[0],{statusLabel:'No data for these years',inChart:false});r.userMessage='Not available';r.choices=[{label:'Other measure'}];r.freeText=true;assert.equal(scoreD(r,e).correct,true);a.geography.name='';assert.equal(scoreD(r,e).correct,false);});
test('unresolved freeze items cannot pass or disappear from scoring denominator',()=>{const {r,e}=fixture();e.unresolved='Research incomplete';assert.equal(scoreD(r,e).correct,false);assert.ok(scoreD(r,e).outcomeErrors.includes('unresolved_frozen_expectation'));});
test('labelled alternative is still wrong but not unlabelled wrong data',()=>{const {r,e}=fixture();series(r).unit='different';assert.equal(scoreD(r,e).unlabelledWrongData,true);series(r).alternative=true;assert.equal(scoreD(r,e).correct,false);assert.equal(scoreD(r,e).unlabelledWrongData,false);});
test('no-data buttonless message is a dead end',()=>{assert.equal(deadEndD({userMessage:'No data',freeText:true,choices:[]}),true);});
test('fixed-year results also reject evidence from another source',()=>{const {r,e}=fixture();const source={retrievedAt:'2026-10-30',complete:true,selector:{...clone(series(r).selector),route:'wrong'},points:clone(series(r).points)};assert.equal(scoreD(r,e,{liveEvidence:{'BRA|total energy|production':source}}).correct,false);});
test('only the explicitly frozen owner alternative can pass',()=>{const {r,e}=fixture();const alt=clone(e);alt.id='explicit-alternative';alt.question={text:'Which activity should I look up?',buttons:['Production'],freeText:true};alt.entries=[];alt.form.clarification={needed:true,about:'activity',options:[]};alt.form.topics[0].activity=null;alt.understoodContains=['Brazil','total energy'];e.acceptableAlternatives=[alt];r.intent.lockedForm=clone(alt.form);r.results=[];r.userMessage=alt.question.text;r.choices=[{label:'Production'}];r.freeText=true;assert.equal(scoreD(r,e).correct,true);r.choices=[{label:'Exports'}];assert.equal(scoreD(r,e).correct,false);});
