Commands used, from the isolated codex/eia-lookup-list worktree. No new dependencies are needed.

```sh
node --test
npm run build
node --test tests/eia-lookup-core.test.js tests/eia-lookup-search.test.js
node --input-type=module -e "import {verifyFreeze} from './scripts/eia-lookup/freeze.js'; verifyFreeze();"
```

Live EIA checks used the existing ~/Downloads/eia-api-key.txt in process memory as EIA_API_KEY. Never print it or write .env files.

```sh
node scripts/eia-lookup/check-rows.js --output evidence/eia-lookup-list/row-checks-1.json --promote
node scripts/eia-lookup/check-rows.js --only state-natural-gas-consumption --output evidence/eia-lookup-list/row-checks-2.json --promote
node scripts/eia-lookup/gold-live.js
```

The first command was run before removing the unsupported monthly frequency. For a current read-only recheck, omit --promote and choose a fresh --output path. There is no need to repeat model calls to verify the code or frozen files.

The paid run used the existing ~/Downloads/openai-api-key.txt as OPENAI_API_KEY in memory, with OPENAI_MODEL unset so the app's own default was tested. The ceiling was calculated before generation.

```sh
node scripts/eia-lookup/budget.js
node scripts/eia-lookup/evaluate.js
node scripts/eia-lookup/browser-server.js
node scripts/eia-lookup/replay-serialization.js
node scripts/eia-lookup/reconcile-cost.js
```

The four browser queries are I4, I6, O1 and F1 verbatim from their frozen keys. The local server bound 127.0.0.1:3188 with LOGIN_REQUIRED=off and OPENAI_MODEL=gpt-6-luna. It was stopped after screenshots/download checks. A new server using the final build and EIA key only then ran the HTTP replay; it was also stopped.

```sh
node scripts/eia-lookup/browser-replay.js
```

Evaluation scripts intentionally refuse existing output directories/files to protect evidence. These are the original execution commands, not permission to repeat spending. A repeat must use fresh evidence destinations in a separate checkout and a recalculated approved budget; never remove or overwrite these records. The row checker already accepts an alternative output filename. Frozen meaning scoring is scripts/eia-locked-form/score.js, unchanged; data scoring is scripts/eia-lookup/score-data.js against expected-data.json, with explicit wrong-answer countertests.
