# Locked-form work order and documentation check

Base: b7b119333dd111b9b2deea12acf1df68a1c2674d. Preservation branch advanced to 0dfab1bb41c7d73decbf1d360357d2a83539392c only by adding AGENTS.md instructions. Exact requested base used; newer read instructions still followed. The existing untracked raw audit is untouched. Dependencies were present; npm ci not needed. Before edits: 621 tests, 620 pass, 0 fail, 1 skipped.

Official docs read 2026-10-28:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/models/gpt-6-luna

Responses text.format json_schema strict=true supports required properties, additionalProperties=false, nullable types, arrays and $defs/$ref. Limits: 5000 total object properties, 10 nesting levels, 120000 characters across property/definition names and enum/const strings, 1000 enum values; a string enum over 250 values has a 15000-character limit. Definitions count once; depth follows references. The schema test records both these counts and conservative array/object nesting.

Luna supports Structured Outputs and low reasoning. Standard USD per million: input 0.10, cached 0.01, cache write 0.125, output 0.50 (reasoning included). Recheck before paid execution. Availability in the account has not yet been probed in this job. No paid calls before the complete budget gate.

The original semantic rules remain unchanged. The original contractCompliance section describes the retired offset contract; Part C replaces it with strict form structure and fact checks. The new scorer intentionally separates meaning from checks and retrieval. Original O10 retains the expressly permitted empty topics representation while clarifying. PASS uses the first 48 scheduled responses only: at least 44 meaning+check passes, all six expected clarification responses correct, no unexpected original O1–O9 clarification. No re-ask or tuned rerun changes that line.

Freeze -> free A0 ceiling -> implementation -> offline checks/build -> budget-gated Luna live check. No push/deployment or retrieval fixes. Known downstream rule sites are retained: sector inference, getNegationScope, and raw-query ranking keywords (including excluded words).
