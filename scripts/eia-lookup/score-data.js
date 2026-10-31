// Independent oracle: expected-data was frozen before the lookup list was written.
// Never import the list or ranking code here.
export function scoreData(result, expected) {
  const errors = [], entries = [], shown = (result.results || []).flatMap(group=>group.countries || []);
  const clarification = expected.entries[0]?.outcome.startsWith('clarification:');
  if (clarification) {
    const about = expected.entries[0].outcome.split(':')[1].trim();
    if (!result.needsClarification || result.intent?.lockedForm?.clarification.about !== about || shown.some(entry=>entry.series)) errors.push('incorrect_clarification');
    const required = result.intent?.lockedForm?.clarification.options || [];
    if (required.some(option=>!(result.choices || []).some(choice=>choice.choice?.value===option.value))) errors.push('missing_clarification_buttons');
    return {correct:!errors.length,errors,unlabelledWrongData:shown.some(entry=>entry.series),entries:[]};
  }
  if (result.needsClarification) errors.push('unexpected_clarification');
  for (const e of expected.entries) {
    const actual = shown.find(item=>item.geography.code===e.geographyCode && item.product===e.product && item.activity===e.activity);
    const problems = [];
    if (!actual) problems.push('missing_entry');
    else if (e.outcome === 'not_available') {
      if (actual.series || actual.status !== 'not_available' || actual.message !== e.message) problems.push('incorrect_unavailability');
      for (const alternative of e.requiredAlternatives || []) if (!actual.alternatives?.some(option=>option.label.includes(alternative.label))) problems.push('missing_alternative:'+alternative.label);
    } else {
      const s = actual.series;
      if (!s?.points?.length || actual.status !== 'available') problems.push('no_numeric_data');
      else {
        if (s.selector?.route !== e.route || s.selector?.dataColumn !== e.measure) problems.push('wrong_measure');
        for (const [facet,value] of Object.entries(e.facets)) if (String(s.selector?.facets?.[facet]) !== String(value)) problems.push('wrong_facet:'+facet);
        if (s.unit !== e.unit || s.frequency !== e.frequency) problems.push('wrong_unit_or_frequency');
        const text = [s.title,s.description,s.basisLabel,s.regionLabel,s.fallbackLabel].filter(Boolean).join('\n');
        for (const label of e.requiredLabels || []) if (!text.includes(label)) problems.push('missing_label:'+label);
        if (!e.acceptableMeasurementBases.includes(s.basisLabel)) problems.push('wrong_basis');
        if (!s.complete || s.completenessNote?.includes('Incomplete response:')) problems.push('incomplete_observations');
      }
    }
    entries.push({geographyCode:e.geographyCode,product:e.product,activity:e.activity,correct:!problems.length,errors:problems,
      status:actual?.status,eiaName:actual?.series?.eiaName,unit:actual?.series?.unit,frequency:actual?.series?.frequency,
      coverage:actual?.series?.coverage,rows:actual?.series?.rowsReceived,total:actual?.series?.total,complete:actual?.series?.complete,
      message:actual?.message,labels:actual?.series ? [actual.series.basisLabel,actual.series.regionLabel,actual.series.fallbackLabel].filter(Boolean) : actual?.alternatives?.map(item=>item.label)});
    errors.push(...problems.map(problem=>`${e.geographyCode}/${e.product}/${e.activity}:${problem}`));
  }
  const extras = shown.filter(actual=>!expected.entries.some(e=>actual.geography.code===e.geographyCode && actual.product===e.product && actual.activity===e.activity));
  if (extras.length) errors.push('unexpected_entries');
  const unlabelledWrongData = entries.some(entry=>entry.errors.length && shown.some(actual=>actual.geography.code===entry.geographyCode && actual.product===entry.product && actual.activity===entry.activity && actual.series && !actual.series.alternative)) || extras.some(entry=>entry.series && !entry.series.alternative);
  return {correct:!errors.length,errors,unlabelledWrongData,entries};
}
