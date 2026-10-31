// Evaluation orchestration only. Reuse the normal application entry points.
import {interpretQuery,interpretClarification} from '../../lib/sources/eia/interpret-query.js';
import {searchLookup} from '../../lib/sources/eia/lookup-search.js';
import {sourceIntentPayload} from '../../lib/eia-intent-payload.js';
import {findEvaluationChoice} from '../../scripts/eia-lookup/evaluation-choice.js';

export const dialogueKind = testCase => !testCase.parentId ? 'initial' : testCase.typedReply ? 'reply' : 'click';

export async function executeDialogueStep(testCase,parent,dependencies,eiaOptions,trace=()=>{}) {
  const kind=dialogueKind(testCase);
  if(kind==='initial') {
    const intent=await interpretQuery(testCase.query,[],dependencies);
    return searchLookup(testCase.query,sourceIntentPayload(intent),{},eiaOptions);
  }
  if(!parent?.intent || parent.executionError)throw new Error('Required parent outcome unavailable: '+testCase.parentId);
  if(kind==='reply') {
    const about=parent.intent.lockedForm.clarification.about||parent.intent.replyAbout||'geography';
    trace({kind,parentId:testCase.parentId,about,reply:testCase.typedReply});
    const intent=await interpretClarification(testCase.query,sourceIntentPayload(parent.intent),about,testCase.typedReply,dependencies);
    return searchLookup(testCase.query,sourceIntentPayload(intent),{},eiaOptions);
  }
  if(!testCase.clicks?.length)throw new Error('Click outcome has no recorded choices: '+testCase.id);
  let result=parent;
  for(const label of testCase.clicks) {
    const button=findEvaluationChoice(result,label);
    trace({kind,parentId:testCase.parentId,label,button});
    result=await searchLookup(testCase.query,sourceIntentPayload(result.intent),button,eiaOptions);
  }
  return result;
}
