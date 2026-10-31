import {textRepairEnabled} from './text-repair.js';
import {lexicalQualifiers} from './lookup-list.js';
import {ruleRequestEvidence} from './request-evidence.js';
import {listRequestEvidenceMentions} from './intent-routing.js';
// The approved named part belongs to the product slot. Do not let a shorter
// model quote silently turn it into the whole product at selector construction.
export const quotedNamedParts = topic => lexicalQualifiers(topic.product,topic.quoted_words);
export function restoreNamedParts(form,text) {
 if(!textRepairEnabled())return form;
 const scopes=ruleRequestEvidence(text,listRequestEvidenceMentions(text)).scopes;
 for(const topic of form.topics){
  if(!topic.product || quotedNamedParts(topic).length)continue;
  const words=lexicalQualifiers(topic.product,text);if(words.length!==1)continue;
  const part=words[0],index=text.toLowerCase().indexOf(part);
  if(index<0||scopes.find(s=>s.start<=index&&s.end>=index+part.length)?.status!=='requested')continue;
  // A shared topic quote must be a literal contiguous span in this turn.
  const at=text.toLowerCase().indexOf(String(topic.quoted_words).toLowerCase());
  if(at<0)continue;
  const start=Math.min(index,at),end=Math.max(index+part.length,at+topic.quoted_words.length);
  if(/[;.!?]/.test(text.slice(start,end)))continue;
  topic.quoted_words=text.slice(start,end);
 }
 return form;
}
