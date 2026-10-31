// Unchanged Q1 checks copied from the historical revision-4 runner.
import {isDeepStrictEqual as same} from 'node:util';
const placeCodes=form=>(form?.geographies||[]).flatMap(g=>g.geography.split('|')[0].trim().split('+'));
const topics=form=>(form?.topics||[]).map(t=>[t.product,t.activity]);
const numericData=result=>(result?.results||[]).flatMap(g=>g.countries||[]).filter(c=>c.series?.complete&&c.series.points?.some(p=>Number.isFinite(p.value)));
const productQuestion=result=>{
 const f=result?.intent?.lockedForm,choices=result?.choices||[],values=(f?.clarification?.options||[]).map(o=>o.value),labels=choices.map(c=>c.label);
 return result?.needsClarification===true&&f?.clarification?.about==='product'&&values.includes('natural gas')&&values.includes('petroleum')&&labels.includes('Natural Gas')&&labels.includes('Gasoline')&&!numericData(result).length;
};
export function scoreQ1(result,testCase){
 const f=result?.intent?.lockedForm,e=testCase,errors=[];
 if(!f){return {correct:false,errors:['missing_form']};}
 const codes=placeCodes(f),pairs=topics(f);
 if(e.kind==='typo_product_to_data'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(!same(pairs,e.topics))errors.push('wrong_topics');
  if(f.clarification.needed)errors.push('unexpected_question');
  for(const [product,activity]of e.topics){if(!numericData(result).some(c=>c.geography.code===e.place&&c.product===product&&c.activity===activity))errors.push('missing_data:'+product+':'+activity);}
 }else if(e.kind==='typo_products_to_activity_question'){
  if(!same(codes,[e.place]))errors.push('wrong_place');
  if(!same(pairs,e.topics))errors.push('wrong_topics');
  if(f.clarification.needed!==true||f.clarification.about!==e.clarificationAbout)errors.push('wrong_clarification_field');
  if(result.userMessage!==e.activityQuestion)errors.push('wrong_activity_question');
  if(!result.needsClarification||!result.choices?.length||!result.choices.every(choice=>choice.choice?.about==='activity'))errors.push('missing_activity_buttons');
  if(result.choices?.some(choice=>e.forbiddenChoices.includes(choice.label)))errors.push('asked_product_ambiguity');
  if(e.dataBeforeChoice===false&&result.results?.some(group=>(group.countries||[]).some(country=>country.series)))errors.push('data_before_activity_choice');
 }else if(e.kind==='gas_product_question'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(!productQuestion(result))errors.push('missing_natural_gas_gasoline_question');
 }else if(e.kind==='gasoline_or_product_question'){
  const gasoline=numericData(result).some(c=>c.product==='petroleum'&&c.series.qualifier==='gasoline');
  if(!productQuestion(result)&&!gasoline)errors.push('neither_gasoline_nor_approved_product_question');
  if(numericData(result).some(c=>c.product==='natural gas'))errors.push('wrong_natural_gas_result');
 }else if(e.kind==='not_natural_gas'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(f.clarification.needed)errors.push('unsupported_or_ambiguous_answer');
  if(pairs.some(([product])=>product===e.productMustNotBe)||numericData(result).some(c=>c.product===e.productMustNotBe))errors.push('natural_gas_misclassification');
 }else if(e.kind==='preserve_existing_natural_gas'){
  if(!same(codes,[e.place]))errors.push('wrong_place');if(!same(pairs,[[e.product,'production']]))errors.push('changed_existing_abbreviation');if(f.clarification.needed)errors.push('unexpected_question');
  if(!numericData(result).some(c=>c.geography.code===e.place&&c.product===e.product&&c.activity==='production'))errors.push('missing_data');
 }else errors.push('unknown_frozen_case_kind');
 return {correct:errors.length===0,errors,places:codes,pairs,clarification:f.clarification,shown:numericData(result).map(c=>({place:c.geography.code,product:c.product,activity:c.activity,qualifier:c.series.qualifier}))};
}
