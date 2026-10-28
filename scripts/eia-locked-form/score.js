import { readFileSync } from 'node:fs';
const ids = JSON.parse(readFileSync(new URL('../../tests/fixtures/eia/locked-form/answer-key.json', import.meta.url), 'utf8')).map(x => x.id);
// Frozen meaning scorer. It does not call application validation or infer answers from retrieval.
const code = value => { const c = typeof value === 'string' ? value.split('|')[0].trim() : null; return c === 'US' ? 'USA' : c; };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function scoreMeaning(form, expected, outcome = 'answer') {
  const errors = [];
  if (outcome !== 'answer' || !form || typeof form !== 'object') return { correct: false, errors: [outcome === 'answer' ? 'ungradable' : outcome] };
  try {
    if (!equal(form.geographies.map(x => code(x.geography)), expected.geographies)) errors.push('geographies_or_order');
    if (!equal(form.excluded_geographies.map(x => code(x.geography)).sort(), [...expected.excludedGeographies].sort())) errors.push('excluded_geographies');
    let pairs = form.topics.map(x => [x.product, x.activity]);
    // The original frozen gas policy explicitly permits no pairs while clarifying.
    if (expected.id === 'O10' && pairs.length === 0) pairs = [[null, 'consumption']];
    if (!equal(pairs, expected.pairs)) errors.push('topics_or_order');
    const excluded = form.excluded_topics.flatMap(x => ['product','activity','sector'].filter(k => x[k] !== null).map(k => [k,x[k]])).sort();
    if (!equal(excluded, [...expected.excludedTopics].sort())) errors.push('excluded_topics');
    if (form.sector.value !== expected.sector) errors.push('sector');
    if (form.frequency.value !== expected.frequency || form.frequency.explicit !== expected.explicit) errors.push('frequency');
    if (form.unsupported_words.length && !expected.clarification) errors.push('unexpected_unsupported_words');
    if (form.clarification.needed !== Boolean(expected.clarification)) errors.push('clarification_needed');
    if (expected.clarification) {
      if (form.clarification.about !== expected.clarification) errors.push('clarification_about');
      if (expected.options.length && !equal(form.clarification.options.map(x => x.value).sort(), [...expected.options].sort())) errors.push('clarification_options');
      if (expected.clarification === 'product' && !form.clarification.options.some(x => x.value === 'petroleum' && /gasoline|petrol/i.test(x.label))) errors.push('gasoline_label');
    } else if (form.clarification.about !== null || form.clarification.options.length) errors.push('unexpected_clarification_details');
  } catch { errors.push('ungradable'); }
  return { correct: errors.length === 0, errors, returnedGeographies: form.geographies?.map(x => code(x.geography)) || [], rawGeographies: form.geographies?.map(x => x.geography) || [] };
}
export function firstRunPass(rows) {
  if (rows.some(x => !ids.includes(x.id) || ![1,2].includes(x.repeat)) || rows.length !== 48 || new Set(rows.map(x => `${x.id}:${x.repeat}`)).size !== 48) return false;
  const success = rows.filter(x => x.meaning.correct && x.checksPassed).length;
  const required = rows.filter(x => ['O10','F9','F13'].includes(x.id));
  return success >= 44 && required.length === 6 && required.every(x => x.meaning.correct && x.checksPassed)
    && rows.filter(x => /^O[1-9]$/.test(x.id)).every(x => x.clarificationNeeded === false);
}
