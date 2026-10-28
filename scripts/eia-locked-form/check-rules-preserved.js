import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as routing from '../../lib/sources/eia/intent-routing.js';
import * as evidence from '../../lib/sources/eia/request-evidence.js';
import { interpretQueryWithRules } from '../../lib/sources/eia/interpret-query.js';
const moduleUrl = new URL('../../lib/sources/eia/interpret-query.js', import.meta.url);
const source = execFileSync('git', ['show', 'b7b119333dd111b9b2deea12acf1df68a1c2674d:lib/sources/eia/interpret-query.js'], { encoding: 'utf8' });
const code = source.replace(/^import .*;\n/gm, '').replace(/export default /g, '').replace(/export /g, '').replaceAll('import.meta.url', JSON.stringify(moduleUrl.href));
const oldRules = vm.runInNewContext(code + '\ninterpretQueryWithRules', { ...routing, ...evidence, readFileSync, URL, process: { env: {} }, requireAuthentication: () => true });
const queries = new Set();
function collect(value) {
 if (!value || typeof value !== 'object') return;
 for (const [k,v] of Object.entries(value)) {
  if (['q','query','raw'].includes(k) && typeof v === 'string' && v.length <= 240 && v.trim()) queries.add(v);
  else if (v && typeof v === 'object') collect(v);
 }
}
function walk(dir) { for (const entry of readdirSync(dir,{withFileTypes:true})) { const path = new URL(entry.name + (entry.isDirectory()?'/':''),dir); if (entry.isDirectory()) walk(path); else if(entry.name.endsWith('.json')) collect(JSON.parse(readFileSync(path))); } }
walk(new URL('../../tests/fixtures/eia/', import.meta.url));
const failures = [];
for (const q of queries) {
 try { const before = JSON.stringify(oldRules(q)), after = JSON.stringify(interpretQueryWithRules(q)); if(before !== after) failures.push({query:q,before:JSON.parse(before),after:JSON.parse(after)}); }
 catch(e) { failures.push({query:q,error:e.message}); }
}
const result = { base: 'b7b119333dd111b9b2deea12acf1df68a1c2674d', queries: queries.size, failures, purpose: 'Differential preservation check, not a meaning oracle; all fixture queries collected without changing expectations.' };
writeFileSync(new URL('../../evidence/eia-locked-form/rules-preservation.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({queries:queries.size,failures:failures.length})); if(failures.length)process.exitCode=1;
