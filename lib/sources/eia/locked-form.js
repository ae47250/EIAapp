import { readFileSync } from 'node:fs';
import { buildLockedFormSchema, checkLockedFormShape, geographyCode, lockedFormVocabulary } from './locked-form-schema.js';
import { resolveApprovedGeography } from './intent-routing.js';
import { addClarificationState, cleanQueryMechanically, OPENAI_TIMEOUT_MS } from './interpret-query.js';

const instructions = readFileSync(new URL('./locked-form-instructions.txt', import.meta.url), 'utf8');
export const REASK_INSTRUCTION = 'The previous response failed local form checks. Return a complete form satisfying the schema and quoted-word checks.';
export const OUTAGE_REASONS = ['openai_not_configured', 'openai_request_failed', 'openai_http_429', 'openai_http_5xx'];

export function checkLockedForm(form, query) {
  const shape = checkLockedFormShape(form);
  if (!shape.valid) return shape;
  const errors = [];
  const clean = value => cleanQueryMechanically(value).toLowerCase();
  const source = clean(query);
  const quotes = [...form.geographies, ...form.excluded_geographies, ...form.topics, ...form.excluded_topics, form.sector, form.frequency]
    .map(item => item.quoted_words).filter(value => value !== null).concat(form.unsupported_words);
  if (quotes.some(quote => !clean(quote) || !source.includes(clean(quote)))) errors.push('quote_not_in_query');
  const excluded = new Set(form.excluded_geographies.map(item => item.geography));
  if (form.geographies.some(item => excluded.has(item.geography))) errors.push('geography_included_and_excluded');
  const { needed, about, options } = form.clarification;
  if (needed || about !== null || options.length) {
    const vocabulary = lockedFormVocabulary();
    const allowed = about === 'geography' ? vocabulary.geography
      : about === 'other' ? Object.values(vocabulary).flat() : vocabulary[about] || [];
    if (['product', 'activity', 'frequency'].includes(about) && options.length === 0) errors.push('clarification_options_required');
    if (options.some(option => !allowed.includes(option.value))) errors.push('invalid_clarification_option');
  }
  if (form.geographies.length === 0 && !(needed && about === 'geography')) errors.push('geography_required');
  if (form.unsupported_words.length && !needed) errors.push('unsupported_words_require_clarification');
  return { valid: errors.length === 0, errors };
}

export function blockedLockedIntent(query, reason, log = defaultLog) {
  log({ event: 'locked_form_blocked', reason });
  const message = 'Please clarify your request or try again. AI interpretation could not be validated; no series will be selected.';
  return {
    originalQuery: String(query), cleanedQuery: cleanQueryMechanically(query), normalizedQuery: cleanQueryMechanically(query),
    interpreter: 'openai_locked_form', interpretationFailure: reason, country: null, countryCode: null,
    needsClarification: true, blockingClarification: true, clarificationMessage: message,
    structuredIntent: { needsClarification: true, blockingClarification: true, clarificationMessage: message }
  };
}

export function convertLockedForm(form, query, dependencies = {}) {
  const check = checkLockedForm(form, query);
  if (!check.valid) return blockedLockedIntent(query, `failed_check:${check.errors.join(',')}`, dependencies.log);
  const resolve = dependencies.resolveGeography || resolveApprovedGeography;
  const clarify = dependencies.addClarificationState || addClarificationState;
  const excludedGeographies = form.excluded_geographies.map(item => resolve(geographyCode(item.geography)));
  const excludedCodes = new Set(excludedGeographies.map(g => g.code));
  const geographies = form.geographies.map(item => resolve(geographyCode(item.geography))).filter(g => !excludedCodes.has(g.code));
  const topic = form.topics[0] || { product: null, activity: null };
  const field = value => ({ normalizedValue: value, validation: value === null ? 'missing' : 'approved', fallbackUsed: false });
  const fields = {
    country: field(geographies[0]?.code || null), product: field(topic.product), activity: field(topic.activity),
    sector: field(form.sector.value), frequency: { ...field(form.frequency.value), explicit: form.frequency.explicit }
  };
  if (form.clarification.needed && form.clarification.about === 'product') fields.product = {
    validation: 'ambiguous', normalizedValue: null, breadth: 'ambiguous', alternatives: form.clarification.options.map(option => option.value)
  };
  const exclusions = form.excluded_topics.flatMap(item => ['product', 'activity', 'sector']
    .filter(type => item[type] !== null).map(type => ({ type, value: item[type], source: 'locked_form' })))
    .map((item, order) => ({ ...item, order }));
  const cleanedQuery = cleanQueryMechanically(query);
  const intent = clarify({
    originalQuery: String(query), cleanedQuery, normalizedQuery: cleanedQuery, correctedQuery: cleanedQuery, correctedQuerySource: 'unchanged',
    interpreter: 'openai_locked_form', interpretationMethod: 'enforced_form', lockedForm: form,
    country: geographies[0] || null, countryCode: geographies[0]?.code || null, validatedGeographies: geographies, excludedGeographies,
    product: fields.product.normalizedValue, activity: topic.activity, sector: form.sector.value,
    validatedConceptPairs: form.topics.map((pair, order) => ({ product: pair.product, activity: pair.activity, order, source: 'validated_interpreter' })),
    exclusions, frequency: form.frequency.value, requestedFrequency: form.frequency.explicit ? form.frequency.value : null,
    frequencyExplicit: form.frequency.explicit, fields, unknownQualifiers: form.unsupported_words.map(value => ({ value, source: 'locked_form' })),
    fallback: { used: false, method: null, reasons: [] }
  });
  if (form.clarification.needed) {
    intent.needsClarification = intent.blockingClarification = true;
    intent.clarificationMessage ||= `Please clarify the ${form.clarification.about || 'request'}. No series will be selected until it is resolved.`;
    intent.structuredIntent = { ...intent.structuredIntent, needsClarification: true, blockingClarification: true, clarificationMessage: intent.clarificationMessage };
  }
  return intent;
}

function outage(query, reason, rules) {
  const intent = rules(query, reason);
  return { ...intent, outageReason: reason, interpretationNotice: 'AI interpretation unavailable' };
}

export function recheckSubmittedForm(raw, query, rules) {
  // The same 12000-character boundary applies to direct callers as to candidate-search.
  if (!raw || typeof raw !== 'object' || JSON.stringify(raw).length > 12000) return blockedLockedIntent(query, 'invalid_submitted_payload');
  if (raw.interpreter === 'rules' && OUTAGE_REASONS.includes(raw.outageReason)) return outage(query, raw.outageReason, rules);
  if (raw.interpreter !== 'openai_locked_form' || !raw.lockedForm) return blockedLockedIntent(query, 'missing_or_legacy_form');
  return convertLockedForm(raw.lockedForm, query);
}

export function lockedFormRequest(query, options = {}, reask = false) {
  return {
    model: options.model || process.env.OPENAI_MODEL || 'gpt-6-luna',
    input: `${instructions}\nRaw query: ${JSON.stringify(String(query))}${reask ? `\n${REASK_INSTRUCTION}` : ''}`,
    text: { format: { type: 'json_schema', name: 'eia_search', strict: true, schema: buildLockedFormSchema() } },
    reasoning: options.reasoning || { effort: 'low' },
    ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {})
  };
}

function defaultLog(event) { console.warn('[EIA interpretation]', JSON.stringify(event)); }

export async function interpretLockedForm(query, dependencies = {}) {
  const { rules, fetch: request = globalThis.fetch, log = defaultLog, onAttempt = () => {}, ...options } = dependencies;
  const key = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) return outage(query, 'openai_not_configured', rules);
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = lockedFormRequest(query, options, attempt > 0);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? OPENAI_TIMEOUT_MS);
    let response, data;
    const started = Date.now();
    try {
      response = await request('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body), signal: controller.signal
      });
      try { data = await response.json(); } catch (error) {
        if (controller.signal.aborted) throw error;
        data = null;
      }
    } catch (error) {
      const reason = controller.signal.aborted || error?.name === 'AbortError' ? 'openai_timeout' : 'openai_request_failed';
      onAttempt({ attempt, body, reason, elapsedMs: Date.now() - started });
      return reason === 'openai_request_failed' ? outage(query, reason, rules) : blockedLockedIntent(query, reason, log);
    } finally { clearTimeout(timeout); }
    const record = { attempt, body, response: data, status: response.status, elapsedMs: Date.now() - started };
    if (!response.ok) {
      const reason = response.status === 429 ? 'openai_http_429' : response.status >= 500 ? 'openai_http_5xx' : `openai_http_${response.status}`;
      onAttempt({ ...record, reason });
      return OUTAGE_REASONS.includes(reason) ? outage(query, reason, rules) : blockedLockedIntent(query, reason, log);
    }
    const content = (data?.output || []).flatMap(item => item.content || []);
    const failure = data?.status === 'incomplete' ? 'openai_cutoff' : content.some(part => part.type === 'refusal') ? 'openai_refusal' : null;
    if (failure) { onAttempt({ ...record, reason: failure }); return blockedLockedIntent(query, failure, log); }
    let form;
    try { form = JSON.parse(data?.output_text ?? content.filter(part => part.type === 'output_text').map(part => part.text).join('')); } catch { form = null; }
    const checks = checkLockedForm(form, query);
    onAttempt({ ...record, form, checks });
    if (checks.valid) return convertLockedForm(form, query, dependencies);
    log({ event: attempt === 0 ? 'locked_form_reask' : 'locked_form_failed_check', errors: checks.errors });
    if (attempt === 1) return blockedLockedIntent(query, 'failed_check', log);
  }
}
