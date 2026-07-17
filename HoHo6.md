# Raw-Only AI Input and Preserved Cleaned-Note Architecture Review

## Review scope

This is a read-only architecture review of the EIA input-processing workflow on branch `codex/nextjs-eia-migration-login-toggle` at commit `38e9659` (`Use raw queries for AI interpretation`). No application or test code was changed as part of this review.

The review focuses on three distinct values:

- `originalQuery`: the exact user note, preserved byte-for-byte as a JavaScript string.
- `cleanedQuery`: a mechanically cleaned copy that changes typographic quotes, non-breaking spaces, repeated whitespace, and leading/trailing whitespace. It does not interpret meaning or correct spelling.
- `correctedQuery`: an AI-generated correction when AI succeeds, or a deterministic typo-corrected form when rules are used as fallback.

These values must not be treated as interchangeable.

## Executive assessment

I agree with the architecture in principle:

> Exact raw note -> initial AI interpretation

and, independently:

> Exact raw note -> mechanical cleaning and deterministic parsing -> preserved supporting evidence

The first AI request currently receives only the exact raw note. The cleaned note is still generated and preserved. The later semantic-reranking request also excludes the cleaned note. This avoids duplicate prompt evidence and unnecessary token use while retaining deterministic infrastructure.

The historical 20-query A/B evaluation supports the decision: raw-only and raw-plus-cleaned produced the same validated intent, same top-five order, and same warnings for all 20 pairs, with no errors. Because the cleaner is deliberately minimal, withholding its output from AI does not remove meaningful semantic information.

The architecture is not yet perfect. Two remaining limitations should be documented and addressed later:

1. Initial AI validation constructs `validationQuery` by concatenating the raw-derived cleaned text with the AI-generated `correctedQuery`. This is useful for typo recovery, but it mixes evidence with an AI claim and does not explicitly record conflicts between them.
2. The legacy International variable scorer still gives `correctedQuery` precedence for lexical scoring. The new local candidate ranker uses raw-derived cleaned text for AI intents, but the legacy scorer does not yet follow the same source-of-truth rule.

Therefore, the current architecture is directionally correct and safe enough to retain, but provenance and conflict handling should be strengthened before claiming that every downstream path strictly treats raw input as authoritative.

## 1. Current workflow

### Stage 1: Browser submission

`components/search/SearchWorkspace.js` preserves the text entered by the user as `originalQuery` and sends it as the `q` parameter to `/api/interpret-query`.

### Stage 2: Input forms

`lib/sources/eia/interpret-query.js` creates two local forms:

```text
originalQuery = exact user input
cleanedQuery  = mechanical whitespace and quote cleanup
```

`cleanQueryMechanically()` performs only these changes:

- curly single quotes to straight single quotes;
- curly double quotes to straight double quotes;
- non-breaking spaces to ordinary spaces;
- repeated whitespace, tabs, and newlines to one space;
- leading and trailing whitespace removal.

It does not correct spelling, infer concepts, choose geography, choose frequency, or resolve ambiguity.

### Stage 3: Initial AI interpretation

`interpretQueryWithOpenAI()` builds the initial prompt. The prompt includes:

- interpretation instructions;
- controlled product, activity, sector, and frequency values;
- output-shape requirements;
- the exact raw query.

It does not include `cleanedQuery`.

The relevant prompt line is:

```js
`Raw query: ${JSON.stringify(forms.originalQuery)}`
```

The model returns `correctedQuery`, confidence, field claims, geographies, concept pairs, exclusions, and unresolved qualifiers.

### Stage 4: Deterministic parsing and AI validation

`validateAiInterpretation()` independently creates a rule interpretation from the original query. It then validates each AI field against approved vocabularies and deterministic evidence.

Each field can become:

- `approved`: the AI value is accepted;
- `fallback`: deterministic rules replace a missing, rejected, ambiguous, or low-confidence AI value;
- `ambiguous`: alternatives remain unresolved;
- `missing`: neither side found a value;
- `rejected`: the AI value is unsupported and no safe fallback exists.

The resulting field records include `rawValue`, `aiValue`, `normalizedValue`, `validation`, `confidence`, `fallbackUsed`, `fallbackReason`, `fallbackMethod`, `reason`, and `alternatives`.

Current limitation: validation uses this combined string:

```js
const validationQuery = `${forms.cleanedQuery} ${correctedQuery}`;
```

This means the AI correction participates in validation context. It does not overwrite `originalQuery`, but it is not kept fully separate as a claim-versus-evidence channel.

### Stage 5: Structured intent and routing

`buildStructuredIntent()` in `lib/sources/eia/intent-routing.js` produces route, geography, product, activity, sector, frequency, ambiguity, exclusions, and provenance.

For AI interpretations, deterministic text scanning uses:

```text
cleanedQuery, falling back to originalQuery
```

It does not use AI-generated `correctedQuery` as the authoritative scan text.

For rule-only fallback interpretations, deterministic typo-corrected text may be used because that text was produced by the controlled rules themselves.

### Stage 6: Staged request preservation

`appendIntentParams()` in `components/search/SearchWorkspace.js` sends the staged intent to `/api/search-eia`. The payload preserves:

- `originalQuery`;
- `cleanedQuery`;
- `correctedQuery`;
- interpreter and confidence;
- validated fields;
- ambiguity and fallback information.

This is request-level preservation in browser state and the staged URL payload. There is no durable database or audit-store persistence.

### Stage 7A: New local candidate pipeline

When `EIA_CANDIDATE_PIPELINE=on`, the GET route uses `candidateSearchHandler()`.

The candidate pipeline:

1. consumes validated structured intent;
2. retrieves candidates from the local metadata index;
3. applies deterministic route, geography, frequency, product, activity, sector, aggregation, lexical, coverage, currentness, and availability logic;
4. displays up to five ranked candidate families;
5. fetches observations only after explicit candidate selection.

For AI intents, lexical ranking uses `cleanedQuery` or `originalQuery`, not `correctedQuery`.

The local `.env.local` currently has `EIA_CANDIDATE_PIPELINE=off`, so local runtime requests currently use the legacy GET path unless the environment is changed and the server restarted.

### Stage 7B: Legacy search path

When the candidate flag is off, the GET route uses `lib/sources/eia/search.js`.

The legacy path preserves and validates the same staged intent, but its `scoreVariable()` function currently computes lexical query text with:

```js
normalizeText(intent.correctedQuery || query)
```

This gives AI-generated corrected wording precedence over the raw-derived mechanically cleaned query. Structured product and activity fields are also used, so this is not the only ranking evidence, but it is an exception to the strict raw-authority principle.

### Stage 8: Optional semantic reranking

`buildSemanticRerankingRequest()` in `lib/sources/eia/semantic-reranking.js` currently includes:

- `rawQuery`;
- validated structured intent;
- already eligible candidate-family metadata;
- allowed family IDs.

It does not include `cleanedQuery`.

Semantic reranking is disabled by default, runs only in shadow mode when explicitly invoked, and never changes the displayed deterministic order. The current public candidate pipeline does not call it.

## 2. Exact files and functions involved

| Responsibility | File | Function or location |
| --- | --- | --- |
| Browser captures raw input | `components/search/SearchWorkspace.js` | Search submission workflow near lines 20-45 |
| Browser stages all query forms | `components/search/SearchWorkspace.js` | `appendIntentParams()` near lines 260-280 |
| Interpret API adapter | `app/api/interpret-query/route.js` | Next route wrapper |
| Initial input validation | `lib/sources/eia/interpret-query.js` | default handler near lines 103-120 |
| Raw and cleaned form creation | `lib/sources/eia/interpret-query.js` | `buildQueryForms()` near lines 723-726 |
| Mechanical cleaner | `lib/sources/eia/interpret-query.js` | `cleanQueryMechanically()` near lines 728-735 |
| Initial AI orchestration | `lib/sources/eia/interpret-query.js` | `interpretQuery()` near lines 123-127 |
| Initial raw-only AI prompt | `lib/sources/eia/interpret-query.js` | `interpretQueryWithOpenAI()` near lines 201-262 |
| Deterministic fallback parser | `lib/sources/eia/interpret-query.js` | `interpretQueryWithRules()` near lines 152-199 |
| AI field validation and repair | `lib/sources/eia/interpret-query.js` | `validateAiInterpretation()` near lines 264-377 |
| Per-field provenance status | `lib/sources/eia/interpret-query.js` | `validateAiField()` near lines 579-666 |
| Clarification and structured-intent attachment | `lib/sources/eia/interpret-query.js` | `addClarificationState()` near lines 780-819 |
| Structured intent and route provenance | `lib/sources/eia/intent-routing.js` | `buildStructuredIntent()` near lines 24-130 |
| Public legacy/candidate route switch | `app/api/search-eia/route.js` | `GET()` near lines 7-12 |
| Candidate API flow | `lib/sources/eia/candidate-search.js` | `candidateSearchHandler()` near lines 10-90 |
| Local metadata retrieval | `lib/sources/eia/local-retrieval.js` | `retrieveLocalCandidates()` near lines 35-79 |
| Candidate fallback orchestration | `lib/sources/eia/candidate-pipeline.js` | `buildLocalCandidatePipeline()` near lines 11-50 |
| Deterministic candidate ranking | `lib/sources/eia/local-ranking.js` | `rankLocalCandidates()` and `rankRetrieval()` near lines 31-60 |
| Raw-derived ranking text policy | `lib/sources/eia/local-ranking.js` | `deterministicQueryText()` near lines 893-898 |
| Legacy lexical variable ranking | `lib/sources/eia/search.js` | `scoreVariable()` near lines 285-301 |
| Optional semantic request | `lib/sources/eia/semantic-reranking.js` | `buildSemanticRerankingRequest()` near lines 107-141 |
| Raw-only prompt and preservation tests | `tests/eia-query-interpretation.test.js` | tests near lines 229-315 |
| Semantic raw-only request tests | `tests/eia-semantic-reranking.test.js` | tests near lines 35-46 and 123-132 |
| Field provenance comparison tests | `tests/eia-live-model-comparison.test.js` | tests near lines 21-57 |
| Historical raw-versus-cleaned A/B evidence | `HOHO2.md` | summary near lines 18-26 |

## 3. Answers to the architecture questions

### 1. Do I agree with raw-only AI input at the beginning?

Yes.

The raw note is the only authoritative record of what the user actually entered. Sending a second mechanically cleaned rendering duplicates evidence without adding meaning. It can also make it harder to determine whether the model understood the user or merely followed the second rendering.

### 2. Benefits

- Fewer prompt tokens.
- No duplicate statement of the same evidence.
- The AI sees original ambiguity, punctuation, spacing, and mention order.
- Mechanical transformations cannot accidentally become model instructions.
- AI behavior can be evaluated independently from deterministic preprocessing.
- The raw note remains clearly distinguishable from later interpretation.
- Deterministic validation, retrieval, and fallback remain reproducible.

### 3. Risks

- A model must directly handle tabs, repeated whitespace, smart quotes, and non-breaking spaces.
- Extremely malformed Unicode or formatting could theoretically reduce model reliability.
- AI output can still differ because model interpretation is not deterministic.
- Downstream code can undermine the policy if it later treats `correctedQuery` as source evidence.
- Preserving several query forms without explicit provenance can confuse future maintainers.

The measured risk is low for the current cleaner because it performs no semantic transformation. The historical A/B run found no validated-intent, top-five, or warning differences across 20 paired cases.

### 4. Is useful information lost by withholding the cleaned note from the first AI call?

No meaningful information is lost.

The cleaned note contains the same words and punctuation content, except for quote normalization and whitespace compression. The raw note actually contains more exact information because it preserves the original formatting. The model can generally interpret these formatting variants without a duplicate rendering.

### 5. Where should the cleaned note be preserved?

It should remain a named, separate field in the server-side intent envelope:

```text
originalQuery
cleanedQuery
correctedQuery
structuredIntent
fields
provenance
```

It may also be carried in staged browser state as it is today. If durable audit storage is added later, raw and cleaned values must be stored in separate fields with transformation version and provenance. `cleanedQuery` must never be stored under an `original`, `raw`, or `userInput` label.

### 6. Which later stages should use the cleaned note?

| Later stage | Recommended use |
| --- | --- |
| Input emptiness and length checks | Active use |
| Deterministic tokenization and phrase matching | Active use |
| Geography, frequency, product, activity, sector, unit, and negation evidence | Active use with controlled vocabularies |
| AI field validation | Supporting evidence, kept separate from AI corrections |
| Metadata retrieval | Indirect supporting use through validated structured intent |
| Candidate retrieval | Indirect supporting use; structured intent should remain primary |
| Candidate lexical ranking | Active supporting use, never sole authority |
| Approved fallback processing | Active use |
| Clarification detection | Supporting evidence |
| Debugging and audit reports | Active use |
| Regression testing | Active use |
| User display | Optional, clearly labeled as mechanically cleaned or interpreted text |
| Initial AI prompt | Do not use |
| Semantic-reranking AI prompt | Do not use; raw plus validated sidecar evidence is preferable |

### 7. Full cleaned string, structured evidence spans, or both?

Both.

The full cleaned string is useful for simple deterministic tokenization and reproducible debugging. Structured evidence spans are better for provenance and conflict handling.

Recommended evidence records should include:

```json
{
  "field": "frequency",
  "canonicalValue": "monthly",
  "rawText": "montly",
  "rawStart": 12,
  "rawEnd": 18,
  "cleanedText": "montly",
  "source": "deterministic_typo_alias",
  "confidence": 1,
  "ruleVersion": "..."
}
```

Current mention records preserve some ordering and source information, but they do not consistently preserve exact start/end offsets into the original raw note. Structured spans should supplement, not replace, the full raw and cleaned strings.

### 8. Could raw-only AI input break retrieval, validation, ranking, or fallback behavior?

The change can indirectly affect downstream results only if the AI returns a different structured interpretation. It does not remove deterministic parsing, validation, retrieval, ranking, or fallback code.

Current evidence is favorable:

- historical A/B: 20/20 same validated intent;
- historical A/B: 20/20 same top-five order;
- historical A/B: 20/20 same warnings;
- focused current verification: 60/60 tests passed.

Residual risks:

- the A/B cohort is limited;
- one paired run does not measure model run-to-run variation;
- both conditions can agree and still be wrong;
- the legacy scorer still uses `correctedQuery` lexical precedence;
- validation currently combines cleaned and AI-corrected text.

No direct break is expected from withholding the cleaned note itself. The more important future work is making every downstream evidence boundary explicit.

### 9. What tests are required?

Existing coverage already proves:

- initial AI receives the exact raw query;
- the initial prompt does not contain the cleaned query;
- `originalQuery` survives staged normalization unchanged;
- `cleanedQuery` remains available after raw-only interpretation;
- semantic reranking requests omit `lightlyCleanedQuery`;
- field-level summaries retain AI value, normalized value, validation, fallback, and repair reason;
- AI failure falls back to deterministic rules.

Additional tests still needed:

1. Assert `originalQuery` remains unchanged through the complete browser -> interpret API -> staged search API -> candidate-selection response flow.
2. Assert `cleanedQuery` never appears in any OpenAI request body, including future AI entry points.
3. Assert AI-generated `correctedQuery` cannot introduce an unmentioned geography, product, activity, sector, unit, exclusion, or date into deterministic evidence.
4. Add explicit conflict fixtures where raw text, deterministic parsing, and AI claims disagree.
5. Require a conflict/provenance record rather than silent resolution for material disagreements.
6. Add raw character-span tests for geography, frequency, product, activity, sector, unit, negation, and identifiers.
7. Test legacy lexical ranking with an AI correction that introduces unsupported wording.
8. Test candidate lexical ranking with the same adversarial correction and verify raw-derived cleaned text controls lexical evidence.
9. Expand the paired evaluation across more malformed Unicode, punctuation, abbreviations, misspellings, multiple geographies, multiple activities, negations, date ranges, units, and identifiers.
10. Run repeated samples or deterministic model settings where available to separate architecture effects from model variance.
11. Include human-reviewed expected outcomes so equality between two conditions is not mistaken for correctness.
12. Add a schema-level provenance test requiring source, validation status, fallback reason, and evidence reference for every important interpreted field.

### 10. What should be done next?

Keep the raw-only initial AI design and keep the cleaned note infrastructure. Do not restore the cleaned note to either AI prompt.

The next architecture work should focus on evidence separation and provenance, not on adding more prompt text.

## 4. Current downstream uses of the cleaned note

### Retrieval

The local metadata retriever primarily consumes structured intent: route, geography, concepts, frequency, exclusions, and unresolved qualifiers. The cleaned string supports the construction and validation of that intent but is not the metadata selector by itself.

### Validation

The cleaned string is actively used by the deterministic fallback parser and AI-field validators. This is appropriate, but the cleaned text and AI correction should eventually be represented as separate evidence channels rather than one concatenated validation string.

### Ranking

The local candidate ranker uses raw-derived cleaned text for AI intents. This is appropriate for lexical evidence and does not make the cleaned string authoritative over structured constraints.

The legacy scorer uses `correctedQuery` first. This is the main remaining inconsistency.

### Fallback

When AI is missing, invalid, low-confidence, unavailable, or rejected, deterministic rules parse the cleaned and normalized raw text. This is an appropriate active use.

### Debugging

The intent response and comparison reports retain cleaned and corrected forms. This is useful for distinguishing mechanical cleanup, AI correction, and final validated values.

### Testing

The raw-only tests preserve both forms, and the historical A/B report demonstrates that the minimal cleaner did not change validated outputs in the tested cohort.

## 5. Raw-versus-cleaned comparison and conflict handling

### Runtime comparison

The runtime does not currently create a first-class comparison object such as:

```json
{
  "rawToCleaned": {
    "transformations": [],
    "semanticChangeExpected": false
  },
  "rawVsAi": {
    "agreements": [],
    "conflicts": []
  }
}
```

The mechanical transformation is deterministic and implicitly observable by retaining both strings, but differences are not enumerated.

### Offline comparison

The historical A/B runner compared raw-only with raw-plus-cleaned model input. `HOHO2.md` records 20/20 identical validated intent, top-five order, and warnings.

### AI-versus-deterministic comparison

The application does compare AI claims with deterministic validation at field level. `validateAiField()` records acceptance, fallback, ambiguity, missing values, and rejection.

However, conflict handling is mostly encoded as validation and fallback status. There is no general `conflicts` array that preserves both competing claims, their evidence spans, and the exact resolution policy.

## 6. Field-level provenance assessment

Current field-level provenance is useful but partial.

### What is recorded

- AI-reported raw field text when provided;
- AI canonical value;
- final normalized value;
- validation status;
- confidence;
- whether deterministic fallback was used;
- fallback reason and method;
- ambiguity reason and alternatives;
- structured-intent provenance for query, geography, concepts, sector, frequency, exclusions, and unresolved qualifiers.

### What is missing

- exact raw start/end span for every field;
- exact cleaned start/end span;
- transformation version for `cleanedQuery`;
- explicit deterministic candidate value before reconciliation;
- a first-class conflict status separate from fallback;
- a complete resolution-policy identifier;
- a trace showing which evidence affected retrieval gates and which affected ranking points;
- durable request-level audit storage.

The answer to "does provenance record which source contributed each interpreted field?" is therefore: **partially**. It records enough to distinguish accepted AI values from deterministic fallback in most field records, but not enough for a complete evidence audit.

## 7. Recommended source-of-truth and provenance rules

1. Preserve `originalQuery` exactly and immutably for the lifetime of the request.
2. Treat `originalQuery` as the only authoritative record of what the user entered.
3. Store `cleanedQuery` only under a clearly mechanical name.
4. Never overwrite or relabel `originalQuery` with cleaned or corrected text.
5. Record the cleaner version and exact transformations when durable provenance is needed.
6. Treat `correctedQuery` as an interpretation or display aid, never as original evidence.
7. Validate AI fields against raw-derived evidence and approved metadata, not merely against wording the AI generated itself.
8. Preserve AI claim, deterministic claim, final value, status, reason, and evidence references separately for each field.
9. Automatically resolve only governed cases such as approved aliases, exact identifiers, and deterministic formatting corrections.
10. Record material conflicts instead of silently selecting one side.
11. Require clarification when unresolved conflict affects geography, product, activity, frequency, unit, exclusion, date range, or identifier.
12. Keep retrieval gates deterministic and metadata-based.
13. Allow cleaned text to support lexical ranking, but never let lexical text override hard structured constraints.
14. Keep semantic reranking limited to already eligible candidates and preserve deterministic order unless a separately approved promotion policy changes that rule.

Recommended per-field shape:

```json
{
  "field": "product",
  "aiClaim": {
    "rawValue": "oil",
    "canonicalValue": "petroleum",
    "confidence": 0.94
  },
  "deterministicEvidence": [
    {
      "rawStart": 14,
      "rawEnd": 17,
      "rawText": "oil",
      "canonicalValue": "petroleum",
      "source": "approved_alias"
    }
  ],
  "finalValue": "petroleum",
  "status": "agreement",
  "resolutionPolicy": "approved_vocabulary_match"
}
```

## 8. Recommended future uses of the cleaned note

The cleaned note should remain infrastructure, not prompt content.

Recommended active uses:

- stable whitespace-insensitive tokenization;
- deterministic phrase matching;
- approved typo and alias processing;
- negation detection;
- metadata vocabulary lookup;
- lexical candidate scoring after hard gates;
- deterministic fallback after AI failure;
- readable diagnostics;
- regression fixtures and comparison reports.

Recommended supporting-only uses:

- AI-field validation;
- clarification generation;
- metadata retrieval through structured evidence;
- user-visible "interpreted as" displays.

Uses to avoid:

- initial AI prompt duplication;
- semantic-reranking prompt duplication;
- replacing `originalQuery`;
- storing it as though it were user-entered text;
- silently resolving semantic conflicts;
- overriding validated structured constraints.

## 9. Brief summary

The current architecture makes the correct primary decision: the initial AI receives only the exact raw user note, while the minimal cleaned note remains available for deterministic work. No useful semantic information is lost by withholding it from AI, and the historical A/B evidence found no effect on validated intent, top-five ordering, or warnings in 20 paired queries.

The cleaned note is preserved in the intent object and staged search payload. It supports deterministic parsing, validation, fallback, local lexical ranking, debugging, and testing. Field-level provenance distinguishes AI acceptance, deterministic fallback, ambiguity, missing values, and rejection, but it does not yet provide complete raw spans or first-class conflict records.

The two main follow-up issues are the combined cleaned-plus-AI-corrected validation string and the legacy scorer's preference for `correctedQuery`. These do not justify reversing raw-only AI input. They justify strengthening downstream evidence separation.

## 10. Numbered proposed action plan

1. **Keep the implemented raw-only initial AI prompt.** Do not send `cleanedQuery` as duplicate model input.
2. **Keep the cleaned note infrastructure.** Continue preserving `originalQuery`, `cleanedQuery`, and `correctedQuery` as separate values.
3. **Keep semantic-reranking input raw-only.** If semantic reranking is later connected, provide raw text, validated structured intent, and eligible candidate metadata, not the cleaned duplicate.
4. **Document the authority hierarchy.** Raw input is authoritative; cleaned text is mechanical evidence; AI correction is a claim; validated structured intent is the operational decision.
5. **Separate validation channels.** Replace the implicit cleaned-plus-corrected validation string with explicit raw-derived evidence and AI-claim inputs while preserving typo recovery.
6. **Align the legacy scorer.** Make legacy lexical scoring follow the same raw-derived text policy as the local candidate ranker.
7. **Add structured evidence spans.** Preserve exact raw offsets, matched text, canonical values, rule source, confidence, and transformation version.
8. **Add first-class conflict records.** Preserve both AI and deterministic claims, resolution status, reason, and whether clarification is required.
9. **Expand end-to-end tests.** Cover the complete staged workflow, all AI request bodies, adversarial AI corrections, legacy ranking, candidate ranking, and provenance schemas.
10. **Expand the evaluation cohort.** Include more malformed formatting, misspellings, abbreviations, negations, multiple concepts, date ranges, units, and identifiers with human-reviewed expected outcomes.
11. **Retain debugging and regression visibility.** Continue reporting raw, cleaned, corrected, AI field, deterministic field, and final validated values separately.
12. **Do not promote additional AI authority without evidence.** Retrieval gates and ranking eligibility should remain deterministic; any future semantic ordering change should require measured improvement and explicit approval.
