# FAIL — Job 9c stopped at the required saved-form test

Historical stop report, superseded by [owner-decision.md](owner-decision.md).

Start: `codex/eia-measure` at `d6a0f8d13063397fc87b6f986265f153053d0267`.

The saved first-turn `job9b-LUNA-MED` answer for `D-D3` has two topics: `nuclear / production` quoted as `prdouction`, and `nuclear / consumption` quoted as `consumption of nuclear energy`. The frozen suite expects `nuclear / generation` and `nuclear / consumption` for this case, with `country-nuclear-generation` as the first lookup row key. EIA metadata has different verified nuclear production and generation series and units. Under Job 9c item 1, `prdouction` names no other activity, so the validator must retain the model's `production`. G1 changes typo repair for places, products and linking words; G2 adds exact place names; G3 restores named product parts. None may convert an activity from production to generation. Thus item 8's required `D-D3` correct in every chosen-setting replay cannot pass for LUNA-MED without changing a written rule, the frozen suite, the model answer, or app behavior outside the authorized groups.

Evidence: `tests/golden/eia-job9c-first-turns.json`, extracted from each of the five Job 9b source runs without prompts or credentials; its SHA-256 is `d6ece64af7ea802481a01903979ff960e79866b5d2e43f0fa2a883441cdcf299`. Source: `~/Documents/EIAapp-Evidence/20261031/job9/job9b-LUNA-MED/model-attempts.jsonl`. Offline test log: `~/Documents/EIAapp-Evidence/20261031/job9/job9c/offline-fail.log` (917 tests; 916 pass, one required saved-form test fails). The earlier d6 validator failure is in `validator-before.txt` alongside that log.

No offline gate, eight-setting replays, SOL run, group decision, deletion, or paid calls were performed. The branch contains partial validator, switch, scorer, and harness changes for review only and is not production-ready. The owner must resolve the production-versus-generation contradiction before the measurement can resume.
