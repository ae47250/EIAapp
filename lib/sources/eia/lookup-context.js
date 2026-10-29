import { listApprovedGeographies, resolveApprovedGeography } from './intent-routing.js';
import { geographyCode, geographyLabel, lockedFormVocabulary } from './locked-form-schema.js';
const vocabulary=lockedFormVocabulary();
const capitalize=s=>s.charAt(0).toUpperCase()+s.slice(1);
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
  const places=form.geographies.map(g=>`${g.geography.split('|')[1].trim()}${g.is_default?' (default)':''}`).join(', ') || 'place not chosen';
  const topics=form.topics.map(t=>`${t.product || 'product not chosen'} / ${t.activity || 'activity not chosen'}`).join('; ') || 'product and activity not chosen';
  return `${places}; ${topics}; ${form.sector.value || 'all sectors (default)'}; ${yearsLabel(form.years)}; ${form.frequency.value}${form.frequency.explicit?'':' (default)'}`;
}
export function clarificationFor(form, placeStep=null) {
  const about=form.clarification.about;
  let text, options=form.clarification.options;
  if (about==='geography' && placeStep==='region') return {userMessage:'Which region should I look up?',freeText:true,
    choices:lookupRegions.map(g=>({label:g.name,choice:{about:'geography',value:geographyLabel(g)}}))};
  if (about==='geography' && !options.length) return {userMessage:placeStep==='type'?'Which countries should I look up?':'Which place should I look up?',freeText:true,
    choices:[{label:'World total',choice:{about:'geography',value:vocabulary.geography.find(v=>geographyCode(v)==='WLD')}},
      {label:'All countries in a region',choice:{about:'geography_scope',value:'region'}},{label:'Type countries',choice:{about:'geography_scope',value:'type'}}]};
  if (['product','activity','frequency'].includes(about)) {
    text=`Which ${about} should I look up?`;
    if (!options.length) options=vocabulary[about].map(value=>({value,label:capitalize(value)}));
  } else if (about==='geography') text='Which place should I look up?';
  else {
    text=form.unsupported_words.length ? `I couldn't use: ${form.unsupported_words.join(', ')}. What should I look up?` : 'What should I look up?';
    if (!options.length) options=vocabulary.product.map(value=>({value,label:capitalize(value)}));
  }
  return {userMessage:text,freeText:true,choices:options.map(o=>({label:o.label,choice:{about:about==='other'?Object.keys(vocabulary).find(key=>vocabulary[key].includes(o.value)) || 'product':about,value:o.value}}))};
}
