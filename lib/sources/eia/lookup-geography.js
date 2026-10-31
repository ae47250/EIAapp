import {readFileSync} from 'node:fs';
import {ruleRequestEvidence} from './request-evidence.js';
import {geographyNameForms,listRequestEvidenceMentions,listApprovedGeographies,resolveApprovedGeography} from './intent-routing.js';
import {geographyCode,geographyLabel} from './locked-form-schema.js';
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const geographyAmbiguities=JSON.parse(readFileSync(new URL('../../../data/eia/geography-ambiguities.json',import.meta.url),'utf8')).places;
// Exact approved data concepts outrank fuzzy geography candidates. Equal
// spelling distance across domains is ambiguous and is left to clarification.
const routingConfig=JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json',import.meta.url),'utf8'));
const vocabulary=routingConfig.vocabulary;
const conceptTerms=[...Object.keys(vocabulary.ambiguousProducts||{}),...new Set(['products','activities','sectors','frequencies'].flatMap(kind=>Object.entries(vocabulary[kind]).flatMap(([name,value])=>[name,...(value.terms||[])])))];
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const occurrences=(text,word)=>[...String(text).matchAll(new RegExp('\\b'+escape(word)+'\\b','gi'))];
const nameOccurrences=(text,name)=>[...String(text).matchAll(new RegExp('(?<![\\p{L}\\p{N}])'+clean(name).split(' ').map(escape).join('[^\\p{L}\\p{N}]+')+'(?![\\p{L}\\p{N}])','giu'))];
// Model-selected codes are candidates. Their own quote must name the place;
// ungrounded codes must not influence later ambiguity/context decisions.
export function quoteNamesPlace(item,geographies=listApprovedGeographies()) {
 const code=geographyCode(item.geography),geo=geographies.find(g=>g.code===code);
 if(!geo)return false;
 const words=clean(item.quoted_words);
 if(geo.type==='state'&&isUSStateGroup(item.quoted_words))return true;
 const names=[...geographyNameForms(geo.name),...Object.entries(routingConfig.geographyAliases||{}).filter(([,value])=>value===code).map(([name])=>name),...geographyAmbiguities.filter(p=>p.codes.includes(code)).map(p=>p.word)];
 const mentions=[...names,code].flatMap(name=>occurrences(words,clean(name)));
 return mentions.some(m=>!geographies.some(other=>other.code!==code&&geographyNameForms(other.name).some(name=>occurrences(words,clean(name)).some(full=>full.index<=m.index&&full.index+full[0].length>=m.index+m[0].length&&full[0].length>m[0].length))));
}
function ambiguousMentions(text,policies,geographies) {
 return policies.flatMap(policy=>occurrences(text,policy.word).filter(m=>!geographies.some(g=>
  clean(g.name)!==clean(policy.word) && occurrences(text,g.name).some(full=>full.index<=m.index && full.index+full[0].length>=m.index+m[0].length)))
  .map(m=>({start:m.index,end:m.index+m[0].length,text:m[0],type:'geography',policy})));
}
// Exact metadata words only. Existing request-scope evidence blocks negative or
// unresolved clauses; a name embedded in a longer full name is never defaulted.
export function resolveAmbiguousPlaces(items,excluded,text,context=items,policies=geographyAmbiguities,geographies=listApprovedGeographies(),scopeStatus='requested') {
 const mentions=ambiguousMentions(text,policies,geographies);
 const scopes=ruleRequestEvidence(String(text),[...listRequestEvidenceMentions(text),...mentions]).scopes;
 let next=structuredClone(items);const resolved=[];
 for(const mention of mentions) {
  const {policy}=mention;
  const status=scopes.find(s=>s.start<=mention.start&&s.end>=mention.end)?.status;
  if(scopeStatus==='quoted'?!['requested','excluded'].includes(status):status!==scopeStatus)continue;
  const explicitContext=/\b(?:state|country)\b/i.test(text);
  const w=escape(policy.word),explicitPhrase=String(text).match(new RegExp('\\b(?:((?:US )?state|country) of '+w+'|'+w+' (?:the )?((?:US )?state|country))\\b','i'));
  const explicitType=explicitPhrase?(/state/i.test(explicitPhrase[1]||explicitPhrase[2])?'state':'country'):null;
  const otherForeign=context.some(g=>{const geo=geographies.find(x=>x.code===geographyCode(g.geography));return geo?.type==='country'&&!policy.codes.includes(geo.code)&&!['USA','US','WLD'].includes(geo.code);});
  const usContext=context.some(g=>['USA','US'].includes(geographyCode(g.geography)));
  const international=policy.internationalHints?.some(h=>occurrences(text,h).length);
  const code=(explicitType && geographies.find(g=>policy.codes.includes(g.code)&&g.type===explicitType)?.code) || (policy.foreignContextCode && (otherForeign || international&&!usContext) ? policy.foreignContextCode : policy.defaultCode);
  if(excluded.some(g=>geographyCode(g.geography)===code))continue;
  const geo=geographies.find(g=>g.code===code);if(!geo)throw new Error('Ambiguity default is absent from approved geography metadata');
  // Preserve explicit state/country decisions, including switch button evidence.
  const explicit=next.find(g=>policy.codes.includes(geographyCode(g.geography))&&/\b(?:state|country)\b/i.test(g.quoted_words));
  if(explicit && explicitContext)continue;
  next=next.filter(g=>!policy.codes.includes(geographyCode(g.geography)) || !ambiguousMentions(g.quoted_words, [policy],geographies).length);
  if(!next.some(g=>geographyCode(g.geography)===code))next.push({geography:geographyLabel(geo),quoted_words:explicitPhrase?.[0] || mention.text,is_default:false});
  resolved.push(mention.text);
 }
 // Keep the user's place order, including a default inserted beside another place.
 next.sort((a,b)=>{const at=g=>{const i=String(text).toLowerCase().indexOf(String(g.quoted_words).toLowerCase());return i<0?Number.MAX_SAFE_INTEGER:i;};return at(a)-at(b);});
 return {items:next,resolved};
}
export function placeCollisions(geographies=listApprovedGeographies()) {
 const groups=new Map();
 for(const g of geographies){const key=clean(g.name);if(!groups.has(key))groups.set(key,new Map());groups.get(key).set(g.code,g);}
 return [...groups.values()].map(g=>[...g.values()]).filter(g=>g.length>1);
}
export function placeDisplayName(geo,geographies) {
 if(!geo)return '';
 return geo.name+(placeCollisions(geographies).some(group=>group.some(g=>g.code===geo.code))?` (${geo.type==='state'?'US state':'country'})`:'');
}
export function placeSwitches(form,geographies=listApprovedGeographies(),text='') {
 const selected=form.geographies.map(g=>geographies.find(x=>x.code===geographyCode(g.geography))).filter(Boolean);
 const switches=form.geographies.flatMap((item,index)=>{
  const current=selected[index];if(!current)return [];
  const policy=geographyAmbiguities.find(p=>p.codes.includes(current.code)&&ambiguousMentions(item.quoted_words,[p],geographies).length);
  const group=policy?policy.codes.map(code=>geographies.find(g=>g.code===code)).filter(Boolean):placeCollisions(geographies).find(group=>group.some(g=>g.code===current.code));
  if(!group || /\b(?:country|state)\b/.test(clean(item.quoted_words)) || !policy && !(` ${clean(item.quoted_words)} `).includes(` ${clean(current.name)} `))return [];
  if((!policy || policy.foreignContextCode) && selected.some(g=>g.code!==current.code&&g.type==='country'&&g.code!=='WLD'))return [];
  return group.filter(g=>g.code!==current.code&&!form.excluded_geographies.some(x=>geographyCode(x.geography)===g.code)).map(g=>({label:`Did you mean ${g.name}${group.some(other=>other.code!==g.code&&other.name===g.name)?` the ${g.type==='state'?'US state':'country'}`:''}?`,choice:{about:'geography_switch',value:geographyLabel(g),from:current.code}}));
 });
 const selectedCodes=new Set(form.geographies.map(g=>geographyCode(g.geography)));
 const additions=ordinaryPlaceMentions(text,geographies).filter(m=>m.suggest&&!m.accept&&!selectedCodes.has(m.geo.code)&&!(m.geo.code==='USA'&&selectedCodes.has('US'))&&!form.excluded_geographies.some(g=>geographyCode(g.geography)===m.geo.code)).map(m=>({label:`Did you also mean ${m.geo.name}?`,choice:{about:'geography_add',value:geographyLabel(m.geo)}}));
 return [...switches,...additions.filter((x,i,a)=>a.findIndex(y=>y.choice.value===x.choice.value)===i)];
}
export function isUSStateGroup(query) {return /\b(?:all|every|each)\b[^.!?;]*\bstate(?:s)?\b/i.test(String(query).replace(/U\.S\./gi,'US')); }
export function usStates(form) {const excluded=new Set(form.excluded_geographies.map(g=>geographyCode(g.geography)));return listApprovedGeographies().filter(g=>g.type==='state'&&!g.name.startsWith('Federal Offshore')&&!excluded.has(g.code)).sort((a,b)=>a.code.localeCompare(b.code));}

// A single edit (including one adjacent transposition); exact names win and ties
// remain unresolved. This is bounded metadata reconciliation, not a ranking score.
export function oneEdit(a,b) {
 if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const d=[...a].map((v,i)=>v!==b[i]?i:-1).filter(i=>i>=0);return d.length===1 || d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]];}
 if(a.length>b.length)[a,b]=[b,a];let i=0;while(i<a.length&&a[i]===b[i])i++;return a.slice(i)===b.slice(i+1);
}
export function ordinaryPlaceMentions(text,geographies=listApprovedGeographies()) {
 const letters=String(text).replace(/[^A-Za-z]/g,''),allCaps=letters.length>0&&letters.replace(/[^A-Z]/g,'').length/letters.length>.7,full=geographies.flatMap(g=>occurrences(text,g.name));
 return [...String(text).matchAll(/\b[A-Za-z]{2}\b/g)].flatMap(m=>{
  const geo=geographies.find(g=>(g.type==='state'&&g.code===m[0].toUpperCase())||(m[0].toLowerCase()==='us'&&g.code==='USA'));
  if(!geo||full.some(f=>f.index<=m.index&&f.index+f[0].length>=m.index+2))return [];
  const prefix=String(text).slice(0,m.index),suffix=String(text).slice(m.index+2);
  const greeting=!prefix.trim()&&/^\s*,/.test(suffix);
  const conjunction=m[0].toLowerCase()==='or' && conceptTerms.some(t=>new RegExp('\\b'+escape(t)+'\\s*$','i').test(prefix)) && conceptTerms.some(t=>new RegExp('^\\s*'+escape(t)+'\\b','i').test(suffix));
  const lowercase=allCaps||m[0]===m[0].toLowerCase();
  const accept=!greeting && !conjunction && (m[0]===m[0].toUpperCase()&&!allCaps || m[0].toLowerCase()==='us'&&(/\b(?:in|vs|versus|than|and|compared to)\s*$/i.test(prefix)||/^\s+(?:average|total)\b/i.test(suffix)));
  const mention={start:m.index,end:m.index+2,text:m[0],type:'geography',geo,accept,lowercase,greeting,conjunction,suggest:m[0].toLowerCase()==='us'};
  const scope=ruleRequestEvidence(text,[...listRequestEvidenceMentions(text),mention]).scopes.find(s=>s.start<=mention.start&&s.end>=mention.end);
  return scope?.status==='requested'?[mention]:[];
 });
}
export function resolveQuotedPlaces(items,excluded,text,context=items,geographies=listApprovedGeographies(),scopeStatus='requested') {
 const places=geographies.filter(g=>g.code!=='US'&&g.name.length>=4),matches=[];
 for(const geo of places)for(const name of geographyNameForms(geo.name))for(const m of nameOccurrences(text,name))matches.push({geo,start:m.index,end:m.index+m[0].length,text:m[0],type:'geography'});
 for(const [name,code]of Object.entries(routingConfig.geographyAliases||{})){
  const geo=geographies.find(g=>g.code===code);if(!geo)continue;
  for(const m of nameOccurrences(text,name))matches.push({geo,start:m.index,end:m.index+m[0].length,text:m[0],type:'geography'});
 }
 for(const m of String(text).matchAll(/\busa\b/gi))matches.push({geo:geographies.find(g=>g.code==='USA'),start:m.index,end:m.index+m[0].length,text:m[0],type:'geography'});
 const concepts=conceptTerms.flatMap(term=>occurrences(text,term).map(m=>({start:m.index,end:m.index+m[0].length})));
 const exact=matches.filter(m=>!matches.some(o=>o.end-o.start>m.end-m.start&&o.start<=m.start&&o.end>=m.end));
 for(const m of String(text).matchAll(/\b[\p{L}]{5,}\b/gu)){
  if([...exact,...concepts].some(e=>e.start<=m.index&&e.end>=m.index+m[0].length))continue;
  if(conceptTerms.some(term=>!term.includes(' ')&&oneEdit(clean(m[0]),clean(term))))continue;
  const candidates=places.filter(g=>!g.name.includes(' ')&&oneEdit(clean(m[0]),clean(g.name)));
  if(candidates.length===1)exact.push({geo:candidates[0],start:m.index,end:m.index+m[0].length,text:m[0],type:'geography'});
 }
 // Apply the same one-edit reconciliation to complete multi-word names.
 const words=[...String(text).matchAll(/[\p{L}]+/gu)];
 const lengths=[...new Set(places.map(g=>clean(g.name).split(' ').length).filter(n=>n>1))];
 for(const n of lengths)for(let i=0;i+n<=words.length;i++){
  const start=words[i].index,end=words[i+n-1].index+words[i+n-1][0].length,phrase=String(text).slice(start,end);
  if([...exact,...concepts].some(m=>m.start<=start&&m.end>=end))continue;
  const candidates=places.filter(g=>clean(g.name).split(' ').length===n&&oneEdit(clean(phrase),clean(g.name)));
  if(candidates.length===1)exact.push({geo:candidates[0],start,end,text:phrase,type:'geography'});
 }
 const ordinary=ordinaryPlaceMentions(text,geographies).filter(m=>!(m.geo.code==='USA'&&isUSStateGroup(text)));
 const scopes=ruleRequestEvidence(text,[...listRequestEvidenceMentions(text),...exact]).scopes;
 const positive=exact.filter(m=>{const status=scopes.find(s=>s.start<=m.start&&s.end>=m.end)?.status;return (scopeStatus==='quoted'?['requested','excluded'].includes(status):status===scopeStatus) && !(m.geo.code==='USA'&&isUSStateGroup(text)) && !ordinary.some(o=>o.start===m.start&&o.end===m.end&&!o.accept);});
 let next=structuredClone(items).filter(item=>{
  const code=geographyCode(item.geography);
  // Keep invalid quote origins visible to the existing validation/re-ask.
  if(clean(item.quoted_words)&&!clean(text).includes(clean(item.quoted_words)))return true;
  if(!quoteNamesPlace(item,geographies) && !(item.is_default&&item.quoted_words===''))return false;
  if(ordinary.some(m=>m.geo.code===code&&(m.greeting||m.conjunction||m.geo.code==='USA'&&!m.accept||!m.accept&&!m.lowercase||m.text.toLowerCase()==='in'&&positive.some(p=>p.geo.code!==code&&p.start>=m.end&&String(text).slice(m.end,p.start).trim()==='')))&&!positive.some(p=>p.geo.code===code))return false;
  return !positive.some(m=>!geographyAmbiguities.some(p=>clean(p.word)===clean(m.text))
    && occurrences(item.quoted_words,m.text).length && code!==m.geo.code
    && !positive.some(p=>p.geo.code===code));
 });
 for(const m of [...positive,...ordinary.filter(m=>m.accept)]){
  if(geographyAmbiguities.some(p=>clean(p.word)===clean(m.text)))continue;
  if(excluded.some(g=>geographyCode(g.geography)===m.geo.code))continue;
  if(!next.some(g=>geographyCode(g.geography)===m.geo.code))next.push({geography:geographyLabel(m.geo),quoted_words:m.text,is_default:false});
 }
 const supportedContext=context.filter(item=>quoteNamesPlace(item,geographies));
 const resolution=resolveAmbiguousPlaces(next,excluded,text,[...supportedContext,...next],geographyAmbiguities,geographies,scopeStatus);
 return {...resolution,resolved:[...resolution.resolved,...positive.map(m=>m.text),...ordinary.filter(m=>m.accept).map(m=>m.text)]};
}
export function resolvedPlaceQuoteSupports(item) {
 return quoteNamesPlace(item)||resolveQuotedPlaces([],[],item.quoted_words,[],undefined,'quoted').items.some(g=>geographyCode(g.geography)===geographyCode(item.geography));
}
export function reconcileExcludedPlaceQuotes(items,context=[]) {
 return items.flatMap(item=>quoteNamesPlace(item)?[item]:resolveQuotedPlaces([],[],item.quoted_words,context,undefined,'quoted').items)
  .filter((item,index,all)=>all.findIndex(other=>other.geography===item.geography)===index);
}
