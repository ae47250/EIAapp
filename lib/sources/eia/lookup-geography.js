import {listApprovedGeographies,resolveApprovedGeography} from './intent-routing.js';
import {geographyCode,geographyLabel} from './locked-form-schema.js';
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
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
  const group=placeCollisions(geographies).find(group=>group.some(g=>g.code===current.code));
  if(!group || /\b(?:country|state)\b/.test(clean(item.quoted_words)) || !(` ${clean(item.quoted_words)} `).includes(` ${clean(current.name)} `))return [];
  if(selected.some(g=>g.code!==current.code&&g.type==='country'&&g.code!=='WLD'))return [];
  return group.filter(g=>g.code!==current.code&&!form.excluded_geographies.some(x=>geographyCode(x.geography)===g.code)).map(g=>({label:`Did you mean ${g.name} the ${g.type==='state'?'US state':'country'}?`,choice:{about:'geography_switch',value:geographyLabel(g),from:current.code}}));
 });
}
export function isUSStateGroup(query) {return /\b(?:all|every|each)\s+(?:(?:the\s+)?(?:u\.?s\.?|united states|american)\s+states?|states?\s+(?:in|of)\s+(?:the\s+)?(?:u\.?s\.?|united states))\b/i.test(query);}
export function usStates(form) {const excluded=new Set(form.excluded_geographies.map(g=>geographyCode(g.geography)));return listApprovedGeographies().filter(g=>g.type==='state'&&!g.name.startsWith('Federal Offshore')&&!excluded.has(g.code)).sort((a,b)=>a.code.localeCompare(b.code));}
