import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {dialogueKind,executeDialogueStep} from './dialogue-step-revision-4.mjs';
import {meaningD} from '../../scripts/eia-lookup/score-d-polish.js';

const read=path=>JSON.parse(path.endsWith('.gz')?gunzipSync(readFileSync(path)):readFileSync(path));
const D=read('evidence/eia-polish/set-d-polish.json.gz').questions.filter(x=>x.id!=='D7q');
const revisedD6a=read('evidence/eia-polish/set-d-d6a-revision-2.json.gz').question;
const original=homedir()+'/Documents/EIAapp-Evidence/20261030/polish/scored-resumed';
const replay=homedir()+'/Documents/EIAapp-Evidence/20261031/job8/saved-replay-run2b';
const records=readFileSync(original+'/records/eia-calls.jsonl','utf8').trim().split('\n').map(JSON.parse);
const canonical=raw=>{const url=new URL(raw);url.searchParams.delete('api_key');url.searchParams.sort();return url.toString();};

test('58 D outcomes include ten button-only steps and four typed replies',()=>{
  assert.equal(D.length*2,58);
  assert.equal(D.filter(x=>dialogueKind(x)==='initial').length*2,44);
  assert.equal(D.filter(x=>dialogueKind(x)==='click').length*2,10);
  assert.equal(D.filter(x=>dialogueKind(x)==='reply').length*2,4);
  assert.equal((44+4+8+9+3)*2,136);
});

for(const id of ['D6a','D8a'])for(const repeat of [1,2])test(`${id} repeat ${repeat}: perform recorded click without any model request`,async()=>{
  const k=id==='D6a'?revisedD6a:D.find(x=>x.id===id);
  const parent=read(`${replay}/${k.parentId}-${repeat}-result.json`);
  let modelCalls=0,eiaReplays=0;const trace=[];
  const result=await executeDialogueStep(k,parent,{fetch:async()=>{modelCalls++;throw new Error('A button must not call the model');}},
    {apiKey:'offline-placeholder',paceMs:0,retries:0,fetch:async url=>{
      const record=records.find(x=>canonical(x.url)===canonical(url));assert.ok(record,'saved EIA response must exist');eiaReplays++;
      return Response.json({response:read(`${original}/eia-${record.n}.json`)},{status:record.status});
    }},row=>trace.push(row));
  assert.equal(modelCalls,0);
  assert.deepEqual(trace.map(x=>x.label),k.clicks);
  assert.deepEqual(meaningD(result.intent.lockedForm),meaningD(k.form));
  if(id==='D6a'){
    assert.equal(result.needsClarification,false);
    const countries=result.results.flatMap(g=>g.countries||[]);
    assert.deepEqual(countries.map(c=>c.geography.code),k.entries.map(e=>e.geographyCode));
    assert.ok(!countries.some(c=>c.geography.code==='AK'));
    for(const entry of k.entries)if(entry.outcome==='missing')assert.equal(countries.find(c=>c.geography.code===entry.geographyCode).statusLabel,entry.statusLabel);
    assert.ok(eiaReplays>0);
  }else{
    assert.equal(result.userMessage,k.question.text);
    assert.deepEqual(result.choices.map(c=>c.label),k.question.buttons);
    assert.equal(result.freeText,true);
  }
});
