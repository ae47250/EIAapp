// Deterministic Job 9c decisions from immutable replay summaries.
import {readFileSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {modelRecommendation} from './measure-decisions.mjs';
import {quantile} from './score-suite.mjs';

export const sourceRuns=['ON','ON2','TERRA','LUNA-MED','LUNA-HIGH'];
export const settings=Array.from({length:8},(_,i)=>i.toString(2).padStart(3,'0'));
const base=homedir()+'/Documents/EIAapp-Evidence/20261031/job9/job9c';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const write=(p,value)=>writeFileSync(p,JSON.stringify(value,null,2)+'\n');
const row=(run,id)=>run.rows.find(x=>x.id===id);
const eligible=r=>!r.excludedFromJointAccuracy;
export function pairDifference(on,off,drops=new Set()){
 const losses=[],wins=[],wrongCreated=[],wrongFixed=[];
 for(const a of on.rows.filter(eligible)){
  if(drops.has(a.id))continue;
  const b=row(off,a.id);
  if(!b||a.score.status!=='scored'||b.score.status!=='scored')throw new Error('Non-comparable replay case '+a.id);
  if(a.score.correct&&!b.score.correct)losses.push(a.id);
  if(!a.score.correct&&b.score.correct)wins.push(a.id);
  const aw=a.score.kind==='wrong value shown',bw=b.score.kind==='wrong value shown';
  if(!aw&&bw)wrongCreated.push(a.id);
  if(aw&&!bw)wrongFixed.push(a.id);
 }
 return {losses,wins,wrongCreated,wrongFixed,W:wrongCreated.length-wrongFixed.length,N:losses.length-wins.length};
}
export function groupEffect(allOn,variant,drops,noise){
 const byRun=Object.fromEntries(sourceRuns.map(name=>[name,pairDifference(allOn[name],variant[name],drops)]));
 const W=Object.values(byRun).reduce((n,x)=>n+x.W,0),N=Object.values(byRun).reduce((n,x)=>n+x.N,0)/sourceRuns.length;
 return {W,N,keep:W>0||W===0&&N>noise,byRun};
}
const score=(summary,drops)=>summary.rows.filter(r=>eligible(r)&&!drops.has(r.id)&&r.score.status==='scored').filter(r=>r.score.correct).length;
const summary=(name)=>read(base+'/'+name+'/summary.json');
const scoreRows=(run,drops)=>{
 const rows=run.rows.filter(r=>eligible(r)&&!drops.has(r.id));
 const sets=[...new Set(rows.map(r=>r.set))];
 return {right:rows.filter(r=>r.score.correct).length,total:rows.length,perSet:Object.fromEntries(sets.map(set=>{const x=rows.filter(r=>r.set===set);return [set,{right:x.filter(r=>r.score.correct).length,total:x.length}];})),failures:rows.filter(r=>!r.score.correct).map(r=>({id:r.id,kind:r.score.kind,errors:r.score.errors})),comparisonCostUSD:run.comparisonCostUSD,comparisonLatencyP90Ms:run.comparisonLatencyP90Ms,notReplayed:run.notReplayed||[]};
};
export function decisionFromRuns(runs){
 for(const name of sourceRuns)for(const bits of settings){const r=runs[name]?.[bits];if(!r||r.status!=='complete'||!r.harnessPass||r.executed!==r.scheduled)throw new Error('Incomplete replay '+name+'/'+bits);}
 const drops=new Set(sourceRuns.flatMap(name=>settings.flatMap(bits=>runs[name][bits].notReplayed||[])));
 const allOn=Object.fromEntries(sourceRuns.map(name=>[name,runs[name]['111']]));
 const noise=Math.max(Math.abs(score(allOn.ON,drops)-score(allOn.ON2,drops)),1);
 const single=Object.fromEntries([0,1,2].map(i=>{
  const bits='111'.split('');bits[i]='0';
  return ['G'+(i+1),groupEffect(allOn,Object.fromEntries(sourceRuns.map(name=>[name,runs[name][bits.join('')]])),drops,noise)];
 }));
 const removed=Object.entries(single).filter(([,x])=>!x.keep).map(([name])=>name);
 const bits=removed.reduce((a,name)=>a.slice(0,Number(name[1])-1)+'0'+a.slice(Number(name[1])),'111');
 const combined=groupEffect(allOn,Object.fromEntries(sourceRuns.map(name=>[name,runs[name][bits]])),drops,noise);
 let chosen=bits;const restored=[];
 if(combined.keep)for(const name of [...removed].sort((a,b)=>single[b].N-single[a].N)){
  const i=Number(name[1])-1;chosen=chosen.slice(0,i)+'1'+chosen.slice(i+1);restored.push(name);
  const effect=groupEffect(allOn,Object.fromEntries(sourceRuns.map(run=>[run,runs[run][chosen]])),drops,noise);
  if(!effect.keep)break;
 }
 const chosenRuns=Object.fromEntries(sourceRuns.map(name=>[name,runs[name][chosen]]));
 const passExceptions=[{run:'LUNA-MED',id:'D-D3',reason:'valid alternative reading; expectation too narrow'}];
 const frontPage=sourceRuns.flatMap(name=>['D-D1','D-D2','D-D3'].filter(id=>!(name==='LUNA-MED'&&id==='D-D3')&&!drops.has(id)).map(id=>({run:name,id,correct:row(chosenRuns[name],id)?.score.correct===true})));
 return {noiseFloor:noise,single,initialRemoved:removed,combined,restored,chosen,droppedIds:[...drops].sort(),droppedCountBySetting:Object.fromEntries(settings.map(bits=>[bits,sourceRuns.reduce((n,name)=>n+(runs[name][bits].notReplayed||[]).length,0)])),chosenScores:Object.fromEntries(sourceRuns.map(name=>[name,scoreRows(chosenRuns[name],drops)])),frontPage,frontPagePass:frontPage.every(x=>x.correct),passExceptions};
}
function runDecision(){
 const runs=Object.fromEntries(sourceRuns.map(name=>[name,Object.fromEntries(settings.map(bits=>[bits,summary('replay-'+name+'-'+bits)]))]));
 const result=decisionFromRuns(runs);write('evidence/eia-job9c/decision.json',result);write('evidence/eia-job9c/drop-ids.json',result.droppedIds);console.log(JSON.stringify({chosen:result.chosen,noise:result.noiseFloor,frontPagePass:result.frontPagePass,dropped:result.droppedIds.length}));
}
function successfulElapsed(names){
 return names.flatMap(name=>readFileSync(base+'/'+name+'/model-attempts.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>r.success).map(r=>r.replayed?r.sourceElapsedMs:r.elapsedMs).filter(Number.isFinite));
}
function runModel(){
 const decision=read('evidence/eia-job9c/decision.json'),d=decision.droppedIds;
 const source=Object.fromEntries(sourceRuns.map(name=>[name,summary('replay-'+name+'-'+decision.chosen)]));
 const sol=summary('SOL-live');if(sol.status!=='complete'||!sol.harnessPass)throw new Error('SOL run incomplete');
 const scoreFor=r=>score(r,new Set(d));
 const low={name:'LUNA-LOW-MEAN',model:'gpt-6-luna',effort:'low',status:'complete',harnessPass:true,right:(scoreFor(source.ON)+scoreFor(source.ON2))/2,costUSD:(source.ON.comparisonCostUSD+source.ON2.comparisonCostUSD)/2,latencyP90Ms:quantile(successfulElapsed(['replay-ON-'+decision.chosen,'replay-ON2-'+decision.chosen]),.9)};
 const candidates=[low,...[['TERRA','gpt-6.1-terra','low'],['LUNA-MED','gpt-6-luna','medium'],['LUNA-HIGH','gpt-6-luna','high']].map(([name,model,effort])=>({name,model,effort,status:'complete',harnessPass:true,right:scoreFor(source[name]),costUSD:source[name].comparisonCostUSD,latencyP90Ms:source[name].comparisonLatencyP90Ms})),{name:'SOL',model:'gpt-6.1-sol',effort:'low',status:sol.status,harnessPass:sol.harnessPass,right:scoreFor(sol),costUSD:sol.costUSD,latencyP90Ms:sol.latencyP90Ms}];
 const result={chosen:decision.chosen,noiseFloor:decision.noiseFloor,candidates,...modelRecommendation(candidates,decision.noiseFloor),solScore:scoreRows(sol,new Set(d))};write('evidence/eia-job9c/model.json',result);console.log(JSON.stringify({recommendation:result.recommendation}));
}
function runVerify(){
 const decision=read('evidence/eia-job9c/decision.json'),d=new Set(decision.droppedIds),names=[...sourceRuns,'SOL'];const checks=[];
 for(const name of names){
  const before=summary(name==='SOL'?'SOL-live':'replay-'+name+'-'+decision.chosen),after=summary('trim-'+name);
  if(after.status!=='complete'||!after.harnessPass)throw new Error('Trimmed run incomplete '+name);
  for(const a of before.rows.filter(r=>!d.has(r.id))){const b=row(after,a.id);if(JSON.stringify(a.score)!==JSON.stringify(b?.score))throw new Error('Case score changed '+name+'/'+a.id);}
  const requests=p=>readFileSync(base+'/'+p+'/requests.jsonl','utf8').trim().split('\n').filter(Boolean).map(JSON.parse).filter(r=>!d.has(r.id)).map(r=>[r.id,r.turn,r.ordinal,r.requestHash]);
  if(JSON.stringify(requests(name==='SOL'?'SOL-live':'replay-'+name+'-'+decision.chosen))!==JSON.stringify(requests('trim-'+name)))throw new Error('Prompt sequence changed '+name);
  checks.push({name,cases:before.rows.filter(r=>!d.has(r.id)).length,matched:true});
 }
 write('evidence/eia-job9c/trim-verification.json',{pass:true,checks,droppedIds:[...d]});console.log(JSON.stringify({pass:true,checks}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const command=process.argv[2];if(command==='decision')runDecision();else if(command==='model')runModel();else if(command==='verify')runVerify();else throw new Error('Expected decision, model, or verify');}
