export const TOP_TEN_NOTE='Chart shows the 10 largest; all countries are in the table and Excel file';
export function chartCountries(countries) {
  const available=countries.filter(c=>c.series?.points?.length);
  return available.length>10 ? [...available].sort((a,b)=>b.series.points.at(-1).value-a.series.points.at(-1).value).slice(0,10) : available;
}
export function observationRows(countries) {
  const maps=countries.map(c=>new Map((c.series?.points || []).map(p=>[p.period,p.value])));
  const periods=[...new Set(countries.flatMap(c=>c.series?.points.map(p=>p.period) || []))].sort();
  return periods.map(period=>({period,values:maps.map(m=>m.get(period) ?? null)}));
}
export function exportContextRows(item) {
  const periods=(item.countries ? item.countries.flatMap(c=>c.series?.points || []) : item.points || []).map(p=>String(p.period).slice(0,4)).sort();
  const start=periods[0],end=periods.at(-1);
  return [['Question asked',item.question || ''],['Years shown',start ? start===end ? start : `${start}–${end}` : 'No observations'],
    ['Source',`Source: U.S. Energy Information Administration (data retrieved ${(item.downloadedAt || new Date().toISOString()).slice(0,10)})`]];
}
