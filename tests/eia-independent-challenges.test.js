import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gunzipSync } from 'node:zlib';
import { after, before, test } from 'node:test';
import { interpretQueryWithRules, normalizeSubmittedIntent } from '../lib/sources/eia/interpret-query.js';
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
