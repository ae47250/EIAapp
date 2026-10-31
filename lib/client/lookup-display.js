import {formatNumber} from './formatting.js';
export const TOP_TEN_NOTE='Chart shows the 10 largest; all countries are in the table and Excel file';
export function chartCountries(countries) {
  const available=countries.filter(c=>observationStatus(c.series?.points)==='Available');
  if(new Set(available.map(c=>c.series.unit)).size>1)return available;
  return available.length>10 ? [...available].sort((a,b)=>[...b.series.points].reverse().find(p=>Number.isFinite(p.value)).value-[...a.series.points].reverse().find(p=>Number.isFinite(p.value)).value).slice(0,10) : available;
}
export function observationRows(countries) {
  const maps=countries.map(c=>new Map((c.series?.observations || c.observationSeries?.observations || c.series?.points || []).map(p=>[p.period,p.value===null ? p.meaning || 'Not available' : p.value])));
  const periods=[...new Set(countries.flatMap(c=>(c.series?.observations || c.observationSeries?.observations || c.series?.points || []).map(p=>p.period)))].sort();
  return periods.map(period=>({period,values:maps.map(m=>m.get(period) ?? null)}));
}
export function exportContextRows(item) {
  const periods=(item.countries ? item.countries.flatMap(c=>c.series?.observations || c.observationSeries?.observations || c.series?.points || []) : item.observations || item.points || []).map(p=>String(p.period).slice(0,4)).sort();
  const start=periods[0],end=periods.at(-1);
  return [['Question asked',item.question || ''],['Years shown',start ? start===end ? start : `${start}–${end}` : 'No observations'],
    ['Source',`Source: U.S. Energy Information Administration (data retrieved ${(item.downloadedAt || new Date().toISOString()).slice(0,10)})`]];
}

export const EIA_SYMBOLS={'--':'Not applicable','NA':'Not available','NA.':'Not available','Not Available':'Not available','W':'Withheld','-':'No data reported'};
export function observationStatus(points=[]) {
 const values=points.map(p=>p.value).filter(Number.isFinite);
 return !values.length?'No data for these years (EIA returned none)':values.every(v=>v===0)?'Reported as zero every year':'Available';
}
export function observationText(point) {return Number.isFinite(point?.value)?formatNumber(point.value):point?.meaning||'Not available';}
export function seriesDescription(series) {return series?[plainDescription(series),series.unit].filter(Boolean).join('; '):'Not available';}
export function headlineFor(series) {
 const point=[...(series?.points||[])].reverse().find(p=>Number.isFinite(p.value));if(!point)return '';
 const units={'$/MCF':'dollars per thousand cubic feet','$/GAL':'dollars per gallon','BCF':'billion cubic feet','MMCF':'million cubic feet','MST':'million short tons','TST':'thousand short tons'};
 return `${series.placeDisplayName||series.country}: ${series.qualifier ? `${series.qualifier} (part of ${series.product})` : series.product} ${series.activity}, ${formatNumber(point.value)} ${units[series.unit]||series.unit} ${/^\d{4}$/.test(point.period)?'in '+point.period+(series.activity==='prices'?' average':''):'in '+periodLabel(point.period)} (EIA).`;
}

export function seriesCardText(series) {
 const measure=series.qualifier?`${series.qualifier} (part of ${series.product})`:series.product;
 const title=`${series.placeDisplayName||series.country}: ${measure} ${series.activity}`;
 const clean=s=>String(s||'').trim().replace(/\.+$/,'');
 const parts=[...new Map([plainDescription(series)].flatMap(s=>String(s||'').split(';')).map(clean).filter(Boolean).map(s=>[s.toLowerCase(),s])).values()];
 if(series.sectorLabel&&!parts.some(s=>s.toLowerCase().includes(clean(series.sectorLabel).toLowerCase())))parts.push(clean(series.sectorLabel));
 if(series.frequency&&!series.fallbackLabel&&!parts.some(s=>s.toLowerCase().includes(series.frequency)))parts.push(`${series.frequency} data`);
 const scope=parts.join('; ');
 const other=[...new Set(series.otherBases||[])].filter(v=>v&&!/^(?:Prefer|Label|Verify|Check|Use|Fetch|Do not)\b/i.test(v)&&v!==series.unit&&clean(v)!==clean(scope));
 const lines=[scope,other.length?`Also available in ${other.join('; ')} (Other bases exist)`:null,series.regionLabel,series.fallbackLabel,series.alternative?'Alternative selected. This differs from the original request':null,series.completenessNote].map(clean).filter(Boolean);
 return {title,lines:[...new Set(lines)].filter(line=>line!==title)};
}

export function placeStatus(country) {
 if(country?.status==='error')return null;
 const series=country?.series||country?.observationSeries;
 if(series)return observationStatus(series.points||[]);
 if(country?.status==='empty' && !country?.coverageStatus)return 'No data for these years (EIA returned none)';
 return country?.coverageStatus==='EIA returns no data'?'EIA does not publish this':country?.coverageStatus==="not in EIA's catalogue"?"Not in EIA's catalogue":country?.coverageStatus?'Not yet in our checked list':'No data for these years (EIA returned none)';
}
export function placeTypeHeader(countries=[]) {
 const types=new Set(countries.map(c=>c.geography?.type || c.placeType).filter(Boolean));
 return types.size===1&&types.has('state')?'State':types.size===1&&types.has('country')?'Country':'Place';
}
export function periodLabel(period) {
 if(/^\d{4}-\d{2}$/.test(period)){const [y,m]=period.split('-');return new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(Date.UTC(Number(y),Number(m)-1,1)))+' '+y;}
 if(/^\d{4}-Q[1-4]$/.test(period))return period.replace('-',' ');
 return period;
}
export function chartPeriodCaption(points=[]) {
 const periods=points.map(p=>p.period).sort();if(!periods.length)return 'No numeric observations to plot';
 const start=periods[0],end=periods.at(-1),years=[...new Set(periods.map(p=>p.slice(0,4)))];
 if(periods.every(p=>/^\d{4}-\d{2}$/.test(p))&&years.length===1){
  const label='Monthly values for '+years[0];
  if(years[0]===String(new Date().getFullYear())&&(start.slice(5)!=='01'||end.slice(5)!=='12'))return label+'; '+periodLabel(start).replace(' '+years[0],'')+'–'+periodLabel(end)+', year not complete';
  return label;
 }
 return start===end?'Value for '+periodLabel(start):'Values from '+periodLabel(start)+' to '+periodLabel(end);
}
export function plainDescription(series) {
 const clauses=String(series.basisLabel||series.eiaName||series.title||'').split(/[;]|(?<=[.!?])\s+/).map(x=>x.trim()).filter(Boolean);
 const safe=clauses.filter(x=>! /^(?:Prefer|Label|Verify|Check|Use|Fetch|Do not)\b|before B\d|unless explicit/i.test(x));
 return [...new Map(safe.map(x=>[x.toLowerCase().replace(/\.+$/,''),x])).values()].join('; ');
}
