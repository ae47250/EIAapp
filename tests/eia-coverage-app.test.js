import test from 'node:test';
import {understoodLine} from '../lib/sources/eia/lookup-context.js';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';
import {scoreD} from '../scripts/eia-lookup/score-d.js';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lookupCatalog,buildLookupSelector,rowFitsGeography} from '../lib/sources/eia/lookup-list.js';
import {resolveApprovedGeography} from '../lib/sources/eia/intent-routing.js';
import {placeCollisions,placeDisplayName,placeSwitches,usStates} from '../lib/sources/eia/lookup-geography.js';
import {lookupSeries,submittedContext,searchLookup} from '../lib/sources/eia/lookup-search.js';
import {observationStatus,chartCountries,observationText,seriesDescription,headlineFor} from '../lib/client/lookup-display.js';
import {buildXlsx,buildComparisonXlsx} from '../lib/client/xlsx.js';
import {formatNumber,getCleanPoints} from '../lib/client/formatting.js';
import {applyReplyUpdate} from '../lib/sources/eia/locked-form-reply-update.js';
import {checkLockedFormV2,convertLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {sourceIntentPayload} from '../lib/eia-intent-payload.js';
const read=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url)));
const d=read('evidence/eia-coverage/set-d.json').questions;
const get=id=>d.find(c=>c.id===id);
const empty=()=>({geographies:null,excluded_geographies:null,topics:null,excluded_topics:null,sector:null,frequency:null,years:null,resolved_words:[],unresolved:[]});
test('every added row is verified and derives from a mapped cell; originals retained exactly',()=>{
 const originals=read('data/eia/lookup-list.json').rows;
 assert.deepEqual(lookupCatalog.rows.slice(0,originals.length),originals);
 for(const r of lookupCatalog.rows.slice(originals.length)){
  assert.equal(r.verification,'verified');assert.match(r.generatedFrom,/^(country|World|US|state)\|/);
  assert.ok(Object.keys(r.placeFacets).length);assert.ok(r.route&&r.unit&&r.basisLabel&&r.dataColumn);assert.ok(r.frequencies.length);
 }
});
test('documented US selector accepts USA only and rejects state/country/World even with forged map entry',()=>{
 const r=lookupCatalog.rows.find(r=>r.route==='total-energy');assert.ok(r);
 const request={sector:r.sector,frequency:r.frequencies[0],excludedGeographies:[]};
 assert.equal(buildLookupSelector(r,resolveApprovedGeography('USA'),request).route,'total-energy');
 for(const code of ['TX','BRA','WLD']){
  const forged={...r,placeFacets:{...r.placeFacets,[code]:{}}};assert.throws(()=>buildLookupSelector(forged,resolveApprovedGeography(code),request),/United States only/);
 }
 const bad=structuredClone(lookupCatalog);bad.scopeRoutes['total-energy'].checked=false;
 assert.throws(()=>buildLookupSelector(r,resolveApprovedGeography('USA'),request,bad),/United States only/);
});
test('every generated country row rejects World',()=>{
 for(const r of lookupCatalog.rows.filter(r=>r.generatedFrom&&r.geographyKind==='country'))assert.equal(rowFitsGeography(r,resolveApprovedGeography('WLD'),{excludedGeographies:[]}),false);
});
test('metadata collisions include a synthetic second name, with typed labels and switch',()=>{
 const places=[{code:'X',name:'Example',type:'country'},{code:'Y',name:'Example',type:'state'}];
 assert.equal(placeCollisions(places).length,1);assert.equal(placeDisplayName(places[1],places),'Example (US state)');
 const form={geographies:[{geography:'Y | Example | US state',quoted_words:'Example'}],excluded_geographies:[]};
 assert.equal(placeSwitches(form,places)[0].choice.value,'X | Example | country');
 assert.equal(placeSwitches(get('D4').form).length,1);assert.equal(placeSwitches(get('D10').form).length,0);
});
test('state group draws from approved geographies and retains exclusions',()=>{
 const states=usStates(get('D6').form);assert.equal(states.length,50);assert.ok(!states.some(g=>g.code==='AK'||g.code==='USA'||g.name.startsWith('Federal Offshore')));
});
test('year endpoints are independent checked slots and survive browser resubmission',()=>{
 const c=get('D12'),reply='Japan and Korea, only from 2005';
 const a={...empty(),years:{start:2005,end:null,quoted_words:'from 2005'}};
 const next=applyReplyUpdate(c.form,c.query,{about:'geography',reply,answer:a});
 assert.equal(next.form.years.end,2019);assert.equal(next.form.years.start,2005);assert.equal(checkLockedFormV2(next.form,c.query,next.quoteSources).valid,true);
 const intent=submittedContext(c.query,{interpreter:'openai_locked_form',originForm:c.form,lockedForm:next.form,choiceHistory:[{type:'reply-update',about:'geography',reply,answer:a}]}).intent;
 assert.equal(intent.years.end,2019);
 const noEnd=structuredClone(c.form);noEnd.years={start:null,end:null,quoted_words:null};
 assert.equal(applyReplyUpdate(noEnd,c.query,{about:'geography',reply,answer:a}).form.years.end,'latest');
});
for(const [label,values,want] of [['zero',[0,0],'Reported as zero every year'],['missing',[null,null],'No data for these years'],['mixed zero',[null,0],'Reported as zero every year'],['real',[0,2,null],'Available']])test('observation status '+label,()=>assert.equal(observationStatus(values.map(value=>({value}))),want));
test('nonnumeric EIA symbols survive parser, table and Excel; only numeric zero is zero',async()=>{
 const row={key:'test',route:'test',dataColumn:'value',unit:'Btu',reportedUnits:['Btu'],product:'coal',activity:'production',basisLabel:'Coal production',description:'All coal',eiaName:'Coal production'};
 const geo=resolveApprovedGeography('BRA'),request={frequency:'annual',sector:null},selector={route:'test',dataColumn:'value',facets:{country:'BRA'},frequency:'annual'};
 const raw=['--','NA','W',0,52317.55723326];
 const series=lookupSeries(row,geo,request,selector,{rows:raw.map((value,i)=>({period:String(2000+i),country:'BRA',value,unit:'Btu'})),total:5,complete:true});
 assert.deepEqual(series.observations.map(p=>p.value),[null,null,null,0,52317.55723326]);assert.deepEqual(series.points.map(p=>p.value),[0,52317.55723326]);
 assert.equal(observationText(series.observations[0]),'Not applicable');assert.equal(getCleanPoints(series.points).length,2);
 const text=new TextDecoder().decode(await buildXlsx(series).arrayBuffer());
 for(const s of ['Not applicable','Not available','Withheld','--','52317.55723326','Native facets','BRA'])assert.ok(text.includes(s),s);
 assert.equal(formatNumber(series.points.at(-1).value),'52,317.5572');assert.match(headlineFor(series),/52,317.5572 Btu in 2004 \(EIA\)/);
 assert.doesNotMatch(seriesDescription(series),/country=BRA/);
 const countries=[{geography:geo,series},{geography:{code:'X',name:'X'},series:{...series,unit:'short tons',points:[{period:'2004',value:0}]}},{geography:{code:'Y',name:'Y'},series:{...series,points:[{period:'2004',value:null,symbol:'W',meaning:'Withheld'}]}}];
 assert.equal(chartCountries(countries).length,1);
 const excel=new TextDecoder().decode(await buildComparisonXlsx([{lookup:true,countries}]).arrayBuffer());assert.match(excel,/short tons/);assert.match(excel,/Withheld/);assert.match(excel,/52317.55723326/);
});
test('front page has one choice list, no empty lookup card and only EIA provider wording',()=>{
 const ui=readFileSync(new URL('../components/search/SearchWorkspace.js',import.meta.url),'utf8');assert.doesNotMatch(ui,/major data providers/);assert.equal((ui.match(/the U\.S\. Energy Information Administration \(EIA\)/g)||[]).length,2);assert.doesNotMatch(ui,/<LookupChoices choices=\{country\.alternatives/);
 const chart=readFileSync(new URL('../components/search/ComparisonChart.js',import.meta.url),'utf8');assert.match(chart,/different units/i);
});
test('original defaults win and other checked bases are disclosed without replacing them',async()=>{
 const c=get('D11');const r=await searchLookup(c.query,{interpreter:'openai_locked_form',lockedForm:c.form},{},{fetchData:async s=>({rows:[{...s.facets,period:'2015',sales:'1.23456789','sales-units':'million kilowatt hours'}],total:1,complete:true})});
 assert.equal(r.selectedSeries.selector.route,'electricity/retail-sales');assert.equal(r.selectedSeries.selector.facets.sectorid,'RES');assert.equal(r.selectedSeries.otherMeasuresExist,true);assert.equal(r.selectedSeries.points[0].value,1.23456789);
});
test('a current-year default may fill an empty annual gap with a checked monthly series, never an explicit annual request',async()=>{
 const c=get('D14');assert.equal(checkLockedFormV2(c.form,c.query).valid,true);
 const calls=[];const fetchData=async s=>{calls.push(s);return {rows:s.frequency==='monthly'?[{...s.facets,period:'2026-01',value:3.45,unitName:'Dollars per Gallon Including Taxes'}]:[],total:s.frequency==='monthly'?1:0,complete:true};};
 const r=await searchLookup(c.query,{interpreter:'openai_locked_form',lockedForm:c.form},{},{fetchData});assert.equal(r.selectedSeries.frequency,'monthly');assert.match(r.selectedSeries.fallbackLabel,/annual data is not available/);assert.equal(calls[0].frequency,'annual');
 const f=structuredClone(c.form);f.frequency={value:'annual',explicit:true,quoted_words:'annual'};calls.length=0;
 const empty=await searchLookup(c.query+' annual',{interpreter:'openai_locked_form',lockedForm:f},{},{fetchData});assert.equal(empty.selectedSeries,null);assert.ok(calls.every(s=>s.frequency==='annual'));
});

test('a blank-quote US default is rejected where country coverage exists',()=>{
 const f=structuredClone(get('D1').form);f.geographies=[{geography:'USA | United States | country',is_default:true,quoted_words:''}];
 assert.equal(checkLockedFormV2(f,'energy production').valid,false);
});
const revisedD=JSON.parse(gunzipSync(readFileSync(new URL('../evidence/eia-coverage/set-d-revision-3.json.gz',import.meta.url)))).questions;
for(const c of revisedD.filter(c=>!c.parentId))test('frozen Set D injected form to data/question '+c.id,async()=>{
 const fetchData=async s=>{
  const matches=(c.entries||[]).filter(e=>e.route===s.route&&e.measure===s.dataColumn&&e.frequency===s.frequency&&Object.entries(s.facets).every(([k,v])=>(Array.isArray(v)?v:[v]).map(String).includes(String(e.facets[k]))));
  const rows=matches.flatMap(e=>(e.snapshotObservations||e.snapshotPoints||[]).map(p=>({...e.facets,period:p.period,[e.measure]:p.symbol??p.value,unitName:e.unit})));
  return {rows,complete:true,total:rows.length,frequency:s.frequency};
 };
 const r=await searchLookup(c.query,{interpreter:'openai_locked_form',lockedForm:c.form},{},{fetchData});
 const liveEvidence=Object.fromEntries((c.entries||[]).filter(e=>e.snapshotPoints?.length).map(e=>[[e.geographyCode,e.product,e.activity].join('|'),{retrievedAt:'2026-10-30',complete:true,selector:{route:e.route,dataColumn:e.measure,frequency:e.frequency,facets:e.facets},points:e.snapshotPoints}]));
 const scored=scoreD(r,c,{liveEvidence});
 assert.deepEqual(scored.formErrors,[]);assert.deepEqual(scored.outcomeErrors,[]);
 // Presentation is checked separately in a rendered browser, never synthesized here.
 for(const e of c.entries||[]){const a=r.results.flatMap(g=>g.countries).find(x=>x.geography.code===e.geographyCode&&x.product===e.product&&x.activity===e.activity);if(e.snapshotObservations?.length)assert.deepEqual((a.series||a.observationSeries)?.observations,e.snapshotObservations,c.id+' full source observations');}
});

test('missing-series cards show the required nonnumeric status without an empty result article',()=>{
 const ui=readFileSync(new URL('../components/search/SearchWorkspace.js',import.meta.url),'utf8');assert.match(ui,/data-status-label>\{country.statusLabel/);assert.match(ui,/No data for these years/);
});

test('understood regions identify all included members and omit excluded members',()=>{
 const f=structuredClone(get('D5b').form);const line=understoodLine(f);
 for(const name of ['Bermuda','Canada','Greenland','Mexico','Saint Pierre and Miquelon','United States'])assert.ok(line.includes(name));
 f.excluded_geographies=[{geography:'CAN | Canada | country',quoted_words:'Canada',is_default:false}];assert.ok(!understoodLine(f).includes('Canada'));
});
