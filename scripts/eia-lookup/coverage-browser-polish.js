import {execFileSync} from 'node:child_process';
// Render actual application results in the local built UI; no model requests are made here.
import {writeFileSync} from 'node:fs';
export async function createCoverageBrowser(dir){
 const {chromium}=await import(process.env.EIA_PLAYWRIGHT_PATH);
 const browser=await chromium.launch({executablePath:process.env.EIA_CHROME_PATH,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const consoleErrors=[],network=[];let current;
 await page.addInitScript(()=>{window.__chartText=[];const original=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__chartText.push(String(text));return original.call(this,text,...args);};});
 page.on('pageerror',e=>consoleErrors.push(e.message));
 page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:3189'))network.push({path:new URL(r.url()).pathname,status:r.status()});});
 await page.route('**/api/**',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api/interpret-query')return route.fulfill({json:{intent:current.intent}});
  if(u.pathname==='/api/search-eia')return route.fulfill({json:current});
  return route.abort();
 });
 async function render(result,label,{screenshot=false,download=false}={}){
  current=result;await page.goto('http://127.0.0.1:3189');
  await page.getByRole('textbox',{name:'Search query',exact:true}).fill(result.query);
  await page.getByRole('button',{name:'Search',exact:true}).click();
  await page.locator('[aria-label="Understood request"]').waitFor();
  await page.getByRole('button',{name:'Search',exact:true}).waitFor();
  await page.waitForFunction(()=>!document.querySelector('.search-panel button')?.disabled);
  const presentation=await page.evaluate(r=>{
   const sections=[...document.querySelectorAll('.results-pair')];
   const entries=(r.results||[]).flatMap((g,gi)=>(g.countries||[]).map(c=>{
    const s=sections[gi],name=c.geography.displayName||c.geography.name;
    const rows=[...(s?.querySelectorAll('.comparison-status-table tbody tr')||[])];
    const row=rows.find(tr=>tr.cells[0]?.textContent.trim()===name);
    const single=s?.querySelector('[data-status-label]');
    const legend=[...(s?.querySelectorAll('.comparison-legend span')||[])].map(e=>e.textContent.trim());
    const separate=[...(s?.querySelectorAll('[data-chart-place]')||[])].some(e=>e.getAttribute('data-chart-place')===c.geography.code&&e.querySelector('canvas'));
    const headings=[...(s?.querySelectorAll('table[aria-label="All country observations"] th')||[])].map(e=>e.textContent);
    return {geographyCode:c.geography.code,product:c.product,activity:c.activity,
      statusLabel:row?.cells[1]?.textContent.trim()||single?.textContent.trim()||null,
      inChart:separate||legend.includes(c.geography.name)||Boolean(!row&&(g.countries||[]).length===1&&single&&s?.querySelector('canvas')),
      inTable:Boolean(row&&headings.some(t=>t.includes(name)))||Boolean(s?.querySelector('.compact-observations')),
      headline:[...(s?.querySelectorAll('[data-headline]')||[])].find(e=>e.getAttribute('data-headline')===c.geography.code)?.textContent||'',
      symbolMeanings:[...(s?.querySelectorAll('table[aria-label="All country observations"] tbody tr')||[])].flatMap(tr=>{const ix=headings.findIndex(t=>t.includes(name));return ix>=0?[{period:tr.cells[0]?.textContent,meaning:tr.cells[ix]?.textContent}]:[];})};
   }));
   return {understoodLine:document.querySelector('[aria-label="Understood request"]')?.textContent,
    buttons:[...document.querySelectorAll('button')].map(b=>b.textContent.trim()),entries,
    headlineRemainder:[...document.querySelectorAll('[data-headline-remainder]')].map(e=>e.textContent).join(' '),
    emptyResultCards:sections.flatMap(s=>[...s.querySelectorAll('article.card')]).filter(e=>!e.querySelector('canvas,table,.stats,.compact-observations')&&!e.querySelector('[data-status-label]')).length,
    sections:sections.map(s=>({captions:[...s.querySelectorAll('[data-chart-caption]')].map(e=>e.textContent),headers:[...s.querySelectorAll('.comparison-status-table th')].map(e=>e.textContent),statuses:[...s.querySelectorAll('[data-status-label]')].map(e=>e.textContent)})),text:document.body.innerText,chartText:window.__chartText,canvasCount:document.querySelectorAll('canvas').length};
  },result);
  if(screenshot)await page.screenshot({path:dir+'/'+label+'.png',fullPage:true});
  if(await page.getByRole('button',{name:'Excel',exact:true}).count()){
   const exports=[];for(let index=0;index<await page.getByRole('button',{name:'Excel',exact:true}).count();index++){
   const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Excel',exact:true}).nth(index).click();const d=await promise;const file=dir+'/'+label+'-'+index+'.xlsx';await d.saveAs(file);
   const workbook=JSON.parse(execFileSync('python3',['-B',new URL('./read-polish-export.py',import.meta.url).pathname,file],{encoding:'utf8',maxBuffer:32*1024*1024}));exports.push(workbook);
   }
   const rows=exports.flatMap(w=>w.rows);
   for(const entry of presentation.entries){const values=rows.filter(row=>row.code===entry.geographyCode&&row.product===entry.product&&row.activity===entry.activity);entry.inExcel=values.length>0;const last=values.filter(p=>p.value!==null).sort((a,b)=>a.period.localeCompare(b.period)).at(-1);entry.excelLatestValue=last?.value;entry.excelLatestPeriod=last?.period;}
   presentation.workbooks=exports;presentation.excelPlaces=[...new Set(rows.map(r=>r.code))];presentation.excelMetadataFields=exports.map(w=>w.metadataFields);
  }
  writeFileSync(dir+'/'+label+'-ui.json',JSON.stringify({presentation,consoleErrors:[...consoleErrors],network:network.splice(0)},null,2)+'\n');
  return presentation;
 }
 return {render,page,close:()=>browser.close(),consoleErrors};
}
