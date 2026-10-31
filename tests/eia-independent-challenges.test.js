import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { gunzipSync } from 'node:zlib';
import { after, before, test } from 'node:test';
import { interpretQueryWithRules, normalizeSubmittedIntent } from '../lib/sources/eia/interpret-query.js';
import { buildLocalCandidatePipeline } from '../lib/sources/eia/candidate-pipeline.js';
import retainedCandidateHandler from '../lib/sources/eia/candidate-search.js';
import {runRouteHandler} from '../lib/next-route-adapter.js';
const searchEia = request => runRouteHandler(retainedCandidateHandler,request);

function fixture(name) {
  return JSON.parse(readFileSync(new URL(`./fixtures/eia/${name}.json`, import.meta.url)));
}
const cases = fixture('independent-challenges').cases;

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
