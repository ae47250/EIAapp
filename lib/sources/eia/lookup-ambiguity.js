import {readFileSync} from 'node:fs';
import {listApprovedGeographies,geographyNameForms} from './intent-routing.js';
import {geographyLabel,geographyCode} from './locked-form-schema.js';
import {oneEdit} from './lookup-geography.js';
const vocabulary=JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json',import.meta.url))).vocabulary;
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const contains=(text,term)=>(` ${clean(text)} `).includes(` ${clean(term)} `);
const unique=items=>[...new Map(items.map(o=>[o.value,o])).values()];
const editDistance=(a,b,limit)=>{
 if(Math.abs(a.length-b.length)>limit)return limit+1;
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const current=[i];let rowMin=i;
  for(let j=1;j<=b.length;j++){const n=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));current[j]=n;rowMin=Math.min(rowMin,n);}
  if(rowMin>limit)return limit+1;previous=current;
 }
 return previous[b.length];
};
const wordSpans=text=>[...String(text).matchAll(/[\p{L}]+/gu)].map(m=>({word:clean(m[0]),start:m.index,end:m.index+m[0].length,text:m[0]}));
function nearMissProducts(text){
 const words=wordSpans(text),matches=[];
 for(const [product,spec]of Object.entries(vocabulary.products))for(const term of unique([product,...(spec.terms||[])].map(value=>({value:clean(value)})).filter(x=>x.value.includes(' ')))){
  const parts=term.value.split(' '),n=parts.length;
  for(let i=0;i<=words.length-n;i++){
   const first=words[i];if(first.word===parts[0]||editDistance(first.word,parts[0],2)>2)continue;
   const tail=words.slice(i+1,i+n);if(tail.length!==n-1||tail.some((w,j)=>w.word!==parts[j+1]))continue;
   matches.push({product, start:first.start,end:tail.at(-1).end,text:String(text).slice(first.start,tail.at(-1).end),firstWord:first.word,canonicalFirstWord:parts[0]});
  }
 }
 return unique(matches.map(m=>({value:`${m.product}|${m.start}|${m.end}`,match:m}))).map(x=>x.match);
}
function nearMeasureWord(word,text){
 const words=wordSpans(text),index=words.findIndex(w=>w.start===word.start&&w.end===word.end),measureTerms=Object.entries(vocabulary.activities).flatMap(([name,spec])=>[name,...(spec.terms||[])]).map(clean);
 return index>=0&&words.some((w,i)=>Math.abs(i-index)<=2&&measureTerms.some(term=>term===w.word));
}
function repairProductNearMisses(form,text){
 const matches=nearMissProducts(text),products=[...new Set(matches.map(m=>m.product))];
 if(!matches.length||products.length!==1)return false;
 const product=products[0],alternatives=new Set(Object.values(vocabulary.ambiguousProducts||{}).flatMap(x=>x.alternatives));
 let changed=false;
 for(const match of matches){
  let topic=form.topics.find(t=>!t.product||alternatives.has(t.product)&&clean(t.quoted_words||'').includes(clean(match.text)));
  if(!topic)topic=form.topics.find(t=>alternatives.has(t.product)&&clean(t.quoted_words||'').includes(match.firstWord));
  if(!topic&&form.topics.length)topic={product:null,activity:form.topics[0].activity,quoted_words:match.text},form.topics.push(topic);
  if(!topic)continue;
  topic.product=product;
  if(!clean(topic.quoted_words||'').includes(clean(match.text)))topic.quoted_words=match.text;
  changed=true;
 }
 if(changed&&form.topics.every(t=>t.product))form.clarification={needed:false,about:null,options:[]};
 return changed;
}
// Candidate choices use existing form option strings and existing slot values.
// No new form field or model schema is introduced.
export function ambiguityOptions(form,text) {
 const nearMisses=nearMissProducts(text);
 const ambiguousProducts=[];
 for(const [word,spec]of Object.entries(vocabulary.ambiguousProducts||{})){
  const exact=wordSpans(text).filter(w=>w.word===clean(word)).map(w=>({start:w.start,end:w.end}));
  const tokens=wordSpans(text),misspelled=tokens.filter(w=>w.word!==clean(word)&&editDistance(w.word,clean(word),1)<=1&&nearMeasureWord(w,text));
  if(!exact.length&&!misspelled.length)continue;
  if(!exact.length&&misspelled.length){
   ambiguousProducts.push({word,about:'product',options:spec.alternatives.map(value=>{const parts=Object.entries(vocabulary.products[value]?.lexicalQualifiers||{}).filter(([,terms])=>terms.some(term=>(spec.contexts||[]).some(c=>c.value===value&&c.terms.some(t=>contains(t,term))))).map(([part])=>part);return {value,label:parts.length===1?parts[0]:value};})});
   continue;
  }
  if(exact.length&&exact.every(p=>nearMisses.some(m=>p.start>=m.start&&p.end<=m.end)))continue;
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
 const repairedProduct=repairProductNearMisses(form,text);
 const ambiguity=ambiguityOptions(form,text);if(!ambiguity)return form;
 if(ambiguity.about==='geography')form.geographies=[];
 if(['product','activity'].includes(ambiguity.about))for(const t of form.topics){
  if(repairedProduct&&ambiguity.about==='product'&&t.product)continue;
  t[ambiguity.about]=null;
 }
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
