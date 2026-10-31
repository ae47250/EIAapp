// Freeze the complete dialogue schedule, unchanged scorers, code, and all attempts.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {homedir} from 'node:os';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';
import {fieldReplyRequest} from '../../lib/sources/eia/locked-form-reply.js';
import {dialogueKind} from './dialogue-step-revision-4.mjs';

const root='evidence/eia-job8',target=root+'/run-freeze-revision-4.json';
const read=p=>JSON.parse(p.endsWith('.gz')?gunzipSync(readFileSync(p)):readFileSync(p));
const hash=value=>createHash('sha256').update(value).digest('hex');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim();
const codeCommit='87375429987a798550a023c83db9722957d8d2d3';
const sourcePaths=['app','components','lib','data','scripts','tests','package.json','package-lock.json','next.config.mjs','proxy.js'];
const branch=git('branch','--show-current'),evidenceHead=git('rev-parse','HEAD');
if(branch!=='codex/eia-fix')throw new Error('Wrong branch');
git('diff','--exit-code',codeCommit,'--',...sourcePaths);
const localEvidenceDirectory='Documents/EIAapp-Evidence/20261031/job8/scored-complete-4';
if(existsSync(target)||existsSync(homedir()+'/'+localEvidenceDirectory))throw new Error('Freeze or scored output exists; preserve it and do not repeat.');
const gates=read(root+'/offline-checks-revision-4.json');
if(!gates.pass)throw new Error('Offline checks must pass before freezing the paid run.');
const D=read('evidence/eia-polish/set-d-polish.json.gz').questions.filter(x=>x.id!=='D7q');
const F=read('evidence/eia-polish/set-f.json').cases;
const Q1=read(root+'/q1-freeze-revision-2.json').cases,Q4=read(root+'/q4-freeze.json').cases;
const options={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:2048};
const steps=[...D.flatMap(k=>[1,2].map(repeat=>({set:'D',k,repeat}))),...F.map(k=>({set:'F',k,repeat:1})),...Q1.map(k=>({set:'Q1',k,repeat:1})),...Q4.map(k=>({set:'Q4',k,repeat:1}))].map(({set,k,repeat})=>{
 const kind=dialogueKind(k),entry={set,id:k.id,repeat,kind,query:k.query,...(k.parentId?{parentId:k.parentId}:{}),...(k.clicks?{clicks:k.clicks}:{}),...(k.typedReply?{typedReply:k.typedReply}:{})};
 if(kind==='initial'){
  entry.requestSHA256=hash(JSON.stringify(lockedFormRequestV2(k.query,options,false)));
  entry.reaskSHA256=hash(JSON.stringify(lockedFormRequestV2(k.query,options,true)));
 }
 return entry;
});
const initialTurns=steps.filter(x=>x.kind==='initial').length,replyTurns=steps.filter(x=>x.kind==='reply').length,buttonOutcomes=steps.filter(x=>x.kind==='click').length;
if(steps.length!==78||D.length*2!==58||F.length!==8||Q1.length!==9||Q4.length!==3||initialTurns!==64||replyTurns!==4||buttonOutcomes!==10)throw new Error('Unexpected schedule');
const initialCount=read(root+'/input-token-count.json');
const {max_output_tokens:initialLimit,...initialBody}=lockedFormRequestV2(Q4.find(k=>k.id==='Q4-ash').query,options,false);
if(hash(JSON.stringify(initialBody))!==initialCount.requestSHA256)throw new Error('Saved initial input count no longer matches the request.');
const priorBudget=read('evidence/eia-polish/run-freeze/budget.json'),replyCount=priorBudget.counts[1];
const {max_output_tokens:replyLimit,...replyBody}=fieldReplyRequest({},'geography','',options,true);
if(hash(JSON.stringify(replyBody))!==replyCount.requestSHA256)throw new Error('Saved reply input count no longer matches the request.');
// This is a spending reserve, not a reduced model allowance. It leaves ample room
// for the actual parent forms while preserving the unchanged 2,048 output limit.
const maximumReplyFormBytes=50000,maximumReplyBytes=240,marginTokens=1024;
const initialInputBound=initialCount.inputTokens+marginTokens;
const replyInputBound=replyCount.inputTokens+maximumReplyFormBytes+maximumReplyBytes+marginTokens;
const perCallMaximumUSD={initial:(initialInputBound*.125+2048*.5)/1e6,reply:(replyInputBound*.125+2048*.5)/1e6};
const modelTurns=initialTurns+replyTurns,maximumGenerationCalls=modelTurns*2;
const generationMaximumUSD=2*(initialTurns*perCallMaximumUSD.initial+replyTurns*perCallMaximumUSD.reply);
const countingReserveUSD=initialCount.inputTokens*.125/1e6;
const totalMaximumUSD=generationMaximumUSD+countingReserveUSD;
const priorRunActualUSD=read(root+'/scored-run-result-1.json').costUSD.totalAccountedSoFar;
const cumulativeMaximumUSD=priorRunActualUSD+totalMaximumUSD,ceilingUSD=.40;
if(totalMaximumUSD>ceilingUSD||cumulativeMaximumUSD>ceilingUSD)throw new Error('Worst-case cost exceeds $0.40; no paid call is permitted.');
const files=[...git('ls-files','--',...sourcePaths).split('\n').filter(Boolean),'AGENTS.md',
 'evidence/eia-polish/set-d-polish.json.gz','evidence/eia-polish/set-d-d6a-revision-2.json.gz','evidence/eia-polish/set-f.json','evidence/eia-polish/set-f-owner.txt','evidence/eia-polish/set-e-policy.json','evidence/eia-polish/run-freeze/budget.json',
 ...['q1-freeze-revision-2.json','q4-freeze.json','input-token-count.json','scored-run-result-1.json','replay-expectations.json','check-revision-2.mjs','dialogue-step-revision-4.mjs','check-dialogue-revision-4.mjs','run-scored-revision-4.mjs','freeze-scored-run-revision-4.mjs','replay-saved-revision-4.mjs','offline-checks-revision-4.json','agents-python-rule-revision-1.patch'].map(p=>root+'/'+p)];
const filesSHA256=Object.fromEntries([...new Set(files)].sort().map(p=>[p,hash(readFileSync(p))]));
const freeze={version:'job8-complete-dialogue-run-4',frozenAt:new Date().toISOString(),branch,codeCommit,evidenceHead,
 schedule:{outcomes:78,D:58,F:8,Q1:9,Q4:3,initialTurns,replyTurns,buttonOutcomes,modelTurns,maximumGenerationCalls,maximumReasksPerTurn:1,maximumReasksTotal:modelTurns,transientRetries:0},
 steps,model:options.model,reasoning:options.reasoning,maximumOutputTokens:2048,
 inputTokenMeasurement:{initial:initialCount,reply:replyCount,initialInputBound,replyInputBound,maximumReplyFormBytes,maximumReplyBytes,marginTokens},
 budget:{ceilingUSD,priorRunActualUSD,perCallMaximumUSD,generationMaximumUSD,countingReserveUSD,totalMaximumUSD,cumulativeMaximumUSD,pricesPerMillionUSD:{input:.125,output:.50},method:'Reserve both allowed attempts for every initial interpretation and typed reply. Button-only outcomes use no model call. Preserve the 2048 output allowance including reasoning. Reserve 50000 bytes for each dynamic parent form. Both the new-run and cumulative maximum fit the latest $0.40 authorization.'},
 passMarks:{D:'at least 53 of 58, with D1-D3 and D21 correct twice',F:'8/8',Q1:'9/9',Q4:'3/3',deadEnds:0,unlabelledWrongData:0,offline:'all checks and build pass'},
 dataRetrieval:{paceMs:600,retries:0,source:'EIA API',credential:'existing local key; never copied into evidence'},
 corrections:{owner:'Q1-coal-and-natual-gas recognizes both products, then asks activity.',runner:'Recorded clicks and replies use their actual parent result. The previous runner repeated the original query for child outcomes. Old failures and estimates remain preserved.',D6a:'Use the existing status-only revision; do not change other expectations or scorers.'},
 offlineGates:gates,localEvidenceDirectory,filesSHA256,
 sourceLinks:['https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/guides/reasoning']};
writeFileSync(target,JSON.stringify(freeze,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({target,codeCommit,evidenceHead,schedule:freeze.schedule,budget:freeze.budget,freezeSHA256:hash(readFileSync(target))},null,2));
