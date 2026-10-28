import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { before, after, test } from 'node:test';
import { createHash } from 'node:crypto';
import { interpretQuery, interpretQueryWithRules, normalizeSubmittedIntent, validateAiInterpretation } from '../lib/sources/eia/interpret-query.js';
import { validateRequestEvidence } from '../lib/sources/eia/request-evidence.js';
import { listRequestEvidenceMentions } from '../lib/sources/eia/intent-routing.js';
import { GET as searchGET } from '../app/api/search-eia/route.js';

// Frozen by a fresh reviewer before implementation or development-case access.
// Exposed cases are now regressions. Original meanings and literal payloads are unchanged.
const matrixBytes = fs.readFileSync(new URL('./fixtures/eia/scope-independent-matrix.json', import.meta.url));
const matrix = JSON.parse(matrixBytes);
const frozen = JSON.parse(fs.readFileSync(new URL('./fixtures/eia/scope-independent-payloads.json', import.meta.url)));
assert.equal(createHash('sha256').update(matrixBytes).digest('hex'), frozen.matrixHash);
const source = fs.readFileSync(new URL('../components/search/SearchWorkspace.js', import.meta.url), 'utf8');
const appendIntentParams = vm.runInNewContext(`(${source.slice(source.indexOf('function appendIntentParams('), source.indexOf('\nfunction formatInterpreter('))})`);
const clone = value => JSON.parse(JSON.stringify(value));
const payload = c => clone(frozen.payloads.find(p => p.id === c.id).payload);
const caseById = Object.fromEntries(matrix.meaning_cases.map(c => [c.id, c]));
let activePayload;
let modelCalls = 0;
const savedFetch = globalThis.fetch;
const savedEnv = Object.fromEntries(['LOGIN_REQUIRED', 'OPENAI_API_KEY', 'EIA_API_KEY'].map(k => [k, process.env[k]]));
before(() => {
  process.env.LOGIN_REQUIRED = 'off';
  process.env.OPENAI_API_KEY = 'offline-test';
  delete process.env.EIA_API_KEY;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses', 'No external transport is allowed');
    assert.equal(options.method, 'POST');
    modelCalls++;
    return Response.json({ output_text: JSON.stringify(activePayload) });
  };
});
after(() => {
  globalThis.fetch = savedFetch;
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
  assert.equal(modelCalls, 44, 'Each meaning/integrity case must exercise the injected model exactly once');
});
function summarized(x){if(!x)return null;const s=x.structuredIntent||x;return {interpreter:x.interpreter,products:[...new Set([s.product,...(s.conceptPairs||[]).map(p=>p.product)].filter(Boolean))],activities:[...new Set([s.activity,...(s.conceptPairs||[]).map(p=>p.activity)].filter(Boolean))],pairs:(s.conceptPairs||[]).map(p=>[p.product,p.activity]),geographies:(s.geographies||x.validatedGeographies||[]).map(g=>g.code),sector:s.sector||null,frequency:s.frequency,frequencyExplicit:s.frequencyExplicit,exclusions:s.exclusions,unresolvedScopes:x.requestEvidence?.scopes?.filter(s=>s.status==='unresolved').map(s=>s.text),unknownQualifiers:s.unknownQualifiers,blocked:Boolean(x.needsClarification||s.blockingClarification),scopeValidation:x.scopeValidation,sourceEvidence:x.requestEvidence,clarificationMessage:x.clarificationMessage};}
function findings(c,x){const s=summarized(x);if(!s)return ['missing_intent'];const f=[];for(const [type,expected] of Object.entries(c.requested)){const actual=type==='sectors'?[s.sector].filter(Boolean):s[type];for(const value of expected)if(!actual?.includes(value))f.push(`lost_${type}:${value}`);if(type==='geographies'&&expected.length>1&&actual?.filter(v=>expected.includes(v)).join('|')!==expected.join('|'))f.push('country_order_changed');}if(c.pairs&&JSON.stringify(s.pairs)!==JSON.stringify(c.pairs))f.push('requested_pairs_changed');if(c.frequency.value!==null&&(s.frequency!==c.frequency.value||s.frequencyExplicit!==c.frequency.explicit))f.push('frequency_changed');for(const [type,values] of Object.entries(c.excluded||{})){if(type==='pairs'){if(!s.blocked)f.push('unsupported_pair_exclusion_not_blocked');continue;}const actual=type==='sectors'?[s.sector].filter(Boolean):type==='frequencies'?[s.frequency]:s[type];for(const v of values)if(actual?.includes(v))f.push(`excluded_${type}_became_requested:${v}`)}if(c.policy.startsWith('clarification_required')&&!s.blocked)f.push('required_clarification_missing');if(c.id==='M25'&&!s.blocked)f.push('independent_clause_constraints_flattened');return f;}
function inputParams(intent,query){const p=new URLSearchParams({q:query});appendIntentParams(p,intent);return p;}
async function route(p){const response=await searchGET(new Request(`https://example.test/api/search-eia?${p}`));const body=await response.json();return {status:response.status,intent:body.intent,blocked:body.diagnostics?.clarificationBlocked,variables:body.variables?.length||0,definitions:body.comparisonDefinitions?.length||0,error:body.error,userMessage:body.userMessage};}
function mutation(id,p,c){let q=c.query;switch(id){
case'I01':p.requestEvidence.scopes.at(-1).end=q.length+3;break;
case'I02':p.requestEvidence.scopes.at(-1).text='residential';break;
case'I03':p.fields.product.value='uranium';p.fields.country.value='FRA';p.geographies=[{value:'FRA',confidence:.99}];p.conceptPairs=[{product:'uranium',activity:'production',confidence:.99}];break;
case'I04':p.fields.product={value:'residential',rawValue:'residential',confidence:.99};p.fields.frequency={value:'Texas',rawValue:'Texas',confidence:.99,explicit:true};break;
case'I05':p.requestEvidence.scopes.pop();p.exclusions=[];break;
case'I06':p.requestEvidence.scopes=[{start:0,end:q.indexOf(' and natural gas'),text:q.slice(0,q.indexOf(' and natural gas')),status:'requested',target:'data'},{start:q.indexOf(' and natural gas'),end:q.indexOf(' for Mexico'),text:q.slice(q.indexOf(' and natural gas'),q.indexOf(' for Mexico')),status:'context',target:'knowledge'},{start:q.indexOf(' for Mexico'),end:q.length,text:q.slice(q.indexOf(' for Mexico')),status:'requested',target:'data'}];p.conceptPairs=p.conceptPairs.slice(0,1);break;
case'I07':{const scope=p.requestEvidence.scopes.find(x=>x.status==='excluded');p.requestEvidence.scopes.push({...scope,status:'requested'});break;}
case'I08':{const start=q.indexOf('gas');p.requestEvidence.scopes.push({start,end:start+3,text:'gas',status:'requested',target:'data'});break;}
case'I09':p.requestEvidence.scopes[1].status='excluded';p.requestEvidence.scopes[1].target='data';p.requestEvidence.scopes[1].operator={start:999,end:1002,text:'not'};p.requestEvidence.scopes[1].id='dangling';break;
case'I10':p.geographies.reverse();p.conceptPairs.reverse().forEach((pair,i)=>pair.order=i);break;
case'I11':p.exclusions=[{type:'product',value:'natural gas',confidence:.99},{type:'activity',value:'production',confidence:.99}];break;
case'I12':q=q.replace('Texas','Canada');break;
case'I13':delete p.requestEvidence;break;
case'I14':break;
case'I15':p.requestEvidence={version:1,query:q,scopes:[{start:0,end:2,text:q.slice(0,2),status:'context',target:'action'},{start:2,end:q.length,text:q.slice(2),status:'excluded',target:'data',operator:{start:q.indexOf("don't"),end:q.indexOf("don't")+5,text:"don't"}}]};break;
case'I16':p.requestEvidence.scopes[1].status='context';p.requestEvidence.scopes[1].target='knowledge';p.unknownQualifiers=[];break;
}return {p,q};}

function assertBlockedResult(result) {
  assert.equal(result.status, 200);
  assert.equal(result.intent.needsClarification, true);
  assert.equal(result.intent.blockingClarification, true);
  assert.equal(result.variables + result.definitions, 0, 'Unresolved meaning must never select candidates');
}
for (const c of matrix.meaning_cases) test(`independent scope meaning ${c.id}: ${c.query}`, async () => {
  activePayload = payload(c);
  const intent = await interpretQuery(c.query);
  assert.equal(intent.interpreter, 'openai');
  const params = inputParams(intent, c.query);
  const normalized = normalizeSubmittedIntent(JSON.parse(params.get('intentPayload')), c.query);
  const result = await route(params);
  assert.equal(result.status, 200);
  for (const actual of [intent, normalized, result.intent]) {
    assert.deepEqual(findings(c, actual), [], 'Frozen semantic assertions');
    assert.deepEqual(actual.requestEvidence, intent.requestEvidence, 'Evidence survives every boundary');
    assert.equal(actual.blockingClarification, actual.needsClarification);
  }
  assert.ok(params.get('intentPayload').length < 12000);
  if (intent.needsClarification) assertBlockedResult(result);
  const rules = interpretQueryWithRules(c.query);
  if (c.id === 'M17') {
    // Explicit adjudication: existing bare-Georgia policy selects the state. The
    // original reviewer ambiguity and model unresolved proposal remain frozen.
    assert.deepEqual(rules.validatedGeographies.map(g => g.code), ['GA']);
  } else if (findings(c, rules).length) {
    // Approved conservative fallback: unsupported grammar can remain in source
    // scopes instead of normalized fields, but cannot execute incomplete intent.
    assert.equal(rules.needsClarification, true);
    assert.equal(rules.requestEvidence.query, c.query);
    const p = inputParams(rules, c.query);
    assertBlockedResult(await route(p));
  }
});
for (const challenge of matrix.integrity_cases) test(`independent scope integrity ${challenge.id}: ${challenge.expect}`, async () => {
  const c = caseById[challenge.seed];
  const { p, q } = mutation(challenge.id, payload(c), c);
  activePayload = p;
  const initial = await interpretQuery(q);
  const normalized = normalizeSubmittedIntent(JSON.parse(inputParams(initial, q).get('intentPayload')), q);
  const result = await route(new URLSearchParams({ q, intentReady: '1', intentPayload: JSON.stringify({ ...p, interpreter: 'openai' }) }));
  assert.equal(result.status, 200);
  assert.deepEqual(normalized.requestEvidence, initial.requestEvidence);
  const repaired = ['I03', 'I04', 'I10', 'I13', 'I14'];
  if (repaired.includes(challenge.id)) {
    for (const actual of [initial, normalized, result.intent]) assert.deepEqual(findings(c, actual), []);
    assert.equal(initial.needsClarification, false, 'Valid source evidence must survive forged derived arrays or safe legacy rebuilding');
  } else {
    assert.equal(initial.needsClarification, true);
    assert.equal(normalized.needsClarification, true);
    assertBlockedResult(result);
    if (['I11', 'I16'].includes(challenge.id)) assert.deepEqual(findings(c, initial), [], 'Known parts survive pair or unknown-product clarification');
  }
});
const targeted = [
 { id: 'approved-internal-no-1', query: 'Show annual electricity generation in Texas with no direct fuel costs.', blocked: false },
 { id: 'approved-internal-no-2', query: 'Show annual electricity generation in Texas with no direct cost.', blocked: false },
 { id: 'internal-scope-overflow', query: 'Show natural gas production for Canada. ' + 'not coal; '.repeat(19), blocked: true },
 { id: 'rules-independent-requests', query: 'Show coal production for Canada. Also show monthly electricity consumption for Texas.', blocked: true },
 { id: 'scope-only-process-fuel', query: 'Show electricity generation in Texas, not process fuel.', blocked: false },
 { id: 'scope-only-plant', query: 'Show electricity generation in Texas, excluding plant.', blocked: false }
];
for (const c of targeted) test(`independent exposed counterexample ${c.id}`, async () => {
  const intent = interpretQueryWithRules(c.query);
  assert.equal(intent.needsClarification, c.blocked);
  assert.ok(intent.requestEvidence.scopes.length <= 32);
  const result = await route(inputParams(intent, c.query));
  assert.equal(result.status, 200);
  assert.equal(result.intent.needsClarification, c.blocked);
  if (c.blocked) assertBlockedResult(result);
});
for (const variant of [0, 2, 'unknown-status']) test(`unknown evidence contract ${variant} requires clarification`, () => {
  const c = caseById.M04;
  const p = payload(c);
  if (variant === 'unknown-status') p.requestEvidence.scopes[1].status = 'ignored';
  else p.requestEvidence.version = variant;
  const result = validateAiInterpretation(p, c.query);
  assert.equal(result.needsClarification, true);
  assert.equal(normalizeSubmittedIntent(result, c.query).needsClarification, true);
});
test('unknown excluded target and an operator after its data cannot silently authorize omission', () => {
  const unknown = payload(caseById.M26);
  const s = unknown.requestEvidence.scopes[1];
  s.status = 'excluded'; s.target = 'data';
  const start = unknown.requestEvidence.query.indexOf('not');
  s.operator = { start, end: start + 3, text: 'not' };
  const q = 'Show coal production for Canada and petroleum consumption for Mexico, no certainty needed.';
  const split = q.indexOf(' and petroleum');
  const neg = q.indexOf('no certainty');
  const trailing = { ...payload(caseById.M04), requestEvidence: { version: 1, query: q, scopes: [
    { start: 0, end: split, text: q.slice(0, split), status: 'requested', target: 'data' },
    { start: split, end: q.length, text: q.slice(split), status: 'excluded', target: 'data', operator: { start: neg, end: neg + 2, text: 'no' } }
  ] } };
  for (const p of [unknown, trailing]) {
    const query = p.requestEvidence.query;
    const checked = validateRequestEvidence(p.requestEvidence, query, listRequestEvidenceMentions(query));
    assert.equal(checked.valid, false);
    const x = validateAiInterpretation(p, query);
    assert.equal(x.needsClarification, true);
    assert.equal(normalizeSubmittedIntent(x, query).needsClarification, true);
  }
});
