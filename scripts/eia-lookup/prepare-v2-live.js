import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),out=resolve(root,'evidence/eia-no-dead-ends/request-freeze-v2-revision-1');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
if(existsSync(out))throw new Error('V2 request freeze already exists; do not repeat counting calls.');
const initial=read('evidence/eia-no-dead-ends/step0/budget-before-calls.json');
if(initial.maximumUSD>1 || initial.maxTokenCountingCalls!==4)throw new Error('Budget ceiling mismatch.');
if(read('evidence/eia-no-dead-ends/request-freeze-v2/count-initial.json').status!==400)throw new Error('Expected preserved preflight failure is missing.');
if(read('evidence/eia-no-dead-ends/step0/summary.json').countCalls!==2)throw new Error('Prior token-count inventory mismatch.');
if(!read('evidence/eia-no-dead-ends/data-live-v2/summary.json').pass)throw new Error('Free EIA pass marks not met.');
const cs=read('tests/fixtures/eia/no-dead-ends/set-c.json').questions.filter(c=>!['C1a','C1b'].includes(c.id));
const independent=read('tests/fixtures/eia/lookup-list/independent-key.json');
const questions=[...cs,...independent];
const requests=questions.flatMap(q=>[false,true].map(reask=>{const body=lockedFormRequestV2(q.query,{model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:16000},reask);return{id:q.id,query:q.query,reask,body,sha256:hash(JSON.stringify(body))};}));
const maxQueryBytes=Math.max(...questions.map(q=>Buffer.byteLength(JSON.stringify(q.query))));
const models={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:16000};
const apiKey=readFileSync(resolve(homedir(),'Downloads/openai-api-key.txt'),'utf8').trim();
if(!/^sk-[A-Za-z0-9_-]+$/.test(apiKey))throw new Error('Existing OpenAI key is unavailable.');
mkdirSync(out,{mode:0o700});const save=(name,data)=>writeFileSync(resolve(out,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
// All request bodies and hashes exist before even the counting requests.
save('requests.json',{recordedAt:new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),repeats:2,scheduledSearches:40,browserQueries:[cs.find(c=>c.id==='C1').query,cs.find(c=>c.id==='C1').query,cs.find(c=>c.id==='C7').query],requests});
const counts=[];
for(const reask of [true]){
 const {max_output_tokens,...body}=lockedFormRequestV2('',models,reask);
 const countBytes=Buffer.byteLength(JSON.stringify(body))+2048;
 if(countBytes>initial.maxCountBytes)throw new Error('Counting-request byte budget exceeded.');
 const response=await fetch('https://api.openai.com/v1/responses/input_tokens',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
 const data=await response.json();
 const count={reask,status:response.status,inputTokens:data.input_tokens,countBytes,maxQueryBytes,bound:Number(data.input_tokens)+maxQueryBytes+256, ...(data.error ? {error:{type:data.error.type,code:data.error.code,param:data.error.param,message:String(data.error.message || '').replaceAll(apiKey,'[REDACTED]')}} : {})};
 save(`count-${reask?'reask':'initial'}.json`,count);counts.push(count);
 if(!response.ok || !Number.isInteger(data.input_tokens) || count.bound>initial.maxInputTokensPerCall)throw new Error('Native count failed or exceeded the input allowance. No generation authorized.');
}
const codePaths=['lib/sources/eia/locked-form-schema-v2.js','lib/sources/eia/locked-form-instructions-v2.txt','lib/sources/eia/locked-form-v2.js','lib/sources/eia/lookup-context.js','lib/sources/eia/lookup-list.js','lib/sources/eia/lookup-search.js','lib/sources/eia/interpret-query.js','lib/eia-intent-payload.js','data/eia/lookup-list.json'];
const budget={recordedAt:new Date().toISOString(),permitted:true,ceilingUSD:1,maximumUSD:initial.maximumUSD,model:models.model,reasoning:models.reasoning,maxOutputTokens:16000,maxInputTokens:8000,maxGenerationCalls:80,maxBrowserGenerationCalls:6,transientRetries:0,counts,
 inputBoundJustification:'Native count of the complete schema/instructions with an empty raw query, plus the largest frozen UTF-8 encoded query length and 256 tokens covering boundary changes and removing the short re-ask sentence for initial calls. One byte per added query token is a conservative upper bound; no truncation.',
 priorRejectedCount:'evidence/eia-no-dead-ends/request-freeze-v2/count-initial.json',totalCountingCalls:4, initialBudget:'evidence/eia-no-dead-ends/step0/budget-before-calls.json',requestFileSHA256:hash(readFileSync(resolve(out,'requests.json'))),codeSHA256:Object.fromEntries(codePaths.map(p=>[p,hash(readFileSync(resolve(root,p)))]))};
save('budget.json',budget);console.log(JSON.stringify({maximumUSD:budget.maximumUSD,counts,scheduledSearches:40,model:budget.model,effort:'low'}));
