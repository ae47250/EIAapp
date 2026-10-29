import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {interpretQuery} from '../../lib/sources/eia/interpret-query.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {scoreMeaning} from '../eia-locked-form/score.js';
import {scoreData} from './score-data.js';
import {root,read,verifyFreeze,sha256} from './freeze.js';
verifyFreeze();
const budget=read('evidence/eia-lookup-list/budget.json');
if(!budget.permitted||budget.maximumUSD>1||budget.maxGenerationCalls!==56)throw new Error('Budget does not authorize these calls');
if(!process.env.OPENAI_API_KEY||!process.env.EIA_API_KEY)throw new Error('Designated existing keys unavailable');
const directory=new URL('evidence/eia-lookup-list/live-model/',root);if(existsSync(directory))throw new Error('Evaluation already started; refusing duplicate calls');mkdirSync(directory);
const keys=read('tests/fixtures/eia/lookup-list/independent-key.json'),oracle=read('evidence/eia-lookup-list/expected-data.json');
let generationCalls=0;const rows=[];const nativeFetch=globalThis.fetch;
for(let repeat=1;repeat<=2;repeat++)for(const k of keys){
 const attempts=[],events=[];
 const intent=await interpretQuery(k.query,[],{maxOutputTokens:budget.allowance,timeoutMs:budget.timeoutMs,
  fetch:async(url,init)=>{
   const body=JSON.parse(init.body),isReask=attempts.length>0,expected=budget.counts.find(c=>c.id===k.id&&c.reask===isReask);
   if(url!=='https://api.openai.com/v1/responses'||++generationCalls>48||sha256(JSON.stringify(body))!==expected.bodySHA256)throw new Error('Frozen request or call-count boundary violated');
   return nativeFetch(url,init);
  },onAttempt:attempt=>{attempts.push(attempt);writeFileSync(new URL(`${k.id}-${repeat}-raw.json`,directory),JSON.stringify({id:k.id,repeat,query:k.query,attempts,events},null,2)+'\n');},log:event=>events.push(event)});
 const result=await searchLookup(k.query,intent);
 const finalAttempt=attempts.at(-1),usage=attempts.map(a=>a.response?.usage||{});
 const costUSD=usage.reduce((n,u)=>n+((u.input_tokens||0)-(u.input_tokens_details?.cached_tokens||0))*.10/1e6+(u.input_tokens_details?.cached_tokens||0)*.01/1e6+(u.output_tokens||0)*.50/1e6,0);
 const costUpperUSD=usage.reduce((n,u)=>n+(u.input_tokens||0)*.25/1e6+(u.output_tokens||0)*.50/1e6,0);
 const row={id:k.id,repeat,query:k.query,meaning:scoreMeaning(finalAttempt?.form,k,finalAttempt?.reason||'answer'),checksPassed:finalAttempt?.checks?.valid===true,
  firstAttempt:{meaning:scoreMeaning(attempts[0]?.form,k,attempts[0]?.reason||'answer'),checksPassed:attempts[0]?.checks?.valid===true},
  data:scoreData(result,oracle.questions.find(q=>q.id===k.id)),clarificationNeeded:result.needsClarification,attemptCount:attempts.length,usage,costUSD,costUpperUSD,result};
 rows.push(row);writeFileSync(new URL(`${k.id}-${repeat}-scored.json`,directory),JSON.stringify(row,null,2)+'\n');
 console.log(JSON.stringify({id:k.id,repeat,meaning:row.meaning.correct,checks:row.checksPassed,rightData:row.data.correct,reasks:attempts.length-1,costUSD,errors:row.data.errors}));
}
const summary={completedAt:new Date().toISOString(),scheduledResponses:24,generationCalls,reasks:generationCalls-24,meaningCorrect:rows.filter(r=>r.meaning.correct).length,checksPassed:rows.filter(r=>r.checksPassed).length,rightData:rows.filter(r=>r.data.correct).length,unlabelledWrongData:rows.filter(r=>r.data.unlabelledWrongData).length,
 firstAttemptMeaningCorrect:rows.filter(r=>r.firstAttempt.meaning.correct).length,firstAttemptChecksPassed:rows.filter(r=>r.firstAttempt.checksPassed).length,costUSD:rows.reduce((n,r)=>n+r.costUSD,0),costUpperUSD:rows.reduce((n,r)=>n+r.costUpperUSD,0),rows:rows.map(({result,...r})=>r),
 limitation:'These questions test reading independently of the locked-form instructions. The lookup list was built knowing these questions, so they are not an independent test of the list. They become regression cases after this run.'};
writeFileSync(new URL('summary.json',directory),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({rightData:summary.rightData,meaning:summary.meaningCorrect,checks:summary.checksPassed,costUSD:summary.costUSD}));
