// Freeze evaluation inputs, instructions, limits and code before a single paid run.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
const dir='evidence/eia-coverage/followup-20261030/run-freeze',sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const b=readFileSync(p);return JSON.parse(p.endsWith('.gz')?gunzipSync(b):b);};
if(existsSync(dir))throw new Error('Freeze exists; preserve it.');
const D=read('evidence/eia-coverage/followup-20261030/set-d-revision-4.json.gz').questions.filter(c=>c.id!=='D7q');
const C=read('evidence/eia-coverage/set-c-revision-2.json.gz').questions;
const I=read('evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz');
const options={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:3072};
const initial=[...D.filter(c=>!c.parentId),...C.filter(c=>!['C1a','C1b'].includes(c.id)),...I];
const requests=initial.flatMap(c=>[false,true].map(reask=>{const b=lockedFormRequestV2(c.query,options,reask);return {id:c.id,query:c.query,reask,sha256:sha(JSON.stringify(b)),bytes:Buffer.byteLength(JSON.stringify(b))};}));
const steps=D.filter(c=>c.parentId).map(c=>({id:c.id,parentId:c.parentId,clicks:c.clicks,typedReply:c.typedReply}));
const countBodies=[lockedFormRequestV2('',options,true),fieldReplyRequest({},'geography','',options,true)];
const key=readFileSync(homedir()+'/Downloads/openai-api-key.txt','utf8').trim();if(!key)throw new Error('Existing key unavailable');
// Before counting, reserve even the byte-level input bound at the documented default 30-minute cache-write price.
const countingReserveUSD=countBodies.reduce((n,b)=>n+Buffer.byteLength(JSON.stringify(b))+2048,0)*.125/1e6;
if(countingReserveUSD>.04)throw new Error('Unexpected counting reservation; no calls made');
writeFileSync('evidence/eia-coverage/followup-20261030/counting-reservation.json',JSON.stringify({at:new Date().toISOString(),countingCalls:2,countingReserveUSD,ceilingUSD:.50,options,rule:'Reserve full request bytes plus framing before token-count calls; no generation until final maximum is permitted.'},null,2)+'\n',{flag:'wx'});
const counts=[];
for(const b of countBodies){const {max_output_tokens,...body}=b;const r=await fetch('https://api.openai.com/v1/responses/input_tokens',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});const d=await r.json();if(!r.ok||!Number.isInteger(d.input_tokens))throw new Error('Native token count unavailable; HTTP '+r.status);counts.push({inputTokens:d.input_tokens,requestSHA256:sha(JSON.stringify(body)),requestBytes:Buffer.byteLength(JSON.stringify(body))});}
const maximumQueryBytes=Math.max(...initial.map(c=>Buffer.byteLength(JSON.stringify(c.query))));
// Byte-level allowances bound the changed query or current form and reply; add 1024 for framing/token-boundary variation.
const maximumReplyFormBytes=5000,maximumReplyBytes=240;
const initialInputBound=counts[0].inputTokens+maximumQueryBytes+1024;
const replyInputBound=counts[1].inputTokens+maximumReplyFormBytes+maximumReplyBytes+1024;
const initialTurns=initial.length*2,replyTurns=steps.filter(c=>c.typedReply).length*2;
const maxGenerationCalls=(initialTurns+replyTurns)*2;
const inputBound=2*(initialTurns*initialInputBound+replyTurns*replyInputBound);
const maximumUSD=(inputBound*.125+maxGenerationCalls*options.maxOutputTokens*.50)/1e6+countingReserveUSD;
const paths=execFileSync('git',['ls-files','lib','components','app','data/eia/lookup-list.json','data/eia/lookup-coverage.json.gz','scripts/eia-lookup/score-d.js','scripts/eia-lookup/score-d-revision-2.js','scripts/eia-lookup/score-c.js','scripts/eia-lookup/score-data.js','scripts/eia-locked-form/score.js'],{encoding:'utf8'}).trim().split('\n');
paths.push('data/eia/geography-ambiguities.json','scripts/eia-lookup/score-d-revision-2.js','scripts/eia-lookup/evaluate-coverage-followup.js','scripts/eia-lookup/evaluation-choice.js','scripts/eia-lookup/coverage-browser-followup.js','scripts/eia-lookup/read-export-places.py','evidence/eia-coverage/followup-20261030/set-d-revision-4.json.gz','evidence/eia-coverage/set-c-revision-2.json.gz','evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz','evidence/eia-coverage/post-run-audit/independent-data-revision-2.json.gz');
const codeSHA256=Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]));
const budget={frozenAt:new Date().toISOString(),options,counts,maximumQueryBytes,maximumReplyFormBytes,maximumReplyBytes,initialInputBound,replyInputBound,initialTurns,replyTurns,maxGenerationCalls,inputBound,countingReserveUSD,maximumUSD,ceilingUSD:.50,priorThisJobGenerationUSD:0,permitted:maximumUSD<=.50,pricesPerMillion:{input:.10,cached:.01,cacheWrite30m:.125,cacheWrite12h:.25,output:.50},sources:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/prompt-caching'],allowanceReason:'3072 output tokens including reasoning, over 7 times the prior 89-response maximum of 400. Same low reasoning and full schema. These short forms contain at most two named places; larger groups expand deterministically. All repetitions retained. The previous 8192 allowance was unnecessarily large for the measured output distribution.',maximumMethod:'88 scheduled model turns plus at most one validation re-ask per turn; no transient retries. Input at the documented default 30-minute cache-write rate, $0.125/M, a total rate rather than a surcharge. No cache options are set; official caching documentation confirms default 30m; output including reasoning at full price. Count requests conservatively reserved by full request bytes plus framing. Browser replays already-scored responses without paid calls.',codeSHA256};
mkdirSync(dir);writeFileSync(dir+'/requests.json',JSON.stringify({requests,steps,Csteps:[{id:'C1a',parentId:'C1',clicks:['World total']},{id:'C1b',parentId:'C1',clicks:['All countries in a region','Europe']}]},null,2)+'\n');
budget.requestFileSHA256=sha(readFileSync(dir+'/requests.json'));writeFileSync(dir+'/budget.json',JSON.stringify(budget,null,2)+'\n');
console.log(JSON.stringify({initialTurns,replyTurns,maxGenerationCalls,initialInputBound,replyInputBound,countingReserveUSD,maximumUSD,permitted:budget.permitted}));if(!budget.permitted)process.exitCode=2;
