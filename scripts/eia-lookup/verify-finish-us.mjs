import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';import {homedir} from 'node:os';import {createHash} from 'node:crypto';import {gzipSync} from 'node:zlib';
import {fetchEiaData} from '../../lib/sources/eia/eia-fetch.js';import {lookupSeries} from '../../lib/sources/eia/lookup-search.js';
const dir='evidence/eia-finish',review=JSON.parse(readFileSync(dir+'/us-review.json')),local=homedir()+'/Documents/EIAapp-Evidence/20261030/finish/us';mkdirSync(local,{recursive:true,mode:0o700});
const key=readFileSync(homedir()+'/Downloads/eia-api-key.txt','utf8').trim();const hash=b=>createHash('sha256').update(b).digest('hex');let calls=0;const output={reviewSHA256:hash(readFileSync(dir+'/us-review.json')),startedAt:new Date().toISOString(),rows:[],checks:[],calls:0};
if(existsSync(dir+'/us-verified.json'))throw Error('Verification exists; preserve it');
for(const c of review.candidates){
 if(Date.now()>=Date.parse(review.researchDeadlineUTC))break;
 const a=c.candidate,s=a.series,kind=c.cellId.split('|'),selector={route:s.route,dataColumn:s.column,frequency:s.frequency,facets:{...s.measureFacets,...a.place.nativePlaceFilters}};
 const row={key:'finish-us-'+hash(JSON.stringify(selector)).slice(0,20),generatedFrom:c.cellId,geographyKind:'united_states',placeFacets:{USA:{}},product:kind[1],activity:kind[2],sector:kind[3]||null,qualifier:kind[4]||null,sectorSupported:!!kind[3],sectorMapping:kind[3]?{[kind[3]]:{}}:{},route:s.route,dataColumn:s.column,fixedFacets:selector.facets,frequencies:[s.frequency],unit:s.unitName,reportedUnits:[...new Set([s.unit,s.unitName])],basisLabel:s.selectedBasisLabel||s.basis.label,description:s.selectedBasisLabel||s.basis.label,eiaName:s.selectedBasisLabel||s.basis.label,otherMeasuresExist:c.otherCandidates.length>1,otherBases:[...new Set(c.otherCandidates.map(x=>x.unit))].filter(v=>v!==s.unitName),verification:'verified',sampleGeography:'USA',required:false,metadataReferences:['evidence/eia-finish/us-review.json','evidence/eia-finish/us-verified.json'],...(c.scope?{documentedUSScope:c.scope}:{})};
 if(a.constraints.pending.length)row.description+='; '+a.constraints.pending.map(p=>p.value).join('; ')+'; EIA scope note not verified';
 if(kind[2]==='storage')row.description+='; EIA scope note not verified';
 const response=await fetchEiaData(selector,{apiKey:key,paceMs:550,retries:0,timeoutMs:30000,fetch:async(url,init)=>{calls++;return fetch(url,init);}});
 if(!response.complete)throw Error('Incomplete US history');
 const series=lookupSeries(row,{code:'USA',name:'United States',type:'national'},{frequency:s.frequency,sector:row.sector},selector,response);
 if(!series?.points.length)throw Error('No numeric US data '+c.cellId);
 if(c.scope && !(c.scope.checked&&c.scope.placeKind==='US'&&c.scope.url&&c.scope.quote))throw Error('Unverified US-only scope');
 const bytes=gzipSync(JSON.stringify(response));if(bytes.length===0||JSON.stringify(response).includes(key))throw Error('Unsafe response');const file=row.key+'.json.gz';writeFileSync(local+'/'+file,bytes,{flag:'wx',mode:0o600});
 output.rows.push(row);output.checks.push({cellId:c.cellId,selector,complete:response.complete,rows:response.rows.length,unit:row.unit,first:series.coverage.start,last:series.coverage.end,numericRows:series.points.length,symbols:series.observations.filter(p=>p.value===null).length,rawSHA256:hash(bytes),localFile:'~/Documents/EIAapp-Evidence/20261030/finish/us/'+file});output.calls=calls;writeFileSync(local+'/partial.json',JSON.stringify(output,null,2));console.log(JSON.stringify({cellId:c.cellId,rows:response.rows.length,calls}));
}
output.completedAt=new Date().toISOString();writeFileSync(dir+'/us-verified.json',JSON.stringify(output,null,2)+'\n',{flag:'wx'});
