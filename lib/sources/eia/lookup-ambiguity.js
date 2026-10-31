import {readFileSync} from 'node:fs';
import {listApprovedGeographies,geographyNameForms} from './intent-routing.js';
import {geographyLabel,geographyCode} from './locked-form-schema.js';
import {oneEdit} from './lookup-geography.js';
const vocabulary=JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json',import.meta.url))).vocabulary;
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const contains=(text,term)=>(` ${clean(text)} `).includes(` ${clean(term)} `);
const unique=items=>[...new Map(items.map(o=>[o.value,o])).values()];
// Candidate choices use existing form option strings and existing slot values.
// No new form field or model schema is introduced.
export function ambiguityOptions(form,text) {
 const ambiguousProducts=[];
 for(const [word,spec]of Object.entries(vocabulary.ambiguousProducts||{})){
  if(!contains(text,word))continue;
  const explicit=spec.alternatives.some(value=>[value,...(vocabulary.products[value]?.terms||[])].some(term=>clean(term)!==clean(word)&&contains(term,word)&&contains(text,term)));
  const context=(spec.contexts||[]).some(c=>c.terms.some(term=>contains(text,term)));
  if(!explicit&&!context)ambiguousProducts.push({word,about:'product',options:spec.alternatives.map(value=>{const parts=Object.entries(vocabulary.products[value]?.lexicalQualifiers||{}).filter(([,terms])=>terms.some(term=>(spec.contexts||[]).some(c=>c.value===value&&c.terms.some(t=>contains(t,term))))).map(([part])=>part);return {value,label:parts.length===1?parts[0]:value};})});
 }
 const geographies=listApprovedGeographies(),alternatives=/\bor\b/i.test(text)&&! /\b(?:both|all of (?:them|these))\b/i.test(text);
 if(alternatives){
  const esc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const spans=(term)=>[...String(text).matchAll(new RegExp('\\b'+esc(term)+'\\b','gi'))].map(m=>({start:m.index,end:m.index+m[0].length}));
  const groups=[...['product','activity'].map(field=>({about:field,items:Object.entries(vocabulary[field==='product'?'products':'activities']).flatMap(([value,spec])=>[value,...(spec.terms||[])].flatMap(term=>spans(term).map(p=>({...p,value,label:value}))))})),
   {about:'geography',items:geographies.filter(g=>g.code!=='US').flatMap(g=>geographyNameForms(g.name).filter(n=>n.length>3).flatMap(n=>spans(n).map(p=>({...p,value:geographyLabel(g),label:g.name}))))},
   {about:'other',items:[...String(text).matchAll(/\b(?:19|20)\d{2}\b/g)].filter(m=>Number(m[0])<=new Date().getFullYear()).map(m=>({start:m.index,end:m.index+4,value:m[0],label:m[0]}))}];
  for(const {about,items}of groups){
   if(about==='product'){
    for(const ambiguity of ambiguousProducts)for(const position of spans(ambiguity.word))items.push(...ambiguity.options.map(option=>({...position,...option})));
   }
   else if(ambiguousProducts.length)return {about:'product',options:unique(ambiguousProducts.flatMap(a=>a.options))};
   const candidates=[];
   for(const m of String(text).matchAll(/\bor\b/gi)){
    const left=items.filter(x=>x.end<=m.index&&!String(text).slice(x.end,m.index).trim()),right=items.filter(x=>x.start>=m.index+2&&!String(text).slice(m.index+2,x.start).trim());
    if(left.length&&right.length)candidates.push(...left,...right);
   }
   const options=unique(candidates.map(({value,label})=>({value,label})));if(options.length>1)return {about,options};
  }
 }
 if(ambiguousProducts.length)return {about:'product',options:unique(ambiguousProducts.flatMap(a=>a.options))};
 for(const m of String(text).matchAll(/\b[\p{L}]{5,}\b/gu)){
  if(geographies.some(g=>geographyNameForms(g.name).some(n=>clean(n)===clean(m[0]))))continue;
  const candidates=geographies.filter(g=>g.code!=='US'&&geographyNameForms(g.name).some(n=>!n.includes(' ')&&oneEdit(clean(m[0]),clean(n))));
  const options=unique(candidates.map(g=>({value:geographyLabel(g),label:g.name})));
  if(options.length>1&&!form.geographies.some(g=>options.some(o=>geographyCode(o.value)===geographyCode(g.geography))))return {about:'geography',options};
 }
 return null;
}
export function normalizeAmbiguity(form,text) {
 const ambiguity=ambiguityOptions(form,text);if(!ambiguity)return form;
 if(ambiguity.about==='geography')form.geographies=[];
 if(['product','activity'].includes(ambiguity.about))for(const t of form.topics)t[ambiguity.about]=null;
 if(ambiguity.about==='other')form.years={start:null,end:null,quoted_words:null};
 const prior=form.clarification;
 form.clarification=prior.needed&&prior.about===ambiguity.about&&prior.options.length===ambiguity.options.length&&prior.options.every(o=>ambiguity.options.some(a=>a.value===o.value))?prior:{needed:true,...ambiguity};return form;
}
// Spelling errors in linking words carry no data constraint. Recognize only an
// adjacent transposition of a grammatical linker immediately before a named
// place, with a complete measure already established. Negations are excluded.
export function normalizeLinkingWords(form,text) {
 if(!form.geographies.length||!form.topics.length||form.topics.some(t=>!t.product||!t.activity))return form;
 const originalCount=form.unsupported_words.length;
 const links=['in','at','of','to','for','from','with'];
 const transposed=(a,b)=>a.length===b.length&&[...a].some((_,i)=>i<a.length-1&&a.slice(0,i)+a[i+1]+a[i]+a.slice(i+2)===b);
 form.unsupported_words=form.unsupported_words.filter(word=>{
  if(!/^[a-z]+$/i.test(word)||vocabulary.negationMarkers.includes(clean(word))||!links.some(x=>transposed(clean(word),x)))return true;
  const at=clean(text).indexOf(clean(word)),tail=clean(text).slice(at+word.length).trim();
  return !form.geographies.some(g=>{const place=listApprovedGeographies().find(p=>p.code===geographyCode(g.geography));return place&&geographyNameForms(place.name).some(name=>tail.startsWith(clean(name)));});
 });
 if(originalCount>0&&!form.unsupported_words.length&&form.clarification.about==='other'&&!ambiguityOptions(form,text))form.clarification={needed:false,about:null,options:[]};
 return form;
}
