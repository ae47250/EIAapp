import {EIA_SYMBOLS,observationStatus} from '../../client/lookup-display.js';
import {placeSwitches,placeDisplayName,usStates} from './lookup-geography.js';
import { sourceIntentPayload } from '../../eia-intent-payload.js';
import { requireAuthentication } from '../../auth.js';
import { cleanQueryMechanically, interpretQuery, normalizeSubmittedIntent } from './interpret-query.js';
import { geographyCode,lockedFormVocabulary } from './locked-form-schema.js';
import { resolveApprovedGeography } from './intent-routing.js';
import { coverageStatus,coverageMessage,lookupCatalog, lookupRequestFromIntent, lexicalQualifiers, findLookupRows, buildLookupSelector, rowFitsGeography, findNotAvailable, lookupAlternatives } from './lookup-list.js';
import { fetchEiaData, eiaError, EIA_MESSAGES } from './eia-fetch.js';
import { convertLockedFormV2, checkLockedFormV2 } from './locked-form-v2.js';
import { clarificationFor } from './lookup-context.js';
import { applyFieldReply } from './locked-form-reply.js';
import { applyReplyUpdate } from './locked-form-reply-update.js';
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
// Revalidate every button against the choices that were actually offered. Keep the
// original repaired form plus the complete sequence; never trust derived client fields.
function applyFormChoice(form, choice, placeStep, query) {
  if(choice.about==='geography_add'){
    const offered=placeSwitches(form,undefined,query).find(c=>c.choice.about==='geography_add'&&c.choice.value===choice.value);if(!offered)throw invalidChoice();
    const next=structuredClone(form);next.geographies.push({geography:choice.value,quoted_words:offered.label,is_default:false});return {form:next,placeStep:null,label:offered.label};
  }
  if(choice.about==='geography_switch'){
    const offered=placeSwitches(form).find(c=>c.choice.value===choice.value && c.choice.from===choice.from);if(!offered)throw invalidChoice();
    const next=structuredClone(form);next.geographies=next.geographies.map(g=>geographyCode(g.geography)===choice.from?{...g,geography:choice.value,quoted_words:offered.label}:g);return {form:next,placeStep:null,label:offered.label};
  }
  const offered=clarificationFor(form,placeStep,{query}).choices.find(c=>c.choice.about===choice.about && c.choice.value===choice.value);
  if (!form.clarification.needed || !offered) throw invalidChoice();
  const next=structuredClone(form);
  if(choice.about==='geography_scope' && choice.value==='states'){next.geographies=usStates(next).map(g=>({geography:`${g.code} | ${g.name} | US state`,quoted_words:offered.label,is_default:false}));next.clarification={needed:false,about:null,options:[]};return {form:next,placeStep:null,label:offered.label};}
  if (choice.about==='geography_scope') return {form:next,placeStep:choice.value,label:offered.label};
  if (choice.about==='geography') {
    if (next.excluded_geographies.some(g=>g.geography===choice.value)) throw invalidChoice();
    next.geographies=[{geography:choice.value,quoted_words:offered.label,is_default:false}];
  } else if (choice.about==='product' || choice.about==='activity') {
    if (!next.topics.length) next.topics=[{product:null,activity:null,quoted_words:offered.label}];
    const unresolved=next.topics.filter(t=>!t[choice.about]);
    const targets=unresolved.length && next.clarification.about!=='other' ? unresolved : next.topics;
    for (const t of targets) {
      t[choice.about]=choice.value; if (choice.about==='product' || !t.quoted_words) t.quoted_words=offered.label;
    }
  } else if (choice.about==='sector') next.sector={value:choice.value,quoted_words:offered.label};
  else if (choice.about==='frequency') next.frequency={value:choice.value,explicit:true,quoted_words:offered.label};
  else throw invalidChoice();
  next.unsupported_words=[];
  const about=next.topics.some(t=>!t.product)?'product':next.topics.some(t=>!t.activity)?'activity':!next.geographies.length?'geography':null;
  next.clarification={needed:about!==null,about,options:[]};
  return {form:next,placeStep:null,label:offered.label};
}
export function submittedContext(query,submitted,action = {}) {
  if (submitted && JSON.stringify(submitted).length>12000) submitted=null;
  const history=submitted?.choiceHistory || [];
  if (!Array.isArray(history) || history.length>12) throw invalidChoice();
  const initial=normalizeSubmittedIntent(submitted?.originForm ? {interpreter:submitted.interpreter,lockedForm:submitted.originForm} : submitted,query);
  if (!initial.lockedForm) return {intent:initial,request:lookupRequestFromIntent(initial)};
  let form=initial.lockedForm,placeStep=null,effectiveQuery=query,geographyText=query,quoteSources={};
  const choices=[...history,...(action.choice?[action.choice]:[])];
  for (const choice of choices) {
    if(choice?.type==='reply-question'){
      if(!(form.clarification.needed&&form.clarification.about===choice.about)&&!(choice.about==='geography'&&placeSwitches(form).length))throw invalidChoice();
      form=structuredClone(form);form.clarification={needed:true,about:choice.about,options:form.clarification.about===choice.about?form.clarification.options:[]};
    } else if (choice?.type==='reply' || choice?.type==='reply-update') {
      const next=(choice.type==='reply-update'?applyReplyUpdate:applyFieldReply)(form,effectiveQuery,choice,quoteSources);
      if(choice.about==='geography' || JSON.stringify(form.geographies)!==JSON.stringify(next.form.geographies))geographyText=choice.reply;
      form=next.form;quoteSources=next.quoteSources;placeStep=null;
    } else {
      const next=applyFormChoice(form,choice,placeStep,geographyText);
      for (const key of ['geographies','excluded_geographies','topics']) quoteSources[key]=next.form[key].map((item,index)=>item.quoted_words===form[key][index]?.quoted_words ? quoteSources[key]?.[index] : undefined);
      for (const key of ['sector','frequency']) if (next.form[key].quoted_words!==form[key].quoted_words) delete quoteSources[key];
      form=next.form;placeStep=next.placeStep;effectiveQuery+=' '+next.label;
    }
    if (!checkLockedFormV2(form,effectiveQuery,quoteSources).valid) throw invalidChoice();
  }
  const intent=convertLockedFormV2(form,effectiveQuery,{quoteSources,clarificationQuery:geographyText});
  intent.originalQuery=query;
  if (choices.length) Object.assign(intent,{originForm:initial.lockedForm,choiceHistory:choices,placeStep});
  return {intent,request:lookupRequestFromIntent(intent),placeStep,quoteSources,effectiveQuery,geographyText};
}
function regionAlternatives(request,region,topic,catalog,topicIndex) {
  const candidates=catalog.rows.filter(row=>row.verification==='verified' && row.geographyKind==='country'
    && request.geographies.some(g=>rowFitsGeography(row,g,request,catalog)) && (row.product===topic.product || row.activity===topic.activity));
  // Offer the same product first, then the first checked measure for the same activity.
  const sameProduct=candidates.find(r=>r.product===topic.product);
  const sameActivity=candidates.find(r=>r.activity===topic.activity && r!==sameProduct);
  return [sameProduct,sameActivity].filter(Boolean).map(row=>({label:`${capitalize(row.product)} ${row.activity} for each country in ${region.name}`,lookupRowKey:row.key,topicIndex}));
}
async function fetchRegionBatch(jobs,options,catalog) {
  const responses=new Map(),groups=new Map();
  for (const job of jobs) {
    if (!job.row) continue;
    const facet=catalog.routes[job.row.route]?.geographyFacet;
    if(!facet || !Object.hasOwn(job.selector.facets,facet)){
      try{responses.set(job,await (options.fetchData || fetchEiaData)(job.selector,options));}catch(error){responses.set(job,{error});}
      continue;
    }
    const { [facet]:geo,...rest }=job.selector.facets;
    const key=JSON.stringify({...job.selector,facets:rest});
    if (!groups.has(key)) groups.set(key,{facet,jobs:[]});
    groups.get(key).jobs.push(job);
  }
  for (const {facet,jobs:group} of groups.values()) {
    const selector={...group[0].selector,facets:{...group[0].selector.facets,[facet]:group.map(j=>j.selector.facets[facet])}};
    try {
      const response=await (options.fetchData || fetchEiaData)(selector,options);
      if (response.rows.some(item=>Object.entries(selector.facets).some(([k,v])=>!(Array.isArray(v)?v:[v]).map(String).includes(String(item[k]))))) throw eiaError('unexpected_facet');
      for (const job of group) {
        const rows=response.rows.filter(item=>String(item[facet])===String(job.selector.facets[facet]));
        responses.set(job,{...response,rows,total:response.complete?rows.length:response.total});
      }
    } catch(error) {for (const job of group) responses.set(job,{error});}
  }
  return responses;
}
function alternativeLabel(row, request) {
  const label = request.excludedSectors.length && !row.excludedSectors?.length
    ? `${capitalize(row.product)} ${row.activity} — all sectors, including ${request.excludedSectors.join(', ')}`
    : row.eiaName;
  return `${label} (${row.unit}; ${row.basisLabel.replace('{sector}',row.sectorSupported && row.sectorMapping[request.sector] ? `${request.sector} sector` : 'all sectors')})`;
}
function noRow(request, geo, topic, catalog, topicIndex) {
  const checkedStatus=coverageStatus(request,geo,topic);
  const unavailable=findNotAvailable(request,geo,topic,catalog);
  if(unavailable)return {geography:geo,product:topic.product,activity:topic.activity,status:'not_available',statusLabel:'No data for these years',series:null,coverageStatus:checkedStatus,message:`${coverageMessage(checkedStatus)}: ${unavailable.label || `${topic.product} ${topic.activity}`} for ${placeDisplayName(geo)}.`,alternatives:lookupAlternatives(request,geo,topic,catalog).map(row=>({label:alternativeLabel(row,request),lookupRowKey:row.key,topicIndex}))};
  const alternatives=lockedFormVocabulary().activity.filter(a=>a!==topic.activity).filter(activity=>findLookupRows(request,geo,{...topic,activity},{catalog}).length).map(activity=>{const row=findLookupRows(request,geo,{...topic,activity},{catalog})[0];return {label:`${capitalize(topic.product)} ${activity}`,lookupRowKey:row.key,topicIndex};});
  return {geography:geo,product:topic.product,activity:topic.activity,status:catalog.rows.some(r=>r.product===topic.product&&r.activity===topic.activity)?'empty':'not_supported',statusLabel:'No data for these years',series:null,coverageStatus:checkedStatus,message:`${coverageMessage(checkedStatus)}: ${topic.product} ${topic.activity} for ${placeDisplayName(geo)}.`,alternatives};
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
    const year=Number(String(item.period).slice(0,4));
    if (request.years?.start && year<request.years.start || typeof request.years?.end==='number' && year>request.years.end) continue;
    const raw = item[row.dataColumn], numeric = (typeof raw==='number'||typeof raw==='string') && String(raw).trim()!=='' && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(String(raw).trim()) && Number.isFinite(Number(raw));
    const value = numeric ? Number(raw) : null;
    if (seen.has(item.period)) {
      if (seen.get(item.period).value !== value || seen.get(item.period).symbol !== (!numeric && raw!=null?String(raw):undefined)) throw eiaError('conflicting_observations');
      duplicateRows++; continue;
    }
    seen.set(item.period,{period:item.period,value,...(!numeric&&raw!=null?{symbol:String(raw),meaning:EIA_SYMBOLS[String(raw)]||'EIA symbol (meaning not verified)'}:{})});
    if (!numeric) missingValues++;
  }
  const observations = [...seen.values()].sort((a,b)=>a.period.localeCompare(b.period));
  if (!observations.length) return null;
  const points=observations.filter(p=>Number.isFinite(p.value)),displayPoints=points.length?points:observations;
  const seriesId = `${selector.route} | ${Object.entries(selector.facets).map(([k,v])=>`${k}=${v}`).join('; ')} | ${selector.dataColumn} | ${selector.frequency}`;
  const fallbackLabel = selector.frequency !== request.frequency
    ? `${capitalize(selector.frequency)} data shown; ${request.frequency} data is not available for this measure.` : null;
  const notes = [row.usCountryFallback?'US data from EIA international country series (USA).':null,!response.complete ? `Incomplete response: ${response.rows.length} of ${response.total} reported rows received; the chart may omit observations.` : null,
    missingValues ? `${missingValues} observation values are missing; they are omitted from the chart, not replaced with zero.` : null,
    duplicateRows ? `${duplicateRows} identical duplicate observations were removed.` : null,
    request.years?.start && Number(displayPoints[0].period.slice(0,4))>request.years.start ? `EIA data for this starts in ${displayPoints[0].period}.` : null,
    typeof request.years?.end==='number' && Number(displayPoints.at(-1).period.slice(0,4))<request.years.end ? `EIA data for this ends in ${displayPoints.at(-1).period}.` : null].filter(Boolean);
  return { lookup:true, lookupRowKey:row.key, candidateId:`lookup:${row.key}:${geography.code}`, seriesId, certainty:null, selectorVerified:true,
    selector, country:geography.name, countryCode:geography.code, product:row.product, activity:row.activity,qualifier:row.qualifier || null,otherBases:row.otherBases || [],
    productId:row.product,activityId:row.activity,unitFacet:row.unit,frequency:selector.frequency,unit:row.unit,
    title:describeSeries(row,response.rows[0]), eiaName:describeSeries(row,response.rows[0]), description:row.description,
    basisLabel:row.basisLabel.replace('{sector}',request.sector ? `${request.sector} sector` : 'all sectors'),otherMeasuresExist:row.otherMeasuresExist,regionLabel:row.region?.label || null,
    placeDisplayName:placeDisplayName(geography),statusLabel:observationStatus(points),
    sector:request.sector || null, sectorLabel:request.sector ? `${capitalize(request.sector)} sector` : 'All sectors',
    fallbackLabel, alternative, completenessNote:notes.join(' '), total:response.total,rowsReceived:response.rows.length,
    complete:response.complete,missingValues,duplicateRows,points,observations,
    coverage:{start:displayPoints[0].period,end:displayPoints.at(-1).period,count:points.length},latestPeriod:[...points].reverse().find(p=>Number.isFinite(p.value))?.period || observations.at(-1).period,latestValue:[...points].reverse().find(p=>Number.isFinite(p.value))?.value ?? null,
    question:request.query || '', years:request.years || null, downloadedAt:new Date().toISOString(),source:SOURCE };
}

// Both the HTTP route and evaluation use this boundary, including browser form revalidation.
export async function searchLookup(query, submittedIntent, action = {}, options = {}) {
  const catalog = options.catalog || lookupCatalog;
  const context=submittedContext(query,submittedIntent,action),intent=context.intent;
  let request={...context.request,query};
  const switches=intent.lockedForm?placeSwitches(intent.lockedForm,undefined,context.geographyText):[];
  if(switches.length)intent.replyAbout='geography';
  const base = {mode:'lookup',query,intent,understood:intent.understood || '',source:SOURCE,selectedSeries:null,selectedComparison:null,selectedComparisons:[],results:[],choices:[],freeText:true};
  if (!intent.lockedForm && action.choice) request=applyChoice(request,action.choice);
  if (request.clarification.needed || !request.geographies.length || !request.topics.length || request.topics.some(topic=>!topic.product || !topic.activity)) {
    return {...base,needsClarification:true,...(intent.lockedForm ? clarificationFor(intent.lockedForm,context.placeStep,{query:context.geographyText||query,catalog})
      : {userMessage:intent.clarificationMessage || 'What should I look up?',choices:choicesFor(request,catalog)})};
  }
  const targetIndex = Number(action.topicIndex ?? 0);
  const override = action.lookupRowKey ? catalog.rows.find(row=>row.key===action.lookupRowKey && row.verification==='verified') : null;
  if (action.lookupRowKey && (!override || !Number.isInteger(targetIndex) || !request.topics[targetIndex]
    || !request.geographies.some(geo=>rowFitsGeography(override,geo,request,catalog)))) throw invalidChoice();
  if (!override && request.regions?.length===1 && request.topics.length===1 && request.geographies.every(g=>!findLookupRows(request,g,request.topics[0],{catalog}).length)) {
    const topic=request.topics[0],region=request.regions[0],choices=regionAlternatives(request,region,topic,catalog,0);
    return {...base,needsClarification:false,userMessage:`We don't have ${topic.product} ${topic.activity} for ${region.name} yet`,
      choices:choices.length ? choices : [{label:'Edit search',editSearch:true}]};
  }
  const results = [];
  for (const [topicIndex,topic] of request.topics.entries()) {
    let rows = request.geographies.map(geo=>findLookupRows(request,geo,topic,{catalog}));
    const availableRows=rows;
    const common = rows[0]?.find(row=>rows.every(list=>list.some(other=>other.key===row.key)));
    if (common) rows = rows.map(()=>[common]); // Use the same published basis/unit for country comparisons when available.
    const jobs=request.geographies.map((geo,index)=>{
      const usingOverride=override && targetIndex===topicIndex && rowFitsGeography(override,geo,request,catalog);
      const selected=usingOverride?override:rows[index][0];
      const row=selected?{...selected,otherBases:[...new Set(availableRows[index].filter(r=>r.key!==selected.key).map(r=>r.unit!==selected.unit?r.unit:r.basisLabel).filter(v=>v!==selected.basisLabel))],otherMeasuresExist:selected.otherMeasuresExist || availableRows[index].some(r=>r.route!==selected.route || r.dataColumn!==selected.dataColumn || r.unit!==selected.unit || r.basisLabel!==selected.basisLabel)}:null;
      const isAlternative=Boolean(usingOverride && !findLookupRows(request,geo,topic,{catalog}).some(r=>r.key===row.key));
      const selectedRequest=isAlternative?{...request,sector:row.sectorSupported && row.sectorMapping[request.sector]?request.sector:null}:request;
      return {geo:{...geo,displayName:placeDisplayName(geo)},row,isAlternative,selectedRequest,selector:row?buildLookupSelector(row,geo,selectedRequest,catalog):null};
    });
    const batch=request.regions?.length ? await fetchRegionBatch(jobs,options,catalog) : null;
    const countries=[];
    for (const job of jobs) {
      const {geo,row,isAlternative,selectedRequest,selector}=job;
      if (!row) {countries.push(noRow(request,geo,topic,catalog,topicIndex));continue;}
      try {
        let response = batch ? batch.get(job) : await (options.fetchData || fetchEiaData)(selector,options);
        if (response.error) throw response.error;
        let series = lookupSeries(row,geo,selectedRequest,selector,response,isAlternative);
        if (!series && response.complete && !override) {
          const seen=new Set([JSON.stringify(selector)]),order=['annual','quarterly','monthly','weekly','daily'];
          const gaps=findLookupRows(request,geo,topic,{catalog}).filter(r=>r.generatedFrom && (!request.frequencyExplicit || r.frequencies.includes(request.frequency)))
            .sort((a,b)=>order.indexOf(a.frequencies[0])-order.indexOf(b.frequencies[0]));
          for(const candidate of gaps){
            const next=buildLookupSelector(candidate,geo,selectedRequest,catalog),key=JSON.stringify(next);if(seen.has(key))continue;seen.add(key);
            const fetched=await (options.fetchData || fetchEiaData)(next,options);
            series=lookupSeries({...candidate,otherMeasuresExist:true},geo,selectedRequest,next,fetched,false);
            if(series || !fetched.complete)break;
          }
        }
        if(!series && response.complete && /\b(?:last|previous|this|current) year\b/i.test(request.years?.quoted_words||'')) {
          const {start,end,...latestSelector}=selector;
          const latestResponse=await (options.fetchData || fetchEiaData)(latestSelector,options);
          const periods=latestResponse.rows.map(r=>String(r.period)).sort(),last=periods.at(-1),lastYear=Number(last?.slice(0,4));
          if(latestResponse.complete && lastYear<request.years.start){
            const rows=latestResponse.rows.filter(r=>String(r.period).startsWith(String(lastYear)));
            series=lookupSeries(row,geo,{...selectedRequest,years:null},latestSelector,{...latestResponse,rows,total:rows.length},isAlternative);
            if(series){series.years=request.years;series.completenessNote=[series.completenessNote,`EIA data for this ends in ${lastYear}; latest available year shown.`].filter(Boolean).join(' ');}
          }
        }
        if (!series?.points.length) {
          countries.push({...noRow(request,geo,topic,catalog,topicIndex),status:'empty',observationSeries:series,unit:series?.unit,message:`EIA returned no numeric observations for ${row.eiaName} in ${geo.name}.`});continue;
        }
        countries.push({geography:geo,product:topic.product,activity:topic.activity,status:'available',statusLabel:series.statusLabel,series,seriesId:series.seriesId,unit:series.unit,coverage:series.coverage,alternatives:[],message:null});
      } catch (error) {
        countries.push({geography:geo,product:topic.product,activity:topic.activity,status:'error',series:null,message:error.kind ? error.message : EIA_MESSAGES.unavailable,errorKind:error.kind || 'unavailable',alternatives:[]});
      }
    }
    const shown = countries.filter(country=>country.series);
    const chartCompatible = new Set(shown.map(country=>`${country.series.unit}|${country.series.frequency}|${country.series.basisLabel}`)).size <= 1;
    const warnings = countries.filter(country=>country.message).map(country=>({code:country.status,geographyCode:country.geography.code,message:country.message}));
    if (!chartCompatible) warnings.push({code:'different_measures',message:'These EIA measures have different units, frequencies or definitions. They are not plotted on a shared axis; no conversion was made.'});
    const comparison = countries.length > 1 ? {lookup:true,definitionId:`lookup:${topicIndex}`,title:`${capitalize(topic.product)} ${topic.activity}`,rank:null,
      definition:{product:topic.product,activity:topic.activity,frequency:shown[0]?.series.frequency,source:SOURCE},
      question:query,years:request.years,countries,warnings,chartCompatible,requestedCountryCount:countries.length,availableCountryCount:shown.length} : null;
    results.push({topicIndex,product:topic.product,activity:topic.activity,title:`${capitalize(topic.product)} ${topic.activity}`,countries,selectedComparison:comparison,selectedSeries:comparison ? null : shown[0]?.series || countries[0]?.observationSeries || null});
  }
  const choices=results.flatMap(result=>result.countries.flatMap(c=>c.alternatives || []));
  const empty=results.flatMap(r=>r.countries).every(c=>!c.series);
  if(empty && !choices.length)choices.push({label:'Edit search',editSearch:true});
  return {...base,...(empty?{userMessage:results.flatMap(r=>r.countries).map(c=>c.message).filter(Boolean).join(' ')}:{}),choices:[...switches,...(choices.length?choices.filter((c,i)=>choices.findIndex(x=>x.label===c.label)===i):[{label:'Edit search',editSearch:true}])],results,selectedSeries:results[0]?.selectedSeries || null,selectedComparison:results[0]?.selectedComparison || null,
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
