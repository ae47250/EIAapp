// Error classifications adapted from Casey Hand @cyanheads, Copyright 2026.
// SPDX-License-Identifier: Apache-2.0
// Source: eia-energy-mcp-server @ 2dcee105e54b44c1177e01d59a8e62512f8f5f26.
// Local implementation adds bounded paging, completeness checks and request pacing.
import { periodBoundProblem } from './eia-period-bounds.js';

export const EIA_MESSAGES = Object.freeze({
  busy: 'EIA is busy and has limited requests. Please try again shortly.',
  slow: 'EIA is taking too long to respond. Please try again.',
  unavailable: 'EIA is unavailable or returned an invalid response. Please try again later.',
  request_problem: 'EIA could not accept this data request. Please check the requested measure, frequency and dates.'
});
const frequencies = ['annual','quarterly','monthly','weekly','daily','hourly','local-hourly'];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
let nextRequestAt = 0;
export function eiaError(reason, kind = 'unavailable') {
  return Object.assign(new Error(EIA_MESSAGES[kind]), { reason, kind, retryable: kind !== 'request_problem' });
}
function invalidReason(text) {
  if (/invalid data\b/i.test(text)) return 'invalid_column';
  if (/invalid frequency\b/i.test(text)) return 'invalid_frequency';
  if (/invalid sort\b/i.test(text)) return 'invalid_sort';
  if (/invalid date format\b/i.test(text)) return 'invalid_period';
  return 'invalid_facet';
}
async function pace(options) {
  const interval = options.paceMs ?? 500;
  if (interval <= 0) return;
  const now = Date.now(), slot = Math.max(now, nextRequestAt);
  nextRequestAt = slot + interval;
  await (options.sleep || sleep)(slot - now);
}
async function readEndpoint(route, params, options) {
  if (typeof route !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(route)) throw eiaError('invalid_route', 'request_problem');
  const apiKey = options.apiKey ?? process.env.EIA_API_KEY;
  if (!apiKey) throw eiaError('missing_api_key', 'request_problem');
  const url = new URL(`https://api.eia.gov/v2/${route}/`);
  url.searchParams.set('api_key', apiKey);
  for (const [key, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : [value]) url.searchParams.append(key, String(item));
  }
  const request = options.fetch || globalThis.fetch;
  for (let attempt = 0; attempt < 2; attempt++) {
    await pace(options);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
    try {
      let response, text;
      try {
        response = await request(url, { signal: controller.signal });
        text = await response.text();
      } catch {
        throw eiaError(controller.signal.aborted ? 'upstream_timeout' : 'upstream_unreachable', controller.signal.aborted ? 'slow' : 'unavailable');
      }
      if (response.status === 414) throw eiaError('uri_too_long', 'request_problem');
      if (response.status === 429 || text.includes('OVER_RATE_LIMIT')) throw eiaError('rate_limited', 'busy');
      if (response.status >= 500) throw eiaError('upstream_unavailable');
      let body;
      try { body = JSON.parse(text); } catch { throw eiaError('upstream_invalid_response'); }
      if (!response.ok || body?.error) throw eiaError(invalidReason(String(body?.error || '')), 'request_problem');
      if (!body?.response || typeof body.response !== 'object' || Array.isArray(body.response)) throw eiaError('upstream_invalid_response');
      // Do not return EIA's request echo: it contains the API key.
      return body.response;
    } catch (error) {
      if (!error?.kind) throw eiaError('upstream_invalid_response');
      if (attempt === 1 || !error.retryable || options.retries === 0) throw error;
      await (options.sleep || sleep)(options.retryDelayMs ?? 1000);
    } finally { clearTimeout(timer); }
  }
}
export async function fetchEiaMetadata(route, options = {}) {
  return readEndpoint(route, {}, options);
}
function validTotal(value) {
  return (typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value)) && Number.isSafeInteger(Number(value)) && Number(value) >= 0;
}
export async function fetchEiaData(selector, options = {}) {
  const { route, dataColumn, facets = {}, frequency, start, end } = selector;
  if (typeof route !== 'string' || !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(route)) throw eiaError('invalid_route', 'request_problem');
  if (!frequencies.includes(frequency)) throw eiaError('invalid_frequency', 'request_problem');
  if (!/^[a-zA-Z0-9_-]+$/.test(dataColumn || '')) throw eiaError('invalid_column', 'request_problem');
  const problem = periodBoundProblem(selector);
  if (problem) throw eiaError(problem, 'request_problem');
  const pageSize = Math.max(1, Math.min(5000, Math.trunc(options.pageSize || 5000)));
  const maxPages = Math.max(1, Math.min(100, Math.trunc(options.maxPages || 20)));
  const params = { frequency, 'data[]': dataColumn, 'sort[0][column]': 'period', 'sort[0][direction]': 'asc', length: pageSize };
  if (start !== undefined && start !== null && start !== '') params.start = start;
  if (end !== undefined && end !== null && end !== '') params.end = end;
  for (const [facet, values] of Object.entries(facets)) {
    if (!/^[a-zA-Z0-9_-]+$/.test(facet)) throw eiaError('invalid_facet', 'request_problem');
    const list = Array.isArray(values) ? values : [values];
    if (!list.length || list.some(value => !['string','number'].includes(typeof value))) throw eiaError('invalid_facet', 'request_problem');
    params[`facets[${facet}][]`] = list;
  }
  const rows = [], pageSignatures = new Set();
  let total = null, initialTotal = null, totalChanged = false, repeatedPage = false, pages = 0;
  while (pages < maxPages) {
    const page = await readEndpoint(`${route}/data`, { ...params, offset: rows.length }, options);
    pages++;
    if (!Array.isArray(page.data) || !validTotal(page.total) || page.data.length > pageSize || page.frequency !== frequency)
      throw eiaError('upstream_invalid_response');
    if (page.data.some(row => !row || typeof row !== 'object' || Array.isArray(row) || typeof row.period !== 'string')) throw eiaError('upstream_invalid_response');
    if (initialTotal === null) initialTotal = Number(page.total);
    else if (total !== Number(page.total)) totalChanged = true;
    total = Number(page.total);
    const signature = JSON.stringify(page.data);
    if (page.data.length && pageSignatures.has(signature)) { repeatedPage = true; break; }
    pageSignatures.add(signature);
    rows.push(...page.data);
    if (!page.data.length || rows.length >= total) break;
  }
  return { rows, total, initialTotal, pages, frequency, complete: rows.length === total && !totalChanged && !repeatedPage,
    totalChanged, repeatedPage, limitReached: pages === maxPages && rows.length < total };
}
