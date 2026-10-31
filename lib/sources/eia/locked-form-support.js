import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../../../data/eia/phase4-routing-config.json',import.meta.url),'utf8'));
const clean=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function oneEdit(a,b) {
 if(Math.abs(a.length-b.length)>1)return false;
 if(a.length===b.length){const d=[...a].map((v,i)=>v!==b[i]?i:-1).filter(i=>i>=0);return d.length===1 || d.length===2&&d[1]===d[0]+1&&a[d[0]]===b[d[1]]&&a[d[1]]===b[d[0]];}
 if(a.length>b.length)[a,b]=[b,a];let i=0;while(i<a.length&&a[i]===b[i])i++;return a.slice(i)===b.slice(i+1);
}
// Read metadata names longest first. A shorter name inside a longer match is
// never counted a second time (for example, gas inside natural gas).
export function namedValues(quote,entries,source=quote,details=false) {
 const words=s=>[...String(s).matchAll(/[\p{L}\p{N}]+/gu)].map(m=>({word:m[0].toLowerCase(),raw:m[0],start:m.index,end:m.index+m[0].length}));
 const q=words(quote),origin=words(source),names=entries.flatMap(({value,names=[],codes=[]})=>[
  ...names.map(name=>({value,parts:words(name).map(w=>w.word),code:false})),
  ...codes.map(code=>({value,parts:[code],code:true}))
 ]).filter(n=>n.parts.length).sort((a,b)=>b.parts.length-a.parts.length||b.parts.join(' ').length-a.parts.join(' ').length);
 const same=(hay,i,n)=>n.parts.every((part,j)=>hay[i+j]&&(n.code?hay[i+j].raw===part:hay[i+j].word===part));
 // Widen only when every whole-word occurrence in the source has the same
 // longer enclosing listed name. Otherwise retain the literal quote.
 let effective=q;
 if(q.length&&origin.length){
  const hits=[];
  for(let i=0;i+q.length<=origin.length;i++)if(q.every((w,j)=>w.word===origin[i+j].word))hits.push(i);
  if(hits.length){
   const enclosing=hits.map(i=>names.filter(n=>n.parts.length>q.length).flatMap(n=>origin.flatMap((_,start)=>start<=i&&start+n.parts.length>=i+q.length&&same(origin,start,n)?[{n,start}]:[])));
   const common=names.find(n=>enclosing.every(list=>list.some(x=>x.n.parts.join(' ')==n.parts.join(' ')&&x.n.value===n.value)));
   if(common){const match=enclosing[0].find(x=>x.n===common);effective=origin.slice(match.start,match.start+common.parts.length);}
  }
 }
 const occupied=new Map(),values=new Set(),matches=[];
 for(const n of names)for(let i=0;i+n.parts.length<=effective.length;i++){
  const span=`${i}:${n.parts.length}`;
  if(!same(effective,i,n)||n.parts.some((_,j)=>occupied.has(i+j)&&occupied.get(i+j)!==span))continue;
  values.add(n.value);n.parts.forEach((_,j)=>occupied.set(i+j,span));
  matches.push({value:n.value,start:effective[i].start,end:effective[i+n.parts.length-1].end,text:effective===q?quote:source});
 }
 return details?matches:values;
}
export function fieldQuoteSupports(field,value,quote,source=quote,otherTopics=[]) {
 if(value===null)return true;
 const kind={product:'products',activity:'activities',sector:'sectors',frequency:'frequencies'}[field];
 if(!config.vocabulary[kind]?.[value])return false;
 const entries=Object.entries(config.vocabulary[kind]).map(([name,spec])=>({value:name,names:[name,...(spec.terms||[]),...(field==='product'?Object.entries(config.vocabulary.ambiguousProducts||{}).filter(([,s])=>s.alternatives.includes(name)).map(([term])=>term):[])]}));
 const matches=namedValues(quote,entries,source,true),found=new Set(matches.map(m=>m.value));
 if(found.has(value))return true;
 for(const competitor of found){
  if(field==='product'||field==='activity'){
   const coordinated=otherTopics.some(t=>t[field]===competitor)&&matches.filter(m=>m.value===competitor).every(m=>{
    const before=m.text.slice(0,m.start),after=m.text.slice(m.end);
    return (/\b(?:and|or)\s*$/i.test(before)&&/\S/.test(before.replace(/\b(?:and|or)\s*$/i,'')) || /,\s*$/.test(before)&&/\S/.test(before.replace(/,\s*$/,'')))
      || (/^\s*(?:and|or)\b/i.test(after)&&/\S/.test(after.replace(/^\s*(?:and|or)\b/i,'')) || /^\s*,/.test(after)&&/\S/.test(after.replace(/^\s*,/,'')));
   });
   if(coordinated)continue;
  }
  return false;
 }
 return true;
}
export function topicEvidence(topic,source) {
 return Object.fromEntries(['product','activity','sector'].filter(k=>Object.hasOwn(topic,k)).map(k=>[k,{value:topic[k],quote:topic.quoted_words,source}]));
}
export function supportedTopicField(topic,field,source,evidence,otherTopics=[]) {
 const e=evidence?.[field];
 const quote=e?.value===topic[field]?e.quote:topic.quoted_words;
 const origin=e?.value===topic[field]?e.source:source;
 return Boolean(quote&&clean(origin).includes(clean(quote)))&&fieldQuoteSupports(field,topic[field],quote,origin,otherTopics.filter(t=>t!==topic));
}
// Drop unsupported values, preserving the remaining meaning and using the
// existing clarification schema. Sector uses its existing 'other' question.
export function dropUnsupportedFields(form,query,sources={}) {
 const dropped=[];
 for(const key of ['topics','excluded_topics'])for(const [i,t]of form[key].entries())for(const field of ['product','activity','sector']){
  if(t[field]!=null&&!supportedTopicField(t,field,sources[key]?.[i]??query,sources[key+'Fields']?.[i],form[key])){t[field]=null;dropped.push(field);}
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
