import {resolveApprovedGeography} from './intent-routing.js';
import {resolveAmbiguousPlaces,resolveQuotedPlaces,placeSwitches,isUSStateGroup,usStates} from './lookup-geography.js';
import {lookupCatalog} from './lookup-list.js';
import {restoreNamedParts} from './locked-form-evidence.js';
import {geographyCode,geographyLabel,checkLockedFormShape,lockedFormVocabulary} from './locked-form-schema.js';
import {checkLockedFormV2} from './locked-form-v2.js';

const vocabulary=lockedFormVocabulary();
const object=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const array=items=>({type:'array',items});
const nullable=schema=>({anyOf:[schema,{type:'null'}]});
const string={type:'string'};
const clean=value=>String(value).trim().replace(/\s+/g,' ').toLowerCase();
const quoted=(words,reply)=>typeof words==='string' && Boolean(clean(words)) && clean(reply).includes(clean(words));
const invalid=code=>Object.assign(new Error('That answer could not be applied to the question.'),{replyError:true,code});
export function buildReplyUpdateSchema() {
  const item=field=>object({value:{$ref:`#/$defs/${field}`},quoted_words:string});
  const topic=object({product:nullable(item('product')),activity:nullable(item('activity'))});
  return {...object({
    geographies:nullable(array(item('geography'))),excluded_geographies:nullable(array(item('geography'))),
    topics:nullable(array(topic)),
    excluded_topics:nullable(array(object({...topic.properties,sector:nullable(item('sector'))}))),
    sector:nullable(object({value:nullable({$ref:'#/$defs/sector'}),quoted_words:string})),
    frequency:nullable(item('frequency')),
    years:nullable(object({start:{type:['number','null']},end:{anyOf:[{type:'number'},{type:'string',enum:['latest']},{type:'null'}]},quoted_words:string})),
    resolved_words:array(object({original_words:string,quoted_words:string})),
    unresolved:array(object({about:{type:'string',enum:['product','activity','geography','frequency','other']},quoted_words:string}))
  }),$defs:Object.fromEntries(Object.entries(vocabulary).map(([key,values])=>[key,{type:'string',enum:values}]))};
}
export function checkReplyUpdate(form,about,reply,answer) {
  if (!(form.clarification.needed && about===form.clarification.about) && !(about==='geography' && placeSwitches(form).length)) throw invalid('reply_field_not_asked');
  if (typeof reply!=='string' || !reply.trim() || reply.length>240) throw invalid('invalid_reply_text');
  if (!checkLockedFormShape(answer,buildReplyUpdateSchema()).valid) throw invalid('reply_shape');
  const items=[...(answer.geographies || []),...(answer.excluded_geographies || []),
    ...(answer.topics || []).flatMap(t=>Object.values(t).filter(Boolean)),...(answer.excluded_topics || []).flatMap(t=>Object.values(t).filter(Boolean)),
    ...[answer.sector,answer.frequency,answer.years].filter(Boolean),...answer.resolved_words,...answer.unresolved];
  if (items.some(item=>!quoted(item.quoted_words,reply))) throw invalid('reply_quote_not_in_answer');
  for (const field of ['geographies','excluded_geographies','topics','excluded_topics']) if (answer[field]?.length===0) throw invalid('reply_empty_replacement');
  if ([...(answer.topics || []),...(answer.excluded_topics || [])].some(t=>Object.values(t).every(v=>v===null))) throw invalid('reply_empty_topic');
  if (answer.resolved_words.some(item=>!form.unsupported_words.includes(item.original_words))) throw invalid('reply_unknown_constraint');
  if (new Set(answer.resolved_words.map(item=>item.original_words)).size!==answer.resolved_words.length) throw invalid('reply_duplicate_resolution');
  return {valid:true,errors:[]};
}
// The versioned history keeps each field's own quote. Its origin form retains
// evidence for inherited topic components; the form's shared topic quote shows
// the latest change. Quote sources are rebuilt from history, never client claims.
export function applyReplyUpdate(form,query,step,quoteSources={}) {
  const {about,reply}=step;
  checkReplyUpdate(form,about,reply,step.answer);
  const answer=structuredClone(step.answer);
  const selected=(answer.geographies||[]).map(g=>({geography:g.value,quoted_words:g.quoted_words,is_default:false}));
  const excluded=[...form.excluded_geographies,...(answer.excluded_geographies||[]).map(g=>({geography:g.value,quoted_words:g.quoted_words}))];
  const resolution=resolveQuotedPlaces(selected,excluded,reply,answer.geographies===null?form.geographies:selected);
  if(resolution.resolved.length || answer.geographies!==null){
    answer.geographies=resolution.items.map(g=>({value:g.geography,quoted_words:g.quoted_words}));
    answer.unresolved=answer.unresolved.filter(g=>g.about!=='geography'||!resolution.resolved.some(w=>clean(w)===clean(g.quoted_words)));
  }
  // A kind-only reply can choose between state/country meanings only when
  // that kind identifies one metadata candidate. It cannot choose between
  // two countries merely because the model supplied a valid country code.
  const kind=/\bcountry\b/i.test(reply)?'country':/\bstate\b/i.test(reply)?'state':null;
  if(about==='geography' && kind && !resolution.resolved.length){
    const choices=[...form.geographies.map(g=>g.geography),...placeSwitches(form).filter(c=>c.choice.about==='geography_switch').map(c=>c.choice.value)];
    const candidates=[...new Set(choices)].filter(label=>resolveApprovedGeography(geographyCode(label))?.type===kind);
    if(candidates.length===1){answer.geographies=[{value:candidates[0],quoted_words:reply}];answer.unresolved=answer.unresolved.filter(u=>u.about!=='geography');}
    else {answer.geographies=null;if(!answer.unresolved.some(u=>u.about==='geography'))answer.unresolved.push({about:'geography',quoted_words:reply});}
  }
  if(isUSStateGroup(reply) && form.topics.every(t=>lookupCatalog.rows.some(r=>r.verification==='verified'&&r.geographyKind==='state'&&r.product===t.product&&r.activity===t.activity))) {answer.geographies=usStates(form).map(g=>({value:geographyLabel(g),quoted_words:reply}));answer.unresolved=answer.unresolved.filter(u=>u.about!=='geography');}
  const next=structuredClone(form),sources=structuredClone(quoteSources);
  for (const key of ['geographies','excluded_geographies']) if (answer[key]!==null) {
    next[key]=answer[key].map(item=>({geography:item.value,quoted_words:item.quoted_words,is_default:false}));
    sources[key]=next[key].map(()=>reply);
  }
  if (answer.topics!==null) {
    const original=form.topics.length?form.topics:[{product:null,activity:null,quoted_words:null}];
    const rows=answer.topics.flatMap(update=>{
      const bases=update.product && update.activity ? [{}] : original;
      return bases.map(base=>({product:update.product?.value ?? base.product,activity:update.activity?.value ?? base.activity,
        quoted_words:(update.product || update.activity).quoted_words}));
    });
    // Shared inherited components can produce the same pair more than once.
    next.topics=rows.filter((row,index)=>rows.findIndex(other=>other.product===row.product && other.activity===row.activity)===index);
    restoreNamedParts(next,reply);
    sources.topics=next.topics.map(()=>reply);
  }
  if (answer.excluded_topics!==null) {
    next.excluded_topics=answer.excluded_topics.map(t=>({product:t.product?.value ?? null,activity:t.activity?.value ?? null,sector:t.sector?.value ?? null,quoted_words:Object.values(t).find(Boolean).quoted_words}));
    sources.excluded_topics=next.excluded_topics.map(()=>reply);
  }
  if (answer.sector!==null) {next.sector={...answer.sector,quoted_words:answer.sector.value===null?null:answer.sector.quoted_words};sources.sector=reply;}
  if (answer.frequency!==null) {next.frequency={...answer.frequency,explicit:true};sources.frequency=reply;}
  if (answer.years!==null) {
    const clear=answer.years.start===null && answer.years.end===null;
    sources.yearSlots ||= Object.fromEntries(['start','end'].map(k=>[k,{value:form.years[k],quote:form.years.quoted_words,source:sources.years ?? query}]));
    for (const k of ['start','end']) if (clear || answer.years[k]!==null) sources.yearSlots[k]={value:answer.years[k],quote:answer.years.quoted_words,source:reply};
    next.years={start:clear?null:answer.years.start ?? form.years.start,end:clear?null:answer.years.end ?? form.years.end ?? 'latest',quoted_words:clear?null:answer.years.quoted_words};
    sources.years=reply;
  }
  const unresolved=next.unsupported_words.map((word,index)=>({word,source:sources.unsupported_words?.[index] ?? query}))
    .filter(item=>!answer.resolved_words.some(resolved=>resolved.original_words===item.word));
  for (const item of answer.unresolved.filter(item=>item.about==='other')) unresolved.push({word:item.quoted_words,source:reply});
  next.unsupported_words=unresolved.map(item=>item.word);sources.unsupported_words=unresolved.map(item=>item.source);
  const addressed=about==='geography'?answer.geographies!==null || answer.excluded_geographies!==null
    :['product','activity'].includes(about)?answer.topics?.some(topic=>topic[about]!==null)
    :about==='frequency'?answer.frequency!==null:answer.resolved_words.length>0;
  const nextAbout=!next.topics.length || next.topics.some(t=>!t.product)?'product':next.topics.some(t=>!t.activity)?'activity':!next.geographies.length?'geography'
    :answer.unresolved[0]?.about || (next.unsupported_words.length?'other':!addressed?about:null);
  next.clarification={needed:nextAbout!==null,about:nextAbout,options:nextAbout===about?form.clarification.options:[]};
  const check=checkLockedFormV2(next,query,sources);
  if (!check.valid) throw invalid('merged_reply_'+check.errors.join(','));
  return {form:next,quoteSources:sources,placeStep:null};
}
