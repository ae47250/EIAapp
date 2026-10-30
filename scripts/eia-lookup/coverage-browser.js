// Render actual application results in the local built UI; no model requests are made here.
import {writeFileSync} from 'node:fs';
export async function createCoverageBrowser(dir){
 const {chromium}=await import(process.env.EIA_PLAYWRIGHT_PATH);
 const browser=await chromium.launch({executablePath:process.env.EIA_CHROME_PATH,headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
 const consoleErrors=[],network=[];let current;
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
    text:document.body.innerText,canvasCount:document.querySelectorAll('canvas').length};
  },result);
  if(screenshot)await page.screenshot({path:dir+'/'+label+'.png',fullPage:true});
  if(download&&await page.getByRole('button',{name:'Excel',exact:true}).count()){
   const promise=page.waitForEvent('download');await page.getByRole('button',{name:'Excel',exact:true}).first().click();const d=await promise;await d.saveAs(dir+'/'+label+'.xlsx');
  }
  writeFileSync(dir+'/'+label+'-ui.json',JSON.stringify({presentation,consoleErrors:[...consoleErrors],network:network.splice(0)},null,2)+'\n');
  return presentation;
 }
 return {render,page,close:()=>browser.close(),consoleErrors};
}
