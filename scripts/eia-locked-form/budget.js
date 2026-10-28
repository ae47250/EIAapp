import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { lockedFormRequest } from '../../lib/sources/eia/locked-form.js';
const root = new URL('../../', import.meta.url);
const keys = JSON.parse(readFileSync(new URL('tests/fixtures/eia/locked-form/answer-key.json', root)));
const keyFile = `${homedir()}/Downloads/openai-api-key.txt`;
const matches = readFileSync(keyFile, 'utf8').match(/sk-[A-Za-z0-9_-]+/g) || [];
if (matches.length !== 1) throw new Error('Working key file unavailable or ambiguous; no replacement created');
const options = { model: 'gpt-6-luna', reasoning: { effort: 'low' }, maxOutputTokens: 16000 };
const rows = [];
for (const k of keys) for (const reask of [false, true]) {
  const body = lockedFormRequest(k.query, options, reask);
  // Count, do not generate. Include the strict schema in the actual request count.
  const { max_output_tokens, ...countBody } = body;
  const response = await fetch('https://api.openai.com/v1/responses/input_tokens', {
    method: 'POST', headers: { Authorization: `Bearer ${matches[0]}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(countBody), signal: AbortSignal.timeout(30000)
  });
  const data = await response.json();
  if (!response.ok || !Number.isInteger(data.input_tokens)) {
    writeFileSync(new URL('evidence/eia-locked-form/token-count-error.json', root), JSON.stringify({ status: response.status, error: data }, null, 2)+'\n');
    throw new Error(`Token counting failed HTTP ${response.status}; see redacted-safe error record. No generation calls made.`);
  }
  rows.push({ id: k.id, reask, inputTokens: data.input_tokens, requestBytes: Buffer.byteLength(JSON.stringify(countBody)) });
}
const inputOneRun = 2 * rows.reduce((n, r) => n + r.inputTokens, 0);
const browserInputs = rows.filter(r => ['F9', 'O6', 'O7'].includes(r.id)).reduce((n, r) => n + r.inputTokens, 0);
// A possible general instruction revision is not written yet. Reserve 512 extra
// input tokens per call; any revision must be counted again before execution.
const revisionExtraTokens = 96 * 512;
const maxGenerationCalls = 198;
const inputTokens = inputOneRun * 2 + browserInputs + revisionExtraTokens;
const outputTokens = maxGenerationCalls * 16000;
// Even if the counting endpoint were charged as input, reserve its entire JSON
// byte size plus 1000 framing tokens per request at the highest input rate.
const countingReserve = rows.reduce((n,r) => n + r.requestBytes + 1000,0) * 0.125 / 1e6;
const maximumUSD = inputTokens * 0.125 / 1e6 + outputTokens * 0.5 / 1e6 + countingReserve;
const result = {
  date: new Date().toISOString(), model: options.model, reasoning: options.reasoning, allowance: 16000, timeoutMs: 90000,
  source: 'https://developers.openai.com/api/docs/models/gpt-6-luna', pricesPerMillion: { input: 0.10, cached: 0.01, cacheWrite: 0.125, output: 0.50 },
  reasonForAllowance: 'Common 16000-token allowance explicitly required by work order; includes reasoning and visible output. Low effort is required and supported. No reduction to fit budget.',
  countEndpoint: '/v1/responses/input_tokens', actualCounts: rows, inputOneRun, browserInputs, revisionExtraTokens,
  maxGenerationCalls, inputTokens, outputTokens, countingReserveUSD: countingReserve, maximumUSD, ceilingUSD: 2, permitted: maximumUSD <= 2,
  components: '48 first attempts + 48 re-asks + 48 possible revision attempts + 48 revision re-asks + 3 browser attempts + 3 browser re-asks. Standard processing. No EIA calls.',
  countingReserveNote: 'Token counting produces no model output. Documentation does not state a count-endpoint charge; a conservative additional input-charge reserve is included rather than assuming zero.'
};
writeFileSync(new URL('evidence/eia-locked-form/budget.json', root), JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({ maximumUSD, ceilingUSD: 2, permitted: result.permitted, minInput:Math.min(...rows.map(r=>r.inputTokens)),maxInput:Math.max(...rows.map(r=>r.inputTokens)) }));
if (!result.permitted) process.exitCode = 2;
