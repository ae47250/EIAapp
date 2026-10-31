// Independent presentation checks for EVERY scored output. No application imports.
import {isDeepStrictEqual as same} from 'node:util';
const number=x=>typeof x==='number'&&Number.isFinite(x);
const labels=['Available','Reported as zero every year','No data for these years (EIA returned none)','Not yet in our checked list','EIA does not publish this',"Not in EIA's catalogue"];
const period=p=>/^\d{4}-\d{2}$/.test(p)?new Intl.DateTimeFormat('en-US',{month:'long',timeZone:'UTC'}).format(new Date(p+'-01T00:00:00Z'))+' '+p.slice(0,4):p.replace('-Q',' Q');
function caption(points){const ps=points.filter(p=>number(p.value)).map(p=>p.period).sort(),a=ps[0],z=ps.at(-1);if(!a)return 'No numeric observations to plot';const ys=[...new Set(ps.map(p=>p.slice(0,4)))];if(ps.every(p=>/^\d{4}-\d{2}$/.test(p))&&ys.length===1){const base='Monthly values for '+ys[0];return ys[0]==='2026'&&(a.slice(5)!=='01'||z.slice(5)!=='12')?base+'; '+period(a).replace(' '+ys[0],'')+'–'+period(z)+', year not complete':base;}return a===z?'Value for '+period(a):'Values from '+period(a)+' to '+period(z);}
const research=/Prefer EIA|Label utility|before B\d|scope note not verified|verify before|qualifies under|owner standing|B\.0|B\.1|research register|scope register/i;
export function scoreEveryOutput(r,ui){const errors=[];if(!ui)return {correct:false,errors:['missing_browser_evidence']};
 if(research.test(ui.text)||research.test((ui.workbooks||[]).map(w=>w.text).join('\n')))errors.push('P4:research_text');
 for(const [gi,g]of (r.results||[]).entries()){
  const countries=g.countries||[],section=ui.sections?.[gi];
  const expectedCardStatuses=g.selectedComparison?countries.filter(c=>!c.series).map(c=>c.statusLabel):countries.map(c=>c.statusLabel);if(!same(section?.statuses||[],expectedCardStatuses))errors.push('P6:card_status:'+gi);
  for(const c of countries){const s=c.series||c.observationSeries,points=s?.points||[],values=points.map(p=>p.value).filter(number),expected=values.length?(values.every(x=>x===0)?labels[1]:labels[0]):s||!c.coverageStatus?labels[2]:c.coverageStatus==='EIA returns no data'?labels[4]:c.coverageStatus==="not in EIA's catalogue"?labels[5]:labels[3];
   const display=ui.entries.find(x=>x.geographyCode===c.geography.code&&x.product===c.product&&x.activity===c.activity);
   if(c.status==='error'||!labels.includes(c.statusLabel)||c.statusLabel!==expected||display?.statusLabel!==expected)errors.push('P6:status:'+c.geography.code);
   const statuses=(ui.workbooks||[]).flatMap(w=>w.statuses||[]).filter(x=>x.code===c.geography.code&&x.product===c.product&&x.activity===c.activity);if((c.series||g.selectedComparison)&&(!statuses.length||statuses.some(x=>x.status!==expected)))errors.push('P6:excel_status:'+c.geography.code);
   const last=points.filter(p=>number(p.value)).at(-1),shouldHeadline=Boolean(c.series)&&(g.selectedComparison?countries.filter(c=>c.series).slice(0,3).includes(c):Boolean(g.selectedSeries));if(shouldHeadline&&last&&!display?.headline)errors.push('P3:missing_headline:'+c.geography.code);if(display?.headline&&last&&!display.headline.includes(period(last.period)))errors.push('P3:headline_period:'+c.geography.code);
   if(last&&c.series&&(display?.excelLatestValue!==last.value||display?.excelLatestPeriod!==last.period))errors.push('excel_full_precision:'+c.geography.code);
  }
  let chart=countries.filter(c=>c.series?.points?.some(p=>number(p.value)&&p.value!==0));if(new Set(chart.map(c=>c.series.unit)).size===1&&chart.length>10)chart=[...chart].sort((a,b)=>b.series.points.filter(p=>number(p.value)).at(-1).value-a.series.points.filter(p=>number(p.value)).at(-1).value).slice(0,10);
  const pts=c=>(c.series.chartSeries||c.series).points||[];
  const expectedCaptions=g.selectedComparison?(g.selectedComparison.chartCompatible===false?chart.map(c=>caption(pts(c))):chart.length?[caption(chart.flatMap(pts))]:[]):g.selectedSeries?.points?.some(p=>number(p.value)&&p.value!==0)?[caption((g.selectedSeries.chartSeries||g.selectedSeries).points)]:[];
  const plotted=g.selectedComparison?(g.selectedComparison.chartCompatible===false?chart.map(pts):chart.length?[chart.flatMap(pts)]:[]):g.selectedSeries?.points?.some(p=>number(p.value)&&p.value!==0)?[(g.selectedSeries.chartSeries||g.selectedSeries).points]:[];
  for(const points of plotted){const periods=points.filter(p=>number(p.value)).map(p=>p.period).sort();if(periods.length&&(!ui.chartText?.includes(periods[0])||!ui.chartText?.includes(periods.at(-1))))errors.push('P3:plotted_endpoints:'+gi);}
  if(!same(section?.captions||[],expectedCaptions))errors.push('P3:chart_caption:'+gi);
  {const types=new Set(countries.map(c=>c.geography.type)),header=types.size===1&&types.has('state')?'State':types.size===1&&types.has('country')?'Country':'Place';if(g.selectedComparison&&section?.headers?.[0]!==header)errors.push('P5:header:'+gi);for(const w of ui.workbooks||[]){if(!w.rows.some(row=>row.product===countries[0]?.product&&row.activity===countries[0]?.activity))continue;if(!w.headers.includes(header)||['State','Country','Place'].some(x=>x!==header&&w.headers.includes(x)))errors.push('P5:excel_header:'+gi);}}
 }
 return {correct:!errors.length,errors};
}
export function scoreF(r,k,ui,policy){const e=k.expected,f=r.intent?.lockedForm,errors=[],codes=f?.geographies.flatMap(g=>g.geography.split('|')[0].trim().split('+'))||[],shown=(r.results||[]).flatMap(g=>g.countries||[]),buttons=(r.choices||[]).map(c=>c.label);
 if(e.places&&!same(codes,e.places))errors.push('places');if(e.product&&!f?.topics.every(t=>t.product===e.product&&t.activity===e.activity))errors.push('topic');
 if(e.noIndiana&&buttons.some(b=>b.includes('Indiana')))errors.push('Indiana');if(e.noQuestion&&r.needsClarification)errors.push('question');if(e.noNi&&/\bni\b/i.test(r.userMessage||''))errors.push('ni_question');
 for(const b of e.buttons||[])if(!buttons.includes(b))errors.push('button:'+b);if(e.question&&f?.clarification.about!==e.question)errors.push('question');
 if(e.data&&!shown.some(c=>c.series?.complete&&c.series.points?.some(p=>number(p.value))))errors.push('no_data');
 if(e.states&&(!same([...codes].sort(),policy.states)||shown.length!==51||ui.sections?.[0]?.headers?.[0]!=='State'))errors.push('states');
 if(e.annual){const s=shown[0]?.series;if(s?.selector?.route!=='total-energy'||s.selector.facets.msn!=='MGUCUUS'||s.frequency!=='annual'||s.latestPeriod!=='2025'||s.latestValue!==3.396||s.chartSeries?.frequency!=='monthly')errors.push('annual_measure');}
 return {correct:!errors.length,errors};
}
