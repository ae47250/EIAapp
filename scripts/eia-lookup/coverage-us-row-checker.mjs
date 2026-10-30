import { isDeepStrictEqual } from 'node:util';
// Research-only verification for documented US scope without a place facet.
// Whole-product correspondence is established upstream in the hashed selection.
export function checkUSResearchRow(job, metadata, scope, approvedDefault) {
 const checks=[];
 try {
  const {row,observations,default:d}=job;
  if(job.cellId.split('|')[0]!=='US'||d.geographyCode!=='USA'||row.sampleGeography!=='USA')throw new Error('Documented route scope permits USA only.');
  if(scope?.placeKind!=='US'||!scope.quote?.trim()||!scope.checked)throw new Error('Missing verified US scope evidence.');
  const url=new URL(scope.url);if(url.protocol!=='https:'||!(url.hostname==='eia.gov'||url.hostname.endsWith('.eia.gov')))throw new Error('Scope source must be EIA.');
  if(!isDeepStrictEqual(d,approvedDefault))throw new Error('Selector differs from independently loaded approved default.');
  if(d.route!==row.route||d.dataColumn!==row.dataColumn||row.frequencies.length!==1||row.frequencies[0]!==d.frequency||!isDeepStrictEqual(d.facets,row.fixedFacets))throw new Error('Row changed the approved measure, facets or frequency.');
  const route=metadata[row.route];if(!route||!Object.hasOwn(route.data||{},row.dataColumn))throw new Error('Data column absent from metadata.');
  if(!(route.frequency||[]).some(f=>f.id===d.frequency))throw new Error('Frequency absent from metadata.');
  const facets=new Set((route.facets||[]).map(f=>f.id));
  for(const [id,value] of Object.entries(d.facets)){
   if(!facets.has(id))throw new Error('Facet absent from metadata: '+id);
   const values=(Array.isArray(value)?value:[value]).map(String);
   if(!values.every(v=>(metadata[row.route+'/facet/'+id]?.facets||[]).some(f=>String(f.id)===v)))throw new Error('Unverified native facet value: '+id);
   if(observations.some(o=>!values.includes(String(o[id]))))throw new Error('Returned facet differs: '+id);
  }
  const finite=v=>(typeof v==='number'||typeof v==='string')&&String(v).trim()!==''&&Number.isFinite(Number(v));
  if(!observations.length||!observations.some(o=>finite(o[row.dataColumn])))throw new Error('No numeric observation.');
  const units=[...new Set(observations.map(o=>o[row.dataColumn+'-units']||o.unitName||o.units||o.unit))];
  const allowed=(row.reportedUnits||[row.unit]).map(v=>v.toLowerCase());if(units.some(v=>typeof v!=='string'||!allowed.includes(v.toLowerCase())))throw new Error('Unexpected unit.');
  const pattern={annual:/^\d{4}$/,quarterly:/^\d{4}-Q[1-4]$/,monthly:/^\d{4}-(0[1-9]|1[0-2])$/,weekly:/^\d{4}-\d{2}-\d{2}$/,daily:/^\d{4}-\d{2}-\d{2}$/}[d.frequency];
  if(!pattern||observations.some((o,j)=>!pattern.test(o.period)||j>0&&o.period<=observations[j-1].period))throw new Error('Invalid, duplicate or unordered periods.');
  if(observations[0].period>d.firstPeriod||observations.at(-1).period<d.lastPeriod)throw new Error('Truncated selected history.');
  checks.push({geography:'USA',selector:{route:d.route,dataColumn:d.dataColumn,frequency:d.frequency,facets:d.facets},rows:observations.length,numericRows:observations.filter(o=>finite(o[row.dataColumn])).length,units,coverage:{start:observations[0].period,end:observations.at(-1).period},scopeEvidence:scope});
  return {pass:true,checks,verificationEngine:'research-documented-US',appSelectorStatus:'guarded support required after owner go'};
 }catch(error){return {pass:false,checks,error:{message:error.message},verificationEngine:'research-documented-US'};}
}
