import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {normalizeLockedFormV2,convertLockedFormV2,repairLockedFormV2,checkLockedFormV2} from '../lib/sources/eia/locked-form-v2.js';
import {geographyLabel} from '../lib/sources/eia/locked-form-schema.js';
import {resolveApprovedGeography,listApprovedGeographies} from '../lib/sources/eia/intent-routing.js';
import {quoteNamesPlace} from '../lib/sources/eia/lookup-geography.js';
import {containsWords} from '../evidence/eia-job8b/score-q4.mjs';
import {sourceIntentPayload} from '../lib/eia-intent-payload.js';
import {searchLookup} from '../lib/sources/eia/lookup-search.js';
import {clarificationFor} from '../lib/sources/eia/lookup-context.js';
import {findEvaluationChoice} from '../scripts/eia-lookup/evaluation-choice.js';
import {lookupCatalog} from '../lib/sources/eia/lookup-list.js';

const g=(code,quote)=>({geography:geographyLabel(resolveApprovedGeography(code)),quoted_words:quote,is_default:false});
const codes=f=>f.geographies.map(x=>x.geography.split(' | ')[0]);
const form=(query,geographies,product='coal',activity='consumption')=>({geographies,excluded_geographies:[],topics:[{product,activity,quoted_words:query}],excluded_topics:[],sector:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},unsupported_words:[],clarification:{needed:!activity,about:activity?null:'activity',options:[]}});
const D=JSON.parse(gunzipSync(readFileSync('evidence/eia-polish/set-d-polish.json.gz'))).questions;
test('Q5 every approved full name and alias supports its metadata code',()=>{
 for(const geo of listApprovedGeographies())assert.equal(quoteNamesPlace({geography:geographyLabel(geo),quoted_words:geo.name}),true,geo.code);
 const aliases=JSON.parse(readFileSync('data/eia/phase4-routing-config.json')).geographyAliases;
 for(const [alias,code]of Object.entries(aliases))assert.equal(quoteNamesPlace(g(code,alias)),true,alias);
 assert.equal(quoteNamesPlace(g('AL','Malabama')),false);
 assert.equal(quoteNamesPlace(g('USA','Former U.S.S.R.')),false);
});
test('Q4 phrase checks accept complete phrases without allowing partial-word matches',()=>{
 assert.equal(containsWords('weighted average sulfur content','sulfur content'),true);
 assert.equal(containsWords("'ash content' or 'receipts delivered'",'ash content'),true);
 assert.equal(containsWords('ash contents','ash content'),false);
 assert.equal(containsWords('cash content','ash content'),false);
});
test('Q5 raw validation rejects a code whose quote names another place',()=>{const q='electricity prices in georgia';assert.ok(checkLockedFormV2(form(q,[g('AL','georgia')]),q).errors.includes('quote_does_not_support_place'));});
test('Q5 exclusion quote correction preserves exclusion rather than adding a country',()=>{const q='coal consumption in Japan not Canada',f=form(q,[g('JPN','Japan')]);f.excluded_geographies=[g('AL','Canada')];const next=normalizeLockedFormV2(f,q);assert.deepEqual(codes(next),['JPN']);assert.deepEqual(next.excluded_geographies.map(g=>g.geography.split(' | ')[0]),['CAN']);assert.equal(checkLockedFormV2(next,q).valid,true);});
for(const [query,items,want] of [
 ['electricity prices in georgia',[g('AL','georgia')],['GA']],
 ['compare georgia and armenia natural gas imports',[g('AL','georgia'),g('ARM','armenia')],['GEO','ARM']],
 ['coal consumption Georgia and France',[g('GA','Georgia'),g('BRA','France')],['GEO','FRA']],
 ['coal consumption in UK',[g('AL','UK')],['GBR']],
 ['energy consumption in icelnd',[g('AL','icelnd')],['ISL']],
 ['coal consumption somewhere',[g('AL','somewhere')],[]],
])test('Q5 quote supports place: '+query,()=>assert.deepEqual(codes(normalizeLockedFormV2(form(query,items),query)),want));
test('Q5 fallback and browser resubmission cannot retain a misquoted model place',async()=>{
 const query='electricity prices in georgia',f=form(query,[g('AL','georgia')],'electricity','prices');
 assert.deepEqual(codes(repairLockedFormV2(f,query)),['GA']);
 const result=await searchLookup(query,{interpreter:'openai_locked_form',lockedForm:f},{},{fetchData:async s=>({complete:true,total:1,rows:[{...s.facets,period:'2024',[s.dataColumn]:12}]})});
 assert.deepEqual(codes(result.intent.lockedForm),['GA']);
});
test('Q5 D4a switch after a misquoted D4 yields only Georgia country',async()=>{
 const c=D.find(x=>x.id==='D4'),f=structuredClone(c.form);f.geographies=[g('AL','georgia')];
 const intent=convertLockedFormV2(normalizeLockedFormV2(f,c.query),c.query);
 const options={fetchData:async s=>({complete:true,total:1,rows:[{...s.facets,period:'2024',[s.dataColumn]:12}]})};
 const first=await searchLookup(c.query,sourceIntentPayload(intent),{},options);
 const next=await searchLookup(c.query,sourceIntentPayload(first.intent),findEvaluationChoice(first,'Did you mean Georgia the country?'),options);
 assert.deepEqual(codes(next.intent.lockedForm),['GEO']);
});
test('Q4 missing activity retains its question and offers explicit consumption instead',async()=>{
 const query='US average ash content of coal receipts delivered for electricity generation';
 const f=form(query,[g('USA','US')],'coal',null);f.sector={value:'electric power',quoted_words:'electricity generation'};f.unsupported_words=['ash content','receipts delivered'];
 const c=clarificationFor(f,null,{query});assert.equal(c.userMessage,'Which activity should I look up?');
 assert.ok(c.unsupportedMessage.includes('ash content'));
 const choice=c.choices.find(x=>x.label==='Show Coal consumption instead');assert.ok(choice);
 const result=await searchLookup(query,sourceIntentPayload(convertLockedFormV2(f,query)),choice,{fetchData:async s=>{const row=lookupCatalog.rows.find(r=>r.route===s.route&&r.dataColumn===s.dataColumn&&Object.entries(s.facets).every(([k,v])=>JSON.stringify(r.fixedFacets?.[k])===JSON.stringify(v)));assert.ok(row);return {complete:true,total:1,rows:[{...s.facets,period:'2024',[s.dataColumn]:12,unitName:row.unit,'series-description':row.eiaName}]};}});
 assert.equal(result.needsClarification,false);
 const countries=result.results.flatMap(x=>x.countries||[]);assert.ok(countries.some(c=>c.series?.points?.length));
 for(const c of countries.filter(c=>c.series)){assert.match(c.unsupportedNotice,/ash content/);assert.match(c.unsupportedNotice,/receipts delivered/);assert.ok(c.series.completenessNote.includes(c.unsupportedNotice));}
});
