import { readFileSync } from 'node:fs';
import { listApprovedGeographies } from './intent-routing.js';
const vocabulary = JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json', import.meta.url), 'utf8')).vocabulary;
const object = properties => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false });
const string = { type: 'string' };
const nullableString = { type: ['string', 'null'] };
const array = items => ({ type: 'array', items });
const ref = name => ({ $ref: `#/$defs/${name}` });
const optional = name => ({ anyOf: [ref(name), { type: 'null' }] });
export function geographyLabel(g) { return `${g.code} | ${g.name} | ${g.type === 'state' ? 'US state' : g.type}`; }
export function geographyCode(value) { return typeof value === 'string' ? value.split('|')[0].trim() : null; }
export function lockedFormVocabulary(geographies = listApprovedGeographies(), terms = vocabulary) {
  return {
    geography: geographies.filter(g => g.code !== 'US').map(geographyLabel),
    product: Object.keys(terms.products), activity: Object.keys(terms.activities),
    sector: Object.keys(terms.sectors), frequency: Object.keys(terms.frequencies)
  };
}
export function buildLockedFormSchema(geographies, terms) {
  const values = lockedFormVocabulary(geographies, terms);
  const geography = object({ geography: ref('geography'), quoted_words: string });
  const topic = object({ product: optional('product'), activity: optional('activity'), quoted_words: string });
  return {
    ...object({
      geographies: array(geography), excluded_geographies: array(geography),
      topics: array(topic),
      excluded_topics: array(object({ product: optional('product'), activity: optional('activity'), sector: optional('sector'), quoted_words: string })),
      sector: object({ value: optional('sector'), quoted_words: nullableString }),
      frequency: object({ value: ref('frequency'), explicit: { type: 'boolean' }, quoted_words: nullableString }),
      unsupported_words: array(string),
      clarification: object({ needed: { type: 'boolean' }, about: { type: ['string', 'null'], enum: ['product', 'geography', 'activity', 'frequency', 'other', null] }, options: array(object({ label: string, value: string })) })
    }),
    $defs: Object.fromEntries(Object.entries(values).map(([key, enums]) => [key, { type: 'string', enum: enums }]))
  };
}
// Count definitions once for total properties/enum/string limits; follow refs for maximum instance depth.
export function schemaCounts(schema) {
  const counts = { objectProperties: 0, enumValues: 0, totalStringCharacters: 0, maximumNesting: 0, largeEnums: [] };
  const chars = value => typeof value === 'string' ? [...value].length : 0;
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (node.properties) { counts.objectProperties += Object.keys(node.properties).length; counts.totalStringCharacters += Object.keys(node.properties).reduce((n, k) => n + chars(k), 0); }
    if (node.$defs) counts.totalStringCharacters += Object.keys(node.$defs).reduce((n, k) => n + chars(k), 0);
    if (node.enum) {
      const length = node.enum.reduce((n, x) => n + chars(x), 0);
      counts.enumValues += node.enum.length; counts.totalStringCharacters += length;
      if (node.enum.length > 250) counts.largeEnums.push({ values: node.enum.length, characters: length });
    }
    if ('const' in node) counts.totalStringCharacters += chars(node.const);
    for (const value of Object.values(node)) if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) value.forEach(visit); else visit(value);
    }
  }
  function depth(node, current = 0) {
    if (node.$ref) return depth(schema.$defs[node.$ref.split('/').at(-1)], current);
    const next = current + (node.type === 'object' || node.type === 'array' ? 1 : 0);
    counts.maximumNesting = Math.max(counts.maximumNesting, next);
    Object.values(node.properties || {}).forEach(x => depth(x, next));
    if (node.items) depth(node.items, next);
    (node.anyOf || []).forEach(x => depth(x, next));
  }
  visit(schema); depth(schema); return counts;
}
export function checkLockedFormShape(value, schema = buildLockedFormSchema()) {
  const errors = [];
  function valid(v, node, path) {
    if (node.$ref) return valid(v, schema.$defs[node.$ref.split('/').at(-1)], path);
    if (node.anyOf) {
      const start = errors.length;
      for (const option of node.anyOf) { errors.length = start; valid(v, option, path); if (errors.length === start) return; }
      errors.length = start; errors.push(`${path}:type`); return;
    }
    const type = v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;
    if (!(Array.isArray(node.type) ? node.type : [node.type]).includes(type)) { errors.push(`${path}:type`); return; }
    if (node.enum && !node.enum.includes(v)) errors.push(`${path}:enum`);
    if (type === 'object') {
      for (const key of node.required || []) if (!Object.hasOwn(v, key)) errors.push(`${path}.${key}:required`);
      for (const key of Object.keys(v)) if (!Object.hasOwn(node.properties, key)) errors.push(`${path}.${key}:extra`);
      for (const [key, child] of Object.entries(node.properties)) if (Object.hasOwn(v, key)) valid(v[key], child, `${path}.${key}`);
    }
    if (type === 'array') v.forEach((x, i) => valid(x, node.items, `${path}[${i}]`));
  }
  valid(value, schema, 'form'); return { valid: errors.length === 0, errors };
}
