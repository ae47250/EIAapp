// Freeze the one-shot Job 8 score schedule before any model generation call.
import {readFileSync,writeFileSync,existsSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {homedir} from 'node:os';
import {gunzipSync} from 'node:zlib';
import {lockedFormRequestV2} from '../../lib/sources/eia/locked-form-v2.js';

const dir='evidence/eia-job8',target=dir+'/run-freeze.json';
const sha=value=>createHash('sha256').update(value).digest('hex');
const read=path=>JSON.parse(path.endsWith('.gz')?gunzipSync(readFileSync(path)):readFileSync(path));
const inputCount=read(dir+'/input-token-count.json');
if(existsSync(target))throw new Error('Run freeze exists; preserve it and use a new version.');
const outputDir=homedir()+'/Documents/EIAapp-Evidence/20261031/job8/scored-final';
if(existsSync(outputDir))throw new Error('Scored-run evidence directory exists; preserve it and choose a new run folder.');
const excludedD=['D4a','D4b','D5a','D5b','D12a','D7q'];
const allD=read('evidence/eia-polish/set-d-polish.json.gz').questions;
const revisedD6a=read('evidence/eia-polish/set-d-d6a-revision-2.json.gz').question;
const D=allD.filter(q=>!excludedD.includes(q.id)).map(q=>q.id==='D6a'?revisedD6a:q);
const F=read('evidence/eia-polish/set-f.json').cases;
const Q1=read(dir+'/q1-freeze.json').cases;
const Q4=read(dir+'/q4-freeze.json').cases;
if(D.length!==24||F.length!==8||Q1.length!==9||Q4.length!==3)throw new Error('Frozen case counts differ from the approved schedule.');
const schedule=[...D.flatMap(q=>[1,2].map(repeat=>({set:'D',id:q.id,repeat,query:q.query}))),
  ...F.map(q=>({set:'F',id:q.id,repeat:1,query:q.query})),
  ...Q1.map(q=>({set:'Q1',id:q.id,repeat:1,query:q.query})),
  ...Q4.map(q=>({set:'Q4',id:q.id,repeat:1,query:q.query}))];
if(schedule.length!==68)throw new Error('Expected 68 generation calls.');
const options={model:'gpt-6-luna',reasoning:{effort:'low'},maxOutputTokens:2048};
const requests=schedule.map(row=>{const body=lockedFormRequestV2(row.query,options,false),json=JSON.stringify(body);return {...row,requestSHA256:sha(json),requestBytes:Buffer.byteLength(json)};});
const maxQueryBytes=Math.max(...schedule.map(x=>Buffer.byteLength(x.query)));
const counted=lockedFormRequestV2(schedule.find(x=>x.id===inputCount.queryId).query,options,false);delete counted.max_output_tokens;
if(maxQueryBytes!==inputCount.queryBytes||sha(JSON.stringify(counted))!==inputCount.requestSHA256)throw new Error('Input-token count no longer matches the final request template.');
if(!Number.isInteger(inputCount.inputTokens)||inputCount.httpStatus!==200||inputCount.model!==options.model||inputCount.reasoning!==options.reasoning.effort)throw new Error('Invalid input-token count record.');
const inputBound=inputCount.inputTokens+1024,price={inputPerMillionUSD:.125,outputPerMillionUSD:.50};
const perCallMaximumUSD=(inputBound*price.inputPerMillionUSD+options.maxOutputTokens*price.outputPerMillionUSD)/1e6;
const countingReserveUSD=inputCount.inputTokens*price.inputPerMillionUSD/1e6;
const generationMaximumUSD=perCallMaximumUSD*schedule.length,totalMaximumUSD=generationMaximumUSD+countingReserveUSD,ceilingUSD=.15;
if(totalMaximumUSD>ceilingUSD)throw new Error('Frozen schedule exceeds the authorized ceiling.');
const hashedFiles=[
 'AGENTS.md','package.json','tests/eia-job8.test.js','tests/eia-finish.test.js','tests/eia-typed-clarification.test.js',
 'lib/eia-intent-payload.js','lib/client/xlsx.js',
 'lib/sources/eia/interpret-query.js','lib/sources/eia/locked-form-v2.js','lib/sources/eia/locked-form-schema.js','lib/sources/eia/locked-form-schema-v2.js','lib/sources/eia/locked-form-instructions-v2.txt','lib/sources/eia/locked-form-reply.js','lib/sources/eia/request-evidence.js',
 'lib/sources/eia/lookup-search.js','lib/sources/eia/lookup-context.js','lib/sources/eia/lookup-ambiguity.js','lib/sources/eia/lookup-geography.js','lib/sources/eia/lookup-list.js','lib/sources/eia/intent-routing.js','lib/sources/eia/eia-fetch.js',
 'components/search/SearchWorkspace.js','components/search/SearchStatus.js','components/search/LookupChoices.js','components/search/ComparisonGroups.js','components/search/SelectedSeries.js','components/search/SelectedComparison.js','components/search/RecentObservations.js','components/search/CandidateGroups.js','components/search/MatchingVariables.js','components/search/SelectedSeries.js','app/globals.css',
 'data/eia/lookup-list.json','data/eia/lookup-coverage.json.gz','data/eia/lookup-us-coverage.json.gz','data/eia/lookup-status.json.gz','data/eia/phase4-routing-config.json','data/eia/routing-metadata.json','data/eia/geography-ambiguities.json',
 'scripts/eia-lookup/score-d-polish.js','scripts/eia-lookup/score-polish-output.js','scripts/eia-lookup/score-d-finish.js','scripts/eia-lookup/coverage-browser-polish.js','scripts/eia-lookup/read-polish-export.py','scripts/eia-lookup/evaluation-choice.js',
 'evidence/eia-polish/set-d-polish.json.gz','evidence/eia-polish/set-d-d6a-revision-2.json.gz','evidence/eia-polish/set-f.json','evidence/eia-polish/set-f-owner.txt','evidence/eia-polish/set-e-policy.json',
 dir+'/q1-freeze.json',dir+'/q4-freeze.json',dir+'/replay-expectations.json',dir+'/input-token-count.json',dir+'/replay-saved.mjs',dir+'/run-scored.mjs',dir+'/freeze-scored-run.mjs'
];
for(const path of hashedFiles)if(!existsSync(path))throw new Error('Freeze source is missing: '+path);
const filesSHA256=Object.fromEntries(hashedFiles.map(path=>[path,sha(readFileSync(path))]));
const branch=execFileSync('git',['branch','--show-current'],{encoding:'utf8'}).trim();
const commit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(branch!=='codex/eia-fix')throw new Error('Scored-run branch mismatch: '+branch);
const freeze={version:'eia-job8-scored-run-1',frozenAt:new Date().toISOString(),branch,codeCommit:commit,
  schedule:{D:{cases:D.map(q=>q.id),excluded:excludedD,repetitions:2,total:48,passMark:'at least 44 of 48; D1-D3 pass on both repeats'},F:{cases:F.map(q=>q.id),repetitions:1,total:8,passMark:'8 of 8'},Q1:{cases:Q1.map(q=>q.id),repetitions:1,total:9,passMark:'9 of 9'},Q4:{cases:Q4.map(q=>q.id),repetitions:1,total:3,passMark:'3 of 3'},totalGenerationCalls:schedule.length,retries:0,validationReasks:0},
  requests,model:options.model,reasoning:options.reasoning,maximumOutputTokens:options.maxOutputTokens,
  inputTokenMeasurement:{...inputCount,inputBound,marginTokens:1024},
  budget:{ceilingUSD,priorJobGenerationSpendUSD:0,perCallMaximumUSD,countingReserveUSD,generationMaximumUSD,totalMaximumUSD,remainingUSD:ceilingUSD-totalMaximumUSD,pricesPerMillionUSD:price,method:'Reserve every scheduled call at 7,913 input tokens billed at the GPT-6 Luna 30-minute cache-write rate and 2,048 output tokens (including reasoning) at full output rate. Include the one input-token count request as if it incurred input charges. No retries or validation re-asks.'},
  dataRetrieval:{source:'EIA API',paceMs:600,retries:0,credential:'existing local EIA key; never saved in evidence'},
  q4Meaning:{ash:'US coal consumption for the electric power sector; ash content remains unsupported until explicitly dropped.',sulfur:'East Coast is not in the approved geography list; preserve it as unresolved and ask for a place rather than widening to the whole US.',reactors:'Ask about unsupported reactor technology before data; any explicit alternative choice must be labelled and the result must name the omitted wording.'},
  localEvidenceDirectory:'Documents/EIAapp-Evidence/20261031/job8/scored-final',
  sourceLinks:['https://developers.openai.com/api/docs/models/gpt-6-luna','https://developers.openai.com/api/docs/pricing','https://developers.openai.com/api/docs/guides/prompt-caching','https://developers.openai.com/api/docs/guides/reasoning'],
  filesSHA256};
mkdirSync(dir,{recursive:true});writeFileSync(target,JSON.stringify(freeze,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({target,branch,codeCommit:commit,counts:freeze.schedule,totalCalls:schedule.length,inputBound,perCallMaximumUSD,countingReserveUSD,generationMaximumUSD,totalMaximumUSD,ceilingUSD,withinCeiling:true,sha256:sha(readFileSync(target))},null,2));
