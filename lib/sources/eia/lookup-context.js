import {ambiguityOptions} from './lookup-ambiguity.js';
import {lookupCatalog,ambiguousProductChoices,lookupRequestFromIntent,findLookupRows,lexicalQualifiers,coverageMessage,coverageStatus} from './lookup-list.js';
import {placeDisplayName,isUSStateGroup,placeSwitches} from './lookup-geography.js';
import { listApprovedGeographies, resolveApprovedGeography } from './intent-routing.js';
import { geographyCode, geographyLabel, lockedFormVocabulary } from './locked-form-schema.js';
const vocabulary=lockedFormVocabulary();
const capitalize=s=>s.charAt(0).toUpperCase()+s.slice(1);
const unsupportedMessage=(form,message)=>form.unsupported_words.length&&!message.startsWith("We can't look up ")
  ? `We can't look up ${form.unsupported_words.map(word=>`'${word}'`).join(' or ')} yet.` : null;
const questionCopy=(form,message)=>({userMessage:message,...(unsupportedMessage(form,message)?{unsupportedMessage:unsupportedMessage(form,message)}:{})});
export const regionNames=['Africa','Asia & Oceania','Central & South America','Eurasia','Europe','Middle East','North America'];
export const lookupRegions=regionNames.map(name=>listApprovedGeographies().find(g=>g.name===name));
if (lookupRegions.some(g=>!g)) throw new Error('Required EIA region metadata is missing.');
export function expandGeographies(items) {
  const seen=new Set();
  return items.flatMap(item=> {
    const geo=resolveApprovedGeography(geographyCode(item.geography));
    return (geo?.code.includes('+') ? geo.code.split('+').map(resolveApprovedGeography) : [geo]).filter(Boolean)
      .map(g=>({...g,is_default:item.is_default===true,...(geo?.code.includes('+')?{requestedRegion:geo.name}: {})}));
  }).filter(g=>!seen.has(g.code)&&seen.add(g.code));
}
export function yearBounds(years, frequency) {
  if (!years || years.start===null) return {};
  const bound=(year,end)=> frequency==='annual' ? String(year) : frequency==='monthly' ? `${year}-${end?'12':'01'}`
    : frequency==='quarterly' ? `${year}-Q${end?'4':'1'}` : `${year}-${end?'12-31':'01-01'}`;
  return {start:bound(years.start,false),...(typeof years.end==='number'?{end:bound(years.end,true)}:{})};
}
export function yearsLabel(years) {
  return years?.start ? years.start===years.end ? String(years.start) : `${years.start}–${years.end}` : 'all available years (default)';
}
export function understoodLine(form) {
  if (!form) return 'Request needs clarification';
  const excluded=new Set(expandGeographies(form.excluded_geographies || []).map(g=>g.code));
  const places=form.geographies.map(g=>{
    const geo=resolveApprovedGeography(geographyCode(g.geography));
    const members=geo?.code.includes('+')?expandGeographies([g]).filter(member=>!excluded.has(member.code)).map(member=>placeDisplayName(member)).join(', '):'';
    return `${placeDisplayName(geo)}${members?` (${members})`:''}${g.is_default?' (default)':''}`;
  }).join(', ') || 'place not chosen';
  const topics=form.topics.map(t=>`${t.product || 'product not chosen'} / ${t.activity || 'activity not chosen'}`).join('; ') || 'product and activity not chosen';
  return `${places}; ${topics}; ${form.sector.value || 'all sectors (default)'}; ${yearsLabel(form.years)}; ${form.frequency.value}${form.frequency.explicit?'':' (default)'}`;
}
export function clarificationFor(form, placeStep=null, context={}) {
  const about=form.clarification.about;
  let text, options=form.clarification.options;
  const sectorQuestion=about==='other'&&options.length>0&&options.every(o=>vocabulary.sector.includes(o.value));
  if(sectorQuestion)return {...questionCopy(form,'Which sector should I look up?'),freeText:true,choices:vocabulary.sector.map(value=>({label:value.split(' ').map(capitalize).join(' '),choice:{about:'sector',value}}))};
  const ambiguity=ambiguityOptions(form,context.query||'');
  if(ambiguity&&ambiguity.about===about&&!['product','activity'].includes(about)){
    const years=about==='other'&&ambiguity.options.every(o=>/^\d{4}$/.test(o.value));
    return {...questionCopy(form,years?'Which year should I look up?':`Which ${about==='geography'?'place':about} should I look up?`),freeText:true,choices:ambiguity.options.map(o=>({label:o.label,choice:{about:years?'years':about,value:o.value}}))};
  }
  if(ambiguity?.about===about)options=ambiguity.options;
  else if(['product','activity','other'].includes(about)){
    const field=about==='activity'?'activity':'product';
    options=vocabulary[field].map(value=>({value,label:value}));
    if(field==='product'){const ambiguous=ambiguousProductChoices(context.query||form.topics.map(t=>t.quoted_words).join(' '));if(ambiguous.length)options=ambiguous;}
  }
  const catalog=context.catalog||lookupCatalog;
  if(about==='geography' && !options.length && form.geographies.length){const switches=placeSwitches(form);if(switches.length)options=[...form.geographies.map(g=>({value:g.geography,label:placeDisplayName(resolveApprovedGeography(geographyCode(g.geography)))})),...switches.filter(c=>c.choice.about==='geography_switch').map(c=>({value:c.choice.value,label:placeDisplayName(resolveApprovedGeography(geographyCode(c.choice.value)))}))];}

  const stateGroup=isUSStateGroup(context.query||'') && catalog.rows.some(r=>r.geographyKind==='state' && form.topics.some(t=>t.product===r.product&&t.activity===r.activity));
  if(about==='geography' && isUSStateGroup(context.query||'') && !stateGroup){const request=lookupRequestFromIntent({lockedForm:form});return {...questionCopy(form,form.topics.map(t=>`${coverageMessage(coverageStatus(request,{type:'state',code:'US-states'},t))}: ${t.product} ${t.activity} for US states.`).join(' ')),freeText:true,choices:[{label:'Edit search',editSearch:true}]};}
  if (about==='geography' && stateGroup) return {...questionCopy(form,placeStep==='states-type'?'Which states should I look up?':'Which place should I look up?'),freeText:true,choices:[{label:'All US states',choice:{about:'geography_scope',value:'states'}},{label:'Type states',choice:{about:'geography_scope',value:'states-type'}}]};
  if (about==='geography' && placeStep==='region') return {...questionCopy(form,'Which region should I look up?'),freeText:true,
    choices:lookupRegions.map(g=>({label:g.name,choice:{about:'geography',value:geographyLabel(g)}}))};
  if (about==='geography' && !options.length) return {...questionCopy(form,placeStep==='type'?'Which countries should I look up?':'Which place should I look up?'),freeText:true,
    choices:[{label:'World total',choice:{about:'geography',value:vocabulary.geography.find(v=>geographyCode(v)==='WLD')}},
      {label:'All countries in a region',choice:{about:'geography_scope',value:'region'}},{label:'Type countries',choice:{about:'geography_scope',value:'type'}}]};
  if(about==='frequency'){
    const request=lookupRequestFromIntent({lockedForm:form});
    const rows=request.geographies.flatMap(g=>request.topics.flatMap(t=>findLookupRows({...request,frequencyExplicit:false},g,t,{catalog}).slice(0,1)));
    options=[...new Set(rows.flatMap(r=>r.frequencies))].filter(value=>rows.every(r=>r.frequencies.includes(value))).map(value=>({value,label:value}));
  }
  if (['product','activity','frequency'].includes(about)) {
    text=`Which ${about} should I look up?`;
    if (!options.length && about!=='frequency') options=vocabulary[about].map(value=>({value,label:value.split(" ").map(capitalize).join(" ")}));
  } else if (about==='geography') text='Which place should I look up?';
  else {
    text=form.unsupported_words.length
      ? `We can't look up ${form.unsupported_words.map(word=>`'${word}'`).join(' or ')} yet. Which available measure should I show instead?`
      : 'What should I look up?';
    if (!options.length) options=vocabulary.product.map(value=>({value,label:value.split(" ").map(capitalize).join(" ")}));
  }
  // Values determine labels; retain an explicitly named approved product qualifier.
  options=options.map(o=>({ ...o,label:about==='geography'?placeDisplayName(resolveApprovedGeography(geographyCode(o.value))):
    about==='other'&&form.unsupported_words.length
      ? `Show ${(lexicalQualifiers(o.value,o.label)[0] || o.value).split(' ').map(capitalize).join(' ')} ${form.topics[0]?.activity||''} instead`
      : (lexicalQualifiers(o.value,o.label)[0] || o.value).split(' ').map(capitalize).join(' ') }));
  if (['product','activity'].includes(about) || about==='other') {
    const field=about==='activity'?'activity':'product',request=lookupRequestFromIntent({lockedForm:form});
    options=options.filter(o=>{
      const topics=(request.topics.length?request.topics:[{product:null,activity:null,qualifiers:[]}]).map(t=>({...t,[field]:o.value,...(field==='product'?{qualifiers:lexicalQualifiers(o.value,o.label)}:{})}));
      return topics.every(t=>{
        const choices=[...(catalog.coverageOverlays||[]),...catalog.rows].filter(r=>r.verification==='verified' && (!t.product||r.product===t.product)&&(!t.activity||r.activity===t.activity)&&(!r.qualifier || t.qualifiers?.includes(r.qualifier)) && (r.generatedFrom?(r.sector||null)===(request.sector||null):!request.sector||r.sectorMapping?.[request.sector]));
        return request.geographies.length?request.geographies.every(g=>choices.some(r=>findLookupRows(request,g,{...t,product:r.product,activity:r.activity},{catalog}).some(x=>x.key===r.key))):choices.length>0;
      });
    });
  }
  const choices=options.map(o=>({label:o.label,choice:{about:about==='other'?Object.keys(vocabulary).find(key=>vocabulary[key].includes(o.value)) || 'product':about,value:o.value}}));
  if(about==='activity' && form.unsupported_words.length && form.topics.every(t=>t.product) && options.some(o=>o.value==='consumption')){
    const products=[...new Set(form.topics.map(t=>(lexicalQualifiers(t.product,t.quoted_words)[0]||t.product).split(' ').map(capitalize).join(' ')))];
    // Reuse the checked activity choice and the existing explicit-drop path.
    choices.find(c=>c.choice.value==='consumption').label=`Show ${products.join(' and ')} consumption instead`;
  }
  return {...questionCopy(form,text),freeText:true,choices};
}
