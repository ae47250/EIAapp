import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {fetchEiaData,fetchEiaMetadata} from '/Users/agust/.codex/worktrees/eia-interpretation-audit/EIAapp/lib/sources/eia/eia-fetch.js';
const root='/Users/agust/.codex/worktrees/eia-interpretation-audit/EIAapp';
const dir='/private/tmp/eia-no-dead-ends-20261028-prefreeze';
if(existsSync(dir))throw new Error('Research evidence exists; inspect it rather than repeating');
const apiKey=readFileSync(`${homedir()}/Downloads/eia-api-key.txt`,'utf8').trim();
if(!/^[A-Za-z0-9]+$/.test(apiKey))throw new Error('Existing EIA key format unavailable');
const catalog=JSON.parse(readFileSync(`${root}/data/eia/lookup-list.json`));
const geographies=JSON.parse(readFileSync(`${root}/data/eia/routing-metadata.json`)).geographies;
const regionNames=['Africa','Asia & Oceania','Central & South America','Eurasia','Europe','Middle East','North America'];
const regions=regionNames.map(name=>{const record=geographies.find(g=>g.name===name);if(!record)throw new Error('Missing approved region '+name);return{name,code:record.code,members:record.code.split('+').map(code=>{const geo=geographies.find(g=>g.code===code);if(!geo)throw new Error('Missing approved region member '+code);return{code,name:geo.name,eiaCode:catalog.routes.international.geographies[code]};})};});
mkdirSync(dir,{mode:0o700});
const save=(name,data)=>writeFileSync(`${dir}/${name}`,JSON.stringify(data,null,2)+'\n',{flag:'wx',mode:0o600});
save('region-membership.json',{source:'data/eia/routing-metadata.json',regions});
writeFileSync(`${dir}/research.mjs`,readFileSync(new URL(import.meta.url)),{flag:'wx',mode:0o600});
const opts={apiKey,retries:0,timeoutMs:30000,paceMs:600};
save('international-route.json',await fetchEiaMetadata('international',opts));
save('international-geography-types.json',await fetchEiaMetadata('international/facet/countryRegionTypeId',opts));
const europe=regions.find(r=>r.name==='Europe');
const cases=[
 ['C1a-world',{route:'international',dataColumn:'value',frequency:'annual',facets:{productId:'44',activityId:'2',unit:'QBTU',countryRegionId:'WORL'},start:'2000',end:'2019'}],
 ['C1b-europe',{route:'international',dataColumn:'value',frequency:'annual',facets:{productId:'44',activityId:'2',unit:'QBTU',countryRegionTypeId:'c',countryRegionId:europe.members.map(g=>g.eiaCode)},start:'2000',end:'2019'}],
 ['C2-australia',{route:'international',dataColumn:'value',frequency:'annual',facets:{productId:'7',activityId:'1',unit:'TST',countryRegionTypeId:'c',countryRegionId:catalog.routes.international.geographies.AUS},start:'2010',end:'2020'}],
 ['C3-ohio',{route:'electricity/retail-sales',dataColumn:'price',frequency:'annual',facets:{stateid:'OH',sectorid:'ALL'},start:'2015'}],
 ['C7-germany',{route:'international',dataColumn:'value',frequency:'annual',facets:{productId:'2',activityId:'2',unit:'BKWH',countryRegionTypeId:'c',countryRegionId:catalog.routes.international.geographies.DEU},start:'1995',end:'2005'}],
 ['C8-france',{route:'international',dataColumn:'value',frequency:'annual',facets:{productId:'27',activityId:'12',unit:'BKWH',countryRegionTypeId:'c',countryRegionId:catalog.routes.international.geographies.FRA},start:'2010',end:'2010'}],
 ['C4-europe-gas-imports',{route:'international',dataColumn:'value',frequency:'annual',facets:{productId:'26',activityId:'3',unit:'BCF',countryRegionTypeId:'c',countryRegionId:europe.members.map(g=>g.eiaCode)}}]
];
const summaries=[];
for(const[id,selector]of cases){
 const data=await fetchEiaData(selector,opts);
 save(id+'.json',{id,retrievedAt:new Date().toISOString(),selector,response:data});
 if(!data.complete)throw new Error('Incomplete EIA observations for '+id);
 const numeric=data.rows.filter(r=>r[selector.dataColumn]!==null&&String(r[selector.dataColumn]).trim()!==''&&Number.isFinite(Number(r[selector.dataColumn])));
 if(id==='C1a-world'&&(!numeric.length||numeric.some(r=>r.countryRegionId!=='WORL'||r.productId!=='44'||r.activityId!=='2'||r.unit!=='QBTU')))throw new Error('World row codes not verified; stop');
 const summary={id,total:data.total,numeric:numeric.length,pages:data.pages,first:numeric[0]?.period,last:numeric.at(-1)?.period,types:[...new Set(data.rows.map(r=>r.countryRegionTypeId))],sample:numeric[0]};
 if(id==='C1b-europe')summary.members=europe.members.map(g=>{const rows=numeric.filter(r=>r.countryRegionId===g.eiaCode);return{...g,status:rows.length?'data':'empty',first:rows[0]?.period||null,last:rows.at(-1)?.period||null,observations:rows.length};});
 summaries.push(summary);console.log(JSON.stringify({id,total:summary.total,numeric:summary.numeric,first:summary.first,last:summary.last,types:summary.types}));
}
save('summary.json',{completedAt:new Date().toISOString(),summaries});
