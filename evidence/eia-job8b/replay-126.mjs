import {scoreQ4} from './score-q4.mjs';
import {dialogueKind,executeDialogueStep} from '../eia-job8/dialogue-step-revision-4.mjs';
import {scoreD} from './score-d.mjs';
import {readFileSync,writeFileSync,mkdirSync,existsSync,readdirSync} from 'node:fs';
import {homedir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual as same} from 'node:util';
import {interpretQuery,interpretClarification} from '../../lib/sources/eia/interpret-query.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {findEvaluationChoice} from '../../scripts/eia-lookup/evaluation-choice.js';
import {createCoverageBrowser} from '../../scripts/eia-lookup/coverage-browser-polish.js';
import {normalizeLockedFormV2,convertLockedFormV2} from '../../lib/sources/eia/locked-form-v2.js';
import {geographyLabel} from '../../lib/sources/eia/locked-form-schema.js';
import {lookupCatalog} from '../../lib/sources/eia/lookup-list.js';
import {resolveApprovedGeography} from '../../lib/sources/eia/intent-routing.js';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p));
const original=homedir()+'/Documents/EIAapp-Evidence/20261030/polish/scored-resumed';
const prior=homedir()+'/Documents/EIAapp-Evidence/20261030/polish/scored-live';
const local=homedir()+'/Documents/EIAapp-Evidence/20261031/job8b/saved-replay-126-final';
for(const key of ['EIA_PLAYWRIGHT_PATH','EIA_CHROME_PATH'])if(!process.env[key]||!existsSync(process.env[key]))throw new Error('Required browser path unavailable: '+key);
if(existsSync(local))throw new Error('Replay folder exists; originals must be preserved');
mkdirSync(local,{recursive:true});mkdirSync(local+'/browser');
const nativeFetch=globalThis.fetch;
globalThis.fetch=(url,init)=>{if(!['127.0.0.1','localhost'].includes(new URL(String(url)).hostname))throw new Error('Offline replay blocks external network');return nativeFetch(url,init);};
const save=(dir,name,value)=>writeFileSync(dir+'/'+name,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const canonical=raw=>{const u=new URL(raw);u.searchParams.delete('api_key');u.searchParams.sort();return u.toString();};
const records=readFileSync(original+'/records/eia-calls.jsonl','utf8').trim().split('\n').map(JSON.parse);
let modelReplays=0,eiaReplays=0,activeLabel,activeKind,browser;const results=new Map(),outcomes=[],q4Outcomes=[];
const eiaOptions={apiKey:'offline-placeholder',paceMs:0,retries:0,fetch:async(url)=>{const r=records.find(r=>r.label===activeLabel&&canonical(r.url)===canonical(url))||records.find(r=>canonical(r.url)===canonical(url));if(!r)throw new Error('Unmatched saved EIA request');eiaReplays++;return Response.json({response:read(original+'/eia-'+r.n+'.json')},{status:r.status});}};
const budget=read('evidence/eia-polish/run-freeze/budget.json');
function dependencies(k,repeat,parent){let attempt=0;return {apiKey:'offline-placeholder',...budget.options,rules:()=>{throw new Error('No fallback in replay');},fetch:async(url,init)=>{const filename=`/${k.id}-${repeat}-${parent?'reply':'initial'}-attempt-${++attempt}.json`;const path=existsSync(original+filename)?original+filename:prior+filename;const record=read(path);if(!same(JSON.parse(init.body),record.body))throw new Error('Saved model request differs');modelReplays++;return Response.json(record.response,{status:200});}};}
const strip=value=>Array.isArray(value)?value.map(strip):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([k])=>!['retrievedAt','downloadedAt','elapsedMs','generatedAt','requestId','unsupportedMessage','unsupportedNotice'].includes(k)).map(([k,v])=>[k,strip(v)])):value;
const D=read('evidence/eia-polish/set-d-polish.json.gz').questions.filter(c=>c.id!=='D7q'),C=read('evidence/eia-coverage/set-c-revision-2.json.gz').questions,I=read('evidence/eia-coverage/post-run-audit/independent-key-revision-2.json.gz'),oracle=read('evidence/eia-finish/independent-data-revision.json.gz');
const focusedScores=[];
const savedSources=readdirSync(original).filter(name=>name.startsWith('source-')&&name.endsWith('.json')).map(name=>read(original+'/'+name));
const focusedD8a=read('evidence/eia-job8b/set-d-d8a-revision.json').question;
const focusedD6a=read('evidence/eia-polish/set-d-d6a-revision-2.json.gz').question;
const E=read('evidence/eia-finish/set-e.json').cases, Epolicy=read('evidence/eia-polish/set-e-policy.json'),F=read('evidence/eia-job8b/set-f-revision.json').cases;
const Q4=read('evidence/eia-job8b/q4-freeze.json').cases;
const replayExpectations=read('evidence/eia-job8b/replay-expectations.json');
async function execute(k,repeat,set){
 activeLabel=`${k.id}-${repeat}`;activeKind='application';let result,parent;
 try{
  parent=k.parentId?results.get(`${k.parentId}-${repeat}`):undefined;
  const beforeModelReplays=modelReplays;
  result=await executeDialogueStep(k,parent,dialogueKind(k)==='click'?undefined:dependencies(k,repeat,parent),eiaOptions);
  if(dialogueKind(k)==='click'&&modelReplays!==beforeModelReplays)throw new Error('Button-only step made a model request');
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
 if(set==='D'&&['D6a','D8a'].includes(k.id)){
  const expected=k.id==='D6a'?focusedD6a:focusedD8a,liveEvidence={};
  for(const entry of expected.entries||[]){if(!entry.route||entry.outcome==='missing')continue;
   const selector={route:entry.route,dataColumn:entry.measure,frequency:entry.frequency,facets:entry.facets};
   const source=savedSources.find(source=>same(source.selector,selector));
   if(!source)throw new Error('Missing saved independent source for '+entry.geographyCode);
   liveEvidence[[entry.geographyCode,entry.product,entry.activity].join('|')]=source;
  }
  const score=scoreD(result,expected,{presentation,liveEvidence});
  focusedScores.push({id:k.id,repeat,...score});
 }
 const unchanged=same(strip(result),strip(previous));
 outcomes.push({id:k.id,repeat,set,unchanged,executionError:result.executionError||null});
 console.log(JSON.stringify(outcomes.at(-1)));
}
function formForQ4(item){
 const geo=resolveApprovedGeography(item.injectedForm.geography),query=item.query;
 const geographyQuote=item.injectedForm.geographyQuote;
 return normalizeLockedFormV2({geographies:geo?[{geography:geographyLabel(geo),quoted_words:geographyQuote,is_default:false}]:[],excluded_geographies:[],
  topics:[{product:item.injectedForm.product,activity:item.injectedForm.activity,quoted_words:query}],excluded_topics:[],
  sector:item.injectedForm.sector?{value:item.injectedForm.sector,quoted_words:item.injectedForm.sectorQuote}:{value:null,quoted_words:null},frequency:{value:'annual',explicit:false,quoted_words:null},years:{start:null,end:null,quoted_words:null},
  unsupported_words:item.injectedForm.unsupported_words,clarification:item.injectedForm.clarification},query);
}
async function replayQ4(item){
 activeLabel=item.id;activeKind='injected model output';
 const initial=await searchLookup(item.query,sourceIntentPayload(convertLockedFormV2(formForQ4(item),item.query)),{});
 const fixture={fetchData:async selector=>{const row=lookupCatalog.rows.find(r=>r.route===selector.route&&r.dataColumn===selector.dataColumn&&Object.entries(selector.facets).every(([k,v])=>JSON.stringify(r.fixedFacets?.[k])===JSON.stringify(v)));if(!row)throw new Error('No approved fixture row');return {complete:true,total:1,rows:[{...selector.facets,period:'2024',[selector.dataColumn]:12,unitName:row.unit,'series-description':row.eiaName}]};}};
 const score=await scoreQ4(initial,item,{id:item.id,repeat:1},{browser,eiaOptions:fixture});
 save(local,item.id+'-result.json',score.result);
 q4Outcomes.push({id:item.id,correct:score.correct,errors:score.errors,questionPass:score.correct,buttonPass:score.correct,noticePass:score.correct,screenPass:score.correct,executionError:null});
}

let failure;
try{
 browser=await createCoverageBrowser(local+'/browser');
 for(const [set,cases]of [['D',D],['C',C.map(c=>c.id==='C1a'?{...c,parentId:'C1',clicks:['World total']}:c.id==='C1b'?{...c,parentId:'C1',clicks:['All countries in a region','Europe']}:c)],['I',I]])for(let repeat=1;repeat<=2;repeat++)for(const k of cases)await execute(k,repeat,set);
 for(const k of E)for(let repeat=1;repeat<=(k.expected.repetitions||1);repeat++)await execute(k,repeat,'E');
 for(const k of F)await execute(k,1,'F');
 for(const k of Q4)await replayQ4(k);
}catch(error){failure=error.message;console.log(JSON.stringify({stopped:failure}));}
finally{await browser?.close();}
const summary={focusedScores,kind:'offline replay, not a new scored run',outcomes,q4Outcomes,comparisonIgnoredFields:['unsupportedMessage and unsupportedNotice are new, separately tested Q4 presentation fields'],modelReplays,eiaReplays,networkCalls:0,failure:failure||null,consoleErrors:browser?.consoleErrors};const changed=outcomes.filter(x=>!x.unchanged);
const expectedDifferences=replayExpectations.permittedDifferences.map(({id,repeat})=>({id,repeat})).sort((a,b)=>a.id.localeCompare(b.id)||a.repeat-b.repeat),actualDifferences=changed.map(({id,repeat})=>({id,repeat})).sort((a,b)=>a.id.localeCompare(b.id)||a.repeat-b.repeat);
const expectedChangesMatch=same(actualDifferences,expectedDifferences);
summary.expectedDifferences=expectedDifferences;summary.actualDifferences=actualDifferences;summary.expectedChangeReasons=replayExpectations.permittedDifferences;summary.expectedChangesMatch=expectedChangesMatch;summary.changed=changed;summary.q4Pass=q4Outcomes.length===3&&q4Outcomes.every(x=>x.questionPass&&x.buttonPass&&x.noticePass&&x.screenPass&&!x.executionError);
summary.focusedPass=focusedScores.length===4&&focusedScores.every(x=>x.correct);
summary.replayGate=summary.focusedPass&&!failure&&outcomes.length===126&&!outcomes.some(x=>x.executionError)&&expectedChangesMatch&&summary.q4Pass;
save(local,'summary.json',summary);console.log(JSON.stringify({focusedPass:summary.focusedPass,focusedScores:focusedScores.map(({id,repeat,correct,formErrors,outcomeErrors,presentationErrors})=>({id,repeat,correct,formErrors,outcomeErrors,presentationErrors})),total:outcomes.length,q4:q4Outcomes,changed,modelReplays,eiaReplays,failure,expectedChangesMatch,q4Pass:summary.q4Pass,replayGate:summary.replayGate}));if(!summary.replayGate)process.exitCode=1;
