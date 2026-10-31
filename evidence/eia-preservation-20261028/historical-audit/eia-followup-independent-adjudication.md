# Frozen challenge adjudication

The original independent file `/private/tmp/eia-followup-independent-challenges.json` remains unchanged. Its SHA-256 is `c60cf4a533abb90b78bd5acb3700eb25d4d0fc4ce7d59994304b2b46ff0bec46`.

Case `positive-order-preserved` asks: “I'm not sure what's available for Canada and The Gambia: coal and natural gas consumption and production”. The frozen expectation was ordered products `[coal, natural gas]` and activities `[consumption, production]`. The probe's natural Cartesian model emits all four product/activity combinations.

Observed behavior: the app retains both countries in order but returns `conceptPairStatus=unresolved`, `needsClarification=true`, and zero candidates. The same behavior occurs in deterministic rules, injected-model validation, serialization revalidation, and the public search GET.

Adjudication: this is not a follow-up defect. The query does not explicitly pair its two products with its two activities. The existing contract deliberately asks for clarification instead of choosing between one-to-one and all-combinations interpretations. The exact same `hasOrderedOneToOneScope` and unresolved-pair guard exists in the prior review bundle. The unchanged frozen failure is retained in the raw log/results, not removed from the denominator. Two supplemental explicit cases demonstrate the required order preservation without ambiguity: “coal consumption and natural gas production” and “energy consumption and production”, both for Canada followed by The Gambia. Both pass all four boundaries and return candidates.

The separate uncertainty-modifier failures are actionable and are not adjudicated away. “I'm not at all sure what's available for USA energy consumption”, as well as “not very/so/particularly/exactly/actually sure”, has one clear product/activity pair and a correct injected model response. At the reviewed initial production diff hash `87234103f9face7f8bb658bf1dd5325b65406a381575c188d9aa6023457d6179`, the parser nevertheless excludes its requested data and drops USA. These were reported to the implementation agent before any final verdict.
