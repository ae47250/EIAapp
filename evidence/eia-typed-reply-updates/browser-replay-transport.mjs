// Offline browser replay: frozen starting forms, saved live reply outputs and EIA observations.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=process.cwd(),read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const cases=read('tests/fixtures/eia/typed-reply-updates.json').cases;
const live=cases.map(c=>read('evidence/eia-typed-reply-updates/live/'+c.id+'.json'));
const events=[],nativeFetch=globalThis.fetch;
function record(event){events.push(event);writeFileSync('/private/tmp/eia-updates-browser-events.json',JSON.stringify(events,null,2));}
globalThis.fetch=async(url,init)=>{
 const address=new URL(String(url));
 if(address.hostname==='api.openai.com'){
  const body=JSON.parse(init.body);
  if(body.text?.format?.name==='eia_search_v2'){
   const raw=body.input.split('\nRaw query: ')[1];const query=JSON.parse(raw.split('\n')[0]);const c=cases.find(c=>c.query===query);
   if(!c)throw new Error('Unknown initial replay query');record({kind:'injected-starting-form',id:c.id});return Response.json({status:'completed',output_text:JSON.stringify(c.form)});
  }
  if(body.text?.format?.name==='eia_reply_update'){
   const entry=live.find(e=>e.attempts.some(a=>a.body.input===body.input && JSON.stringify(a.body.text)===JSON.stringify(body.text)));
   if(!entry)throw new Error('Unknown field reply replay');record({kind:'replayed-live-field-answer',id:entry.id});return Response.json(entry.attempts[0].response);
  }
  throw new Error('No other OpenAI call is permitted in browser replay');
 }
 if(address.hostname==='api.eia.gov'){
  const match=live.flatMap(e=>e.eiaResponses).find(e=>address.pathname==='/v2/'+e.selector.route+'/data/' && Object.entries(e.selector.facets).every(([key,value])=>address.searchParams.get('facets['+key+'][]')===String(value)) && address.searchParams.get('frequency')===e.selector.frequency && (address.searchParams.get('start') || undefined)===e.selector.start && (address.searchParams.get('end') || undefined)===e.selector.end);
  if(!match)throw new Error('Unknown EIA request in browser replay');record({kind:'replayed-EIA-observations',selector:match.selector});
  const offset=Number(address.searchParams.get('offset')),length=Number(address.searchParams.get('length'));
  return Response.json({response:{data:match.response.rows.slice(offset,offset+length),total:String(match.response.rows.length),frequency:match.selector.frequency}});
 }
 return nativeFetch(url,init);
};
