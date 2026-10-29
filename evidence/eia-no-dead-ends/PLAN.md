Job 3 scope and freeze decisions (before implementation)

Base: 2c7a4c91e2d03ed580264bda8ab2f413e8dc700f. Branch: codex/eia-no-dead-ends.
Step 0 ran on unchanged v1 code. Luna passed with an empty geography question, losing years. Nano failed invalid_clarification_option, then passed by mapping many countries to World, which is the wrong meaning. Raw replies/checks are preserved.

World is verified live as countryRegionId WORL, product 44, activity 2, unit QBTU, countryRegionTypeId r. Europe has 45 source-listed members. 41 have numeric primary-energy consumption during 2000-2019; Former Czechoslovakia, East Germany, West Germany and Former Yugoslavia have none. Four other members have partial periods. No historical member is silently dropped.

The v2 source form keeps the approved composite region identifier. Lookup resolution expands that identifier into its ordered members from the existing geography list. The scorer compares expanded ordered places, so explicit equivalent members have the same meaning. This keeps resubmission compact and preserves all countries.
Year values in v2 are integers (or null; end may be latest). C6 asks activity first: bare energy already means total energy. All 12 approved activity buttons and free text are shown. These are implementation choices within the work order, not altered expected meanings.
C4 uses the exact specified text and two region-expanded alternative buttons; it does not automatically substitute imports or total energy. C3 latest is freshly checked at scoring time.

Expected implementation files and reasons:
- New lib/sources/eia/locked-form-schema-v2.js, locked-form-instructions-v2.txt and locked-form-v2.js: strict versioned years/default fields, upgradeV1Form, local checks, repaired forms, bounded re-ask and privacy-safe event logs.
- lib/sources/eia/interpret-query.js and lib/eia-intent-payload.js: choose v2 and preserve forms, year bounds and authorized button history through browser resubmission.
- lib/sources/eia/lookup-list.js plus a small region/year helper if needed: approved region expansion, World isolation and frequency-specific bounds.
- lib/sources/eia/lookup-search.js: code-built clarification steps, region-expanded alternatives, grouped EIA fetching and coverage disclosures.
- data/eia/lookup-list.json: WLD mapping and exactly one World total-energy row. No other measure additions.
- components/search/SearchWorkspace.js and LookupChoices.js: stop blocked submissions, understood line, code-built choices and free text.
- components/search/SelectedComparison.js: ten largest chart series only, with all countries retained in the table and export.
- lib/client/xlsx.js: three additional Metadata lines, preserving existing workbook structure.
- Focused new tests/fixtures and evaluation/browser scripts; existing tests may only receive explicit v2 upgrades, listed with reasons. Existing expected meanings and all frozen v1 files remain untouched.

Research sources: https://research.adobe.com/publication/datatone-managing-ambiguity-in-natural-language-interfaces-for-data-visualization/ supports showing disambiguation choices at the ambiguity. https://www.tableau.com/research/publications/inferencing-underspecified-natural-language-utterances-visual-analysis supports constrained interpretation of underspecified requests. Their optional ranking/history ideas are outside this job.

Budget: step0/budget-before-calls.json records a $0.955248 initial maximum including Step 0, 40 scored searches, 3 browser searches, every possible one-time validation re-ask and four conservatively charged token-count calls. Actual v2 native input counts must pass the 8000-token bound before generation. 16000 output tokens covers reasoning plus JSON. No scored reruns; any failed pass mark stops the push.
No main changes, merge, manual deploy, settings changes, extra model, rankings, transformations, CSV, editable tags, saved history, old-module/cache deletion or new measures beyond World.
