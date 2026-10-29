import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkLockedForm, convertLockedForm, interpretLockedForm, lockedFormRequest, recheckSubmittedForm } from '../lib/sources/eia/locked-form.js';
import { interpretQuery, normalizeSubmittedIntent, interpretQueryWithRules } from '../lib/sources/eia/interpret-query.js';
import { appendIntentParams } from '../lib/eia-intent-payload.js';
import { listApprovedGeographies, buildStructuredIntent } from '../lib/sources/eia/intent-routing.js';
import { geographyLabel } from '../lib/sources/eia/locked-form-schema.js';
import { buildLocalCandidatePipeline } from '../lib/sources/eia/candidate-pipeline.js';
import { GET as searchEia } from '../app/api/search-eia/route.js';
const keys = JSON.parse(readFileSync(new URL('./fixtures/eia/locked-form/answer-key.json', import.meta.url)));
const forms = JSON.parse(readFileSync(new URL('./fixtures/eia/locked-form/gold-forms.json', import.meta.url)));
const gold = id => structuredClone(forms.find(x => x.id === id).form);
const key = id => keys.find(x => x.id === id);
const noRules = () => { throw new Error('A model answer must never enter the rules interpreter'); };
const quiet = () => {};
const answer = form => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(form) }] }] });

for (const k of keys) test(`locked form ${k.id}: frozen meaning survives conversion and browser resubmission`, async () => {
  const form = gold(k.id);
  const intent = await interpretQuery(k.query, [], { apiKey: 'offline-placeholder', fetch: async () => answer(form), rules: noRules, log: quiet });
  assert.equal(intent.interpreter, 'openai_locked_form');
  assert.deepEqual(checkLockedForm(form, k.query), { valid: true, errors: [] });
  const params = appendIntentParams(new URLSearchParams({ q: k.query }), intent);
  const payload = JSON.parse(params.get('intentPayload'));
  assert.deepEqual(Object.keys(payload), ['interpreter', 'lockedForm']);
  assert.deepEqual(payload.lockedForm, form);
  const submitted = normalizeSubmittedIntent(payload, k.query);
  assert.deepEqual(submitted, intent);
  assert.deepEqual(submitted.validatedGeographies.map(g => g.code), k.geographies);
  assert.deepEqual(submitted.validatedConceptPairs.map(p => [p.product, p.activity]), k.pairs);
  assert.equal(submitted.frequency, k.frequency);
  assert.equal(submitted.frequencyExplicit, k.explicit);
  assert.equal(submitted.sector, k.sector);
  assert.equal(submitted.needsClarification, Boolean(k.clarification));
  assert.deepEqual(submitted.excludedGeographies.map(g => g.code), k.excludedGeographies);
  if (k.clarification) {
    const pipeline = await buildLocalCandidatePipeline(submitted);
    assert.equal(pipeline.diagnostics.clarificationBlocked, true);
    assert.equal(pipeline.retrievals.length, 0);
    if (k.clarification === 'product') assert.equal(submitted.clarificationMessage, 'Please clarify the product: natural gas and petroleum (including gasoline). No series will be selected until it is resolved.');
  }
});

test('locked-form geography is authoritative; USA does not introduce US or comparison mode', () => {
  const i = convertLockedForm(gold('O1'), key('O1').query);
  assert.deepEqual(buildStructuredIntent(i, 'Ireland electricity generation').geographies.map(g => g.code), ['USA']);
  assert.deepEqual(i.structuredIntent.geographies.map(g => g.code), ['USA']);
  assert.equal(i.multiCountryComparison.active, false);
});

test('quote checks are case-insensitive, whitespace-collapsed and check every quote-bearing field', () => {
  const f = gold('O1');
  assert.equal(checkLockedForm(f, 'TOTAL  ENERGY\n CONSUMPTION UNITED STATES').valid, true);
  for (const change of [f => f.geographies[0].quoted_words = 'invented', f => f.topics[0].quoted_words = 'invented', f => f.sector.quoted_words = 'invented', f => f.frequency.quoted_words = 'invented', f => f.excluded_geographies.push({ ...f.geographies[0], quoted_words: 'invented' }), f => f.excluded_topics.push({ product: 'coal', activity: null, sector: null, quoted_words: 'invented' }), f => f.unsupported_words.push('invented')]) {
    const copy = gold('O1'); change(copy);
    assert.ok(checkLockedForm(copy, key('O1').query).errors.includes('quote_not_in_query'));
  }
  const copy = gold('O1'); copy.topics[0].quoted_words = '  ';
  assert.equal(checkLockedForm(copy, key('O1').query).valid, false);
});

test('facts reject overlapping geographies, missing required geography, and unsupported words without clarification', () => {
  const f = gold('O1'); f.excluded_geographies.push(f.geographies[0]);
  assert.ok(checkLockedForm(f, key('O1').query).errors.includes('geography_included_and_excluded'));
  const absent = gold('O1'); absent.geographies = [];
  assert.ok(checkLockedForm(absent, key('O1').query).errors.includes('geography_required'));
  absent.clarification = { needed: true, about: 'geography', options: [] };
  assert.equal(checkLockedForm(absent, key('O1').query).valid, true);
  const unsupported = gold('O1'); unsupported.unsupported_words = ['energy'];
  assert.ok(checkLockedForm(unsupported, key('O1').query).errors.includes('unsupported_words_require_clarification'));
  unsupported.clarification = { needed: true, about: 'other', options: [] };
  assert.equal(checkLockedForm(unsupported, key('O1').query).valid, true);
});
for (const [about, value] of [['product', 'coal'], ['activity', 'production'], ['frequency', 'monthly'], ['geography', gold('O1').geographies[0].geography], ['other', 'coal']]) test(`clarification ${about}: options validation`, () => {
  const f = gold('O1'); f.clarification = { needed: true, about, options: [] };
  assert.equal(checkLockedForm(f, key('O1').query).valid, ['geography', 'other'].includes(about));
  f.clarification.options = [{ label: value, value }];
  assert.equal(checkLockedForm(f, key('O1').query).valid, true);
  f.clarification.options[0].value = 'not-approved';
  assert.equal(checkLockedForm(f, key('O1').query).valid, false);
});

test('plain fact checks do not reinterpret meaning or spell-check a valid model selection', async () => {
  const f = gold('O1'); f.geographies[0].geography = geographyLabel(listApprovedGeographies().find(g => g.code === 'ISL'));
  // A meaning mistake is measured by the frozen scorer, not a second interpreter.
  const i = await interpretLockedForm(key('O1').query, { apiKey: 'offline-placeholder', fetch: async () => answer(f), rules: noRules, log: quiet });
  assert.deepEqual(i.validatedGeographies.map(g => g.code), ['ISL']);
});

for (const status of [400, 401, 403, 429, 500, 503]) test(`HTTP ${status} outcome mapping`, async () => {
  let rulesCalls = 0, attempts = 0;
  const i = await interpretLockedForm(key('O1').query, { apiKey: 'offline-placeholder', fetch: async () => Response.json({ error: { message: 'offline' } }, { status }), log: quiet, onAttempt: () => attempts++, rules: (q, reason) => { rulesCalls++; return interpretQueryWithRules(q, [], reason); } });
  const outage = status === 429 || status >= 500;
  assert.equal(rulesCalls, Number(outage)); assert.equal(attempts, 1);
  assert.equal(i.interpreter, outage ? 'rules' : 'openai_locked_form');
  if (!outage) assert.equal((await buildLocalCandidatePipeline(i)).diagnostics.clarificationBlocked, true);
});
for (const kind of ['missing-key', 'network', 'timeout', 'refusal', 'cutoff', 'invalid-json', 'failed-check']) test(`${kind} outcome mapping and bounded re-ask`, async () => {
  let rulesCalls = 0, fetches = 0; const events = [];
  const i = await interpretLockedForm(key('O1').query, {
    apiKey: kind === 'missing-key' ? '' : 'offline-placeholder', timeoutMs: 5,
    rules: (q, reason) => { rulesCalls++; return interpretQueryWithRules(q, [], reason); }, log: e => events.push(e),
    fetch: async (_url, options) => {
      fetches++;
      if (kind === 'network') throw new TypeError('offline network');
      if (kind === 'timeout') return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))));
      if (kind === 'refusal') return Response.json({ output: [{ content: [{ type: 'refusal', refusal: 'offline' }] }] });
      if (kind === 'cutoff') return Response.json({ status: 'incomplete' });
      if (kind === 'invalid-json') return Response.json({ output_text: '{' });
      const f = gold('O1'); f.geographies[0].quoted_words = 'invented'; return answer(f);
    }
  });
  const outage = ['missing-key', 'network'].includes(kind);
  assert.equal(rulesCalls, Number(outage));
  assert.equal(fetches, kind === 'missing-key' ? 0 : ['failed-check', 'invalid-json'].includes(kind) ? 2 : 1);
  if (outage) {
    assert.equal(i.interpreter, 'rules'); assert.equal(i.interpretationNotice, 'AI interpretation unavailable');
    const payload = JSON.parse(appendIntentParams(new URLSearchParams(), i).get('intentPayload'));
    assert.deepEqual(normalizeSubmittedIntent(payload, key('O1').query), i);
  } else assert.equal((await buildLocalCandidatePipeline(i)).diagnostics.clarificationBlocked, true);
  if (fetches === 2) assert.equal(events.filter(e => e.event === 'locked_form_reask').length, 1);
});

test('one re-ask can pass; first attempt and retry are independently recorded', async () => {
  const attempts = [];
  const i = await interpretLockedForm(key('O1').query, { apiKey: 'offline-placeholder', rules: noRules, log: quiet,
    onAttempt: a => attempts.push(a), fetch: async () => attempts.length ? answer(gold('O1')) : Response.json({ output_text: '{}' }) });
  assert.equal(i.countryCode, 'USA'); assert.equal(attempts.length, 2);
  assert.equal(attempts[0].checks.valid, false); assert.equal(attempts[1].checks.valid, true);
});

test('request enforces schema and uses the owner-authorized low reasoning default with explicit evaluation overrides', () => {
  const body = lockedFormRequest('raw words', { model: 'production-placeholder' });
  assert.equal(body.model, 'production-placeholder'); assert.equal(body.text.format.strict, true);
  assert.equal(body.text.format.type, 'json_schema'); assert.deepEqual(body.reasoning, { effort: 'low' }); assert.equal(body.max_output_tokens, undefined);
  assert.equal(body.input.includes('requestEvidence'), false);
  const evaluation = lockedFormRequest('raw words', { model: 'gpt-6-luna', reasoning: { effort: 'low' }, maxOutputTokens: 16000 });
  assert.deepEqual(evaluation.reasoning, { effort: 'low' }); assert.equal(evaluation.max_output_tokens, 16000);
});

test('public search rejects missing, unreadable, oversized and legacy payloads without fetching', async () => {
  const saved = process.env.LOGIN_REQUIRED; const oldFetch = globalThis.fetch;
  process.env.LOGIN_REQUIRED = 'off'; globalThis.fetch = noRules;
  try {
    for (const payload of [undefined, '{', 'x'.repeat(12001), JSON.stringify({ interpreter: 'openai', countryCode: 'USA' }), JSON.stringify({ interpreter: 'openai_locked_form', countryCode: 'USA' })]) {
      const p = new URLSearchParams({ q: key('O1').query, intentReady: '1' }); if (payload !== undefined) p.set('intentPayload', payload);
      const response = await searchEia(new Request(`http://localhost/api/search-eia?${p}`)); const result = await response.json();
      assert.equal(response.status, 200); assert.equal(result.needsClarification, true); assert.deepEqual(result.results, []);
      assert.deepEqual(result.choices, []);
    }
    const f = gold('O1'); f.geographies[0].quoted_words = 'invented';
    assert.equal(recheckSubmittedForm({ interpreter: 'openai_locked_form', lockedForm: f }, key('O1').query, noRules).needsClarification, true);
  } finally { globalThis.fetch = oldFetch; if (saved === undefined) delete process.env.LOGIN_REQUIRED; else process.env.LOGIN_REQUIRED = saved; }
});

test('all approved geography labels survive conversion and raw-form resubmission without competing raw mentions', () => {
  for (const g of listApprovedGeographies().filter(g => g.code !== 'US')) {
    const f = gold('O1'), q = `energy consumption ${g.name}`;
    f.geographies = [{ geography: geographyLabel(g), quoted_words: g.name }];
    const i = convertLockedForm(f, q);
    const p = appendIntentParams(new URLSearchParams(), i);
    const submitted = normalizeSubmittedIntent(JSON.parse(p.get('intentPayload')), q);
    assert.deepEqual(submitted.validatedGeographies.map(g => g.code), [g.code], q);
    assert.deepEqual(submitted.structuredIntent.geographies.map(g => g.code), [g.code], q);
  }
});
