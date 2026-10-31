import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as same} from 'node:util';
import {interpretQuery,interpretClarification} from '../../lib/sources/eia/interpret-query.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {findEvaluationChoice} from './evaluation-choice.js';
import {createCoverageBrowser} from './coverage-browser-polish.js';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p));
const original=homedir()+'/Documents/EIAapp-Evidence/20261030/polish/scored-resumed';
const prior=homedir()+'/Documents/EIAapp-Evidence/20261030/polish/scored-live';
const local=homedir()+'/Documents/EIAapp-Evidence/20261030/polish/final-offline-replay-2';
for(const key of ['EIA_PLAYWRIGHT_PATH','EIA_CHROME_PATH'])if(!process.env[key]||!existsSync(process.env[key]))throw new Error('Required browser path unavailable: '+key);
if(existsSync(local))throw new Error('Replay folder exists; originals must be preserved');
mkdirSync(local,{recursive:true});mkdirSync(local+'/browser');
const nativeFetch=globalThis.fetch;
globalThis.fetch=(url,init)=>{if(!['127.0.0.1','localhost'].includes(new URL(String(url)).hostname))throw new Error('Offline replay blocks external network');return nativeFetch(url,init);};
const save=(dir,name,value)=>writeFileSync(dir+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const canonical=raw=>{const u=new URL(raw);u.searchParams.delete('api_key');u.searchParams.sort();return u.toString();};
const records=readFileSync(original+'/records/eia-calls.jsonl','utf8').trim().split('\n').map(JSON.parse);
let modelReplays=0,eiaReplays=0,activeLabel,activeKind,browser;const results=new Map(),outcomes=[];
const eiaOptions={apiKey:'offline-placeholder',paceMs:0,retries:0,fetch:async(url)=>{const r=records.find(r=>r.label===activeLabel&&canonical(r.url)===canonical(url))||records.find(r=>canonical(r.url)===canonical(url));if(!r)throw new Error('Unmatched saved EIA request');eiaReplays++;return Response.json({response:read(original+'/eia-'+r.n+'.json')},{status:r.status});}};
const budget=read('evidence/eia-polish/run-freeze/budget.json');
function dependencies(k,repeat,parent){let attempt=0;return {apiKey:'offline-placeholder',...budget.options,rules:()=>{throw new Error('No fallback in replay');},fetch:async(url,init)=>{const filename=`/${k.id}-${repeat}-${parent?'reply':'initial'}-attempt-${++attempt}.json`;const path=existsSync(original+filename)?original+filename:prior+filename;const record=read(path);if(!same(JSON.parse(init.body),record.body))throw new Error('Saved model request differs');modelReplays++;return Response.json(record.response,{status:200});}};}
const strip=value=>Array.isArray(value)?value.map(strip):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['retrievedAt','downloadedAt','elapsedMs','generatedAt','requestId'].includes(k)).map(([k,v])=>[k,strip(v)])):value;
const D=read('evidence/eia-polish/set-d-polish.json.gz').questions.filter(c=>c.id!=='D7q'),C=read('evidence/eia-coverage/set-c-revision-2.json.gz').questions,I=read('evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz'),oracle=read('evidence/eia-finish/independent-data-revision.json.gz');
const E=read('evidence/eia-finish/set-e.json').cases, Epolicy=read('evidence/eia-polish/set-e-policy.json'),F=read('evidence/eia-polish/set-f.json').cases;
async function execute(k,repeat,set){
 activeLabel=`${k.id}-${repeat}`;activeKind='application';let result,parent;
 try{
  if(k.parentId){parent=results.get(`${k.parentId}-${repeat}`);if(!parent)throw new Error('Parent outcome missing');
   if(k.typedReply){const intent=await interpretClarification(k.query,sourceIntentPayload(parent.intent),parent.intent.lockedForm.clarification.about||parent.intent.replyAbout||'geography',k.typedReply,dependencies(k,repeat,parent));result=await searchLookup(k.query,sourceIntentPayload(intent),{},eiaOptions);}
   else {result=parent;for(const label of k.clicks){const button=findEvaluationChoice(result,label);result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);}}
  }else{const intent=await interpretQuery(k.query,[],dependencies(k,repeat));result=await searchLookup(k.query,sourceIntentPayload(intent),{},eiaOptions);}
  if(set==='E'||set==='F'){
   const e=k.expected;save(local,activeLabel+'-initial-result.json',result);
   for(const label of e.clicks||[]){const button=findEvaluationChoice(result,label);result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);}
   if(e.reply){const initial=result,replyCase={...k,typedReply:e.reply};const updated=await interpretClarification(k.query,sourceIntentPayload(initial.intent),initial.intent.lockedForm.clarification.about||initial.intent.replyAbout||'geography',e.reply,dependencies(replyCase,repeat,initial));result=await searchLookup(k.query,sourceIntentPayload(updated),{},eiaOptions);}
   if(e.buttonPath){const button=findEvaluationChoice(result,e.buttonPath);result=await searchLookup(k.query,sourceIntentPayload(result.intent),button,eiaOptions);result.statePathVerified=true;}
   if(e.states&&e.reply)result.statePathVerified=true;
  }
 }catch(error){result={...(result||parent||{mode:'lookup',query:k.query,intent:{},results:[],choices:[],freeText:false}),executionError:error.message};}
 results.set(activeLabel,result);save(local,activeLabel+'-result.json',result);
 const previous=read(original+'/'+activeLabel+'-result.json');
 const presentation=await browser.render(result,activeLabel,{screenshot:false});
 const unchanged=same(strip(result),strip(previous));
 outcomes.push({id:k.id,repeat,set,unchanged,executionError:result.executionError||null});
 console.log(JSON.stringify(outcomes.at(-1)));
}
let failure;
try{
 browser=await createCoverageBrowser(local+'/browser');
 for(const [set,cases]of [['D',D],['C',C.map(c=>c.id==='C1a'?{...c,parentId:'C1',clicks:['World total']}:c.id==='C1b'?{...c,parentId:'C1',clicks:['All countries in a region','Europe']}:c)],['I',I]])for(let repeat=1;repeat<=2;repeat++)for(const k of cases)await execute(k,repeat,set);
 for(const k of E)for(let repeat=1;repeat<=(k.expected.repetitions||1);repeat++)await execute(k,repeat,'E');
 for(const k of F)await execute(k,1,'F');
}catch(error){failure=error.message;console.log(JSON.stringify({stopped:failure}));}
finally{await browser?.close();}
const summary={kind:'offline replay, not a new scored run',outcomes,modelReplays,eiaReplays,networkCalls:0,failure:failure||null,consoleErrors:browser?.consoleErrors};save(local,'summary.json',summary);console.log(JSON.stringify({total:outcomes.length,changed:outcomes.filter(x=>!x.unchanged),modelReplays,eiaReplays,failure}));if(failure||outcomes.some(x=>x.executionError))process.exitCode=1;
