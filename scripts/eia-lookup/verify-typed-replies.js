// Bounded follow-up verification. Never rerun an existing live evidence directory.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
import {convertLockedFormV2} from '../../lib/sources/eia/locked-form-v2.js';
import {interpretClarification} from '../../lib/sources/eia/interpret-query.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {fetchEiaData} from '../../lib/sources/eia/eia-fetch.js';
const root=fileURLToPath(new URL('../../',import.meta.url)),dir=resolve(root,'evidence/eia-typed-clarification');
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const cases=read('tests/fixtures/eia/typed-clarification.json').cases;
const options={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:16000};
const save=(name,value)=>writeFileSync(resolve(dir,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
for(const [path,h] of Object.entries(read('evidence/eia-typed-clarification/expectations-freeze.json').sha256))assert.equal(hash(readFileSync(resolve(root,path))),h);
for(const [path,h] of Object.entries(read('evidence/eia-no-dead-ends/freeze-manifest.json').sha256))assert.equal(hash(readFileSync(resolve(root,path))),h);
if(process.argv.includes('--prepare')) {
 const requests=cases.flatMap(c=>[false,true].map(reask=>{const body=fieldReplyRequest(c.form,c.about,c.reply,options,reask);return {id:c.id,reask,body,sha256:hash(JSON.stringify(body))};}));
 const bytes=Math.max(...requests.map(r=>Buffer.byteLength(JSON.stringify(r.body))));
 // Each text token consumes bytes; reserve another 8192 tokens for framing/schema presentation.
 // This deliberately loose bound avoids truncating inputs or reducing reasoning/output allowance.
 assert.ok(bytes+8192<=50000,'Input bound exceeded; stop before calling');
 const maximumUSD=8*(50000*0.25+16000*0.5)/1e6,priorSpentUpperUSD=read('evidence/eia-no-dead-ends/cost-final.json').conservativeSpentUpperUSD;
 assert.ok(maximumUSD+priorSpentUpperUSD<1,'Existing $1 ceiling exceeded');
 const paths=[...new Set([...execFileSync('git',['diff','--name-only','HEAD'],{cwd:root,encoding:'utf8'}).trim().split('\n'),...execFileSync('git',['ls-files','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).trim().split('\n')])].filter(p=>/^(lib|components|scripts|tests)\//.test(p));
 save('request-freeze.json',{recordedAt:new Date().toISOString(),requests,codeSHA256:Object.fromEntries(paths.map(p=>[p,hash(readFileSync(resolve(root,p)))]))});
 save('budget-before-calls.json',{recordedAt:new Date().toISOString(),model:options.model,reasoning:options.reasoning,maxOutputTokens:16000,maxInputTokens:50000,largestBodyBytes:bytes,framingReserveTokens:8192,scheduledRuns:4,possibleValidationReasks:4,transientRetries:0,maximumUSD,priorSpentUpperUSD,cumulativeMaximumUSD:maximumUSD+priorSpentUpperUSD,ceilingUSD:1,pricesPerMillion:{conservativeInput:0.25,output:0.5},source:'https://developers.openai.com/api/docs/models/gpt-6-luna',notes:'Four typed replies from frozen repaired forms. No initial full-query model calls. Single validation reask only; no repeats of wrong meanings. Retain prior 16000-token allowance; low reasoning required by owner.'});
 console.log(JSON.stringify({prepared:true,requests:requests.length,maximumUSD,cumulativeMaximumUSD:maximumUSD+priorSpentUpperUSD}));
} else if(process.argv.includes('--live')) {
 const frozen=read('evidence/eia-typed-clarification/request-freeze.json'),budget=read('evidence/eia-typed-clarification/budget-before-calls.json');
 for(const [path,h] of Object.entries(frozen.codeSHA256))assert.equal(hash(readFileSync(resolve(root,path))),h,path);
 const live=resolve(dir,'live');if(existsSync(live))throw new Error('Live evidence exists. Do not repeat.');
 const openai=readFileSync(resolve(homedir(),'Downloads/openai-api-key.txt'),'utf8').trim(),eia=readFileSync(resolve(homedir(),'Downloads/eia-api-key.txt'),'utf8').trim();
 if(!openai || !eia)throw new Error('Existing key unavailable; no replacement will be created.');
 mkdirSync(live);let calls=0,spent=0;const results=[];
 const redact=value=>JSON.parse(JSON.stringify(value).replaceAll(openai,'[REDACTED]').replaceAll(eia,'[REDACTED]'));
 const liveSave=(name,value)=>writeFileSync(resolve(live,name),JSON.stringify(redact(value),null,2)+'\n',{flag:'wx'});
 liveSave('started.json',{at:new Date().toISOString(),requestFreezeSHA256:hash(readFileSync(resolve(dir,'request-freeze.json'))),budget});
 for(const c of cases){
  const attempts=[],logs=[],eiaResponses=[];let result,intent,error;
  try {
   intent=await interpretClarification(c.query,sourceIntentPayload(convertLockedFormV2(c.form,c.query)),c.about,c.reply,{...options,apiKey:openai,timeoutMs:90000,log:e=>logs.push(e),onAttempt:a=>attempts.push(a),fetch:async(url,init)=>{
    const body=JSON.parse(init.body);assert.equal(String(url),'https://api.openai.com/v1/responses');
    assert.ok(frozen.requests.some(r=>r.id===c.id && r.sha256===hash(JSON.stringify(body))),'Unfrozen request');assert.ok(calls<8);calls++;
    return fetch(url,init);
   }});
   for(const a of attempts){const usage=a.response?.usage;if(usage){assert.ok(usage.input_tokens<=budget.maxInputTokens);spent+=(usage.input_tokens*0.25+usage.output_tokens*0.5)/1e6;}assert.equal(a.response?.model,'gpt-6-luna');}
   result=await searchLookup(c.query,sourceIntentPayload(intent),{},{fetchData:async selector=>{const response=await fetchEiaData(selector,{apiKey:eia,paceMs:600,retries:0});eiaResponses.push({selector,response});return response;}});
   assert.deepEqual(intent.validatedGeographies.map(g=>g.code),c.expected.geographies);assert.equal(intent.product,c.expected.product);assert.equal(intent.activity,c.expected.activity);
   assert.deepEqual({start:intent.years.start,end:intent.years.end},c.expected.years);assert.deepEqual(intent.lockedForm.years,c.form.years);assert.deepEqual(intent.lockedForm.frequency,c.form.frequency);assert.deepEqual(intent.lockedForm.sector,c.form.sector);
   assert.equal(intent.lockedForm.clarification.about,c.expected.nextQuestion);assert.notEqual(intent.lockedForm.clarification.about,c.about);
   assert.equal(Boolean(result.needsClarification),c.expected.outcome==='question');assert.equal(result.query,c.query);assert.deepEqual(result.intent.lockedForm,intent.lockedForm);
   if(c.expected.outcome==='data')assert.ok(result.results[0].countries.every(country=>country.series?.points.length));
   else {assert.ok(result.choices.length);assert.equal(result.freeText,true);}
  } catch(e){error={name:e.name,message:e.message};}
  liveSave(c.id+'.json',{id:c.id,query:c.query,reply:c.reply,about:c.about,expected:c.expected,attempts,logs,intent,result,eiaResponses,pass:!error,error});
  const record={id:c.id,pass:!error,calls:attempts.length,nextQuestion:intent?.lockedForm.clarification.about,countries:result?.results.flatMap(r=>r.countries.map(g=>({code:g.geography.code,status:g.status,points:g.series?.points.length,unit:g.series?.unit}))),error};results.push(record);console.log(JSON.stringify(record));
 }
 const summary={pass:results.every(r=>r.pass),runs:4,calls,results,spentUpperUSD:spent,maximumUSD:budget.maximumUSD,cumulativeSpentUpperUSD:budget.priorSpentUpperUSD+spent,completedAt:new Date().toISOString()};liveSave('summary.json',summary);console.log(JSON.stringify(summary));if(!summary.pass)process.exitCode=1;
} else throw new Error('Use --prepare or --live');
