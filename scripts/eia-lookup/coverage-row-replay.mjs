// Offline injection into the unchanged existing checker; never call EIA here.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { checkLookupRows } from './check-rows.js';
import { checkUSResearchRow } from './coverage-us-row-checker.mjs';
const root = new URL('../../', import.meta.url);
const evidence = new URL('evidence/eia-coverage/',root);
const manifest=JSON.parse(readFileSync(new URL('row-replay-input.json',evidence)));
const load = ref => {
 const bytes=readFileSync(ref.localFile.replace(/^~/,homedir()));
 if(createHash('sha256').update(bytes).digest('hex')!==ref.sha256)throw new Error('Replay input hash mismatch');
 return JSON.parse(gunzipSync(bytes));
};
const hash=createHash('sha256').update(readFileSync(new URL('row-replay-input.json',evidence))).digest('hex');
const chunked=manifest.format==='bounded-replay-chunks-v1';
const input=chunked?{...manifest,metadata:load(manifest.metadata)}:load(manifest);
const inputPath=(chunked?manifest.metadata.localFile:manifest.localFile).replace(/^~/,homedir());
function* allJobs(){
 let count=0;
 if(chunked){for(const part of manifest.parts){const chunk=load(part);if(chunk.jobs.length!==part.jobs)throw new Error('Chunk job count mismatch');for(const job of chunk.jobs){count++;yield job;}}}
 else for(const job of input.jobs){count++;yield job;}
 if(count!==manifest.jobs)throw new Error('Replay job count mismatch');
}
const selectedPointerRaw=readFileSync(new URL('coverage-selection-details.json',evidence));
if(createHash('sha256').update(selectedPointerRaw).digest('hex')!==input.selectionPointerSHA256)throw new Error('Stale selection input');
const selectedPointer=JSON.parse(selectedPointerRaw), selectedRaw=readFileSync(selectedPointer.localFile.replace(/^~/,homedir()));
if(createHash('sha256').update(selectedRaw).digest('hex')!==selectedPointer.sha256)throw new Error('Selection hash mismatch');
const selected=JSON.parse(gunzipSync(selectedRaw));
const crosswalk=JSON.parse(readFileSync(new URL('place-crosswalk.json',evidence)));
const records=[];
for(const job of allJobs()){
 if(job.researchScope){
  const approved=selected.mappedCandidateCells.find(c=>c.cellId===job.cellId)?.defaults.find(d=>d.seriesId===job.default.seriesId&&d.geographyCode===job.default.geographyCode&&d.frequency===job.default.frequency);
  const scope=crosswalk.routes[job.row.route]?.scopeEvidence;
  const result=checkUSResearchRow(job,input.metadata,scope,approved);
  records.push({cellId:job.cellId,key:job.key,geography:job.row.sampleGeography,frequency:job.row.frequencies[0],sourceCalls:job.sourceCalls,...result});continue;
 }
 const catalog={routes:{[job.row.route]:job.mapping},rows:[job.row]};
 const result=await checkLookupRows(catalog,{
  fetchMetadata:async route=>{if(!input.metadata[route])throw new Error('No saved metadata for '+route);return input.metadata[route];},
  fetchData:async selector=>{
   if(selector.route!==job.row.route || selector.frequency!==job.row.frequencies[0] || selector.dataColumn!==job.row.dataColumn)throw new Error('Selector changed route, frequency or measure');
   const expected=job.default.facets;
   if(Object.keys(selector.facets).length!==Object.keys(expected).length || Object.entries(expected).some(([k,v])=>String(selector.facets[k])!==String(v)))throw new Error('Selector differs from saved exact native facets');
   return {rows:job.observations,total:job.observations.length,complete:true,frequency:selector.frequency};
  }
 });
 const record=result.records[0];records.push({cellId:job.cellId,key:job.key,geography:job.row.sampleGeography,frequency:job.row.frequencies[0],pass:record.pass,sourceCalls:job.sourceCalls,...(record.error?{error:record.error}:{}),checks:record.checks});
}
const output={mode:input.mode,inputSHA256:hash,selectionPointerSHA256:input.selectionPointerSHA256,time:new Date().toISOString(),counts:{passed:records.filter(r=>r.pass).length,failed:records.filter(r=>!r.pass).length,unsupported:input.unsupported.length,researchUS:records.filter(r=>r.verificationEngine==='research-documented-US').length},records,unsupported:input.unsupported};
// Raw-row samples remain in protected local evidence; commit a compact check summary.
const detailText=JSON.stringify(output)+'\n';
const detailHash=createHash('sha256').update(detailText).digest('hex');
const detailPath=inputPath.replace(/\.json\.gz$/,'.checks-'+detailHash+'.json');
writeFileSync(detailPath,detailText);
const summary={storage:'local-research-evidence-v1',summary:'Full unchanged row-checker results remain in hash-verified local evidence; offline replay of complete live EIA responses.',mode:output.mode,time:output.time,inputSHA256:hash,selectionPointerSHA256:input.selectionPointerSHA256,counts:output.counts,localFile:detailPath.replace(homedir(),'~'),sha256:detailHash,bytes:Buffer.byteLength(detailText),failed:records.filter(r=>!r.pass).map(({checks,sourceCalls,...r})=>r),unsupported:input.unsupported};
writeFileSync(new URL('row-replay-checks.json',evidence),JSON.stringify(summary)+'\n');
console.log(JSON.stringify(output.counts));
if(output.counts.failed)process.exitCode=1;
