import {readFileSync,writeFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildStructuredIntent,resolveApprovedGeography} from '../../lib/sources/eia/intent-routing.js';
import {cleanQueryMechanically} from '../../lib/sources/eia/interpret-query.js';
import {buildLocalCandidatePipeline} from '../../lib/sources/eia/candidate-pipeline.js';
import {getSafeUnitConversion} from '../../lib/sources/eia/multi-country-comparison.js';
import {RESULT_CERTAINTY_VERSION,buildRankedResultCertainty} from '../../lib/sources/eia/result-certainty.js';
const root=new URL('../../',import.meta.url);
export const keys=JSON.parse(readFileSync(new URL('tests/fixtures/eia/locked-form/answer-key.json',root),'utf8'));
// Exercise the exact public handler/grouping source with only the interpreter/auth boundary substituted.
// Retrieval, ranking, grouping, limits, serialization and clarification handling remain the application code.
const handlerFile=new URL('lib/sources/eia/candidate-search.js',root);
const original=readFileSync(handlerFile,'utf8');
const source=original.replace(/^import .*;\n/gm,'').replace('export default async function candidateSearchHandler','async function candidateSearchHandler');
export const groupingSourceSHA256=createHash('sha256').update(original).digest('hex');
export function handIntent(k) {
 const geographies=k.geographies.map(resolveApprovedGeography),first=k.pairs[0];
 const field=value=>({validation:value===null?'missing':'approved',normalizedValue:value,source:'hand_written_ceiling',fallbackUsed:false,alternatives:[]});
 const base={originalQuery:k.query,cleanedQuery:cleanQueryMechanically(k.query),normalizedQuery:cleanQueryMechanically(k.query).toLowerCase(),interpreter:'openai',country:geographies[0]||null,countryCode:geographies[0]?.code||null,validatedGeographies:geographies,product:first[0],activity:first[1],sector:k.sector,frequency:k.frequency,requestedFrequency:k.explicit?k.frequency:null,frequencyExplicit:k.explicit,validatedConceptPairs:k.pairs.map(([product,activity],order)=>({product,activity,sector:k.sector,order})),exclusions:k.excludedTopics.map(([type,value])=>({type,value})),excludedGeographies:k.excludedGeographies,fields:{country:field(geographies[0]?.code||null),product:field(first[0]),activity:field(first[1]),sector:field(k.sector),frequency:{...field(k.frequency),explicit:k.explicit}},needsClarification:false,blockingClarification:false,unknownQualifiers:[],fallback:{used:false,reasons:[]}};
 return {...base,structuredIntent:buildStructuredIntent(base,k.query)};
}
export async function publicReplay(intent,query) {
 let status=200,body;let pipeline;
 const ctx={requireAuthentication:()=>true,normalizeSubmittedIntent:()=>intent,interpretQuery:()=>{throw new Error('Unplanned interpreter call');},cleanQueryMechanically,buildLocalCandidatePipeline:async input=>{pipeline=await buildLocalCandidatePipeline(input);return pipeline;},getSafeUnitConversion,RESULT_CERTAINTY_VERSION,buildRankedResultCertainty,process:{env:{}},fetch:()=>{throw new Error('Unplanned network call');},console};
 const handler=vm.runInNewContext(source+'\ncandidateSearchHandler',ctx,{filename:fileURLToPath(handlerFile)});
 const res={setHeader(){},status(value){status=value;return this;},json(value){body=value;return this;}};
 await handler({method:'GET',query:{q:query,intentReady:'1'}},res);
 if(status!==200)throw new Error('Public replay failed: '+JSON.stringify(body));
 return {status,body,pipeline};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 let networkCalls=0;globalThis.fetch=async()=>{networkCalls++;throw new Error('No model or EIA calls allowed');};
 const rows=[];
 for(const k of keys){
  if(k.clarification){rows.push({id:k.id,query:k.query,status:'pending converter',expectedClarification:k.clarification});continue;}
  const intent=handIntent(k);const replay=await publicReplay(intent,k.query);
  const first=replay.body.comparisonMode?replay.body.comparisonDefinitions[0]||null:replay.body.candidateGroups.filter((g,i,all)=>all.findIndex(x=>x.geography.code===g.geography.code)===i).map(g=>g.candidates[0]);
  rows.push({id:k.id,query:k.query,status:'awaiting metadata adjudication',expected:k,handIntent:intent,first,public:replay.body,pipelineDiagnostics:replay.pipeline.diagnostics});
  console.log(JSON.stringify({id:k.id,comparison:replay.body.comparisonMode,first:replay.body.comparisonMode?first:(first||[]).map(x=>({seriesId:x.seriesId,title:x.title,geography:x.geography,product:x.product,activity:x.activity,unit:x.unit,frequency:x.frequency}))}));
 }
 if(networkCalls)throw new Error('Unexpected network access');
 writeFileSync(new URL('evidence/eia-locked-form/ceiling-hand-written.json',root),JSON.stringify({groupingSourceSHA256,networkCalls,phase:'before converter; clarification cases pending',rows},null,2)+'\n');
}
