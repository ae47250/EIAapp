// Freeze evaluation inputs, instructions, limits and code before a single paid run.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
const dir='evidence/eia-coverage/run-freeze',sha=b=>createHash('sha256').update(b).digest('hex');
const read=p=>{const b=readFileSync(p);return JSON.parse(p.endsWith('.gz')?gunzipSync(b):b);};
if(existsSync(dir))throw new Error('Freeze exists; preserve it.');
const D=read('evidence/eia-coverage/set-d-revision-3.json.gz').questions.filter(c=>c.id!=='D7q');
const C=read('evidence/eia-coverage/set-c-revision-2.json.gz').questions;
const I=read('tests/fixtures/eia/lookup-list/independent-key.json');
const options={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:8192};
const initial=[...D.filter(c=>!c.parentId),...C.filter(c=>!['C1a','C1b'].includes(c.id)),...I];
const requests=initial.flatMap(c=>[false,true].map(reask=>{const b=lockedFormRequestV2(c.query,options,reask);return {id:c.id,query:c.query,reask,sha256:sha(JSON.stringify(b)),bytes:Buffer.byteLength(JSON.stringify(b))};}));
const steps=D.filter(c=>c.parentId).map(c=>({id:c.id,parentId:c.parentId,clicks:c.clicks,typedReply:c.typedReply}));
const countBodies=[lockedFormRequestV2('',options,true),fieldReplyRequest({},'geography','',options,true)];
const key=readFileSync(homedir()+'/Downloads/openai-api-key.txt','utf8').trim();if(!key)throw new Error('Existing key unavailable');
// Before counting, reserve even the byte-level input bound at the highest listed cache-write price.
const countingReserveUSD=countBodies.reduce((n,b)=>n+Buffer.byteLength(JSON.stringify(b))+2048,0)*.25/1e6;
if(countingReserveUSD>.04)throw new Error('Unexpected counting reservation; no calls made');
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
const maximumUSD=(inputBound*.25+maxGenerationCalls*options.maxOutputTokens*.50)/1e6+countingReserveUSD;
const paths=execFileSync('git',['ls-files','lib','components','app','data/eia/lookup-list.json','data/eia/lookup-coverage.json.gz','scripts/eia-lookup/score-d.js','scripts/eia-lookup/score-c.js','scripts/eia-lookup/score-data.js','scripts/eia-locked-form/score.js'],{encoding:'utf8'}).trim().split('\n');
paths.push('evidence/eia-coverage/set-d-revision-3.json.gz','evidence/eia-coverage/set-c-revision-2.json.gz','tests/fixtures/eia/lookup-list/independent-key.json','evidence/eia-lookup-list/expected-data.json');
const codeSHA256=Object.fromEntries(paths.map(p=>[p,sha(readFileSync(p))]));
const budget={frozenAt:new Date().toISOString(),options,counts,maximumQueryBytes,maximumReplyFormBytes,maximumReplyBytes,initialInputBound,replyInputBound,initialTurns,replyTurns,maxGenerationCalls,inputBound,countingReserveUSD,maximumUSD,ceilingUSD:1.50,priorThisJobGenerationUSD:0,permitted:maximumUSD<=1.50,pricesPerMillion:{input:.10,cached:.01,cacheWrite30m:.125,cacheWrite12h:.25,output:.50},sources:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/pricing'],allowanceReason:'8192 includes reasoning and JSON. The previous 48 Luna responses used at most 339 output tokens. This gives more than 24 times that observed maximum, with low reasoning unchanged and the full strict schema. These turns contain at most two requested countries; all-state/region expansion is deterministic, not model-generated. No repetitions removed.',maximumMethod:'88 scheduled model turns plus at most one validation re-ask per turn; no transient retries. Input at the highest listed standard cache-write rate; output including reasoning at full price. Count requests conservatively reserved by full request bytes plus framing. Browser replays already-scored responses without paid calls.',codeSHA256};
mkdirSync(dir);writeFileSync(dir+'/requests.json',JSON.stringify({requests,steps,Csteps:[{id:'C1a',parentId:'C1',clicks:['World total']},{id:'C1b',parentId:'C1',clicks:['All countries in a region','Europe']}]},null,2)+'\n');
budget.requestFileSHA256=sha(readFileSync(dir+'/requests.json'));writeFileSync(dir+'/budget.json',JSON.stringify(budget,null,2)+'\n');
console.log(JSON.stringify({initialTurns,replyTurns,maxGenerationCalls,initialInputBound,replyInputBound,countingReserveUSD,maximumUSD,permitted:budget.permitted}));if(!budget.permitted)process.exitCode=2;
