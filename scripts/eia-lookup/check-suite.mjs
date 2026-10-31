// Complete offline gate. Historical measurement runners remain preserved and
// superseded; only run-suite.mjs executes the consolidated golden cases.
import {spawnSync} from 'node:child_process';
import {mkdirSync,openSync,closeSync,readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {frozenHashes} from './run-suite.mjs';
const name=process.argv[2];if(!name||!/^[a-zA-Z0-9-]+$/.test(name))throw new Error('Unique gate name required');
const base=homedir()+'/Documents/EIAapp-Evidence/20261031/job9',dir=base+'/'+name;
if(existsSync(dir))throw new Error('Preserve existing evidence');mkdirSync(dir,{recursive:true});
const results=[],startingFiles=frozenHashes();
function run(label,command,args){const fd=openSync(dir+'/'+label+'.log','wx');const r=spawnSync(command,args,{stdio:['ignore',fd,fd],env:{...process.env,EIA_TEXT_REPAIR:'on'}});closeSync(fd);results.push({label,exit:r.status,error:r.error?.message});if(r.status!==0)throw new Error(label+' failed; see '+dir+'/'+label+'.log');}
try{
 run('javascript','npm',['test']);
 for(const file of readdirSync('scripts/eia-lookup').filter(f=>f.endsWith('.test.py')).sort())run(file,'python3',['-B','scripts/eia-lookup/'+file]);
 run('saved-responses','node',['scripts/eia-lookup/replay-responses.mjs',dir+'/saved-responses']);
 for(const flag of ['on','off'])run('suite-'+flag,'node',['scripts/eia-lookup/run-suite.mjs','--name',name+'-'+flag,'--mode','offline','--repair',flag]);
 if(!existsSync('evidence/eia-job9/freeze.json'))run('build','npm',['run','build']); // Frozen source reuses the already verified build.
 const on=JSON.parse(readFileSync(base+'/'+name+'-on/summary.json')),off=JSON.parse(readFileSync(base+'/'+name+'-off/summary.json'));
 const differences=on.rows.flatMap(a=>{const b=off.rows.find(b=>b.id===a.id);if(JSON.stringify(a.score.actual)===JSON.stringify(b.score.actual))return [];return [{id:a.id,on:a.score,off:b.score,cause:'Same saved model answers processed with raw-text repairs enabled versus disabled; stale or absent subsequent answers are recorded as no fixture.'}];});
 writeFileSync('evidence/eia-job9/'+name+'-differences.json',JSON.stringify(differences,null,2)+'\n');
 if(JSON.stringify(startingFiles)!==JSON.stringify(frozenHashes()))throw new Error('Files changed during the offline gate; rerun against final files');
 const gate={pass:true,completedAt:new Date().toISOString(),name,results,files:frozenHashes(),suiteOn:{executed:on.executed,noFixture:on.noFixture},suiteOff:{executed:off.executed,noFixture:off.noFixture},archive:JSON.parse(readFileSync(dir+'/saved-responses/summary.json')),differenceCount:differences.length};
 writeFileSync(dir+'/gate.json',JSON.stringify(gate,null,2)+'\n');
 writeFileSync('evidence/eia-job9/offline-gate.json',JSON.stringify({...gate,archive:{...gate.archive,differences:gate.archive.differences.map(d=>({key:d.key,paths:d.paths})),failures:gate.archive.failures}},null,2)+'\n');
 console.log(JSON.stringify({pass:true,name,checks:results.length,differences:differences.length}));
}catch(e){writeFileSync(dir+'/gate.json',JSON.stringify({pass:false,name,results,error:e.message},null,2)+'\n');console.error(e.message);process.exitCode=1;}
