import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { test } from 'node:test';
import { normalizeBulkSeries } from '../scripts/eia-metadata/normalize.js';
import { interpretQueryWithRules } from '../lib/sources/eia/interpret-query.js';
import { retrieveLocalCandidates } from '../lib/sources/eia/local-retrieval.js';

const geographies = JSON.parse(readFileSync(new URL('../data/eia/routing-metadata.json', import.meta.url))).geographies;
const records = gunzipSync(readFileSync(new URL('../data/eia/builds/phase1b/natural-gas.jsonl.gz', import.meta.url)))
  .toString().trim().split('\n').map(JSON.parse);
const stateRecords = records.filter(r => /^NG\.[^._]+_S([A-Z]{2})_[^._]+\.[AQMWD]$/.test(r.series_id));
const stateFor = r => geographies.find(g => g.type === 'state' && g.code === r.geography.code);
const raw = r => ({ series_id: r.series_id, name: r.title, description: r.description,
  geography: 'USA-' + r.geography.code, f: r.series_id.split('.').at(-1), units: r.unit,
  start: r.date_start, end: r.date_end });

test('state-series metadata regeneration uses the verified code, not an energy qualifier as part of the place name', () => {
  assert.equal(stateRecords.length, 2655, 'Frozen source inventory');
  let formerlyWrong = 0;
  let verified = 0;
  for (const record of stateRecords) {
    const state = stateFor(record);
    assert.ok(state);
    assert.equal(/^NG\.[^.]+_S([A-Z]{2})_/.exec(record.series_id)[1], state.code);
    const titleVerified = record.title.toLowerCase().startsWith(state.name.toLowerCase() + ' ');
    if (titleVerified) verified++;
    const normalized = normalizeBulkSeries(raw(record), { routeFamily: 'domestic' });
    assert.equal(normalized.geography.name, titleVerified ? state.name : record.geography.name);
    for (const key of ['series_id', 'unit', 'date_start', 'date_end', 'title']) assert.equal(normalized[key], record[key]);
    if (record.geography.name !== state.name) formerlyWrong++;
  }
  assert.equal(verified, 2647, 'Eight inconsistent title prefixes are preserved, not guessed');
  assert.equal(formerlyWrong, 138, 'All affected cached labels remain identifiable in the unchanged source');
});

test('display repair applies across affected states and preserves source identifiers, units, coverage and provenance', async () => {
  const examples = [...new Map(stateRecords.filter(r => r.geography.name !== stateFor(r).name && r.frequency === 'monthly' && /Natural Gas Production,/.test(r.title)).map(r => [r.geography.code, r])).values()];
  assert.equal(examples.length, 33);
  for (const record of examples) {
    const state = stateFor(record);
    const intent = interpretQueryWithRules(`${record.frequency} ${state.name} natural gas production`);
    assert.equal(intent.needsClarification, false);
    const result = await retrieveLocalCandidates(intent, { records: [record], enforceVersion: false });
    const candidates = result.retrievals.flatMap(r => [...r.primaryCandidates, ...r.fallbackCandidates]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0].geography.name, state.name);
    for (const key of ['series_id', 'unit', 'date_start', 'date_end', 'metadata_hash', 'title']) assert.equal(candidates[0][key], record[key]);
    assert.deepEqual(candidates[0].selector, record.selector);
    assert.notEqual(record.geography.name, state.name, 'Source record was not mutated');
  }
});

test('unverified regional and mismatched series identifiers do not receive a state-wide label', () => {
  const sample = stateRecords.find(r => r.geography.name !== stateFor(r).name && r.frequency === 'monthly' && /Natural Gas Production,/.test(r.title));
  const region = { ...raw(sample), series_id: sample.series_id.replace('_S', '_R') };
  assert.equal(normalizeBulkSeries(region, { routeFamily: 'domestic' }).geography.name, sample.geography.name);
  const longerId = { ...raw(sample), series_id: sample.series_id.replace('_S', '_EXTRA_S') };
  assert.equal(normalizeBulkSeries(longerId, { routeFamily: 'domestic' }).geography.name, sample.geography.name);
  const mismatch = { ...raw(sample), geography: 'USA-ZZ' };
  assert.equal(normalizeBulkSeries(mismatch, { routeFamily: 'domestic' }).geography.name, sample.geography.name);
});
