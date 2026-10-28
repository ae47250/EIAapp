// Source spans describe proposed meaning; they never supply metadata codes or series IDs.
// Positions are UTF-16 offsets into the exact original query, including punctuation.
const STATUSES = new Set(['requested', 'excluded', 'unresolved', 'context']);
const TARGETS = new Set(['data', 'action', 'knowledge', 'condition', 'unknown']);
const NEGATIVE = /\b(?:not|no|never|without|except|exclude|excluding)\b|\b[a-z]+n['’]t\b/gi;
const KNOWLEDGE = /\b(?:sure|certain|aware|know|knowing|understand|understanding|idea|certainty|knowledge)\b/i;
const JOINERS = new Set(['a', 'an', 'the', 'and', 'or', 'in', 'for', 'of', 'from', 'to']);
const ACTIONS = new Set(['show', 'include']);
const wordTokens = text => [...text.matchAll(/[\p{L}\p{N}]+/gu)].map(m => ({ start: m.index, end: m.index + m[0].length, text: m[0].toLowerCase() }));
const contains = (outer, inner) => outer.start <= inner.start && outer.end >= inner.end;
const intersects = (a, b) => a.start < b.end && b.start < a.end;
const dataMentions = mentions => mentions.filter(m => m.type !== 'negation');
export function hasNegation(query) { return [...String(query).matchAll(NEGATIVE)].length > 0; }

function operators(query, mentions) {
  return [...query.matchAll(NEGATIVE)].map(m => ({ start: m.index, end: m.index + m[0].length, text: m[0] }))
    .concat(mentions.filter(m => m.type === 'negation').map(m => ({ start: m.start, end: m.end, text: m.text })))
    .sort((a, b) => a.start - b.start)
    .filter((op, i, all) => all.findIndex(x => x.start === op.start && x.end === op.end) === i)
    .filter(op => !mentions.some(m => contains(m, op) && m.end - m.start > op.end - op.start));
}
function boundary(query, start) {
  for (let i = start; i < query.length; i++) {
    if (/[;!?\n]/.test(query[i])) return i;
    if (query[i] === '.' && !(/\d/.test(query[i - 1] || '') && /\d/.test(query[i + 1] || ''))
      && !/(?:^|\W)[a-z]$/i.test(query.slice(0, i))) return i;
  }
  return query.length;
}

// A deliberately bounded grammar: direct negation of metadata terms, optionally
// through a direct request verb. Unknown intervening or trailing language is not
// assumed to be an adverb, a request, or an exclusion.
export function ruleRequestEvidence(query, mentions) {
  query = String(query);
  const decisions = [];
  const ops = operators(query, mentions);
  for (const op of ops) {
    if (decisions.some(s => contains(s, op))) continue;
    let end = boundary(query, op.end);
    const contrast = /\b(?:but|instead|rather)\b/i.exec(query.slice(op.end, end));
    if (contrast) end = op.end + contrast.index;
    const tokens = wordTokens(query.slice(op.end, end)).map(t => ({ ...t, start: t.start + op.end, end: t.end + op.end }));
    let sawData = false;
    for (const token of tokens) {
      if (sawData && ACTIONS.has(token.text)) { end = token.start; break; }
      if (mentions.some(m => contains(m, token))) sawData = true;
    }
    const content = tokens.filter(t => t.end <= end);
    const direct = content.length > 0 && content.every((token, index) =>
      mentions.some(m => contains(m, token)) || JOINERS.has(token.text) || (index === 0 && ACTIONS.has(token.text)));
    const hasData = mentions.some(m => m.start >= op.end && m.end <= end);
    const nested = ops.some(other => other.start > op.start && other.start < end);
    decisions.push({ start: op.start, end, status: direct && hasData && !nested ? 'excluded' : 'unresolved', target: direct ? 'data' : 'unknown', operator: op });
  }
  const scopes = [];
  let cursor = 0;
  for (const decision of decisions) {
    if (decision.start > cursor) scopes.push({ start: cursor, end: decision.start, status: 'requested', target: 'data' });
    scopes.push(decision);
    cursor = decision.end;
  }
  if (cursor < query.length) scopes.push({ start: cursor, end: query.length, status: 'requested', target: 'data' });
  if (scopes.length > 32) {
    const start = scopes[30].start;
    scopes.splice(30, scopes.length - 30, { start, end: query.length, status: 'unresolved', target: 'unknown' });
  }
  return { version: 1, query, scopes: scopes.map(s => ({ ...s, text: query.slice(s.start, s.end) })) };
}

function exactSpan(span, query) {
  return span && Number.isInteger(span.start) && Number.isInteger(span.end)
    && span.start >= 0 && span.end > span.start && span.end <= query.length
    && span.text === query.slice(span.start, span.end);
}

export function validateRequestEvidence(value, query, mentions, { source = 'model' } = {}) {
  query = String(query);
  const errors = [];
  if (value?.invalid === true || value?.version !== 1 || value?.query !== query || !Array.isArray(value?.scopes)
    || value.scopes.length === 0 || value.scopes.length > 32) {
    return { valid: false, errors: ['invalid_evidence_envelope'] };
  }
  const scopes = [];
  let previousEnd = 0;
  for (const raw of value.scopes) {
    if (!exactSpan(raw, query) || !STATUSES.has(raw.status) || !TARGETS.has(raw.target)) {
      errors.push('invalid_source_scope'); continue;
    }
    if (wordTokens(query).some(t => (t.start < raw.start && raw.start < t.end) || (t.start < raw.end && raw.end < t.end))) errors.push('split_source_token');
    if (raw.start < previousEnd) errors.push('overlapping_or_unordered_scopes');
    if (/[\p{L}\p{N}]/u.test(query.slice(previousEnd, raw.start))) errors.push('uncovered_source_text');
    previousEnd = raw.end;
    const scope = { start: raw.start, end: raw.end, text: raw.text, status: raw.status, target: raw.target };
    if (raw.status === 'excluded') {
      const op = raw.operator;
      if (!exactSpan(op, query) || !contains(raw, op)
        || !operators(query, mentions).some(item => item.start === op.start && item.end === op.end)) errors.push('invalid_exclusion_operator');
      else scope.operator = { start: op.start, end: op.end, text: op.text };
      if (!['data', 'action'].includes(raw.target)) errors.push('exclusion_has_non_data_target');
      const firstData = dataMentions(mentions).find(m => contains(raw, m));
      if (!firstData) errors.push('unsupported_exclusion_target');
      if (op && firstData && op.end > firstData.start) errors.push('operator_after_exclusion_target');
      if (op && firstData && KNOWLEDGE.test(query.slice(op.end, firstData.start))) errors.push('knowledge_is_not_a_data_exclusion');
    }
    if (raw.status === 'requested' && operators(query, mentions).some(op => contains(raw, op))) errors.push('negation_inside_requested_scope');
    if (raw.status === 'context' && raw.target === 'data') errors.push('data_cannot_be_context');
    scopes.push(scope);
  }
  if (/[\p{L}\p{N}]/u.test(query.slice(previousEnd))) errors.push('uncovered_source_text');
  for (const mention of dataMentions(mentions)) {
    const containing = scopes.filter(scope => contains(scope, mention));
    if (containing.length !== 1) errors.push('split_or_uncovered_metadata_mention');
    else if (containing[0].status === 'context') errors.push('metadata_hidden_in_context');
  }
  if (source === 'model') {
    const direct = ruleRequestEvidence(query, mentions).scopes.filter(s => s.status === 'excluded');
    for (const scope of direct) {
      const head = dataMentions(mentions).find(m => contains(scope, m));
      // Only the directly governed head is a deterministic veto. A trailing
      // prepositional phrase may qualify the positive request instead.
      for (const mention of dataMentions(mentions).filter(m => contains(scope, m) && m.start === head?.start)) {
        if (scopes.some(s => s.status === 'requested' && contains(s, mention))) errors.push('contradicts_direct_exclusion');
      }
    }
  }
  if (errors.length) return { valid: false, errors: [...new Set(errors)] };
  // Spaces mask content while punctuation and original character positions remain.
  // This prevents joining previously separated fragments into a new metadata name.
  const project = status => {
    const chars = query.split('');
    for (const scope of scopes) if (scope.status !== status) {
      for (let i = scope.start; i < scope.end; i++) if (!/[\s;,.!?—–]/u.test(chars[i])) chars[i] = ' ';
    }
    return chars.join('');
  };
  const classified = mentions.map(m => ({ ...m, status: scopes.find(s => contains(s, m))?.status || 'unresolved' }));
  return {
    valid: true, errors: [], source,
    evidence: { version: 1, query, scopes },
    positiveQuery: project('requested'), excludedQuery: project('excluded'),
    mentions: classified,
    unresolved: scopes.filter(s => s.status === 'unresolved')
  };
}
