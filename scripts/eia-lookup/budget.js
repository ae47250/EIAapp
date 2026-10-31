import {writeFileSync,existsSync} from 'node:fs';
import {lockedFormRequest} from '../../lib/sources/eia/locked-form.js';
import {root,read,verifyFreeze,sha256} from './freeze.js';
verifyFreeze();
const path=new URL('evidence/eia-lookup-list/budget.json',root);if(existsSync(path))throw new Error('Budget already recorded; refusing overwrite');
if(!process.env.OPENAI_API_KEY)throw new Error('Existing OpenAI key unavailable');
const independent=read('tests/fixtures/eia/lookup-list/independent-key.json'),original=read('tests/fixtures/eia/locked-form/answer-key.json');
const inputs=[...independent,...original.filter(k=>['O1','F1'].includes(k.id))];
const counts=[];const allowance=16000;
for(const k of inputs)for(const reask of [false,true]){
 const body=lockedFormRequest(k.query,{maxOutputTokens:allowance},reask);
 if(body.model!=='gpt-6-luna'||body.reasoning?.effort!=='low')throw new Error('App default does not match authorized model/settings');
 const {max_output_tokens,...countBody}=body;
 const response=await fetch('https://api.openai.com/v1/responses/input_tokens',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(countBody),signal:AbortSignal.timeout(30000)});
 const data=await response.json();if(!response.ok||!Number.isInteger(data.input_tokens))throw new Error(`Token count failed with HTTP ${response.status}; no generation calls made`);
 counts.push({id:k.id,reask,inputTokens:data.input_tokens,requestBytes:Buffer.byteLength(JSON.stringify(countBody)),bodySHA256:sha256(JSON.stringify(body))});
}
const inputTokens=counts.reduce((n,r)=>n+r.inputTokens*(r.id.startsWith('I')?2:0),0)+counts.filter(r=>['I4','I6','O1','F1'].includes(r.id)).reduce((n,r)=>n+r.inputTokens,0);
const countingReserveUSD=counts.reduce((n,r)=>n+r.requestBytes+2048,0)*.25/1e6;
const outputTokens=56*allowance;const maximumUSD=(inputTokens*.25+outputTokens*.50)/1e6+countingReserveUSD;
const budget={recordedAt:new Date().toISOString(),model:'gpt-6-luna',reasoning:{effort:'low'},allowance,timeoutMs:90000,scheduledModelResponses:24,browserSearches:4,maxGenerationCalls:56,maxReasksPerSearch:1,inputTokens,outputTokens,counts,countingReserveUSD,maximumUSD,ceilingUSD:1,priorThisJobGenerationSpendingUSD:0,permitted:maximumUSD<=1,
 pricesPerMillion:{input:.10,cached:.01,cacheWrite30m:.125,cacheWrite12h:.25,output:.50},
 sources:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/structured-outputs'],
 allowanceReason:'16000 tokens per response for both reasoning and final JSON: the same generous allowance used for the prior locked-form evaluation; no reduction to meet the ceiling. Low effort is the owner decision. Frozen schema and prompt are included in native token counts.',
 maximumMethod:'24 scheduled searches plus 24 possible re-asks, and four browser searches plus four possible re-asks. All input charged at the highest listed cache-write price, all output including reasoning at full standard output price; no cache discounts assumed. Token-count calls conservatively reserved at one input token per request byte plus 2048 framing tokens. No tools or external paid calls.',
 nativeSupport:'Current official model page confirms Responses API, low reasoning and strict Structured Outputs; native counting succeeded for every frozen input. Refusal and incomplete-response handling remain unchanged.'};
writeFileSync(path,JSON.stringify(budget,null,2)+'\n');console.log(JSON.stringify({maximumUSD,ceilingUSD:1,permitted:budget.permitted,inputTokens,countingRequests:counts.length}));if(!budget.permitted)process.exitCode=1;
