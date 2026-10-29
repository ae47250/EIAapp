// Preserve raw/scored evaluation files. Correct only the harness boundary identified by size analysis.
import {writeFileSync,existsSync} from 'node:fs';
import {convertLockedForm} from '../../lib/sources/eia/locked-form.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {scoreData} from './score-data.js';
import {root,read,verifyFreeze} from './freeze.js';
verifyFreeze();const path=new URL('evidence/eia-lookup-list/serialization-replay.json',root);if(existsSync(path))throw new Error('Replay record already exists');
const summary=read('evidence/eia-lookup-list/live-model/summary.json'),expected=read('evidence/eia-lookup-list/expected-data.json');const corrections=[];
for(const row of summary.rows){
 const raw=read(`evidence/eia-lookup-list/live-model/${row.id}-${row.repeat}-raw.json`),last=raw.attempts.at(-1);
 if(!last.checks?.valid)continue;
 const intent=convertLockedForm(last.form,raw.query,{log:()=>{}}),source=sourceIntentPayload(intent);
 if(JSON.stringify(intent).length<=12000)continue;
 const result=await searchLookup(raw.query,source,{}, {fetchData:async()=>{throw new Error('This replay must not fetch observations.');}});
 corrections.push({id:row.id,repeat:row.repeat,expandedPayloadCharacters:JSON.stringify(intent).length,sourcePayloadCharacters:JSON.stringify(source).length,previousData:row.data,data:scoreData(result,expected.questions.find(q=>q.id===row.id)),result});
}
const rows=summary.rows.map(row=>({...row,data:corrections.find(c=>c.id===row.id&&c.repeat===row.repeat)?.data||row.data}));
const record={recordedAt:new Date().toISOString(),reason:'Evaluation and direct-query handler passed expanded internal intent to a source-form size boundary. Both now use the same sourceIntentPayload as the browser. No form checks, prompts, expected meanings, EIA selectors or model settings changed. Original raw/scored records retained.',modelCalls:0,eiaCalls:0,corrections,rightData:rows.filter(r=>r.data.correct).length,unlabelledWrongData:rows.filter(r=>r.data.unlabelledWrongData).length};
writeFileSync(path,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({correctedRecords:corrections.length,rightData:record.rightData,unlabelledWrongData:record.unlabelledWrongData,modelCalls:0,eiaCalls:0}));
