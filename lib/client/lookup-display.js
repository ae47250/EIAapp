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
 return !values.length?'No data for these years':values.every(v=>v===0)?'Reported as zero every year':'Available';
}
export function observationText(point) {return Number.isFinite(point?.value)?formatNumber(point.value):point?.meaning||'Not available';}
export function seriesDescription(series) {return series?[series.eiaName||series.title,series.basisLabel,series.unit].filter(Boolean).join('; '):'Not available';}
export function headlineFor(series) {
 const point=[...(series?.points||[])].reverse().find(p=>Number.isFinite(p.value));if(!point)return '';
 const units={'$/MCF':'dollars per thousand cubic feet','$/GAL':'dollars per gallon','BCF':'billion cubic feet','MMCF':'million cubic feet','MST':'million short tons','TST':'thousand short tons'};
 return `${series.placeDisplayName||series.country}: ${series.product} ${series.activity}, ${formatNumber(point.value)} ${units[series.unit]||series.unit} in ${point.period.slice(0,4)} (EIA).`;
}
