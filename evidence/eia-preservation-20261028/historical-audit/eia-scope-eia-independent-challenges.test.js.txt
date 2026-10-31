import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gunzipSync } from 'node:zlib';
import { after, before, test } from 'node:test';
import { interpretQueryWithRules, validateAiInterpretation, normalizeSubmittedIntent } from '../lib/sources/eia/interpret-query.js';
import { buildLocalCandidatePipeline } from '../lib/sources/eia/candidate-pipeline.js';
import { GET as searchEia } from '../app/api/search-eia/route.js';

function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/eia/${name}.json`, import.meta.url)));
}
const cases = fixture('independent-challenges').cases;
const adjudications = fixture('challenge-route-adjudication').claims;
const scopeCases = fixture('scope-evidence-legacy').review;
cases.push(...fixture('review-regressions').cases.map((item, index) => ({
  id: `review-${index + 1}`,
  q: item.q,
  expected: {
    codes: item.codes,
    ...(item.pairs ? { pairs: item.pairs.map(([product, activity]) => ({ product, activity })) } : {})
  }
})));
const source = readFileSync(new URL('../components/search/SearchWorkspace.js', import.meta.url), 'utf8');
const serialize = runInNewContext(`(${source.slice(source.indexOf('function appendIntentParams('), source.indexOf('\nfunction formatInterpreter('))})`);
const savedEnvironment = Object.fromEntries(['LOGIN_REQUIRED', 'OPENAI_API_KEY', 'EIA_API_KEY'].map(key => [key, process.env[key]]));
const savedFetch = globalThis.fetch;
let fetches = 0;
before(() => {
  process.env.LOGIN_REQUIRED = 'off';
  delete process.env.OPENAI_API_KEY;
  delete process.env.EIA_API_KEY;
  globalThis.fetch = async () => { fetches++; throw new Error('Unexpected external request in offline challenges'); };
});
after(() => {
  globalThis.fetch = savedFetch;
  for (const [key, value] of Object.entries(savedEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  assert.equal(fetches, 0, 'No model or source API calls are permitted');
});

function signature(intent) {
  const structured = intent.structuredIntent;
  return {
    codes: structured.geographies.map(g => g.code),
    frequency: intent.frequency,
    explicit: intent.frequencyExplicit,
    sector: intent.sector,
    route: structured.route.family,
    pairs: structured.conceptPairs.map(p => ({ product: p.product, activity: p.activity })),
    clarify: intent.needsClarification
  };
}
function injected(expected) {
  const field = value => ({ value, confidence: 0.99 });
  return {
    confidence: 0.99,
    geographies: (expected.codes || []).map(field),
    conceptPairs: expected.pairs?.map((pair, order) => ({ ...pair, order, confidence: 0.99 })),
    fields: {
      country: field(expected.codes?.[0]),
      product: field(expected.pairs?.[0]?.product),
      activity: field(expected.pairs?.[0]?.activity),
      frequency: { ...field(expected.frequency), explicit: expected.explicit },
      sector: field(expected.sector)
    }
  };
}
const sourceRecords = new Map();
function sourceRecord(family, seriesId) {
  if (!sourceRecords.has(family)) {
    const artifacts = family === 'domestic' ? ['domestic', 'natural-gas'] : [family];
    const records = artifacts.flatMap(name => gunzipSync(readFileSync(new URL(`../data/eia/builds/phase1b/${name}.jsonl.gz`, import.meta.url))).toString().trim().split('\n').map(JSON.parse));
    sourceRecords.set(family, new Map(records.map(record => [record.series_id, record])));
  }
  return sourceRecords.get(family).get(seriesId);
}

for (const { id, q, expected, additionalChecks = [] } of cases) {
  test(`${id}: ${q}`, async () => {
    const errors = [];
    for (const [mode, intent] of [
      ['rules', interpretQueryWithRules(q)],
      ['injected', validateAiInterpretation({ ...injected(expected), ...(scopeCases[id] ? { requestEvidence: scopeCases[id].requestEvidence } : {}) }, q)]
    ]) {
      const actual = signature(intent);
      const modeExpected = mode === "rules" && scopeCases[id] ? scopeCases[id].rulesExpected : expected;
      for (const key of ['codes', 'frequency', 'explicit', 'sector', 'route', 'pairs', 'clarify']) {
        if (!Object.hasOwn(modeExpected, key)) continue;
        const value = key === 'pairs' ? modeExpected.pairs.map(p => ({ product: p.product, activity: p.activity })) : modeExpected[key];
        try {
          const routeClaim = key === 'route' && adjudications.find(claim => claim.caseId === id);
          if (routeClaim) assert.ok(routeClaim.acceptedRouteFamilies.includes(actual.route));
          else assert.deepEqual(actual[key], value);
        } catch {
          errors.push({ mode, key, expected: value, actual: actual[key] });
        }
      }
      const params = serialize(new URLSearchParams({ q }), intent);
      const submitted = normalizeSubmittedIntent(JSON.parse(params.get('intentPayload')), q);
      try {
        assert.deepEqual(signature(submitted), actual);
      } catch {
        errors.push({ mode, key: 'browser-resubmission', expected: actual, actual: signature(submitted) });
      }
      if (expected.empty === false || expected.clarify === true || additionalChecks.length) {
        try {
          const pipeline = await buildLocalCandidatePipeline(submitted);
          if (expected.empty === false) assert.ok(pipeline.retrievals.some(r => r.displayCandidates.length), 'Expected available candidates');
          if (expected.clarify === true) assert.equal(pipeline.diagnostics.clarificationBlocked, true);
          if (additionalChecks.length) {
            const response = await searchEia(new Request(`http://example.test/api/search-eia?${params}`));
            const body = await response.json();
            assert.equal(response.status, 200);
            assert.equal(body.selectedSeries, null);
            for (const check of additionalChecks) {
              if (check.kind === 'frequency-fallback') {
                assert.equal(body.intent.frequency, expected.frequency);
                assert.equal(body.intent.frequencyExplicit, true);
                for (const retrieval of pipeline.retrievals) {
                  for (const candidate of retrieval.displayCandidates.filter(c => c.frequency !== expected.frequency)) {
                    assert.equal(candidate.ranking.tier, 'B');
                    assert.ok(retrieval.userWarnings.some(warning => /fallback|alternatives/i.test(warning.message)));
                  }
                }
              }
              if (check.kind === 'unit') {
                for (const candidate of body.variables) {
                  const record = sourceRecord(candidate.routeFamily, candidate.seriesId);
                  assert.ok(record, 'Candidate must exist in the preserved official metadata');
                  assert.equal(candidate.unit, record.unit, 'Offer the source unit without silent relabeling or conversion');
                }
              }
            }
          }
        } catch (error) {
          errors.push({ mode, key: 'retrieval/public-response', error: error.code || error.message });
        }
      }
    }
    assert.deepEqual(errors, [], JSON.stringify(errors));
  });
}

test('public search preserves injected interpretation through the actual browser serializer without network access', async () => {
  const expectations = [
    { q: 'energy consumption iceland not ireland', codes: ['ISL'], pairs: [{ product: 'total energy', activity: 'consumption' }], clarify: false },
    { q: 'U.S. total energy consumption', codes: ['USA'], pairs: [{ product: 'total energy', activity: 'consumption' }], clarify: false },
    { q: 'gas consumption in the United States', codes: ['USA'], clarify: true },
    { q: 'In Texas, show natural gas production, natural gas consumption, and electricity generation.', codes: ['TX'], pairs: [{ product: 'natural gas', activity: 'production' }, { product: 'natural gas', activity: 'consumption' }, { product: 'electricity', activity: 'generation' }], clarify: false }
  ];
  for (const expected of expectations) {
    const intent = validateAiInterpretation(injected({ ...expected, frequency: 'annual', explicit: false, sector: null }), expected.q);
    const params = serialize(new URLSearchParams({ q: expected.q }), intent);
    const response = await searchEia(new Request(`http://example.test/api/search-eia?${params}`));
    const body = await response.json();
    assert.equal(response.status, 200, expected.q);
    assert.deepEqual(body.intent.structuredIntent.geographies.map(g => g.code), expected.codes);
    assert.equal(body.needsClarification, expected.clarify);
    assert.equal(body.selectedSeries, null);
    if (expected.clarify) assert.match(body.intent.clarificationMessage, /natural gas.*gasoline/);
    else {
      assert.ok(body.variables.length > 0, expected.q);
      for (const pair of expected.pairs) assert.ok(body.variables.some(candidate => candidate.activity === pair.activity), expected.q + ': ' + pair.activity);
    }
  }
});

test('public cap shares slots across requests and discloses overflow without dropping intent', async () => {
  const q = 'electricity generation Alabama Alaska Arizona Arkansas California Colorado Connecticut Delaware Florida Georgia Hawaii';
  const response = await searchEia(new Request(`http://example.test/api/search-eia?q=${encodeURIComponent(q)}`));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(body.intent.structuredIntent.geographies.map(g => g.code), ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI']);
  assert.equal(body.variables.length, 10);
  assert.equal(new Set(body.candidateGroups.map(group => group.geography.code)).size, 10);
  assert.ok(body.userWarnings.some(warning => warning.code === 'candidate_display_limit' && warning.message.includes('Hawaii')));
});

test('comparison definition cap represents each requested pair and discloses excess requests', async () => {
  for (const q of [
    'Canada and Mexico natural gas production, natural gas consumption, and electricity generation',
    'Canada and Mexico coal production, coal consumption, petroleum production, petroleum consumption, natural gas production, natural gas consumption'
  ]) {
    const response = await searchEia(new Request(`http://example.test/api/search-eia?q=${encodeURIComponent(q)}`));
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.comparisonMode, true);
    const pairs = body.intent.structuredIntent.conceptPairs;
    const represented = new Set(body.comparisonDefinitions.map(d => `${d.definition.product}:${d.definition.activity}`));
    assert.equal(represented.size, Math.min(5, pairs.length));
    for (const definition of body.comparisonDefinitions) assert.deepEqual(definition.countries.map(c => c.geography.code), ['CAN', 'MEX']);
    for (const pair of pairs) {
      if (!represented.has(`${pair.product}:${pair.activity}`)) {
        assert.ok(body.userWarnings.some(warning => warning.code === 'candidate_display_limit' && warning.message.includes(`${pair.product} ${pair.activity}`)));
      }
    }
  }
});
