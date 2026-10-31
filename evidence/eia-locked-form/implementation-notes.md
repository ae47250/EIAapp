# Locked-form implementation checkpoint

Base: b7b119333dd111b9b2deea12acf1df68a1c2674d. Freeze: 07f57ffe4b982f5ac7ed7f7f409a8db03ab5734c. A0: 3c93efb.

The model path now uses strict Responses JSON Schema, copied source words, mechanical fact checks, conversion through addClarificationState, and raw-form browser resubmission. Only outages enter the unchanged rules engine; timeout, refusal, cutoff, rejected requests and exhausted fact-check re-asks block retrieval. A failed check allows one re-ask. No production model or model-setting change: default gpt-5.4-mini, 30-second timeout; no new production reasoning/output settings.

Browser serialization is factored into lib/eia-intent-payload.js so production and evaluation execute the same function. Rules outage envelopes carry only an approved outage reason and are reinterpreted from the original query. Legacy or missing model forms never reuse derived fields.

Exactly two routing/ranking comparisons accept the new interpreter label. Known remaining independent rules are unchanged: sector inference in intent-routing.js, getNegationScope there, and raw-query keyword ranking (including excluded words) in local-ranking.js. These may still affect downstream results and are outside this job.

The removed functions are listed in deleted-functions.json. request-evidence.js remains for the rules fallback. The original contractCompliance scoring for character offsets is retired, replaced by Part C. Retired test definitions and reasons are in test-migration.json; fixtures remain unchanged. Existing tests outside the retired model contract were retained with their expectations unchanged. Baseline: 621 tests, 620 passed, 1 skipped. Current suite: 284 passed, no failures. These counts are not directly comparable because the contract tests were retired and replaced. Separate differential preservation: all 332 distinct fixture queries produce byte-identical rules intents at the base and new implementation. npm run build passes.

Commands:
- OPENAI_API_KEY= EIA_API_KEY= node --test --test-reporter=tap
- OPENAI_API_KEY= EIA_API_KEY= node scripts/eia-locked-form/check-rules-preserved.js
- OPENAI_API_KEY= EIA_API_KEY= node scripts/eia-locked-form/ceiling-converter.js
- OPENAI_API_KEY= EIA_API_KEY= npm run build

No push, merge, deployment or source API requests. Pre-existing docs/eia-interpretation-audit.md is untouched and unstaged. Newer AGENTS guidance on preservation branch 0dfab1b was read; the task's exact b7b1193 base remains unchanged. Build/test logs replace local absolute home/worktree paths with placeholders; raw logs remain in /private/tmp.
