import {readdirSync,writeFileSync,existsSync} from 'node:fs';
import {root,read,verifyFreeze,sha256} from './freeze.js';
verifyFreeze();const output=new URL('evidence/eia-lookup-list/cost-reconciliation.json',root);if(existsSync(output))throw new Error('Cost record already exists');
const budget=read('evidence/eia-lookup-list/budget.json'),calls=[];
for(const folder of ['live-model','browser'])for(const name of readdirSync(new URL(`evidence/eia-lookup-list/${folder}/`,root)).filter(n=>n.endsWith('-raw.json'))){
 const record=read(`evidence/eia-lookup-list/${folder}/${name}`);
 for(const a of record.attempts||[record]){
  const u=a.response?.usage;if(!u)throw new Error('Missing usage; exact generation estimate cannot be reconciled');
  const expected=budget.counts.find(c=>c.id===record.id&&c.reask===(a.attempt>0));
  if(sha256(JSON.stringify(a.body))!==expected.bodySHA256)throw new Error('Generation request differs from pre-call budget');
  const cached=u.input_tokens_details?.cached_tokens||0,written=u.input_tokens_details?.cache_write_tokens||0,uncached=u.input_tokens-cached-written;
  if(uncached<0)throw new Error('Inconsistent input usage');
  const estimateUSD=(uncached*.10+written*.125+cached*.01+u.output_tokens*.50)/1e6;
  const upperUSD=(u.input_tokens*.25+u.output_tokens*.50)/1e6;
  calls.push({folder,id:record.id,repeat:record.repeat||null,attempt:a.attempt,responseId:a.response.id,model:a.response.model,usage:u,estimateUSD,upperUSD});
 }
}
if(calls.length>budget.maxGenerationCalls)throw new Error('Call ceiling exceeded');
const generationEstimateUSD=calls.reduce((n,c)=>n+c.estimateUSD,0),generationUpperUSD=calls.reduce((n,c)=>n+c.upperUSD,0);
const result={recordedAt:new Date().toISOString(),calls,modelEvaluationCalls:calls.filter(c=>c.folder==='live-model').length,browserCalls:calls.filter(c=>c.folder==='browser').length,generationEstimateUSD,generationUpperUSD,countingReserveUSD:budget.countingReserveUSD,totalConservativeAccountedUSD:generationUpperUSD+budget.countingReserveUSD,preCallMaximumUSD:budget.maximumUSD,ceilingUSD:1,
 method:'Usage-based generation estimate uses standard input/output/cached prices and 30-minute cache-write pricing. Conservative generation bound charges all input at the highest cache-write rate. Add the original conservative reserve for native token counting; its actual billing is not stated in the source documentation.',
 correction:'Original per-response evaluation cost estimates treated cache-write tokens as ordinary input. Those historical records remain unchanged. This reconciliation includes the cache-write premium, and the runner now does so too. No generation was repeated.'};
writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({generationCalls:calls.length,generationEstimateUSD,generationUpperUSD,totalConservativeAccountedUSD:result.totalConservativeAccountedUSD,preCallMaximumUSD:budget.maximumUSD}));
