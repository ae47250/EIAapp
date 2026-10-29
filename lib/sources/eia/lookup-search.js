import { sourceIntentPayload } from '../../eia-intent-payload.js';
import { requireAuthentication } from '../../auth.js';
import { cleanQueryMechanically, interpretQuery, normalizeSubmittedIntent } from './interpret-query.js';
import { geographyCode } from './locked-form-schema.js';
import { resolveApprovedGeography } from './intent-routing.js';
import { lookupCatalog, lookupRequestFromIntent, lexicalQualifiers, findLookupRows, buildLookupSelector, rowFitsGeography, findNotAvailable, lookupAlternatives } from './lookup-list.js';
import { fetchEiaData, eiaError, EIA_MESSAGES } from './eia-fetch.js';
const SOURCE = 'U.S. Energy Information Administration';
const capitalize = value => value.charAt(0).toUpperCase() + value.slice(1);
const invalidChoice = () => Object.assign(new Error('That choice is not available for this request. Run the search again.'), { choiceError:true });

function applyChoice(request, choice) {
  const clarification = request.clarification;
  if (!choice || !clarification.needed || choice.about !== clarification.about) throw invalidChoice();
  const option = clarification.options.find(item => item.value === choice.value);
  if (!option) throw invalidChoice();
  const next = structuredClone(request);
  if (choice.about === 'product' || choice.about === 'activity') {
    const unresolved = next.topics.filter(topic => topic[choice.about] === null);
    if (!unresolved.length) throw invalidChoice();
    for (const topic of unresolved) {
      topic[choice.about] = option.value;
      if (choice.about === 'product') topic.qualifiers = lexicalQualifiers(option.value, option.label);
    }
  } else if (choice.about === 'geography' && !next.geographies.length) {
    const geo = resolveApprovedGeography(geographyCode(option.value));
    if (!geo || next.excludedGeographies.includes(geo.code)) throw invalidChoice();
    next.geographies = [geo];
  } else if (choice.about === 'frequency') {
    next.frequency = option.value; next.frequencyExplicit = true;
  } else throw invalidChoice();
  next.clarification = { needed:false, about:null, options:[] };
  return next;
}
function choicesFor(request, catalog) {
  return request.clarification.options.flatMap(option => {
    const choice = { about:request.clarification.about, value:option.value };
    let applied;
    try { applied = applyChoice(request, choice); } catch { return []; }
    const topic = applied.topics.find(topic => topic.qualifiers?.length);
    const row = topic && catalog.rows.find(row => row.verification === 'verified'
      && applied.geographies.length && applied.geographies.every(geo => findLookupRows(applied,geo,topic,{catalog}).includes(row)));
    return [{ label:option.label, choice, ...(row ? { lookupRowKey:row.key, topicIndex:applied.topics.indexOf(topic) } : {}) }];
  });
}
function alternativeLabel(row, request) {
  const label = request.excludedSectors.length && !row.excludedSectors?.length
    ? `${capitalize(row.product)} ${row.activity} — all sectors, including ${request.excludedSectors.join(', ')}`
    : row.eiaName;
  return `${label} (${row.unit}; ${row.basisLabel.replace('{sector}',row.sectorSupported && row.sectorMapping[request.sector] ? `${request.sector} sector` : 'all sectors')})`;
}
function noRow(request, geo, topic, catalog, topicIndex) {
  const unavailable = findNotAvailable(request,geo,topic,catalog);
  return { geography:geo, product:topic.product, activity:topic.activity,
    status:unavailable ? 'not_available' : 'not_supported', series:null,
    message:unavailable ? `EIA does not publish ${unavailable.label} for ${geo.name}.`
      : `We don't have ${topic.product} ${topic.activity} for ${geo.name} yet.`,
    alternatives:lookupAlternatives(request,geo,topic,catalog).map(row => ({label:alternativeLabel(row,request),lookupRowKey:row.key,topicIndex})) };
}
function describeSeries(row, sample) {
  return sample['series-description'] || sample.seriesDescription || [sample.productName, sample.activityName].filter(Boolean).join(' — ') || row.eiaName;
}
export function lookupSeries(row, geography, request, selector, response, alternative = false) {
  const allowedUnits = (row.reportedUnits || [row.unit]).map(unit => unit.toLowerCase());
  const seen = new Map(); let missingValues = 0, duplicateRows = 0;
  for (const item of response.rows) {
    if (Object.entries(selector.facets).some(([key,value]) => !(Array.isArray(value)?value:[value]).map(String).includes(String(item[key])))) throw eiaError('unexpected_facet');
    const unit = item[`${row.dataColumn}-units`] || item.unitName || item.units || item.unit;
    if (typeof unit !== 'string' || !allowedUnits.includes(unit.toLowerCase())) throw eiaError('unexpected_unit');
    const raw = item[row.dataColumn], numeric = raw !== null && raw !== undefined && String(raw).trim() !== '' && Number.isFinite(Number(raw));
    const value = numeric ? Number(raw) : null;
    if (seen.has(item.period)) {
      if (seen.get(item.period) !== value) throw eiaError('conflicting_observations');
      duplicateRows++; continue;
    }
    seen.set(item.period,value);
    if (!numeric) missingValues++;
  }
  const points = [...seen].filter(([,value]) => value !== null).map(([period,value])=>({period,value})).sort((a,b)=>a.period.localeCompare(b.period));
  if (!points.length) return null;
  const seriesId = `${selector.route} | ${Object.entries(selector.facets).map(([k,v])=>`${k}=${v}`).join('; ')} | ${selector.dataColumn} | ${selector.frequency}`;
  const fallbackLabel = selector.frequency !== request.frequency
    ? `${capitalize(selector.frequency)} data shown; ${request.frequency} data is not available for this measure.` : null;
  const notes = [!response.complete ? `Incomplete response: ${response.rows.length} of ${response.total} reported rows received; the chart may omit observations.` : null,
    missingValues ? `${missingValues} observation values are missing; they are omitted from the chart, not replaced with zero.` : null,
    duplicateRows ? `${duplicateRows} identical duplicate observations were removed.` : null].filter(Boolean);
  return { lookup:true, lookupRowKey:row.key, candidateId:`lookup:${row.key}:${geography.code}`, seriesId, certainty:null, selectorVerified:true,
    selector, country:geography.name, countryCode:geography.code, product:row.product, activity:row.activity,
    productId:row.product,activityId:row.activity,unitFacet:row.unit,frequency:selector.frequency,unit:row.unit,
    title:describeSeries(row,response.rows[0]), eiaName:describeSeries(row,response.rows[0]), description:row.description,
    basisLabel:row.basisLabel.replace('{sector}',request.sector ? `${request.sector} sector` : 'all sectors'),otherMeasuresExist:row.otherMeasuresExist,regionLabel:row.region?.label || null,
    sector:request.sector || null, sectorLabel:request.sector ? `${capitalize(request.sector)} sector` : 'All sectors',
    fallbackLabel, alternative, completenessNote:notes.join(' '), total:response.total,rowsReceived:response.rows.length,
    complete:response.complete,missingValues,duplicateRows,points,
    coverage:{start:points[0].period,end:points.at(-1).period,count:points.length},latestPeriod:points.at(-1).period,latestValue:points.at(-1).value,
    downloadedAt:new Date().toISOString(),source:SOURCE };
}

// Both the HTTP route and evaluation use this boundary, including browser form revalidation.
export async function searchLookup(query, submittedIntent, action = {}, options = {}) {
  const catalog = options.catalog || lookupCatalog;
  const intent = normalizeSubmittedIntent(submittedIntent,query);
  let request = lookupRequestFromIntent(intent);
  const base = {mode:'lookup',query,intent,source:SOURCE,selectedSeries:null,selectedComparison:null,selectedComparisons:[],results:[],choices:[],choice:action.choice || null};
  if (action.choice) request = applyChoice(request,action.choice);
  if (request.clarification.needed || !request.geographies.length || !request.topics.length || request.topics.some(topic=>!topic.product || !topic.activity)) {
    return {...base,needsClarification:true,userMessage:intent.clarificationMessage || `Please clarify the ${request.clarification.about || 'request'}.`,choices:choicesFor(request,catalog)};
  }
  const targetIndex = Number(action.topicIndex ?? 0);
  const override = action.lookupRowKey ? catalog.rows.find(row=>row.key===action.lookupRowKey && row.verification==='verified') : null;
  if (action.lookupRowKey && (!override || !Number.isInteger(targetIndex) || !request.topics[targetIndex]
    || !request.geographies.some(geo=>rowFitsGeography(override,geo,request,catalog)))) throw invalidChoice();
  const results = [];
  for (const [topicIndex,topic] of request.topics.entries()) {
    let rows = request.geographies.map(geo=>findLookupRows(request,geo,topic,{catalog}));
    const common = rows[0]?.find(row=>rows.every(list=>list.some(other=>other.key===row.key)));
    if (common) rows = rows.map(()=>[common]); // Use the same published basis/unit for country comparisons when available.
    const countries = [];
    for (const [index,geo] of request.geographies.entries()) {
      const usingOverride = override && targetIndex === topicIndex && rowFitsGeography(override,geo,request,catalog);
      const row = usingOverride ? override : rows[index][0];
      const isAlternative = Boolean(usingOverride && !findLookupRows(request,geo,topic,{catalog}).includes(row));
      if (!row) { countries.push(noRow(request,geo,topic,catalog,topicIndex));continue; }
      // An explicit alternative is labelled and may have a different sector/product definition.
      const selectedRequest = isAlternative ? {...request,sector:row.sectorSupported && row.sectorMapping[request.sector] ? request.sector : null} : request;
      const selector = buildLookupSelector(row,geo,selectedRequest,catalog);
      try {
        const response = await (options.fetchData || fetchEiaData)(selector,options);
        const series = lookupSeries(row,geo,selectedRequest,selector,response,isAlternative);
        if (!series) {
          countries.push({...noRow(request,geo,topic,catalog,topicIndex),status:'empty',message:`EIA returned no numeric observations for ${row.eiaName} in ${geo.name}.`});continue;
        }
        countries.push({geography:geo,product:topic.product,activity:topic.activity,status:'available',series,seriesId:series.seriesId,unit:series.unit,coverage:series.coverage,alternatives:[],message:null});
      } catch (error) {
        countries.push({geography:geo,product:topic.product,activity:topic.activity,status:'error',series:null,message:error.kind ? error.message : EIA_MESSAGES.unavailable,errorKind:error.kind || 'unavailable',alternatives:[]});
      }
    }
    const shown = countries.filter(country=>country.series);
    const chartCompatible = new Set(shown.map(country=>`${country.series.unit}|${country.series.frequency}|${country.series.basisLabel}`)).size <= 1;
    const warnings = countries.filter(country=>country.message).map(country=>({code:country.status,geographyCode:country.geography.code,message:country.message}));
    if (!chartCompatible) warnings.push({code:'different_measures',message:'These EIA measures have different units, frequencies or definitions. Each is charted separately; no conversion was made.'});
    const comparison = countries.length > 1 ? {lookup:true,definitionId:`lookup:${topicIndex}`,title:`${capitalize(topic.product)} ${topic.activity}`,rank:null,
      definition:{product:topic.product,activity:topic.activity,frequency:shown[0]?.series.frequency,source:SOURCE},
      countries,warnings,chartCompatible,requestedCountryCount:countries.length,availableCountryCount:shown.length} : null;
    results.push({topicIndex,product:topic.product,activity:topic.activity,title:`${capitalize(topic.product)} ${topic.activity}`,countries,selectedComparison:comparison,selectedSeries:comparison ? null : shown[0]?.series || null});
  }
  return {...base,results,selectedSeries:results[0]?.selectedSeries || null,selectedComparison:results[0]?.selectedComparison || null,
    selectedComparisons:results.map(result=>result.selectedComparison).filter(Boolean),needsClarification:false,
    note:'Search complete. EIA measurement definitions and availability are shown with each result.'};
}
function parse(value,max) {
  if (typeof value !== 'string' || value.length > max) return null;
  try { return JSON.parse(value); } catch { return null; }
}
export default async function lookupSearchHandler(req,res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');res.setHeader('Cache-Control','no-store');
  if (!requireAuthentication(req,res)) return;
  if (req.method !== 'GET') return res.status(405).json({error:'Method not allowed.',userMessage:'Use the search box on the webpage or send a GET request.'});
  const original = String(req.query.q || ''),query = cleanQueryMechanically(original);
  if (!query || query.length > 240) return res.status(400).json({error:'Invalid query.',userMessage:query ? 'Use a shorter geography and energy topic search.' : 'Enter a geography and energy topic.'});
  try {
    const submitted = req.query.intentReady === '1' ? parse(req.query.intentPayload,12000) : sourceIntentPayload(await interpretQuery(original));
    const choice = req.query.choice === undefined ? null : parse(req.query.choice,2000);
    if (req.query.choice !== undefined && !choice) throw invalidChoice();
    const result = await searchLookup(original,submitted,{choice,lookupRowKey:req.query.lookupRowKey,topicIndex:req.query.topicIndex});
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.choiceError ? 400 : 500).json({error:'Unable to complete this EIA request.',userMessage:error.choiceError || error.kind ? error.message : EIA_MESSAGES.unavailable});
  }
}
