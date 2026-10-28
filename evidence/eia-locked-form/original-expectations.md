# Frozen expectations

All sectors are unstated/null. No product/activity exclusions, except the explicit Ireland geography exclusion in #6.

|#|Exact query|Geographies in order|Product/activity pairs|Frequency|Excluded geography|Clarification|
|---|---|---|---|---|---|---|
|1|total energy consumption united states|USA|total energy / consumption|annual; explicit=false|none|no|
|2|total energyy consumption usa|USA|total energy / consumption|annual; explicit=false|none|no|
|3|brazil and japan electrciity consumption|BRA, JPN|electricity / consumption|annual; explicit=false|none|no|
|4|energy consumption iceland|ISL|total energy / consumption|annual; explicit=false|none|no|
|5|energy consumption icealnd|ISL|total energy / consumption|annual; explicit=false|none|no|
|6|energy consumption iceland not ireland|ISL|total energy / consumption|annual; explicit=false|IRL|no|
|7|natural gas production and consumption in Texas annually|TX|natural gas / production; natural gas / consumption|annual; explicit=true|none|no|
|8|monthly electricity consumption in California|CA|electricity / consumption|monthly; explicit=true|none|no|
|9|electricity consumption in Georgia and France|GEO, FRA|electricity / consumption|annual; explicit=false|none|no|
|10|gas consumption in the United States|USA|unresolved gas / consumption|annual; explicit=false|none|natural gas vs gasoline|

**semanticAccuracy:** All-or-nothing per original response, with field-level reasons also reported. Check ordered canonical geographies, every product/activity pair, no invented sector, annual/explicit=false default, explicit annual/monthly where stated, Ireland exclusion in #6, and gas clarification in #10. Confidence does not award correctness. Canonical names/metadata aliases with the same meaning are accepted; equivalent valid span segmentations are accepted. Contradictory requested/excluded/unresolved dispositions fail semantics even when compatibility fields look correct.

**ambiguityPolicy:** Only #10 requires clarification;1–9 establish clear requests and unnecessary clarification fails exact semantic accuracy. #10 must preserve country/consumption, leave product unresolved, and clearly identify natural-gas/gasoline ambiguity rather than guessing; structured ambiguity with equivalent prose is accepted.

**pairsPolicy:** Compare canonical ordered pair arrays. Singular compatibility product/activity fields may summarize the first pair; they cannot replace or contradict ordered pairs. #7 must retain both production and consumption. #10 may use an empty pairs array or null-product/consumption pair while clarifying.

**contractCompliance:** Strict original JSON only (no fenced/substr JSON repair), prompt-required top-level keys and field/item types, finite0..1 confidences, allowed canonical category values, and exact source evidence validated against original raw text. Record syntactic JSON, shape, and span compliance separately. App built-in tolerant extraction is replayed unchanged and explicitly labelled if it recovers a non-strict answer.

**downstream:** Replay every received original response verbatim through interpretQuery with injected transport, validateAiInterpretation (where JSON parses), actual browser appendIntentParams, normalizeSubmittedIntent, public search GET, and cached candidate pipeline. No additional model/EIA calls. Record semantic changes, clarification, fallback, routes, units, frequencies, source coverage, eligible/ranked/displayed counts and candidate IDs. Correct labelled frequency fallback is not itself a model mistake. Empty metadata results and the known Texas routing/eligibility problem are reported separately; no fixes.

**usableInterpretation:** Original semantic pass AND JSON/source-evidence contract pass. A downstream rescue/fallback never upgrades model success. Report downstream-safe outcomes separately.

**consistency:** For each query/model, compare normalized original semantic signatures from both scheduled repeats; count missing/error repeats as not consistent. Also report strict pass agreement separately. Byte-identical wording/span splits are not required.

**latency:** Wall time for each actual attempt. Report median/min/max of successful scheduled generation latency; separately report end-to-end time including retry and failed attempts.

**cost:** Use returned input/output/cache-write/cache-hit token usage and official Standard rates. Include all retries with reported usage. For transport failures without usage disclose unknown billed cost and reserve full per-attempt ceiling. Cost per usable interpretation uses all actual known generation cost divided by usable original responses.

**decision:** Provisionally prefer Luna only if frozen semantic and contract scores are no worse and measured token cost is lower; if neither is adequate say so. Ten queries and two repeats do not establish statistical equivalence or general complex-negation validity.
