import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { resolveApprovedGeography } from './intent-routing.js';
import { expandGeographies, yearBounds } from './lookup-context.js';
import { geographyCode } from './locked-form-schema.js';
const originalCatalog = JSON.parse(readFileSync(new URL('../../../data/eia/lookup-list.json', import.meta.url), 'utf8'));
const generatedCatalog = JSON.parse(gunzipSync(readFileSync(new URL('../../../data/eia/lookup-coverage.json.gz', import.meta.url))));
export const lookupCatalog = {...originalCatalog,rows:[...originalCatalog.rows,...generatedCatalog.rows],coverageOverlays:generatedCatalog.overlays,scopeRoutes:generatedCatalog.scopeRoutes};
const vocabulary = JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json', import.meta.url), 'utf8')).vocabulary;
const normalize = text => String(text || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const sameSet = (a = [], b = []) => a.length === b.length && a.every(x => b.includes(x));

export function lexicalQualifiers(product, quotedWords) {
  const words = ` ${normalize(quotedWords)} `;
  return Object.entries(vocabulary.products[product]?.lexicalQualifiers || {})
    .filter(([, terms]) => terms.some(term => words.includes(` ${normalize(term)} `))).map(([value]) => value);
}
export function lookupRequestFromIntent(intent) {
  const form = intent.lockedForm;
  if (form) return {
    geographies: expandGeographies(form.geographies).filter(g=>!expandGeographies(form.excluded_geographies).some(x=>x.code===g.code || x.code==='USA' && g.type==='state')),
    years:form.years, regions:form.geographies.map(item=>resolveApprovedGeography(geographyCode(item.geography))).filter(g=>g?.code.includes('+')),
    topics: form.topics.map(item => ({ ...item, qualifiers: lexicalQualifiers(item.product, item.quoted_words) })),
    sector: form.sector.value, frequency: form.frequency.value, frequencyExplicit: form.frequency.explicit,
    excludedGeographies: expandGeographies(form.excluded_geographies).map(g=>g.code),
    excludedProducts: form.excluded_topics.map(item => item.product).filter(Boolean),
    excludedActivities: form.excluded_topics.map(item => item.activity).filter(Boolean),
    excludedSectors: form.excluded_topics.map(item => item.sector).filter(Boolean),
    clarification: form.clarification
  };
  const structured = intent.structuredIntent || {};
  const exclusions = intent.exclusions || structured.exclusions || [];
  const positiveWords = (intent.requestEvidence?.scopes || []).filter(scope => scope.status === 'requested' && scope.target === 'data').map(scope => scope.text).join(' ');
  const productOptions = intent.fields?.product?.validation === 'ambiguous' ? intent.fields.product.alternatives || [] : [];
  const pairs = intent.validatedConceptPairs?.length ? intent.validatedConceptPairs : structured.conceptPairs || [{ product: intent.product, activity: intent.activity }];
  return {
    geographies: intent.validatedGeographies?.length ? intent.validatedGeographies : structured.geographies || [intent.country].filter(Boolean),
    topics: pairs.map(pair => ({ ...pair, qualifiers: pair.lexicalQualifiers || lexicalQualifiers(pair.product,positiveWords) })),
    sector: intent.fields?.sector?.normalizedValue || null, frequency: intent.frequency || 'annual', frequencyExplicit: Boolean(intent.frequencyExplicit),
    excludedGeographies: (intent.excludedGeographies || []).map(item => item.code),
    excludedProducts: exclusions.filter(item => item.type === 'product').map(item => item.value),
    excludedActivities: exclusions.filter(item => item.type === 'activity').map(item => item.value),
    excludedSectors: exclusions.filter(item => item.type === 'sector').map(item => item.value),
    clarification: { needed: Boolean(intent.blockingClarification || intent.needsClarification), about: productOptions.length ? 'product' : null, options: productOptions.map(value => ({value,label:value === 'petroleum' ? 'Petroleum (gasoline)' : value})) }
  };
}
function containsProduct(parent, child, seen = new Set()) {
  if (parent === child) return true;
  if (seen.has(parent)) return false;
  seen.add(parent);
  return (vocabulary.products[parent]?.alternatives || []).some(value => containsProduct(value, child, seen));
}
export function rowFitsGeography(row, geography, request, catalog = lookupCatalog) {
  if (!geography) return false;
  const excluded = request.excludedGeographies || [];
  if (excluded.includes(geography.code) || geography.type === 'state' && excluded.includes('USA')) return false;
  if (row.generatedFrom) {
    if(row.geographyKind==='country' && catalog.rows.some(other=>other.region?.code===geography.code))return false;
    const kind=row.geographyKind;
    if (kind==='country' && (geography.type!=='country' || geography.code==='WLD') || kind==='state' && geography.type!=='state' || kind==='united_states' && (geography.code!=='USA' || geography.type!=='national') || kind==='eia_region' && geography.code!=='WLD') return false;
    return Object.hasOwn(row.placeFacets,geography.code) && !(geography.code==='USA' && excluded.some(c=>resolveApprovedGeography(c)?.type==='state'));
  }
  const kindFits = row.geographyKind === 'state' ? geography.type === 'state'
    : row.geographyKind === 'united_states' ? geography.code === 'USA'
    : row.geographyKind === 'country' ? (geography.type === 'country' || geography.code === 'USA') && !catalog.rows.some(other=>other.region && other.region.code===geography.code)
    : row.geographyKind === 'eia_region' && row.region?.requestedCodes.includes(geography.code);
  if (!kindFits) return false;
  if (geography.code === 'USA' && excluded.some(code => resolveApprovedGeography(code)?.type === 'state' && !row.region?.excludedGeographies?.includes(code))) return false;
  return Boolean(catalog.routes[row.route]?.geographies[row.region?.code || geography.code]);
}
export function findLookupRows(request, geography, topic, options = {}) {
  const catalog = options.catalog || lookupCatalog;
  const candidates=catalog.rows;
  return candidates.filter(row => {
    if (row.verification !== 'verified' && !options.allowPending) return false;
    if (row.product !== topic.product || row.activity !== topic.activity || !rowFitsGeography(row, geography, request, catalog)) return false;
    if (request.excludedActivities.includes(topic.activity) || request.excludedProducts.some(p => containsProduct(p, topic.product))) return false;
    const qualifiers = topic.qualifiers || [];
    if (qualifiers.length > 1 || row.qualifier && !qualifiers.includes(row.qualifier)) return false;
    if (qualifiers.length && ![row.qualifier, ...(row.acceptedQualifiers || [])].includes(qualifiers[0])) return false;
    const relevantProducts = request.excludedProducts.filter(product => containsProduct(topic.product, product));
    if (!sameSet(row.excludedProducts || [], relevantProducts)) return false;
    if (row.generatedFrom && (row.sector||null)!==(request.sector||null)) return false;
    if (request.sector) {
      if (request.excludedSectors.includes(request.sector) || !row.sectorSupported || !row.sectorMapping[request.sector]) return false;
    } else if (!sameSet(row.excludedSectors || [], request.excludedSectors)) return false;
    return true;
  }).sort((a,b) => Number(b.frequencies.includes(request.frequency)) - Number(a.frequencies.includes(request.frequency))
    || Number(Boolean(a.generatedFrom))-Number(Boolean(b.generatedFrom))
    || Number(b.geographyKind === 'united_states') - Number(a.geographyKind === 'united_states'));
}
export function buildLookupSelector(row, geography, request, catalog = lookupCatalog) {
  const scope=catalog.scopeRoutes?.[row.route];
  if (scope) {
    if (scope.placeKind!=='US' || !scope.checked || !scope.quote || !/^https:\/\/(?:[a-z0-9-]+\.)*eia\.gov\//i.test(scope.url||'') || geography.code!=='USA' || geography.type!=='national' || row.geographyKind!=='united_states') throw new Error('This documented route supports the United States only.');
  }
  if (row.generatedFrom) {
    if (!rowFitsGeography(row,geography,request,catalog) || (row.sector||null)!==(request.sector||null)) throw new Error('The lookup row does not support this geography or sector.');
    const frequency=row.frequencies.includes(request.frequency)?request.frequency:row.frequencies[0];
    return {route:row.route,dataColumn:row.dataColumn,frequency,...yearBounds(request.years,frequency),facets:{...row.fixedFacets,...row.placeFacets[geography.code]}};
  }
  const mapping = catalog.routes[row.route];
  const geographyCode = row.region?.code || geography.code;
  const value = mapping?.geographies[geographyCode];
  if (!value) throw new Error('The lookup row does not support this geography.');
  const sectorFacets = row.sectorSupported ? row.sectorMapping[request.sector || ''] : {};
  if (!sectorFacets || request.sector && !row.sectorSupported) throw new Error('The lookup row does not support this sector.');
  const frequency = row.frequencies.includes(request.frequency) ? request.frequency : row.frequencies.includes('annual') ? 'annual' : row.frequencies[0];
  return { route: row.route, dataColumn: row.dataColumn, frequency, ...yearBounds(request.years,frequency),
    facets: { ...row.fixedFacets, [mapping.geographyFacet]: value, ...mapping.extraGeographyFacets?.[geographyCode], ...sectorFacets } };
}
export function findNotAvailable(request, geography, topic, catalog = lookupCatalog) {
  if (request.sector || (topic.qualifiers || []).length || request.excludedProducts.length || request.excludedActivities.length) return null;
  return catalog.notAvailable.find(item => item.product === topic.product && item.activity === topic.activity
    && (item.geographyKind === 'state' ? geography.type === 'state' : geography.type === 'country')
    && (!item.geographyCodes || item.geographyCodes.includes(geography.code))
    && sameSet(item.excludedSectors, request.excludedSectors)) || null;
}
export function lookupAlternatives(request, geography, topic, catalog = lookupCatalog) {
  const unavailable = findNotAvailable(request, geography, topic, catalog);
  return catalog.rows.filter(row => row.verification === 'verified' && rowFitsGeography(row, geography, request, catalog)
    && (unavailable ? unavailable.alternatives.includes(row.key) : row.product === topic.product || row.activity === topic.activity))
    .sort((a,b) => Number(b.product === topic.product && b.activity === topic.activity) - Number(a.product === topic.product && a.activity === topic.activity))
    .slice(0,3);
}

// A default is a catalogue scope, not an inferred place name. States never
// establish a national default; a checked national row and no country/World
// equivalent are both required. Qualifiers stay separate from whole products.
export function documentedNationalDefaults(catalog=lookupCatalog) {
 const rows=catalog.rows.filter(r=>r.verification==='verified');
 const tuples=rows.filter(r=>r.geographyKind==='united_states').map(r=>[r.product,r.activity,r.qualifier||null]);
 return tuples.filter((t,i)=>tuples.findIndex(x=>JSON.stringify(x)===JSON.stringify(t))===i && !rows.some(r=>['country','eia_region'].includes(r.geographyKind)&&r.product===t[0]&&r.activity===t[1]&&(r.qualifier||null)===t[2]));
}
export function isDocumentedNationalDefault(form) {
 const allowed=documentedNationalDefaults();
 return form.topics.length>0 && form.topics.every(t=>allowed.some(([p,a,q])=>t.product===p&&t.activity===a&&(lexicalQualifiers(p,t.quoted_words)[0]||null)===q));
}
