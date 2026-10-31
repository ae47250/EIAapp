import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lookupCatalog} from '../lib/sources/eia/lookup-list.js';

// Referential integrity: every recorded key must exist in the runner's offline
// catalog (lookup-list.json, lookup-coverage.json.gz, lookup-us-coverage.json.gz).
// Source nulls remain unscored. This preflight does not add a scorer fail kind.
test('EIA suite data expectations have nonempty, existing lookup row keys', () => {
  const keys = new Set(lookupCatalog.rows.map(row => row.key));
  const invalidKeys = cases => cases.flatMap(c => {
    const rows = c.expected.lookupRowKeys;
    if (rows === null) return [];
    if (!Array.isArray(rows) || rows.length === 0) return [`${c.id}: empty lookup-row-key list`];
    return rows.flatMap(row => {
      if (!Array.isArray(row.keys) || row.keys.length === 0) return [`${c.id}/${row.place}: empty lookup-row-key list`];
      return row.keys.filter(key => !keys.has(key)).map(key => `${c.id}/${row.place}: unknown lookup row key ${key}`);
    });
  });
  const fixture = rows => [{id: 'validation-probe', expected: {data: true, lookupRowKeys: rows}}];
  assert.deepEqual(invalidKeys(fixture(null)), []);
  assert.equal(invalidKeys(fixture([])).length, 1);
  assert.equal(invalidKeys(fixture([{place: 'USA', keys: []}])).length, 1);
  assert.equal(invalidKeys(fixture([{place: 'USA', keys: ['nonexistent-test-key']}])).length, 1);
  assert.deepEqual(invalidKeys(fixture([{place: 'USA', keys: [lookupCatalog.rows[0].key]}])), []);
  const suite = JSON.parse(readFileSync(new URL('./golden/eia-suite.json', import.meta.url)));
  assert.deepEqual(invalidKeys(suite.cases), []);
});
