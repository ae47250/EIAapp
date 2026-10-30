// Owner Job 6 standing scorer rule: only normalize HTML whitespace in unit labels.
// Owner Set E oracle. No application imports; the policy is approved metadata,
// frozen before execution. A failed answer is never retried to improve scores.
import {isDeepStrictEqual as same} from 'node:util';
import {deadEndD} from './score-d-finish.js';
const code=g=>g.geography.split('|')[0].trim();
export function scoreE(result,expectation,policy,presentation){
 const e=expectation.expected,f=result.intent?.lockedForm,errors=[],shown=(result.results||[]).flatMap(g=>g.countries||[]),buttons=(result.choices||[]).map(c=>c.label);
 if(!f)return {correct:false,errors:['missing_form'],deadEnd:deadEndD(result),unlabelledWrongData:false};
 const places=f.geographies.flatMap(g=>code(g).split('+'));
 if(e.places&&!same(places,e.places))errors.push('places');
 if(e.product&&!f.topics.every(t=>t.product===e.product&&t.activity===e.activity))errors.push('product_activity');
 if(e.years&&!same([f.years.start,f.years.end],e.years))errors.push('years');
 if(e.question&&f.clarification.about!==e.question)errors.push('question');
 if(e.question==='activity'&&e.clicks?.length&&!f.topics.every(t=>t.product===e.clicks.at(-1).toLowerCase()))errors.push('chosen_product_lost');
 for(const label of [...(Array.isArray(e.buttons)?e.buttons:[]),...(e.includesButtons||[])])if(!buttons.includes(label)||!presentation?.buttons.includes(label))errors.push('missing_button:'+label);
 if(e.buttons==='all and only checked coal activities'&&!same(buttons.map(x=>x.toLowerCase()).sort(),policy.coalActivities))errors.push('coal_activity_buttons');
 if(e.region&&!same([...places].sort(),policy.regions[e.region]))errors.push('region_members');
 if(e.states&&!same([...places].sort(),policy.states))errors.push('state_members');
 if(e.states&&!(result.statePathVerified===true))errors.push('state_path');
 const needsData=!e.question&&!e.includesButtons;
 if(needsData){
  if(result.needsClarification)errors.push('unexpected_question');
  const wanted=e.region?policy.regions[e.region]:e.states?policy.states:e.places;
  if(wanted&&!same(shown.map(c=>c.geography.code).sort(),[...wanted].sort()))errors.push('missing_or_extra_entries');
  if(!shown.some(c=>c.series?.complete&&c.series.points?.some(p=>Number.isFinite(p.value))))errors.push('no_complete_numeric_data');
  for(const c of shown){
   const s=c.series;if(!s){if(!c.message||!/Not yet in our checked list|Not in EIA's catalogue|subset|EIA does not publish this|No data for these years/i.test(c.message))errors.push('unexplained_missing:'+c.geography.code);continue;}
   if(s.complete!==true)errors.push('incomplete:'+c.geography.code);
   const expectedSelector=policy.selectors[expectation.id]?.[c.geography.code];
   if(expectedSelector&&(['route','dataColumn','frequency'].some(k=>s.selector?.[k]!==expectedSelector[k])||!same(s.selector?.facets,expectedSelector.facets)))errors.push('wrong_selector:'+c.geography.code);
   const display=presentation?.entries.find(x=>x.geographyCode===c.geography.code&&x.product===c.product&&x.activity===c.activity),last=s.points.filter(p=>Number.isFinite(p.value)).at(-1);
   if(!display?.inTable||!display?.inExcel)errors.push('table_or_excel:'+c.geography.code);
   if(last&&(display?.excelLatestValue!==last.value||display?.excelLatestPeriod!==last.period))errors.push('excel_precision:'+c.geography.code);
   if(e.qualifier&&(s.qualifier!==e.qualifier||!(/gallon|\$\/GAL/i.test(s.unit))||/PATXD/.test(JSON.stringify(s.selector))||/Real|constant/i.test(s.unit)))errors.push('named_part_or_basis');
   if(e.qualifier&&last&&!last.period.startsWith(String(e.years[0]))&&!/ends in \d{4}/.test(s.completenessNote||''))errors.push('missing_ends_in_note');
   if(e.qualifier&&!presentation?.text.toLowerCase().includes('gasoline'))errors.push('missing_part_label');
  }
 }
 if(result.executionError)errors.push('execution:'+result.executionError);
 const deadEnd=deadEndD(result);if(deadEnd)errors.push('dead_end');
 // Data correctness is scored above. This narrower owner-defined label gate
 // checks whether displayed data identifies the actual selected series.
 const unlabelledWrongData=shown.some(c=>c.series?.points?.some(p=>Number.isFinite(p.value))&&(!c.series.selector||!c.series.unit||!c.series.basisLabel||!String(presentation?.text||'').replace(/\s+/g,' ').trim().includes(String(c.series.unit).replace(/\s+/g,' ').trim())));
 return {correct:!errors.length,errors,deadEnd,unlabelledWrongData};
}
