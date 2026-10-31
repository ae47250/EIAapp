import {writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {scoreData} from './score-data.js';
import {root,read,verifyFreeze} from './freeze.js';
verifyFreeze();
if(!process.env.EIA_API_KEY)throw new Error('Designated EIA key unavailable');
const directory=new URL('evidence/eia-lookup-list/gold-live/',root);
if(existsSync(directory))throw new Error('Gold evaluation already exists; refusing overwrite');mkdirSync(directory);
const gold=read('tests/fixtures/eia/locked-form/gold-forms.json'),keys=read('tests/fixtures/eia/locked-form/answer-key.json'),expected=read('evidence/eia-lookup-list/expected-data.json');
const rows=[];
for(const k of keys){
 const started=Date.now();const result=await searchLookup(k.query,{interpreter:'openai_locked_form',lockedForm:gold.find(g=>g.id===k.id).form});
 const row={id:k.id,query:k.query,elapsedMs:Date.now()-started,score:scoreData(result,expected.questions.find(q=>q.id===k.id)),result};rows.push(row);
 writeFileSync(new URL(k.id+'.json',directory),JSON.stringify(row,null,2)+'\n');
 console.log(JSON.stringify({id:k.id,correct:row.score.correct,errors:row.score.errors}));
}
const summary={completedAt:new Date().toISOString(),questions:rows.length,correct:rows.filter(r=>r.score.correct).length,unlabelledWrongData:rows.filter(r=>r.score.unlabelledWrongData).length,rows:rows.map(({result,...r})=>r)};
writeFileSync(new URL('summary.json',directory),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({questions:summary.questions,correct:summary.correct,unlabelledWrongData:summary.unlabelledWrongData}));
