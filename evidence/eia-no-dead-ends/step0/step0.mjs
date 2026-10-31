import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { interpretQuery } from '/Users/agust/.codex/worktrees/eia-interpretation-audit/EIAapp/lib/sources/eia/interpret-query.js';
import { lockedFormRequest } from '/Users/agust/.codex/worktrees/eia-interpretation-audit/EIAapp/lib/sources/eia/locked-form.js';
const root='/Users/agust/.codex/worktrees/eia-interpretation-audit/EIAapp';
const directory='/private/tmp/eia-no-dead-ends-20261028-step0';
const expectedBase='2c7a4c91e2d03ed580264bda8ab2f413e8dc700f';
if(execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim()!==expectedBase)throw new Error('Start SHA mismatch');
if(existsSync(directory))throw new Error('Step 0 evidence already exists; refusing duplicate calls');
const key=readFileSync(`${homedir()}/Downloads/openai-api-key.txt`,'utf8').trim();
if(!/^sk-[A-Za-z0-9_-]+$/.test(key))throw new Error('Existing key format unavailable');
const query='Looking for data on energy consumption for many countries from 2000-2019';
const models=['gpt-6-luna','gpt-5.4-nano-2026-03-17'];
const hash=value=>createHash('sha256').update(value).digest('hex');
const allowance=16000,maxInput=8000,maxCountBytes=32048;
const maximumUSD=88*(maxInput*.25+allowance*.50)/1e6+2*(maxInput*.20+allowance*1.25)/1e6+4*maxCountBytes*.25/1e6;
const budget={recordedAt:new Date().toISOString(),base:expectedBase,ceilingUSD:1,maximumUSD,maxInputTokensPerCall:maxInput,maxOutputTokensPerCall:allowance,reasoning:{effort:'low'},
  maxGenerationCalls:{luna:88,nano:2,total:90},schedule:{step0Searches:2,scoredCSearches:16,scoredISearches:24,browserSearches:3,possibleReasksPerSearch:1,transientRetries:0},
  maxTokenCountingCalls:4,maxCountBytes,countingReserveUSD:4*maxCountBytes*.25/1e6,
  pricesPerMillion:{luna:{input:.10,cached:.01,write30m:.125,write12h:.25,output:.50},nano:{input:.20,cached:.02,output:1.25}},
  allowanceReason:'The same 16000 output tokens used in Job 2, covering reasoning and final JSON. Low reasoning is required by the owner; no reduction to fit the ceiling.',
  inputBoundRule:'Native counting must establish <=8000 tokens before generation. This is a stop gate, never input truncation. Before v2 calls, verify its entire schema/instructions plus every frozen query against this bound. At most four counting calls, each <=32048 request bytes; conservatively charge them at one input token per byte and the highest Luna cache-write price.',
  sources:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/models/gpt-5.4-nano','https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/token-counting'],
  requests:models.flatMap(model=>[false,true].map(reask=>{const body=lockedFormRequest(query,{model,reasoning:{effort:'low'},maxOutputTokens:allowance},reask);return{model,reask,body,sha256:hash(JSON.stringify(body))};}))};
if(maximumUSD>1)throw new Error('Worst-case cost exceeds ceiling');
mkdirSync(directory,{mode:0o700});
const save=(name,value)=>writeFileSync(`${directory}/${name}`,JSON.stringify(value,null,2)+'\n',{flag:'wx',mode:0o600});
save('budget-before-calls.json',budget);
writeFileSync(`${directory}/step0.mjs`,readFileSync(new URL(import.meta.url)),{flag:'wx',mode:0o600});
let countCalls=0,generationCalls=0;
for(const model of models){
 const body=budget.requests.find(r=>r.model===model&&r.reask).body;
 const {max_output_tokens,...countBody}=body;
 if(Buffer.byteLength(JSON.stringify(countBody))+2048>maxCountBytes)throw new Error('Counting reserve exceeded');
 const response=await fetch('https://api.openai.com/v1/responses/input_tokens',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(countBody),signal:AbortSignal.timeout(30000)});
 countCalls++;
 const data=await response.json();
 save(`count-${model}.json`,{model,status:response.status,response:data});
 if(!response.ok||!Number.isInteger(data.input_tokens)||data.input_tokens>maxInput)throw new Error('Native count failed or exceeds input bound; no generation calls made');
}
const summaries=[];
for(const model of models){
 const attempts=[],events=[];
 const startedAt=new Date().toISOString();
 const intent=await interpretQuery(query,[],{apiKey:key,model,reasoning:{effort:'low'},maxOutputTokens:allowance,timeoutMs:90000,
  fetch:async(url,init)=>{
   const body=JSON.parse(init.body),expected=budget.requests.find(r=>r.model===model&&r.reask===(attempts.length>0));
   if(url!=='https://api.openai.com/v1/responses'||hash(JSON.stringify(body))!==expected.sha256||++generationCalls>4)throw new Error('Frozen request or count boundary mismatch');
   return fetch(url,init);
  },onAttempt:record=>{attempts.push(record);save(`${model}-attempt-${attempts.length}.json`,{query,model,startedAt,requestSHA256:hash(JSON.stringify(record.body)),...record});},log:event=>events.push(event)});
 save(`${model}-result.json`,{query,model,startedAt,finishedAt:new Date().toISOString(),attempts:attempts.length,events,intent});
 const summary={model,returnedModels:attempts.map(a=>a.response?.model),statuses:attempts.map(a=>a.status),attempts:attempts.length,failedChecks:attempts.map(a=>a.checks?.errors||[]),form:attempts.at(-1)?.form,interpretationFailure:intent.interpretationFailure||null,usage:attempts.map(a=>a.response?.usage),events};
 summaries.push(summary);console.log(JSON.stringify({model,attempts:attempts.length,failedChecks:summary.failedChecks,interpretationFailure:summary.interpretationFailure}));
}
save('summary.json',{completedAt:new Date().toISOString(),base:expectedBase,countCalls,generationCalls,summaries});
console.log(JSON.stringify({directory,countCalls,generationCalls,maximumUSD}));
