# Final trace map and exposed counterexample

The baseline traces in `traces-before.md` were written before corrections. These locations refer to the final implementation, not the baseline.

| Requirement | Shared correction and observable path |
|---|---|
| R2 | `lookup-geography.js:80` derives ordinary codes from metadata and applies the specified case/context rule; `:93` reconciles model places. Initial normalization and reply merge use it. `lookup-search.js:92` retains the turn's geography text through replay; the optional add-place button is validated before merging. Actual browser E1 adds USA beside Japan without another model call, then retrieves and exports both. |
| R9 | `lookup-geography.js:93` restores exact/unique spelling matches before validation; original I12's omitted Iowa/Nebraska becomes IA/NE and survives resubmission. Both live I12 repetitions passed. The exposed D18 regression is described below. |
| R11 | `lookup-geography.js:70–71` shares group detection and state expansion; `locked-form-reply-update.js:68` applies it to typed answers. `lookup-search.js:110` sends the reply's place context into clarification. Initial group requests cannot substitute a US national total. Actual browser typed All U.S. states produced 51 entries and 51 places in Excel. |
| R12 | `locked-form-evidence.js:6` restores a positively stated approved part in the topic quote. `lookup-list.js:36` retains part evidence through activity-only updates using origin/history. Selection then rejects whole-product rows for named parts. Live E12 selected nominal monthly retail gasoline, not PATXD; screen and actual Excel retain gasoline scope and dollars/gallon. |
| R13 | `locked-form-v2.js:24` validates previous/current calendar-year evidence. Request builders at `locked-form-v2.js:179` and `locked-form-reply.js:89` supply date/year. `lookup-search.js:264` makes a bounded latest-available retrieval only for a complete empty relative-year response and labels an earlier ending year. Actual E12 data/Excel passed; D14's historical open-ended-year expectation mismatch remains in the original score. |
| R14 | `interpret-query.js:106` turns unusable/model-failure replies into replayable question history. `locked-form-reply-update.js:61` allows a kind-only reply to select only a unique metadata alternative; it cannot pick one of two countries arbitrarily. `lookup-context.js:47` supplies existing country alternatives. Actual Korea reply kept natural-gas consumption and offered South/North Korea. |

## D18: exact trace before the post-run correction

Both `D18-*-initial-attempt-1.json` raw OpenAI responses contain World only for `marine capaicty in World`. The application, not the model or EIA, added Maine.

At scored commit `09bb0b2`, `lookup-geography.js:96–100` tried single-word, one-edit geography matches without considering exact valid non-geography concepts. `marine` is one deletion from `Maine`. The reconciled form therefore became ME + WLD; `lookupRequestFromIntent` expanded both; selection attempted both; screen/Excel faithfully carried the extra requested place (Maine was unavailable). No source mislabelling is inferred from this place-request error.

The final `lookup-geography.js:97–101` gives exact approved product/activity/sector/frequency terms precedence, and declines tied fuzzy matches across these domains. There is no marine/Maine branch or spelling-exception list. The exposed test covers the original query, a correctly spelled variant, typed replies, explicit Maine, misspelled Nebraska, and every canonical non-geography vocabulary term. Against the scored code it failed; after correction it passes. Replaying 101 recorded initial model outputs changed only the two D18 forms. The actual browser/API replay now shows World only.

## Screen and Excel boundary

`formatting.js:8` supplies the same whole-number/four-significant-digit formatting for headline, table, chart and tooltip. Actual D9 headline/chart: 185,035; downloaded Excel: 185034.87432294185. `lookup-display.js:26` deduplicates the status description; `:33` builds one scope line while retaining sector, frequency and explicit alternative notices. `xlsx.js:302` supplies one metadata field per purpose; the browser's actual E12 export has one Units, Frequency, Source and Series name row.

Final verification is offline replay through the real local API routes, not fresh AI responses. Exact saved upstream requests matched 11 model calls and 58 EIA calls; the transport denied anything unmatched. No unmatched request, new upstream call or browser error occurred.
