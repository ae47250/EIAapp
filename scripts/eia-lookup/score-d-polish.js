// Independent evaluation code. Freeze before implementation; no app imports.
// UI evidence must be captured from the rendered page, not synthesized from expected answers.
import {isDeepStrictEqual as same} from 'node:util';
const id = e => [e.geographyCode ?? e.geography?.code,e.product,e.activity].join('|');
const numeric = v => typeof v === 'number' && Number.isFinite(v);
const words = s => String(s ?? '').normalize('NFKC').toLocaleLowerCase('en-US').replace(/\s+/g,' ').trim();
const contains = (s,part) => words(s).includes(words(part));
const code = s => typeof s === 'string' ? s.split('|')[0].trim().split('+') : [];
export function meaningD(f) {
 if (!f || typeof f !== 'object') return null;
 return {places:(f.geographies||[]).flatMap(g=>code(g.geography).map(code=>({code,is_default:g.is_default}))),
 excludedPlaces:(f.excluded_geographies||[]).flatMap(g=>code(g.geography).map(code=>({code,is_default:g.is_default}))),
 pairs:(f.topics||[]).map(t=>[t.product,t.activity]),excludedTopics:(f.excluded_topics||[]).map(t=>[t.product,t.activity,t.sector]),
 sector:f.sector?.value,frequency:f.frequency?.value,frequencyExplicit:f.frequency?.explicit,
 years:{start:f.years?.start,end:f.years?.end},clarificationAbout:f.clarification?.needed ? f.clarification.about : null};
}
export function statusD(points) {
 const values=(points||[]).map(p=>p.value).filter(numeric);
 return !values.length ? 'No data for these years (EIA returned none)' : values.every(v=>v===0) ? 'Reported as zero every year' : 'Available';
}
export function deadEndD(r) {
 if ((r?.results||[]).some(g=>(g.countries||[]).some(c=>c.series?.complete===true && c.series.points?.some(p=>numeric(p.value))))) return false;
 const choices=[...(r?.choices||[]),...(r?.results||[]).flatMap(g=>g.choices||[])];
 const message=r?.userMessage||r?.question||(r?.results||[]).map(g=>g.message||'').join(' ');
 return !(words(message) && choices.some(c=>words(c.label)) && r?.freeText===true);
}
function compareQuestion(result,q,errors) {
 if ((result?.userMessage||result?.question||'')!==q.text) errors.push('wrong_question');
 if (!same((result?.choices||[]).map(c=>c.label),q.buttons)) errors.push('wrong_buttons');
 if (result?.freeText!==true) errors.push('missing_free_text');
}
// Intl's standard decimal formatting, independently specified by Part D.3:
// Owner Job 6 R6: whole numbers at |value| >= 1000, otherwise four significant digits.
// Read the actual workbook too: screen rounding must never alter Excel values.
const rounded = n => new Intl.NumberFormat('en-US',Math.abs(n)>=1000?{maximumFractionDigits:0,useGrouping:false}:{maximumSignificantDigits:4,useGrouping:false}).format(n);
function headlineHasValue(text,value) {
 const tokens=String(text||'').replace(/,/g,'').match(/[+-]?(?:\d+(?:\.\d*)?|\.\d+)/g)||[];
 return tokens.includes(rounded(value));
}
export function scoreD(result,expected,options={}) {
 if (expected.acceptableAlternatives?.length) {
  const primary=scoreD(result,{...expected,acceptableAlternatives:[]},options);
  if (primary.correct) return primary;
  for (const alternative of expected.acceptableAlternatives) {
   const score=scoreD(result,alternative,options);
   if (score.correct) return {...score,acceptedOwnerAlternative:alternative.id};
  }
  return primary;
 }
 const formErrors=[],outcomeErrors=[],presentationErrors=[];
 const actualMeaning=meaningD(result?.intent?.lockedForm),want=meaningD(expected.form);
 if (!want) throw new Error('Invalid frozen expectation: form required');
 if (!actualMeaning) formErrors.push('missing_form');
 else for (const k of Object.keys(want)) if (!same(actualMeaning[k],want[k])) formErrors.push('form:'+k);
 if (expected.unresolved) outcomeErrors.push('unresolved_frozen_expectation');
 const shown=(result?.results||[]).flatMap(g=>g.countries||[]);
 const ui=options.presentation ?? result?.presentation;
 let unlabelledWrongData=false;
 if (expected.question) {
  compareQuestion(result,expected.question,outcomeErrors);
  if (shown.some(c=>c.series?.points?.length)) {outcomeErrors.push('unexpected_data');unlabelledWrongData=shown.some(c=>!c.series?.alternative);}
 } else {
  if (result?.needsClarification) outcomeErrors.push('unexpected_question');
  for (const e of expected.entries||[]) {
   const key=id(e),matches=shown.filter(c=>id(c)===key),a=matches[0],errors=[];
   if (matches.length!==1) errors.push(matches.length?'duplicate_entry':'missing_entry');
   if (a && a.geography?.name!==e.geographyName) errors.push('wrong_place_name');
   if (a && e.outcome==='missing') {
    if (a.series?.points?.some(p=>numeric(p.value)) || !['empty','not_available'].includes(a.status)) errors.push('wrong_missing_status');
    if (e.requiredMessage && !contains(a.message||result?.userMessage,e.requiredMessage)) errors.push('wrong_missing_message');
   } else if (a) {
    const s=a.series;
    if (!s || !Array.isArray(s.points) || !s.points.length) errors.push('missing_series');
    else {
     if (s.selector?.route!==e.route || s.selector?.dataColumn!==e.measure) errors.push('wrong_measure');
     if (!same(s.selector?.facets,e.facets)) errors.push('wrong_facets');
     if (s.unit!==e.unit || s.frequency!==e.frequency || s.selector?.frequency!==e.frequency) errors.push('wrong_unit_or_frequency');
     if (!e.acceptableMeasurementBases?.includes(s.basisLabel)) errors.push('wrong_basis');
     if (s.complete!==true) errors.push('incomplete_observations');
     const labels=[s.title,s.description,s.basisLabel,s.regionLabel,s.fallbackLabel].join('\n');
     for (const label of e.requiredLabels||[]) if (!contains(labels,label)) errors.push('missing_basis_label:'+label);
     let last=e.lastPeriod,source=options.liveEvidence?.[key];
     if (source && (!source.retrievedAt || source.complete!==true || !same(source.selector,{route:e.route,dataColumn:e.measure,frequency:e.frequency,facets:e.facets}))) errors.push('wrong_source_evidence');
     if (last==='latest') {
      if (!source?.retrievedAt || source.complete!==true || !same(source.selector,{route:e.route,dataColumn:e.measure,frequency:e.frequency,facets:e.facets}) || !source.points?.length) errors.push('missing_live_latest_evidence');
      last=source?.points?.at(-1)?.period;
     }
     if (s.points[0]?.period!==e.firstPeriod || s.coverage?.start!==e.firstPeriod) errors.push('wrong_first_period');
     if (s.points.at(-1)?.period!==last || s.coverage?.end!==last) errors.push('wrong_last_period');
     if (s.points.some((p,i)=>typeof p.period!=='string' || i>0&&p.period<=s.points[i-1].period)) errors.push('duplicate_or_unordered_periods');
     const {start,end}=expected.form.years;
     if (s.points.some(p=>start!==null&&Number(p.period.slice(0,4))<start || typeof end==='number'&&Number(p.period.slice(0,4))>end)) errors.push('observations_outside_years');
     if (s.points.some(p=>p.value!==null&&!numeric(p.value))) errors.push('invalid_value');
     const reference=source?.points ?? e.snapshotPoints;
     if (reference) {
      if (reference.length!==s.points.length || reference.some((p,i)=>p.period!==s.points[i]?.period || p.value!==s.points[i]?.value)) errors.push('wrong_observations');
      for (const p of reference.filter(p=>p.value===null&&p.symbol)) {
       const actual=s.points.find(v=>v.period===p.period);
       if (actual?.symbol!==p.symbol || actual?.meaning!==p.meaning) errors.push('lost_symbol_meaning:'+p.period);
      }
     }
     const status=statusD(s.points),display=(ui?.entries||[]).find(x=>id(x)===key);
     if (!display || display.statusLabel!==status) presentationErrors.push(key+':wrong_status_label');
     if (display && display.inChart!==(expected.chartPolicy ? expected.chartPolicy.codes.includes(e.geographyCode) : status==='Available')) presentationErrors.push(key+':wrong_chart_inclusion');
     if (display && display.inTable!==true) presentationErrors.push(key+':missing_table_entry');
     const latest=[...s.points].reverse().find(p=>numeric(p.value));
     if(latest && (display?.excelLatestValue!==latest.value || display?.excelLatestPeriod!==latest.period))presentationErrors.push(key+':excel_latest_value_changed_or_missing');
     if (e.headlineRequired!==false && latest) {
      const line=display?.headline;
      if (!headlineHasValue(line,latest.value) || !contains(line,e.unitWords||e.unit) || !contains(line,latest.period.slice(0,4)) || !contains(line,e.geographyName) || !contains(line,'EIA')) presentationErrors.push(key+':wrong_headline');
      for (const alternatives of e.headlineConcepts||[[e.product],[e.activity]]) if (!alternatives.some(x=>contains(line,x))) presentationErrors.push(key+':missing_headline_concept');
     }
     for (const p of s.points.filter(p=>p.value===null&&p.symbol)) if (!(display?.symbolMeanings||[]).some(x=>x.period===p.period&&x.meaning===p.meaning)) presentationErrors.push(key+':missing_symbol_words:'+p.period);
    }
   }
   if (a && e.outcome==='missing') {
    const display=(ui?.entries||[]).find(x=>id(x)===key);
    if (display?.statusLabel!==e.statusLabel || display.inChart!==false || (e.tableRequired!==false && display.inTable!==true)) presentationErrors.push(key+':wrong_missing_display');
   }
   if(expected.chartPolicy?.requireExcel && !(ui?.entries||[]).find(x=>id(x)===key)?.inExcel) presentationErrors.push(key+':missing_excel_entry');
   outcomeErrors.push(...errors.map(v=>key+':'+v));
   if (errors.length && a?.series && !a.series.alternative) unlabelledWrongData=true;
  }
  for (const a of shown) if (!(expected.entries||[]).some(e=>id(e)===id(a))) {outcomeErrors.push('unexpected_entry:'+id(a));if(a.series&&!a.series.alternative)unlabelledWrongData=true;}
  if (expected.unavailableQuestion) compareQuestion(result,expected.unavailableQuestion,outcomeErrors);
 }
 for (const part of expected.understoodContains||[]) if (!contains(ui?.understoodLine,part)) presentationErrors.push('understood_missing:'+part);
 if (expected.switchButton) {
  if (!(ui?.buttons||[]).includes(expected.switchButton)) presentationErrors.push('missing_place_switch');
 } else if (expected.forbidPlaceSwitch && (ui?.buttons||[]).some(x=>/^Did you mean /i.test(x))) presentationErrors.push('unexpected_place_switch');
 if (expected.headlineRemainder && !contains(ui?.headlineRemainder,expected.headlineRemainder)) presentationErrors.push('wrong_headline_remainder');
 if (expected.noEmptyCards && ui?.emptyResultCards!==0) presentationErrors.push('empty_result_card');
 if (expected.checkChoiceUniqueness) for (const label of (expected.unavailableQuestion||expected.question).buttons) if ((ui?.buttons||[]).filter(x=>x===label).length!==1) presentationErrors.push('choice_not_shown_once:'+label);
 const deadEnd=deadEndD(result);if(deadEnd)outcomeErrors.push('dead_end');
 return {correct:!formErrors.length&&!outcomeErrors.length&&!presentationErrors.length,formCorrect:!formErrors.length,outcomeCorrect:!outcomeErrors.length&&!presentationErrors.length,deadEnd,unlabelledWrongData,formErrors,outcomeErrors,presentationErrors,actualMeaning};
}
