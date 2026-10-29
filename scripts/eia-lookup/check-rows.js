import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { fetchEiaData, fetchEiaMetadata } from '../../lib/sources/eia/eia-fetch.js';
import { buildLookupSelector } from '../../lib/sources/eia/lookup-list.js';
import { resolveApprovedGeography } from '../../lib/sources/eia/intent-routing.js';
const root = fileURLToPath(new URL('../../', import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
const finite = value => value !== null && String(value).trim() !== '' && Number.isFinite(Number(value));
const labelFields = { productId:'productName', activityId:'activityName', countryRegionId:'countryRegionName', countryRegionTypeId:'countryRegionTypeName', unit:'unitName', seriesId:'seriesDescription', stateId:'stateDescription', stateid:'stateDescription', location:'stateDescription', sectorid:'sectorName', fueltypeid:'fuelTypeDescription', duoarea:'area-name', product:'product-name', process:'process-name', series:'series-description' };

export async function checkLookupRows(catalog, options = {}) {
  const metadata = new Map(), records = [], metadataRead = options.fetchMetadata || fetchEiaMetadata, dataRead = options.fetchData || fetchEiaData;
  const getMetadata = route => {
    if (!metadata.has(route)) metadata.set(route, metadataRead(route, options));
    return metadata.get(route);
  };
  for (const row of catalog.rows.filter(row => !options.only || options.only.includes(row.key))) {
    const record = { key: row.key, required: row.required, route: row.route, dataColumn: row.dataColumn, selectorDefinitionHash: digest(JSON.stringify({ route:row.route, measure:row.dataColumn, fixedFacets:row.fixedFacets, frequencies:row.frequencies })), checks: [], pass: false };
    records.push(record);
    try {
      const route = await getMetadata(row.route), facets = new Set((route.facets || []).map(item => item.id));
      if (!Object.hasOwn(route.data || {}, row.dataColumn)) throw new Error('Data column absent from route metadata.');
      const geo = resolveApprovedGeography(row.sampleGeography);
      if (!geo) throw new Error('Sample geography is not approved.');
      // Check every declared frequency and sector mapping, not an unchecked cross-product.
      for (const frequency of row.frequencies) for (const sector of row.sectorSupported ? Object.keys(row.sectorMapping) : ['']) {
        if (!(route.frequency || []).some(item => item.id === frequency)) throw new Error('Frequency absent from route metadata.');
        const selector = buildLookupSelector(row, geo, { sector: sector || null, frequency }, catalog);
        for (const id of Object.keys(selector.facets)) if (!facets.has(id)) throw new Error(`Facet ${id} absent from route metadata.`);
        const response = await dataRead(selector, options), observations = response.rows;
        if (!response.complete) throw new Error('Incomplete observation response.');
        if (!observations.length || !observations.some(item => finite(item[row.dataColumn]))) throw new Error('No numeric observations.');
        const units = [...new Set(observations.map(item => item[`${row.dataColumn}-units`] || item.unitName || item.units || item.unit))];
        const allowedUnits = (row.reportedUnits || [row.unit]).map(value => value.toLowerCase());
        if (units.some(value => typeof value !== 'string' || !allowedUnits.includes(value.toLowerCase()))) throw new Error(`Unexpected unit; received ${JSON.stringify(units)}.`);
        if (new Set(observations.map(item => item.period)).size !== observations.length) throw new Error('More than one observation per period; selector is not a single series.');
        const facetChecks = [];
        for (const [id,value] of Object.entries(selector.facets)) {
          const values = Array.isArray(value) ? value.map(String) : [String(value)];
          if (observations.some(item => !values.includes(String(item[id])))) throw new Error(`Returned facet ${id} does not match request.`);
          const facet = await getMetadata(`${row.route}/facet/${id}`);
          const present = values.every(value => (facet.facets || []).some(item => String(item.id) === value));
          const label = labelFields[id];
          const names = [...new Set(observations.map(item => item[label] || (id === 'sectorid' ? item.sectorDescription : null)).filter(Boolean))];
          if (!present && !names.length) throw new Error(`Facet value ${id} lacks catalogue or observation metadata confirmation.`);
          facetChecks.push({ id, values, source: present ? 'facet_metadata' : 'observation_metadata', names,
            ...(present ? {} : { note:'The default facet catalogue is frequency-limited; all returned observations confirm this code and its source-provided label.' }) });
        }
        const periods = observations.map(item => item.period).sort();
        record.checks.push({ geography:geo.code, sector:sector || null, selector, rows:observations.length, total:response.total, complete:response.complete,
          numericRows:observations.filter(item => finite(item[row.dataColumn])).length, units, displayedUnit:row.unit,
          frequency:response.frequency, coverage:{start:periods[0],end:periods.at(-1)}, facetChecks, sample:observations.at(-1) });
      }
      record.pass = true;
    } catch (error) {
      // Only our own errors or the sanitized fetch error leave this boundary.
      record.error = error.kind ? { reason:error.reason,kind:error.kind,message:error.message } : { message:error.message };
      if (error.reason === 'rate_limited') return { complete:false, stopped:'rate_limited', records };
    }
    options.onRow?.(record);
  }
  return { complete:true, records };
}
async function main() {
  const args = process.argv.slice(2), outIndex = args.indexOf('--output'), onlyIndex = args.indexOf('--only');
  const output = resolve(root, outIndex >= 0 ? args[outIndex + 1] : 'evidence/eia-lookup-list/row-checks.json');
  if (existsSync(output)) throw new Error('Output exists; use a new record path to preserve previous results.');
  if (!process.env.EIA_API_KEY) throw new Error('Existing EIA_API_KEY is unavailable.');
  const path = resolve(root,'data/eia/lookup-list.json'), original = readFileSync(path,'utf8'), catalog = JSON.parse(original);
  const startedAt = new Date().toISOString();
  const result = await checkLookupRows(catalog, { only:onlyIndex >= 0 ? args[onlyIndex + 1].split(',') : null,
    onRow:record => console.log(JSON.stringify({key:record.key,pass:record.pass,checks:record.checks.length,error:record.error || null})) });
  const report = { startedAt, finishedAt:new Date().toISOString(), inputSha256:digest(original), ...result };
  mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
  if (args.includes('--promote')) {
    if (readFileSync(path,'utf8') !== original) throw new Error('Lookup list changed during verification; results preserved, promotion skipped.');
    const passed = new Set(result.records.filter(record => record.pass).map(record => record.key));
    for (const row of catalog.rows) if (passed.has(row.key)) row.verification = 'verified';
    writeFileSync(path,JSON.stringify(catalog,null,2)+'\n');
  }
  console.log(JSON.stringify({output,passed:result.records.filter(record=>record.pass).length,failed:result.records.filter(record=>!record.pass).length,complete:result.complete}));
  if (!result.complete || result.records.some(record=>!record.pass)) process.exitCode=1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('Row check could not complete; no credential details logged.');process.exitCode=1; });
