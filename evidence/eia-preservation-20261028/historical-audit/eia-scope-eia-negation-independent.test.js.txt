import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createHash } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { pathToFileURL, fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('..', import.meta.url)).replace(/\/$/, '');
const manifestPath = new URL('./fixtures/eia/negation-independent.json', import.meta.url);
const expectedHash = '5c911f9c2b7b47748f510eed4031cf1b49423ac1e39519764b8a691215c003ff';
const bytes = readFileSync(manifestPath);
const hash = createHash('sha256').update(bytes).digest('hex');
if (hash !== expectedHash) throw new Error('Frozen independent manifest changed');
const cases = JSON.parse(bytes).cases;
const scopeCases = JSON.parse(readFileSync(new URL('./fixtures/eia/scope-evidence-legacy.json', import.meta.url))).independent;
const source = readFileSync(root + '/components/search/SearchWorkspace.js', 'utf8');
const start = source.indexOf('function appendIntentParams(');
const end = source.indexOf('\nfunction formatInterpreter(', start);
if (start < 0 || end <= start) throw new Error('Real serializer not found');
const serialize = runInNewContext('(' + source.slice(start, end) + ')');
const moduleUrl = rel => pathToFileURL(root + '/' + rel).href;
const { interpretQuery, normalizeSubmittedIntent } = await import(moduleUrl('lib/sources/eia/interpret-query.js'));
const { GET } = await import(moduleUrl('app/api/search-eia/route.js'));
const vocab = JSON.parse(readFileSync(root + '/data/eia/phase4-routing-config.json'));
const metadata = JSON.parse(readFileSync(root + '/data/eia/routing-metadata.json'));
const geoCodes = new Set(metadata.geographies.map(g => g.code));
const fields = value => ({ rawValue: value, value, confidence: 0.99, ambiguityReason: null });
const typeFor = value => geoCodes.has(value) ? 'geography' : ['products','activities','sectors','frequencies'].find(k => Object.hasOwn(vocab.vocabulary[k] || {}, value))?.replace(/ies$/, 'y').replace(/s$/, '') || 'unknown';
function modelFor(c) {
  const pos = c.positive;
  const pairs = pos.pairs || [{ product: pos.products?.[0] || null, activity: pos.activities?.[0] || null }];
  const frequency = pos.frequencies?.[0] || 'annual';
  const ex = (c.required_exclusions || []).map(value => ({ type: typeFor(value), value, confidence: .99 })).filter(x => ['product','activity','sector','conceptType'].includes(x.type));
  return {
    correctedQuery: c.query,
    confidence: .99,
    ambiguity: c.clarification ? 'The attachment or requested status of the additional negated phrase is unresolved.' : null,
    fields: { country: fields(pos.geographies?.[0]), product: fields(pairs[0]?.product), activity: fields(pairs[0]?.activity), sector: fields(pos.sectors?.[0] || null), frequency: { ...fields(frequency), explicit: Boolean(pos.frequencies?.length) } },
    geographies: (pos.geographies || []).map(value => ({value, confidence: .99})),
    conceptPairs: pairs.map((pair,order) => ({...pair, order, confidence:.99})),
    exclusions: ex,
    unknownQualifiers: c.clarification ? [{value: c.query.slice(Math.max(c.query.lastIndexOf(';') + 1, c.query.lastIndexOf(', not') + 2)).trim(), confidence: .99}] : []
  };
}
function compact(intent) {
  const s = intent?.structuredIntent || intent || {};
  return {
    interpreter: intent?.interpreter,
    geographies: (s.geographies || []).map(g => g.code),
    pairs: (s.conceptPairs || []).map(p => ({product:p.product,activity:p.activity})),
    product: s.product, activity: s.activity, sector: s.sector,
    frequency: s.frequency, requestedFrequency:s.requestedFrequency, frequencyExplicit:s.frequencyExplicit,
    exclusions: s.exclusions || [],
    unknownQualifiers: s.unknownQualifiers || [],
    needsClarification: Boolean(intent?.needsClarification || s.needsClarification),
    blockingClarification: Boolean(intent?.blockingClarification || s.blockingClarification),
    clarificationMessage: intent?.clarificationMessage || s.clarificationMessage || null,
    negationResolution: s.negationResolution || intent?.negationResolution || null
  };
}
function judge(c, a) {
  const failures=[];
  const pos=c.positive;
  const equal=(x,y)=>JSON.stringify(x)===JSON.stringify(y);
  if (!equal(a.geographies,pos.geographies)) failures.push({check:'ordered-geographies',expected:pos.geographies,actual:a.geographies});
  const products=[...new Set(a.pairs.map(p=>p.product).filter(Boolean))];
  const activities=[...new Set(a.pairs.map(p=>p.activity).filter(Boolean))];
  if (pos.products && !equal(products,pos.products)) failures.push({check:'positive-products',expected:pos.products,actual:products});
  if (pos.activities && !equal(activities,pos.activities)) failures.push({check:'positive-activities',expected:pos.activities,actual:activities});
  if (pos.pairs && !equal(a.pairs,pos.pairs)) failures.push({check:'ordered-pairs',expected:pos.pairs,actual:a.pairs});
  if (pos.sectors && !pos.sectors.includes(a.sector)) failures.push({check:'positive-sector',expected:pos.sectors,actual:a.sector});
  if (pos.frequencies && (!a.frequencyExplicit || !pos.frequencies.includes(a.requestedFrequency))) failures.push({check:'positive-frequency',expected:pos.frequencies,actual:[a.requestedFrequency,a.frequencyExplicit]});
  for (const value of c.forbid_exclusions || []) if (a.exclusions.some(e => e.value===value || e.value===String(value).toLowerCase())) failures.push({check:'false-exclusion',value});
  for (const value of c.required_exclusions || []) {
    const type=typeFor(value);
    const excluded = type==='geography' ? !a.geographies.includes(value) : type==='frequency' ? a.requestedFrequency!==value : a.exclusions.some(e=>e.value===value);
    if (!excluded) failures.push({check:'missing-required-exclusion',type,value});
  }
  if (c.clarification && !a.needsClarification) failures.push({check:'missing-required-clarification'});
  return failures;
}
const saved = Object.fromEntries(['LOGIN_REQUIRED', 'OPENAI_API_KEY', 'EIA_API_KEY'].map(key => [key, process.env[key]]));
const savedFetch = globalThis.fetch;
let currentModel;
let calls = 0;
before(() => {
  process.env.LOGIN_REQUIRED = 'off';
  process.env.OPENAI_API_KEY = 'offline-test';
  delete process.env.EIA_API_KEY;
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses', 'No live transport permitted');
    assert.equal(options?.method, 'POST');
    calls++;
    return Response.json({ output_text: JSON.stringify(currentModel) });
  };
});
after(() => {
  globalThis.fetch = savedFetch;
  for (const [key, value] of Object.entries(saved)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  assert.equal(calls, cases.length);
});
for (const original of cases) test(`independent negation ${original.id}: ${original.query}`, async () => {
  const scopeCase = scopeCases[original.id];
  assert.equal(scopeCase.q, original.query);
  const c = scopeCase.expected;
  currentModel = { ...modelFor(c), requestEvidence: scopeCase.requestEvidence };
  const intent = await interpretQuery(c.query);
  assert.equal(intent.interpreter, 'openai');
  const params = serialize(new URLSearchParams({ q: c.query }), intent);
  const resubmitted = normalizeSubmittedIntent(JSON.parse(params.get('intentPayload')), c.query);
  const response = await GET(new Request('http://example.test/api/search-eia?' + params));
  const body = await response.json();
  assert.equal(response.status, 200);
  const stages = { interpretation: compact(intent), resubmission: compact(resubmitted), publicGET: compact(body.intent) };
  const failures = Object.entries(stages).flatMap(([stage, value]) => judge(c, value).map(issue => ({ stage, ...issue })));
  if (c.clarification) {
    if (!body.needsClarification) failures.push({ stage: 'publicGET', check: 'public-clarification-required' });
    if ((body.variables?.length || 0) || (body.comparisonDefinitions?.length || 0)) failures.push({ stage: 'publicGET', check: 'ambiguous-request-returned-candidates' });
  }
  assert.deepEqual(failures, [], JSON.stringify(failures));
});
