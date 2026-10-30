import {documentedNationalDefaults,isDocumentedNationalDefault} from './lookup-list.js';
import { readFileSync } from 'node:fs';
import { buildLockedFormSchemaV2, checkLockedFormShapeV2, upgradeV1Form } from './locked-form-schema-v2.js';
import { checkLockedFormShape, geographyCode, lockedFormVocabulary } from './locked-form-schema.js';
import { REASK_INSTRUCTION, OUTAGE_REASONS } from './locked-form.js';
import { resolveApprovedGeography } from './intent-routing.js';
import { addClarificationState, cleanQueryMechanically, OPENAI_TIMEOUT_MS } from './interpret-query.js';
import { clarificationFor, understoodLine } from './lookup-context.js';
const instructions = readFileSync(new URL('./locked-form-instructions-v2.txt', import.meta.url), 'utf8');
const clean = value => cleanQueryMechanically(value).toLowerCase();
const quoted = (value, query) => typeof value === 'string' && Boolean(clean(value)) && clean(query).includes(clean(value));
const vocabulary = lockedFormVocabulary();
const allowedOptions = about => about === 'other' ? Object.values(vocabulary).flat() : vocabulary[about] || [];
function yearErrors(years, query, slots = {}) {
  const errors = [];
  if (years.start === 'latest') errors.push('invalid_year_start');
  for (const key of ['start','end']) {
    const value=years[key];
    if (value !== null && value !== 'latest' && (!Number.isInteger(value) || value < 1900 || value > new Date().getFullYear())) errors.push('year_out_of_bounds');
    const evidence=slots[key];
    const phrase=evidence?.value===value && quoted(evidence.quote,evidence.source)?evidence.quote:years.quoted_words || '';
    const relative=value===new Date().getFullYear() && /\b(?:this|current) year\b/i.test(phrase);
    if (typeof value === 'number' && !relative && !new RegExp(`\\b${value}\\b`).test(phrase)) errors.push('year_not_in_quote');
  }
  if (years.start === null && years.end !== null || years.start !== null && years.end === null) errors.push('incomplete_year_range');
  if (typeof years.end === 'number' && years.start > years.end) errors.push('inverted_year_range');
  if (years.start !== null && !quoted(years.quoted_words, query) || years.start === null && years.quoted_words !== null) errors.push('invalid_year_quote');
  return errors;
}
function vagueGeography(item) {
  // A plural scope word alone is not evidence for any named geography.
  if (!/\bcountries\b|\bworldwide\b|\bglobally\b/i.test(item.quoted_words)) return false;
  const geo=resolveApprovedGeography(geographyCode(item.geography));
  return ![geo?.name,...(geo?.aliases || [])].filter(Boolean).some(name => clean(item.quoted_words).includes(clean(name)));
}
export function checkLockedFormV2(form, query, quoteSources = {}) {
  const shape=checkLockedFormShapeV2(form);
  if (!shape.valid) return shape;
  const errors=[];
  const quotedItems=['geographies','excluded_geographies','topics','excluded_topics'].flatMap(key=>form[key].map((item,index)=>({item,source:quoteSources[key]?.[index] ?? query,defaulted:key==='geographies' && form.geographies.length===1 && item.is_default && geographyCode(item.geography)==='USA' && item.quoted_words==='' && isDocumentedNationalDefault(form)})).filter(x=>!x.defaulted));
  quotedItems.push(...['sector','frequency'].map(key=>({item:form[key],source:quoteSources[key] ?? query})));
  if (quotedItems.some(({item,source}) => item.quoted_words !== null && !quoted(item.quoted_words,source)) || form.unsupported_words.some((word,index)=>!quoted(word,quoteSources.unsupported_words?.[index] ?? query))) errors.push('quote_not_in_query');
  if (form.geographies.some(g=>vagueGeography(g))) errors.push('vague_geography');
  const excluded=new Set(form.excluded_geographies.map(g=>g.geography));
  if (form.geographies.some(g=>excluded.has(g.geography))) errors.push('geography_included_and_excluded');
  const {needed,about,options}=form.clarification;
  if (needed !== (about !== null) || !needed && options.length) errors.push('inconsistent_clarification');
  if (options.some(o=>!allowedOptions(about).includes(o.value))) errors.push('invalid_clarification_option');
  if (!form.topics.length || form.topics.some(t=>!t.product)) {
    if (!(needed && about==='product')) errors.push('product_required');
  } else if (form.topics.some(t=>!t.activity) && !(needed && ['product','activity'].includes(about))) errors.push('activity_required');
  if (!form.geographies.length && !(needed && ['product','activity','geography'].includes(about))) errors.push('geography_required');
  if (form.unsupported_words.length && !needed) errors.push('unsupported_words_require_clarification');
  if (form.frequency.explicit && form.frequency.quoted_words===null || !form.frequency.explicit && (form.frequency.value!=='annual' || form.frequency.quoted_words!==null)) errors.push('invalid_frequency_evidence');
  if (form.sector.value!==null && form.sector.quoted_words===null || form.sector.value===null && form.sector.quoted_words!==null) errors.push('invalid_sector_evidence');
  errors.push(...yearErrors(form.years,quoteSources.years ?? query,quoteSources.yearSlots));
  return {valid:!errors.length,errors:[...new Set(errors)]};
}
export function repairLockedFormV2(raw, query) {
  const input=raw && typeof raw==='object' ? raw : {};
  const list=key=>Array.isArray(input[key]) ? input[key] : [];
  const geos=key=>list(key).filter(g=>g && vocabulary.geography.includes(g.geography) && typeof g.is_default==='boolean' && quoted(g.quoted_words,query) && !vagueGeography(g))
    .map(g=>({geography:g.geography,quoted_words:g.quoted_words,is_default:g.is_default}));
  const excluded_geographies=geos('excluded_geographies');
  const geographies=geos('geographies').filter(g=>!excluded_geographies.some(x=>x.geography===g.geography));
  const topic=(t,exclude=false)=>({product:vocabulary.product.includes(t.product)?t.product:null,activity:vocabulary.activity.includes(t.activity)?t.activity:null,
    ...(exclude?{sector:vocabulary.sector.includes(t.sector)?t.sector:null}:{}),quoted_words:t.quoted_words});
  const topics=list('topics').filter(t=>t && quoted(t.quoted_words,query)).map(t=>topic(t));
  const excluded_topics=list('excluded_topics').filter(t=>t && quoted(t.quoted_words,query)).map(t=>topic(t,true));
  let sector={value:null,quoted_words:null};
  if (vocabulary.sector.includes(input.sector?.value) && quoted(input.sector.quoted_words,query)) sector={value:input.sector.value,quoted_words:input.sector.quoted_words};
  let frequency={value:'annual',explicit:false,quoted_words:null};
  if (input.frequency?.explicit===true && vocabulary.frequency.includes(input.frequency.value) && quoted(input.frequency.quoted_words,query)) frequency={value:input.frequency.value,explicit:true,quoted_words:input.frequency.quoted_words};
  let years={start:null,end:null,quoted_words:null};
  if (input.years && ['start','end','quoted_words'].every(k=>Object.hasOwn(input.years,k)) && !yearErrors(input.years,query).length) years={start:input.years.start,end:input.years.end,quoted_words:input.years.quoted_words};
  const unsupported_words=list('unsupported_words').filter(w=>quoted(w,query));
  if (input.years && yearErrors(input.years,query).length && quoted(input.years.quoted_words,query)) unsupported_words.push(input.years.quoted_words);
  let about=!topics.length || topics.some(t=>!t.product) ? 'product' : topics.some(t=>!t.activity) ? 'activity' : !geographies.length ? 'geography' : input.frequency?.explicit && frequency.explicit===false ? 'frequency' : unsupported_words.length ? 'other' : input.clarification?.needed && ['product','activity','geography','frequency','other'].includes(input.clarification.about) ? input.clarification.about : 'other';
  const options=(Array.isArray(input.clarification?.options)?input.clarification.options:[]).filter(o=>o && typeof o.label==='string' && o.label.trim() && allowedOptions(about).includes(o.value)).map(o=>({label:o.label,value:o.value}));
  return {geographies,excluded_geographies,topics,excluded_topics,sector,frequency,years,unsupported_words,clarification:{needed:true,about,options}};
}
function defaultLog(event) { console.warn('[EIA interpretation]', JSON.stringify(event)); }
function logCheck(dependencies,event,errors,model) {
  // Never log the query, quotes, model output, or option labels.
  (dependencies.log || defaultLog)({event,checks:errors.map(error=>error.startsWith('form')?'schema_'+error.split(':').at(-1):error),model:model || dependencies.model || process.env.OPENAI_MODEL || 'gpt-6-luna',time:new Date().toISOString()});
}
export function fallbackIntentV2(raw, query, errors, dependencies={}) {
  const form=repairLockedFormV2(raw,query);
  const check=checkLockedFormV2(form,query);
  if (!check.valid) throw new Error('The repaired interpretation did not satisfy the v2 contract.');
  logCheck(dependencies,'locked_form_fallback_question',errors);
  return {...convertLockedFormV2(form,query,dependencies),repaired:true,failedChecks:errors};
}

export function convertLockedFormV2(form, query, dependencies = {}) {
  const check = checkLockedFormV2(form, query, dependencies.quoteSources);
  if (!check.valid) return fallbackIntentV2(form, query, check.errors, dependencies);
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
    interpreter: 'openai_locked_form', formVersion:2, years:form.years, interpretationMethod: 'enforced_form', lockedForm: form,
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
  intent.needsClarification = intent.blockingClarification = form.clarification.needed;
  intent.structuredIntent = {...intent.structuredIntent, needsClarification:form.clarification.needed, blockingClarification:form.clarification.needed};
  intent.understood = understoodLine(form);
  if (form.clarification.needed) Object.assign(intent, clarificationFor(form,null,{query}));
  return intent;
}

function outage(query, reason, rules) {
  const intent = rules(query, reason);
  return { ...intent, outageReason: reason, interpretationNotice: 'AI interpretation unavailable' };
}

export function recheckSubmittedFormV2(raw, query, rules) {
  if (!raw || typeof raw !== 'object' || JSON.stringify(raw).length>12000) return fallbackIntentV2(null,query,['invalid_submitted_payload']);
  if (raw.interpreter==='rules' && OUTAGE_REASONS.includes(raw.outageReason)) return outage(query,raw.outageReason,rules);
  if (raw.interpreter!=='openai_locked_form' || !raw.lockedForm) return fallbackIntentV2(null,query,['missing_or_legacy_form']);
  const form=checkLockedFormShape(raw.lockedForm).valid ? upgradeV1Form(raw.lockedForm) : raw.lockedForm;
  return convertLockedFormV2(form,query);
}

export function lockedFormRequestV2(query, options = {}, reask = false) {
  return {
    model: options.model || process.env.OPENAI_MODEL || 'gpt-6-luna',
    input: `${instructions}\nCatalogue combinations with only US national scope (product, activity, qualifier; no foreign country/World equivalent): ${JSON.stringify(documentedNationalDefaults())}\nCurrent year: ${new Date().getFullYear()}\nRaw query: ${JSON.stringify(String(query))}${reask ? `\n${REASK_INSTRUCTION}` : ''}`,
    text: { format: { type: 'json_schema', name: 'eia_search_v2', strict: true, schema: buildLockedFormSchemaV2() } },
    reasoning: options.reasoning || { effort: 'low' },
    ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {})
  };
}


export async function interpretLockedFormV2(query, dependencies = {}) {
  const { rules, fetch: request = globalThis.fetch, log = defaultLog, onAttempt = () => {}, ...options } = dependencies;
  const key = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) return outage(query, 'openai_not_configured', rules);
  for (let attempt = 0; attempt < 2; attempt++) {
    const body = lockedFormRequestV2(query, options, attempt > 0);
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
      return reason === 'openai_request_failed' ? outage(query, reason, rules) : fallbackIntentV2(null, query, [reason], dependencies);
    } finally { clearTimeout(timeout); }
    const record = { attempt, body, response: data, status: response.status, elapsedMs: Date.now() - started };
    if (!response.ok) {
      const reason = response.status === 429 ? 'openai_http_429' : response.status >= 500 ? 'openai_http_5xx' : `openai_http_${response.status}`;
      onAttempt({ ...record, reason });
      return OUTAGE_REASONS.includes(reason) ? outage(query, reason, rules) : fallbackIntentV2(null, query, [reason], dependencies);
    }
    const content = (data?.output || []).flatMap(item => item.content || []);
    const failure = data?.status === 'incomplete' ? 'openai_cutoff' : content.some(part => part.type === 'refusal') ? 'openai_refusal' : null;
    if (failure) { onAttempt({ ...record, reason: failure }); return fallbackIntentV2(null, query, [failure], dependencies); }
    let form;
    try { form = JSON.parse(data?.output_text ?? content.filter(part => part.type === 'output_text').map(part => part.text).join('')); } catch { form = null; }
    const checks = checkLockedFormV2(form, query);
    onAttempt({ ...record, form, checks });
    if (checks.errors.length===1 && checks.errors[0]==='invalid_clarification_option') return fallbackIntentV2(form,query,checks.errors,dependencies);
    if (checks.valid) return convertLockedFormV2(form, query, dependencies);
    logCheck(dependencies, attempt===0 ? 'locked_form_reask' : 'locked_form_failed_check', checks.errors, body.model);
    if (attempt === 1) return fallbackIntentV2(form, query, checks.errors, dependencies);
  }
}
