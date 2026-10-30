// Shared with the browser: submit source form, never derived intent fields.
export function appendIntentParams(params, intent) {
  if (!intent) return params;
  params.set('intentReady', '1');
  params.set('intentPayload', JSON.stringify(sourceIntentPayload(intent)));
  return params;
}

// Button choices travel separately; the source form and its quotes remain unchanged.
export function appendLookupChoice(params, intent, action = {}) {
  appendIntentParams(params, intent);
  if (action.choice) params.set('choice', JSON.stringify(action.choice));
  if (action.lookupRowKey) params.set('lookupRowKey', action.lookupRowKey);
  if (action.topicIndex !== undefined) params.set('topicIndex', String(action.topicIndex));
  return params;
}

export function sourceIntentPayload(intent) {
  return intent?.interpreter === 'rules'
    ? { interpreter: 'rules', outageReason: intent.outageReason }
    : { interpreter: intent?.interpreter, lockedForm: intent?.lockedForm, ...(intent?.choiceHistory?.length ? {originForm:intent.originForm,choiceHistory:intent.choiceHistory} : {}) };
}

export function canSearchIntent(intent) {
  return intent?.interpreter==='rules' || Boolean(intent?.lockedForm && !intent?.interpretationFailure && !intent?.blockingClarification && !intent?.needsClarification);
}
export function clarificationResult(intent,query) {
  return {mode:'lookup',query,intent,understood:intent?.understood || '',results:[],needsClarification:true,
    userMessage:intent?.userMessage || intent?.clarificationMessage || 'What should I look up?',
    choices:intent?.choices?.length ? intent.choices : [{label:'Edit search',editSearch:true}],freeText:true};
}

// Replies are separate field answers; the original query and its evidence stay intact.
export function clarificationReplyPayload(query, intent, reply) {
  return {query, intentPayload:sourceIntentPayload(intent), about:intent?.replyAbout || intent?.lockedForm?.clarification?.about, reply};
}
