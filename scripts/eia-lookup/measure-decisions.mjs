export function flagDecision(on,on2,off,off2){
 const noise=Math.max(Math.abs(on.right-on2.right),1);
 const complete=[on,on2,off,off2].every(r=>r?.status==='complete'&&r.executed===r.scheduled&&r.harnessPass);
 const regressions=[];
 for(const [a,b]of [[on,off],[on2,off2]])for(const row of a.rows||[]){if(row.excludedFromJointAccuracy)continue;const paired=b.rows?.find(x=>x.id===row.id);if(row.score.kind==='wrong value shown'&&paired?.score.correct)regressions.push({run:a.name,id:row.id});}
 const gain=(on.right+on2.right-off.right-off2.right)/2;
 return {setting:complete&&gain>noise&&!regressions.length?'on':'off',noiseFloor:noise,gain,regressions,complete};
}
export function modelRecommendation(runs,noise){
 const complete=runs.filter(r=>r.status==='complete'&&r.harnessPass),best=Math.max(...complete.map(r=>r.right));
 const eligible=complete.filter(r=>best-r.right<=noise&&r.latencyP90Ms!==null&&r.latencyP90Ms<8000).sort((a,b)=>a.costUSD-b.costUSD);
 return {best,eligible:eligible.map(r=>r.name),recommendation:eligible[0]?{model:eligible[0].model,effort:eligible[0].effort,costUSD:eligible[0].costUSD,right:eligible[0].right,p90Ms:eligible[0].latencyP90Ms}:null};
}
