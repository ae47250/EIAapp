// Shared with the browser: submit source form, never derived intent fields.
export function appendIntentParams(params, intent) {
  if (!intent) return params;
  params.set('intentReady', '1');
  params.set('intentPayload', JSON.stringify(intent.interpreter === 'rules'
    ? { interpreter: 'rules', outageReason: intent.outageReason }
    : { interpreter: intent.interpreter, lockedForm: intent.lockedForm }));
  return params;
}
