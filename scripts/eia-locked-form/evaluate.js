import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { interpretQuery } from '../../lib/sources/eia/interpret-query.js';
import { convertLockedForm, blockedLockedIntent } from '../../lib/sources/eia/locked-form.js';
import { replayPublicSearch, scoreRightData } from './real-path.js';
import { scoreMeaning, firstRunPass } from './score.js';
const root = new URL('../../', import.meta.url);
const read = path => JSON.parse(readFileSync(new URL(path,root)));
const tuned = process.argv.includes('--tuned');
const budget = read(tuned ? 'evidence/eia-locked-form/budget-tuned.json' : 'evidence/eia-locked-form/budget.json');
if (!budget.permitted || budget.maximumUSD > 2) throw new Error('Budget does not permit calls');
for(const [path,hash] of Object.entries(read('evidence/eia-locked-form/freeze-manifest.json').sha256)) {
 const expectedHash = tuned && path === 'lib/sources/eia/locked-form-instructions.txt' ? read('evidence/eia-locked-form/prompt-revision.json').revisedSHA256 : hash;
 if(createHash('sha256').update(readFileSync(new URL(path,root))).digest('hex')!==expectedHash)throw new Error('Frozen artifact changed: '+path);
}
const directory = new URL(tuned ? 'evidence/eia-locked-form/live-tuned/' : 'evidence/eia-locked-form/live-first/',root);
if (existsSync(directory)) throw new Error('First-run directory already exists; never overwrite or repeat scored calls');
mkdirSync(directory);
const matches = readFileSync(`${homedir()}/Downloads/openai-api-key.txt`,'utf8').match(/sk-[A-Za-z0-9_-]+/g)||[];
if(matches.length!==1)throw new Error('Working key missing/ambiguous');
const apiKey=matches[0];
process.env.LOGIN_REQUIRED='off';process.env.EIA_API_KEY='';process.env.OPENAI_API_KEY='';
const actualFetch=globalThis.fetch;
globalThis.fetch=async()=>{throw new Error('Unplanned external call; no EIA calls permitted');};
const keys=read('tests/fixtures/eia/locked-form/answer-key.json');
const ceiling=read('evidence/eia-locked-form/ceiling-converter.json').rows;
const rows=[];let count=0;
const options={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:16000,timeoutMs:90000};
for(let repeat=1;repeat<=2;repeat++) for(const k of keys){
 const attempts=[],events=[];
 await interpretQuery(k.query,[],{...options,apiKey,fetch:async(url,init)=>{
  if(url!=='https://api.openai.com/v1/responses'||++count>96)throw new Error('Generation call boundary violated');
  return actualFetch(url,init);
 },onAttempt:attempt=>{attempts.push(attempt);writeFileSync(new URL(`${k.id}-${repeat}-raw.json`,directory),JSON.stringify({id:k.id,repeat,query:k.query,attempts,events},null,2)+'\n');},log:event=>events.push(event)});
 const scored=[];
 for(const attempt of attempts){
  const checksPassed=attempt.checks?.valid===true;
  const meaning=scoreMeaning(attempt.form,k,attempt.reason||'answer');
  const intent=checksPassed?convertLockedForm(attempt.form,k.query,{log:()=>{}}):blockedLockedIntent(k.query,attempt.reason||'failed_check',()=>{});
  const body=await replayPublicSearch(intent,k.query);
  const rightData=scoreRightData(body,k,ceiling.find(r=>r.id===k.id));
  const usage=attempt.response?.usage||{};
  const cached=usage.input_tokens_details?.cached_tokens||0;
  const cacheWrite=usage.input_tokens_details?.cache_write_tokens||0;
  const costUSD=((usage.input_tokens||0)-cached-cacheWrite)*0.10/1e6+cacheWrite*0.125/1e6+cached*0.01/1e6+(usage.output_tokens||0)*0.50/1e6;
  const costUpperUSD=((usage.input_tokens||0)-cached)*0.125/1e6+cached*0.01/1e6+(usage.output_tokens||0)*0.50/1e6;
  scored.push({id:k.id,repeat,attempt:attempt.attempt,meaning,checksPassed,clarificationNeeded:body.intent.needsClarification,
   rightData,elapsedMs:attempt.elapsedMs,usage,costUSD,costUpperUSD,responseId:attempt.response?.id||null,model:attempt.response?.model||null,public:body});
 }
 const row={id:k.id,repeat,query:k.query,attempts:scored,events};rows.push(row);
 writeFileSync(new URL(`${k.id}-${repeat}-scored.json`,directory),JSON.stringify(row,null,2)+'\n');
 const first=scored[0];console.log(JSON.stringify({id:k.id,repeat,meaning:first.meaning.correct,checks:first.checksPassed,rightData:first.rightData.correct,reasks:scored.length-1,costUSD:scored.reduce((n,r)=>n+r.costUSD,0)}));
 if(attempts.some(a=>a.status===400)){
  writeFileSync(new URL('STOP.json',directory),JSON.stringify({reason:'HTTP 400: stop, do not fall back to unenforced JSON',last:k.id,repeat,rows:rows.length},null,2));
  throw new Error('HTTP 400; stop condition reached. Exact response preserved in raw record.');
 }
}
const first=rows.map(r=>r.attempts[0]);
const summary={label:tuned?'tuned on the same queries, not independent':'frozen first run',pass:firstRunPass(first),scheduledCalls:48,generationCalls:count,reasks:count-48,rows:first.map(({public:_,...r})=>r),costUSD:rows.flatMap(r=>r.attempts).reduce((n,r)=>n+r.costUSD,0),costUpperUSD:rows.flatMap(r=>r.attempts).reduce((n,r)=>n+r.costUpperUSD,0),costNote:'Standard input/output estimate; upper bound treats uncached input as cache-write pricing. Usage and raw responses retained.'};
writeFileSync(new URL('summary.json',directory),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({pass:summary.pass,calls:count,costUSD:summary.costUSD,costUpperUSD:summary.costUpperUSD}));
