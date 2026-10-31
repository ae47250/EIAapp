// One scorer for all seven sets. Expected values come only from the frozen suite.
import {isDeepStrictEqual as same} from 'node:util';
export const words=x=>String(x??'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
export const exactSet=(a,b)=>same([...new Set(a.map(words))].sort(),[...new Set(b.map(words))].sort());
const codes=items=>(items||[]).flatMap(g=>g.geography.split('|')[0].trim().split('+'));
const countries=r=>(r?.results||[]).flatMap(g=>g.countries||[]);
export function snapshot(result){
 const f=result?.intent?.lockedForm;
 return {places:codes(f?.geographies),product:f?.topics.map(t=>t.product)||[],activity:f?.topics.map(t=>t.activity)||[],sector:f?.sector.value??null,frequency:f?.frequency.value??null,years:f?[f.years.start,f.years.end]:null,question:result?.userMessage||'',buttons:(result?.choices||[]).map(c=>c.label),lookupRowKeys:countries(result).filter(c=>c.series).map(c=>({place:c.geography.code,product:c.product,activity:c.activity,key:c.series.lookupRowKey})),clarification:f?.clarification.needed?f.clarification.about:null,shown:countries(result).map(c=>({place:c.geography.code,product:c.product,activity:c.activity,status:c.status,message:c.message,notice:c.unsupportedNotice,data:Boolean(c.series?.points?.length),key:c.series?.lookupRowKey,selector:c.series?.selector})),unsupportedMessage:result?.unsupportedMessage||'',needsClarification:Boolean(result?.needsClarification)};
}
export function scoreCase(k,result,{initial=result,ui,executionError,noFixture=false}={}){
 if(noFixture)return {status:'no fixture',correct:null,kind:null,fields:{},errors:[]};
 const actual=snapshot(result),first=snapshot(initial),e=k.expected,fields={},errors=[];
 const fail=(field,reason=field)=>{fields[field]=false;errors.push(reason);};
 for(const [field,want]of Object.entries(e)){
  if(want===null||!['places','product','activity','sector','frequency','years','question','buttons','lookupRowKeys'].includes(field))continue;
  let correct;
  if(field==='buttons')correct=exactSet((k.set==='Q4'?first:actual).buttons,want);
  else if(field==='places')correct=exactSet((k.set==='Q4'?first:actual).places,want);
  else if(field==='lookupRowKeys')correct=want.every(w=>actual.lookupRowKeys.some(a=>a.place===w.place&&a.product===w.product&&a.activity===w.activity&&w.keys.includes(a.key)));
  else if(field==='question'&&want==='')correct=!actual.needsClarification;
  else correct=same((k.set==='Q4'?first:actual)[field],want);
  fields[field]=correct;if(!correct)errors.push(field);
 }
 const source=k.sourceCase,se=source.expected||{};
 if(e.data===true&&!actual.shown.some(c=>c.data))fail('data','expected data missing');
 if(se.region&&!result?.intent?.lockedForm?.geographies.some(g=>g.geography.split(' | ')[1]===se.region))fail('places','region');
 if(se.states){const states=actual.places; if(!exactSet(states,k.referenceStates||[])||!actual.shown.length)fail('places','all states');}
 for(const label of se.includesButtons||[])if(!actual.buttons.some(b=>words(b)===words(label)))fail('requiredButtons','missing '+label);
 if(typeof se.buttons==='string'&&se.buttons==='all and only checked coal activities'){
  const checked=['Sales','Consumption','Production','Generation','Imports','Exports','Reserves','Capacity','Storage','Prices','Expenditures'];
  if(!exactSet(actual.buttons.map(b=>b==='Show Coal consumption instead'?'Consumption':b),checked))fail('buttons','checked coal activities');
 }
 for(const entry of source.entries||k.referenceData?.entries||[]){
  if(entry.outcome!=='data'&&entry.outcome!=='missing')continue;
  const c=countries(result).find(c=>c.geography.code===entry.geographyCode&&c.product===entry.product&&c.activity===entry.activity);
  if(entry.outcome==='data'){
   if(!c?.series?.points?.length)fail('data','data missing '+entry.geographyCode);
   else if(c.series.selector?.route!==entry.route||c.series.selector?.dataColumn!==entry.measure||!same(c.series.selector?.facets,entry.facets))fail('lookupRowKeys','selector '+entry.geographyCode);
  }else if(c?.series?.points?.length)fail('data','unexpected data '+entry.geographyCode);
 }
 if(k.referenceSelectors)for(const c of countries(result).filter(c=>c.series)){const selector=k.referenceSelectors[c.geography.code];if(!selector||c.series.selector.route!==selector.route||c.series.selector.dataColumn!==selector.dataColumn||!same(c.series.selector.facets,selector.facets))fail('lookupRowKeys','source selector '+c.geography.code);}
 if(se.unit&&countries(result).some(c=>c.series&&!words(c.series.unit).includes(words(se.unit))))fail('unit','source unit');
 if(k.set==='Q1'){
  if(source.kind==='gasoline_or_product_question'){
   const question=actual.clarification==='product'&&exactSet(actual.buttons,['Natural Gas','Gasoline']);
   const petroleum=actual.product.every(x=>x==='petroleum')&&JSON.stringify(result?.intent?.lockedForm?.topics).toLowerCase().includes('gasoline');
   if(!question&&!petroleum)fail('product','gasoline or product question');
  }
  if(source.choicesRequired&&!actual.buttons.length)fail('buttons','choices required');
 }
 if(k.policy==='natural-gasoline-notice'){
  const visible=[actual.question,actual.unsupportedMessage,...actual.shown.flatMap(c=>[c.message,c.notice])].join(' ');
  const notice=/can(?:not|'t) (?:be )?look(?:ed)? up[^.]*natural gasoline|natural gasoline[^.]*(?:cannot|can't) (?:be )?look(?:ed)? up/i.test(visible);
  const wrong=actual.product.includes('natural gas')||actual.shown.some(c=>c.product==='natural gas');
  const acceptable=actual.clarification==='product'||actual.shown.some(c=>c.data&&c.product==='petroleum');
  if(wrong||!notice||!acceptable||/EIA does not publish this: petroleum production for Texas/i.test(visible))fail('naturalGasoline','screen or lookup violates natural gasoline requirement');
 }
 if(k.set==='Q4'){
  if(source.allowedInitialActivities&&!first.activity.every(v=>source.allowedInitialActivities.includes(v)))fail('activity','unsupported initial activity');
  if(source.allowedClarificationAbout&&!source.allowedClarificationAbout.includes(first.clarification))fail('question','wrong initial question');
  if(source.noResult&&first.shown.some(c=>c.data))fail('data','data shown before explicit alternative');
  const text=[first.question,first.unsupportedMessage].join(' ');
  for(const term of source.questionMustQuote||[])if(!words(text).includes(words(term)))fail('notice','missing unsupported notice '+term);
  if(source.dropButton){
   if(!first.buttons.some(b=>words(b)===words(source.dropButton)))fail('buttons','missing explicit alternative');
   if(!actual.shown.some(c=>c.data))fail('data','explicit alternative did not reach data');
   for(const term of source.resultNoticeMustSayNot||[])if(!actual.shown.filter(c=>c.data).every(c=>words(c.notice).includes(words(term))))fail('notice','dropped detail lost');
  }
  // These meaning/question expectations describe the initial screen.
  for(const field of ['places','product','activity','sector','frequency','years','question','buttons'])if(e[field]!==null){fields[field]=['places','buttons'].includes(field)?exactSet(first[field],e[field]):same(first[field],e[field]);}
 }
 if(ui&&ui.understoodLine!==undefined&&!words(ui.understoodLine).includes(words(result?.understood||result?.intent?.understood||'')))fail('screen','rendered understood differs');
 if(executionError)errors.push(executionError);
 const wrongValue=['places','product','activity','sector','frequency','years','lookupRowKeys','data','naturalGasoline'].some(f=>fields[f]===false)&&(!actual.needsClarification||actual.shown.some(c=>c.data));
 let kind=null;
 if(executionError)kind=/Required button|reply context|clarification field/i.test(executionError)?'asked the wrong question or buttons':'error';
 else if(wrongValue)kind='wrong value shown';
 else if(actual.needsClarification&&(e.question===''||e.data===true))kind='asked when it should have answered';
 else if(!actual.needsClarification&&e.question&&actual.shown.some(c=>c.data))kind='answered when it should have asked';
 else if(Object.values(fields).some(v=>!v)||errors.length)kind='asked the wrong question or buttons';
 return {status:'scored',correct:kind===null,kind,fields,errors:[...new Set(errors)],actual};
}
export const quantile=(xs,q)=>{if(!xs.length)return null;const a=[...xs].sort((a,b)=>a-b);return q===.5&&a.length%2===0?(a[a.length/2-1]+a[a.length/2])/2:a[Math.max(0,Math.ceil(a.length*q)-1)];};
export function scorecard(rows,calls=[]){
 const joint=rows.filter(r=>!r.excludedFromJointAccuracy&&r.score.status==='scored');
 const fieldNames=['places','product','activity','sector','frequency','years','question','buttons','lookupRowKeys'];
 return {right:joint.filter(r=>r.score.correct).length,total:joint.length,perSet:Object.fromEntries([...new Set(rows.map(r=>r.set))].map(set=>{const a=joint.filter(r=>r.set===set);return [set,{right:a.filter(r=>r.score.correct).length,total:a.length}];})),perField:Object.fromEntries(fieldNames.map(field=>{const a=joint.filter(r=>field in r.score.fields);return [field,{right:a.filter(r=>r.score.fields[field]).length,total:a.length}];})),failures:Object.fromEntries(['wrong value shown','asked when it should have answered','answered when it should have asked','asked the wrong question or buttons','error'].map(kind=>[kind,joint.filter(r=>r.score.kind===kind).length])),noFixture:rows.filter(r=>r.score.status==='no fixture').length,costUSD:calls.reduce((n,c)=>n+(c.costUSD||0),0),comparisonCostUSD:calls.reduce((n,c)=>n+(c.replayed?c.sourceCostUSD||0:c.costUSD||0),0),comparisonLatencyMedianMs:quantile(calls.filter(c=>c.success&&(c.replayed?c.sourceElapsedMs!=null:true)).map(c=>c.replayed?c.sourceElapsedMs:c.elapsedMs),.5),comparisonLatencyP90Ms:quantile(calls.filter(c=>c.success&&(c.replayed?c.sourceElapsedMs!=null:true)).map(c=>c.replayed?c.sourceElapsedMs:c.elapsedMs),.9),latencyMedianMs:quantile(calls.filter(c=>c.success&&!c.replayed).map(c=>c.elapsedMs),.5),latencyP90Ms:quantile(calls.filter(c=>c.success&&!c.replayed).map(c=>c.elapsedMs),.9),retries:calls.filter(c=>c.retry>0).length,naturalGasoline:rows.filter(r=>r.excludedFromJointAccuracy)};
}
