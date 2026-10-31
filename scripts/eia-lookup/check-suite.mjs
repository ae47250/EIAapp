// Full Job 9c offline gate across every repair-group setting.
import {spawnSync} from 'node:child_process';
import {mkdirSync,openSync,closeSync,readFileSync,writeFileSync,readdirSync,existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {frozenHashes} from './run-suite.mjs';
const name=process.argv[2];if(!name||!/^[a-zA-Z0-9-]+$/.test(name))throw new Error('Unique gate name required');
const base=homedir()+'/Documents/EIAapp-Evidence/20261031/job9/job9c',dir=base+'/'+name;
if(existsSync(dir))throw new Error('Preserve existing evidence');mkdirSync(dir,{recursive:true});
const results=[],startingFiles=frozenHashes(),settings=Array.from({length:8},(_,i)=>i.toString(2).padStart(3,'0'));
function run(label,command,args){const fd=openSync(dir+'/'+label+'.log','wx');const r=spawnSync(command,args,{stdio:['ignore',fd,fd],env:{...process.env,EIA_REPAIR_G1:'on',EIA_REPAIR_G2:'on',EIA_REPAIR_G3:'on'}});closeSync(fd);results.push({label,exit:r.status,error:r.error?.message});if(r.status!==0)throw new Error(label+' failed; see '+dir+'/'+label+'.log');}
try{
 run('javascript','npm',['test']);
 for(const file of readdirSync('scripts/eia-lookup').filter(f=>f.endsWith('.test.py')).sort())run(file,'python3',['-B','scripts/eia-lookup/'+file]);
 run('saved-responses','node',['scripts/eia-lookup/replay-responses.mjs',dir+'/saved-responses']);
 for(const groups of settings)run('suite-'+groups,'node',['scripts/eia-lookup/run-suite.mjs','--name',name+'-'+groups,'--mode','offline','--groups',groups]);
 run('build','npm',['run','build']);
 const summaries=Object.fromEntries(settings.map(groups=>[groups,JSON.parse(readFileSync(base+'/'+name+'-'+groups+'/summary.json'))]));
 const differences=summaries['111'].rows.flatMap(a=>settings.filter(groups=>groups!=='111').flatMap(groups=>{const b=summaries[groups].rows.find(b=>b.id===a.id);return JSON.stringify(a.score.actual)===JSON.stringify(b.score.actual)?[]:[{id:a.id,groups,allOn:a.score,comparison:b.score}];}));
 writeFileSync('evidence/eia-job9c/'+name+'-differences.json',JSON.stringify(differences,null,2)+'\n');
 if(JSON.stringify(startingFiles)!==JSON.stringify(frozenHashes()))throw new Error('Files changed during offline gate');
 const archive=JSON.parse(readFileSync(dir+'/saved-responses/summary.json'));
 const gate={pass:true,completedAt:new Date().toISOString(),name,results,files:frozenHashes(),settings:Object.fromEntries(settings.map(groups=>[groups,{executed:summaries[groups].executed,noFixture:summaries[groups].noFixture}])),archive:{...archive,differences:archive.differences.map(d=>({key:d.key,paths:d.paths}))},differenceCount:differences.length};
 writeFileSync(dir+'/gate.json',JSON.stringify(gate,null,2)+'\n');
 writeFileSync('evidence/eia-job9c/offline-gate.json',JSON.stringify(gate,null,2)+'\n');
 writeFileSync('evidence/eia-job9c/freeze.json',JSON.stringify({createdAt:new Date().toISOString(),gate:name,files:gate.files},null,2)+'\n');
 console.log(JSON.stringify({pass:true,name,checks:results.length,differences:differences.length}));
}catch(e){writeFileSync(dir+'/gate.json',JSON.stringify({pass:false,name,results,error:e.message},null,2)+'\n');console.error(e.message);process.exitCode=1;}
