import {readFileSync} from 'node:fs';
import {ruleRequestEvidence} from './request-evidence.js';
import {listRequestEvidenceMentions,listApprovedGeographies,resolveApprovedGeography} from './intent-routing.js';
import {geographyCode,geographyLabel} from './locked-form-schema.js';
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export const geographyAmbiguities=JSON.parse(readFileSync(new URL('../../../data/eia/geography-ambiguities.json',import.meta.url),'utf8')).places;
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const occurrences=(text,word)=>[...String(text).matchAll(new RegExp('\\b'+escape(word)+'\\b','gi'))];
function ambiguousMentions(text,policies,geographies) {
 return policies.flatMap(policy=>occurrences(text,policy.word).filter(m=>!geographies.some(g=>
  clean(g.name)!==clean(policy.word) && occurrences(text,g.name).some(full=>full.index<=m.index && full.index+full[0].length>=m.index+m[0].length)))
  .map(m=>({start:m.index,end:m.index+m[0].length,text:m[0],type:'geography',policy})));
}
// Exact metadata words only. Existing request-scope evidence blocks negative or
// unresolved clauses; a name embedded in a longer full name is never defaulted.
export function resolveAmbiguousPlaces(items,excluded,text,context=items,policies=geographyAmbiguities,geographies=listApprovedGeographies()) {
 const mentions=ambiguousMentions(text,policies,geographies);
 const scopes=ruleRequestEvidence(String(text),[...listRequestEvidenceMentions(text),...mentions]).scopes;
 let next=structuredClone(items);const resolved=[];
 for(const mention of mentions) {
  const {policy}=mention;
  if(scopes.find(s=>s.start<=mention.start&&s.end>=mention.end)?.status!=='requested')continue;
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
export function placeSwitches(form,geographies=listApprovedGeographies()) {
 const selected=form.geographies.map(g=>geographies.find(x=>x.code===geographyCode(g.geography))).filter(Boolean);
 return form.geographies.flatMap((item,index)=>{
  const current=selected[index];if(!current)return [];
  const policy=geographyAmbiguities.find(p=>p.codes.includes(current.code)&&ambiguousMentions(item.quoted_words,[p],geographies).length);
  const group=policy?policy.codes.map(code=>geographies.find(g=>g.code===code)).filter(Boolean):placeCollisions(geographies).find(group=>group.some(g=>g.code===current.code));
  if(!group || /\b(?:country|state)\b/.test(clean(item.quoted_words)) || !policy && !(` ${clean(item.quoted_words)} `).includes(` ${clean(current.name)} `))return [];
  if((!policy || policy.foreignContextCode) && selected.some(g=>g.code!==current.code&&g.type==='country'&&g.code!=='WLD'))return [];
  return group.filter(g=>g.code!==current.code&&!form.excluded_geographies.some(x=>geographyCode(x.geography)===g.code)).map(g=>({label:`Did you mean ${g.name}${group.some(other=>other.code!==g.code&&other.name===g.name)?` the ${g.type==='state'?'US state':'country'}`:''}?`,choice:{about:'geography_switch',value:geographyLabel(g),from:current.code}}));
 });
}
export function isUSStateGroup(query) {return /\b(?:all|every|each)\s+(?:(?:the\s+)?(?:u\.?s\.?|united states|american)\s+states?|states?\s+(?:in|of)\s+(?:the\s+)?(?:u\.?s\.?|united states))\b/i.test(query);}
export function usStates(form) {const excluded=new Set(form.excluded_geographies.map(g=>geographyCode(g.geography)));return listApprovedGeographies().filter(g=>g.type==='state'&&!g.name.startsWith('Federal Offshore')&&!excluded.has(g.code)).sort((a,b)=>a.code.localeCompare(b.code));}
