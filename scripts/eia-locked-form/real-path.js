import { appendIntentParams } from '../../lib/eia-intent-payload.js';
import { GET } from '../../app/api/search-eia/route.js';
export async function replayPublicSearch(intent, query) {
  const params = appendIntentParams(new URLSearchParams({ q: query }), intent);
  const response = await GET(new Request(`http://localhost/api/search-eia?${params}`));
  const body = await response.json();
  if (!response.ok) throw new Error(`Public search failed: ${response.status}: ${JSON.stringify(body)}`);
  return body;
}
export function firstDisplayed(body) {
  return body.comparisonMode ? body.comparisonDefinitions[0] || null
    : body.candidateGroups.filter((g, i, all) => all.findIndex(x => x.geography.code === g.geography.code) === i).map(g => g.candidates[0]);
}
// Matching the complete first displayed record to the independently adjudicated A0
// record is deliberately conservative. Changed records require separate adjudication.
export function scoreRightData(body, expected, ceiling) {
  if (expected.clarification) return { correct: body.diagnostics?.clarificationBlocked === true && body.variables.length === 0 && body.intent?.lockedForm?.clarification.about === expected.clarification && (expected.clarification !== 'product' || body.intent.clarificationMessage === 'Please clarify the product: natural gas and petroleum (including gasoline). No series will be selected until it is resolved.'), reason: 'clarification and no retrieval' };
  const first = firstDisplayed(body);
  const same = JSON.stringify(first) === JSON.stringify(ceiling.first);
  return { correct: same && ceiling.rightData === true, reason: same ? ceiling.reason : 'Displayed result differs from adjudicated A0 record; not credited without review.', first };
}
