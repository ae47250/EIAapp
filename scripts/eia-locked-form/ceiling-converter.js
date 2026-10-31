import { readFileSync, writeFileSync } from 'node:fs';
import { convertLockedForm } from '../../lib/sources/eia/locked-form.js';
import { replayPublicSearch, firstDisplayed } from './real-path.js';
const read = path => JSON.parse(readFileSync(new URL('../../' + path, import.meta.url)));
const keys = read('tests/fixtures/eia/locked-form/answer-key.json');
const forms = read('tests/fixtures/eia/locked-form/gold-forms.json');
const before = read('evidence/eia-locked-form/ceiling-hand-written.json');
const adjudication = read('evidence/eia-locked-form/ceiling-adjudication.json');
process.env.LOGIN_REQUIRED = 'off'; process.env.OPENAI_API_KEY = ''; process.env.EIA_API_KEY = '';
let networkCalls = 0; globalThis.fetch = async () => { networkCalls++; throw new Error('Network forbidden'); };
const rows = [];
for (const k of keys) {
  const intent = convertLockedForm(forms.find(x => x.id === k.id).form, k.query);
  const body = await replayPublicSearch(intent, k.query);
  const first = firstDisplayed(body);
  const prior = before.rows.find(x => x.id === k.id);
  const judged = adjudication.rows.find(x => x.id === k.id);
  const previousSeries = value => JSON.stringify(value, (key, value) => ['ranking', 'certainty', 'diagnostics'].includes(key) ? undefined : value);
  const same = previousSeries(first) === previousSeries(prior.first);
  const clarificationCorrect = k.clarification && body.diagnostics.clarificationBlocked === true && body.variables.length === 0 && (k.clarification === 'product' ? /Please clarify the product: natural gas and petroleum \(including gasoline\)/.test(body.intent.clarificationMessage) : /clarify the country/.test(body.intent.clarificationMessage));
  rows.push({ id: k.id, query: k.query, rightData: k.clarification ? Boolean(clarificationCorrect) : same ? judged.rightData : null, reason: k.clarification ? body.intent.clarificationMessage : same ? judged.reason : 'Changed displayed record requires adjudication', sameDisplayedRecord: same, first, public: body, measurementBasis: judged.measurementBasis || null });
  console.log(k.id, rows.at(-1).rightData, same, body.intent.clarificationMessage || '');
}
writeFileSync(new URL('../../evidence/eia-locked-form/ceiling-converter.json', import.meta.url), JSON.stringify({ networkCalls, rows }, null, 2) + '\n');
