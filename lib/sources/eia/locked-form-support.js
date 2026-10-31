import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json',import.meta.url),'utf8'));
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function oneEdit(a,b) {
 if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const d=[...a].map((v,i)=>v!==b[i]?i:-1).filter(i=>i>=0);return d.length===1 || d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]];}
 if(a.length>b.length)[a,b]=[b,a];let i=0;while(i<a.length&&a[i]===b[i])i++;return a.slice(i)===b.slice(i+1);
}
// Validate a supplied value only; this function never discovers or selects one.
// Damerau single edits, with the owner's short-word and length restrictions.
export function quoteSupportsNames(quote,names,codes=[],fuzzy=true) {
 const words=clean(quote).split(' ');
 for(const name of names){
  const canonical=clean(name),parts=canonical.split(' ');
  if(!canonical)continue;
  for(let i=0;i+parts.length<=words.length;i++){
   const span=words.slice(i,i+parts.length);
   if(span.join(' ')===canonical)return true;
   const mismatches=span.map((w,j)=>w!==parts[j]?j:-1).filter(j=>j>=0);
   if(fuzzy&&mismatches.length===1){const j=mismatches[0];if(span[j].length>4&&span[j].length<=parts[j].length&&oneEdit(span[j],parts[j]))return true;}
  }
 }
 return codes.some(code=>String(quote).split(/[^\p{L}\p{N}]+/u).includes(code)&&code===code.toUpperCase());
}
export function fieldQuoteSupports(field,value,quote) {
 if(value===null)return true;
 const kind={product:'products',activity:'activities',sector:'sectors',frequency:'frequencies'}[field];
 const spec=config.vocabulary[kind]?.[value];if(!spec)return false;
 const ambiguous=field==='product'?Object.entries(config.vocabulary.ambiguousProducts||{}).filter(([,s])=>s.alternatives.includes(value)).map(([name])=>name):[];
 return quoteSupportsNames(quote,[value,...(spec.terms||[]),...ambiguous]);
}
export function topicEvidence(topic,source) {
 return Object.fromEntries(['product','activity','sector'].filter(k=>Object.hasOwn(topic,k)).map(k=>[k,{value:topic[k],quote:topic.quoted_words,source}]));
}
export function supportedTopicField(topic,field,source,evidence) {
 const e=evidence?.[field];
 const quote=e?.value===topic[field]?e.quote:topic.quoted_words;
 const origin=e?.value===topic[field]?e.source:source;
 return Boolean(quote&&clean(origin).includes(clean(quote)))&&fieldQuoteSupports(field,topic[field],quote);
}
// Drop unsupported values, preserving the remaining meaning and using the
// existing clarification schema. Sector uses its existing 'other' question.
export function dropUnsupportedFields(form,query,sources={}) {
 const dropped=[];
 for(const key of ['topics','excluded_topics'])for(const [i,t]of form[key].entries())for(const field of ['product','activity','sector']){
  if(t[field]!=null&&!supportedTopicField(t,field,sources[key]?.[i]??query,sources[key+'Fields']?.[i])){t[field]=null;dropped.push(field);}
 }
 for(const field of ['sector','frequency']){
  const item=form[field];if(item.value===null||field==='frequency'&&!item.explicit)continue;
  if(!fieldQuoteSupports(field,item.value,item.quoted_words)){
   form[field]=field==='frequency'?{value:'annual',explicit:false,quoted_words:null}:{value:null,quoted_words:null};dropped.push(field);
  }
 }
 if(dropped.length){
  const about=form.topics.some(t=>!t.product)?'product':form.topics.some(t=>!t.activity)?'activity':dropped.includes('sector')?'other':dropped.includes('frequency')?'frequency':dropped[0];
  form.clarification={needed:true,about,options:about==='other'?Object.keys(config.vocabulary.sectors).map(value=>({value,label:value})):[]};
 }
 return dropped;
}
