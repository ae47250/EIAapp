// Frozen before v2 implementation. This scorer never imports app interpretation or lookup code.
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const code = value => typeof value === 'string' ? value.split('|')[0].trim() : null;
const identity = value => [value.geographyCode ?? value.geography?.code, value.product, value.activity].join('|');
export function meaningC(form) {
  if (!form || typeof form !== 'object') return null;
  return {
    places: (form.geographies || []).flatMap(g => (code(g.geography) || '').split('+').map(member => ({code:member,is_default:g.is_default}))),
    excludedPlaces: (form.excluded_geographies || []).flatMap(g => (code(g.geography) || '').split('+').map(member => ({code:member,is_default:g.is_default}))),
    pairs: (form.topics || []).map(t => [t.product,t.activity]),
    excludedTopics: (form.excluded_topics || []).map(t => [t.product,t.activity,t.sector]),
    sector:form.sector?.value,frequency:form.frequency?.value,frequencyExplicit:form.frequency?.explicit,
    years:{start:form.years?.start,end:form.years?.end},
    clarificationAbout:form.clarification?.needed ? form.clarification.about : null
  };
}
export function isDeadEnd(result) {
  if (!result || typeof result !== 'object') return true;
  const groups = result.results || [];
  if (groups.some(g => (g.countries || []).some(c => c.series?.points?.length))) return false;
  const choices = (result.choices || []).concat(groups.flatMap(g => g.choices || []));
  const message = result.userMessage || result.question || result.note || groups.map(g => g.message).filter(Boolean).join(' ');
  return !(typeof message === 'string' && message.trim() && choices.some(c => typeof c.label === 'string' && c.label.trim()) && result.freeText === true);
}
export function scoreC(result, expected, options = {}) {
  const formErrors=[],outcomeErrors=[];
  const actualMeaning=meaningC(result?.intent?.lockedForm),expectedMeaning=meaningC(expected.form);
  if (!actualMeaning) formErrors.push('missing_form');
  else for (const key of Object.keys(expectedMeaning)) if (!same(actualMeaning[key],expectedMeaning[key])) formErrors.push('form:'+key);
  const shown=(result?.results || []).flatMap(g=>g.countries || []);
  let unlabelledWrongData=false;
  if (expected.question) {
    const q=expected.question;
    if ((result.userMessage || result.question || '')!==q.text) outcomeErrors.push('wrong_question');
    if (!same((result.choices || []).map(c=>c.label),q.buttons)) outcomeErrors.push('wrong_buttons');
    if (result.freeText!==true) outcomeErrors.push('missing_free_text');
    if (shown.some(c=>c.series?.points?.length)) {outcomeErrors.push('unexpected_data');unlabelledWrongData=shown.some(c=>c.series&&!c.series.alternative);}
  } else {
    if (result?.needsClarification) outcomeErrors.push('unexpected_question');
    for (const e of expected.entries) {
      const matches=shown.filter(c=>identity(c)===identity(e));
      const a=matches[0],errors=[];
      if (matches.length!==1) errors.push(matches.length?'duplicate_entry':'missing_entry');
      if (a && e.outcome==='missing') {
        if (a.series || !(e.acceptableStatuses || ['empty','not_available']).includes(a.status)) errors.push('wrong_missing_status');
        if (a.geography?.name!==e.geographyName) errors.push('missing_country_name');
      } else if (a) {
        const s=a.series;
        if (!s?.points?.length || a.status!=='available') errors.push('no_numeric_data');
        else {
          if (s.selector?.route!==e.route || s.selector?.dataColumn!==e.measure) errors.push('wrong_measure');
          for (const [facet,value] of Object.entries(e.facets)) if (!same(s.selector?.facets?.[facet],value)) errors.push('wrong_facet:'+facet);
          if (s.unit!==e.unit || s.frequency!==e.frequency) errors.push('wrong_unit_or_frequency');
          if (!e.acceptableMeasurementBases.includes(s.basisLabel)) errors.push('wrong_basis');
          const labels=[s.title,s.description,s.basisLabel,s.regionLabel,s.fallbackLabel].filter(Boolean).join('\n');
          for (const label of e.requiredLabels || []) if (!labels.includes(label)) errors.push('missing_label:'+label);
          if (s.complete!==true) errors.push('incomplete_observations');
          let last=e.lastPeriod;
          if (last==='latest') {
            const evidence=options.latestEvidence;
            if (!evidence?.retrievedAt || !evidence?.lastPeriod || evidence.selector?.route!==e.route || evidence.selector?.dataColumn!==e.measure || evidence.selector?.frequency!==e.frequency
              || Object.entries(e.facets).some(([f,v])=>!same(evidence.selector?.facets?.[f],v))) errors.push('missing_live_latest_evidence');
            last=evidence?.lastPeriod;
          }
          if (s.coverage?.start!==e.firstPeriod || s.points[0]?.period!==e.firstPeriod) errors.push('wrong_first_period');
          if (s.coverage?.end!==last || s.points.at(-1)?.period!==last) errors.push('wrong_last_period');
          const {start,end}=expected.form.years;
          if (s.points.some(p=>!Number.isFinite(p.value) || start!==null&&Number(p.period.slice(0,4))<start || typeof end==='number'&&Number(p.period.slice(0,4))>end)) errors.push('observations_outside_years');
          if (s.points.some((p,i)=>i>0&&p.period<=s.points[i-1].period)) errors.push('duplicate_or_unordered_periods');
        }
      }
      outcomeErrors.push(...errors.map(error=>identity(e)+':'+error));
      if (errors.length && a?.series && !a.series.alternative) unlabelledWrongData=true;
    }
    for (const a of shown) if (!expected.entries.some(e=>identity(e)===identity(a))) {
      outcomeErrors.push('unexpected_entry:'+identity(a));
      if (a.series&&!a.series.alternative) unlabelledWrongData=true;
    }
  }
  const deadEnd=isDeadEnd(result);
  if (deadEnd) outcomeErrors.push('dead_end');
  return {correct:!formErrors.length&&!outcomeErrors.length,formCorrect:!formErrors.length,outcomeCorrect:!outcomeErrors.length,
    deadEnd,unlabelledWrongData,formErrors,outcomeErrors,actualMeaning};
}
