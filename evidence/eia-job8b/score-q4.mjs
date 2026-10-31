// Versioned Q4 scorer: only the owner's full-phrase and missing-activity revisions.
import {isDeepStrictEqual as same} from 'node:util';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {findEvaluationChoice} from '../../scripts/eia-lookup/evaluation-choice.js';
export const containsWords=(text,words)=>(' '+String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ').includes(' '+String(words).toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()+' ');
const numericData=result=>(result?.results||[]).flatMap(g=>g.countries||[]).filter(c=>c.series?.complete&&c.series.points?.some(p=>Number.isFinite(p.value)));
const placeCodes=form=>(form?.geographies||[]).flatMap(g=>g.geography.split('|')[0].trim().split('+'));
const topics=form=>(form?.topics||[]).map(t=>[t.product,t.activity]);
export async function scoreQ4(initial,testCase,entry,{browser,eiaOptions}){
 const e=testCase,f=initial?.intent?.lockedForm,errors=[];
 if(!f)return {correct:false,errors:['missing_form'],result:initial,presentation:null};
 if(!e.questionMustQuote.every(word=>f.unsupported_words.some(phrase=>containsWords(phrase,word))))errors.push('unsupported_words_missing_or_changed');
 if(f.clarification.needed!==true)errors.push('not_asked');
 if(e.injectedForm.geography){if(!same(placeCodes(f),[e.injectedForm.geography]))errors.push('place_changed');}
 else if(f.geographies.length||f.clarification.about!=='geography')errors.push('unresolved_East_Coast_not_preserved');
 const activities=e.allowedInitialActivities||[e.injectedForm.activity];
 if(!activities.some(activity=>same(topics(f),[[e.injectedForm.product,activity]])))errors.push('topic_changed');
 if((f.sector?.value||null)!==(e.injectedForm.sector||null))errors.push('sector_changed');
 if(e.dropButton&&!initial.choices.some(c=>c.label===e.dropButton))errors.push('missing_labeled_drop_button');
 const about=e.allowedClarificationAbout?(f.topics[0]?.activity===null?'activity':'other'):e.injectedForm.clarification.about;
 if(about&&f.clarification.about!==about)errors.push('wrong_clarification_field');
 if(e.placeQuestion&&initial.userMessage!==e.placeQuestion)errors.push('wrong_place_question');
 if(!initial.needsClarification||numericData(initial).length)errors.push('initial_result_before_choice');
 if(f.clarification.about==='other'&&initial.choices.some(c=>['product','activity'].includes(c.choice?.about)&&!/^Show .+ instead$/i.test(c.label)))errors.push('drop_button_not_explicit');
 const initialPresentation=await browser.render(initial,`${entry.id}-${entry.repeat}-initial`,{screenshot:true});
 const notice=initialPresentation.text.match(/We can't look up ([^\n]*?) yet\./)?.[1]||'';
 const unsupportedVisible=e.questionMustQuote.every(word=>containsWords(notice,word))&&f.unsupported_words.every(phrase=>notice.includes(phrase));
 if(!unsupportedVisible)errors.push('unsupported_question_not_visible');
 let result=initial,presentation=initialPresentation;
 if(e.dropToData){
  const button=initial.choices.find(c=>c.label===e.dropButton);
  if(button){try{result=await searchLookup(e.query,sourceIntentPayload(initial.intent),findEvaluationChoice(initial,e.dropButton),eiaOptions);presentation=await browser.render(result,`${entry.id}-${entry.repeat}-dropped`,{screenshot:true});}
   catch(error){errors.push('drop_path_error:'+error.message);}}
  const country=numericData(result).find(c=>c.series),unsupported=e.questionMustQuote[0],notice=country?.unsupportedNotice;
  if(!country)errors.push('drop_path_no_data');
  else {
   if(!/^This shows .+, not '.+'\.$/.test(notice||'')||!e.questionMustQuote.every(word=>containsWords(notice,word))||!f.unsupported_words.every(phrase=>notice.includes(phrase)))errors.push('drop_path_notice_missing_or_wrong');
   if(!country.series.completenessNote?.includes(notice))errors.push('series_note_missing_notice');
   if(!presentation.text.includes(notice))errors.push('screen_notice_missing');
   const excelText=(presentation.workbooks||[]).map(w=>w.text||'').join('\n');if(!excelText.includes(notice))errors.push('excel_notice_missing');
   if(result.needsClarification)errors.push('drop_path_did_not_finish');
  }
 }else if(e.noResult&&(numericData(result).length||result.results.some(g=>(g.countries||[]).some(c=>c.series))))errors.push('unresolved_place_returned_data');
 return {correct:errors.length===0,errors,initialResult:initial,result,presentation,initialPresentation};
}
