// HTTP replay of the exact forms already produced in the browser. No model calls.
import {readdirSync,writeFileSync,existsSync} from 'node:fs';
import {appendLookupChoice} from '../../lib/eia-intent-payload.js';
import {scoreData} from './score-data.js';
import {root,read,verifyFreeze} from './freeze.js';
verifyFreeze();const output=new URL('evidence/eia-lookup-list/browser/http-replay.json',root);
if(existsSync(output))throw new Error('HTTP replay already recorded');
const oracle=read('evidence/eia-lookup-list/expected-data.json'),rows=[];
async function replay(raw,action={}){
 const parts=raw.response.output.flatMap(item=>item.content||[]),form=JSON.parse(raw.response.output_text??parts.filter(part=>part.type==='output_text').map(part=>part.text).join(''));
 const params=appendLookupChoice(new URLSearchParams({q:raw.query}),{interpreter:'openai_locked_form',lockedForm:form},action);
 const response=await fetch('http://127.0.0.1:3188/api/search-eia?'+params,{signal:AbortSignal.timeout(60000)});
 const result=await response.json();const row={id:raw.id,action,status:response.status,sourceFormUnchanged:JSON.stringify(result.intent?.lockedForm)===JSON.stringify(form),result};
 if(!action.lookupRowKey&&!action.choice)row.score=scoreData(result,oracle.questions.find(q=>q.id===raw.id));rows.push(row);return result;
}
for(const id of ['I4','I6','O1','F1']){
 const names=readdirSync(new URL('evidence/eia-lookup-list/browser/',root)).filter(n=>n.startsWith(id+'-')&&n.endsWith('-raw.json')).sort();
 const raw=read('evidence/eia-lookup-list/browser/'+names.at(-1)),initial=await replay(raw);
 if(id==='I4'){const button=initial.choices.find(c=>c.choice?.value==='petroleum');if(!button)throw new Error('Gasoline choice absent');await replay(raw,button);}
 if(id==='I6'){const button=initial.results[0].countries[0].alternatives[0];if(!button)throw new Error('Labelled alternative absent');await replay(raw,button);}
}
writeFileSync(output,JSON.stringify({recordedAt:new Date().toISOString(),purpose:'HTTP replay using the exact browser-produced source forms; not a wire capture of the earlier clicks. No new model calls.',rows},null,2)+'\n');
console.log(JSON.stringify({httpChecks:rows.length,statuses:rows.map(r=>r.status),unchangedForms:rows.every(r=>r.sourceFormUnchanged),correctBaseOutcomes:rows.filter(r=>r.score?.correct).length}));
