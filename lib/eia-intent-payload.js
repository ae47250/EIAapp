// Shared with the browser: submit source form, never derived intent fields.
export function appendIntentParams(params, intent) {
  if (!intent) return params;
  params.set('intentReady', '1');
  params.set('intentPayload', JSON.stringify(intent.interpreter === 'rules'
    ? { interpreter: 'rules', outageReason: intent.outageReason }
    : { interpreter: intent.interpreter, lockedForm: intent.lockedForm }));
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
