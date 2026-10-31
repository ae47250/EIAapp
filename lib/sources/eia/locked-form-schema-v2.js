import { buildLockedFormSchema, checkLockedFormShape } from './locked-form-schema.js';

export function buildLockedFormSchemaV2() {
  const schema = buildLockedFormSchema();
  for (const key of ['geographies', 'excluded_geographies']) {
    const geography=schema.properties[key].items;
    schema.properties[key].items={...geography,properties:{...geography.properties,is_default:{type:'boolean'}},required:[...geography.required,'is_default']};
  }
  schema.properties.years = {
    type: 'object', additionalProperties: false, required: ['start', 'end', 'quoted_words'],
    properties: { start: { type: ['integer', 'null'] },
      end: { anyOf: [{ type: 'integer' }, { type: 'string', enum: ['latest'] }, { type: 'null' }] },
      quoted_words: { type: ['string', 'null'] } }
  };
  schema.required.push('years');
  return schema;
}
export function checkLockedFormShapeV2(form) {
  // Reuse the historical shape walker; integer semantics are checked separately.
  const schema = JSON.parse(JSON.stringify(buildLockedFormSchemaV2()).replaceAll('"integer"', '"number"'));
  const result = checkLockedFormShape(form, schema);
  for (const key of ['start','end']) if (typeof form?.years?.[key] === 'number' && !Number.isInteger(form.years[key])) result.errors.push(`form.years.${key}:integer`);
  return { valid: !result.errors.length, errors: result.errors };
}
export function upgradeV1Form(form) {
  return { ...structuredClone(form),
    geographies: form.geographies.map(g => ({...g, is_default:false})),
    excluded_geographies: form.excluded_geographies.map(g => ({...g, is_default:false})),
    years: {start:null, end:null, quoted_words:null} };
}
