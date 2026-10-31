# AGENTS.md

## Project Scope

This repository is for data extraction, metadata lookup, API retrieval, data cleaning, display, diagnostics, and export workflows using official statistical data sources.

This guidance applies to sources such as IMF, OECD, World Bank, EIA, FRED, Eurostat, national statistical agencies, central banks, and similar data providers.

Primary goal: keep the app reliable, reproducible, secure, and easy to debug while making the smallest necessary code changes.

---

## General Change Policy

Before editing code:

1. Identify the exact files that need changes.
2. Explain why each file needs changes.
3. Make the smallest safe change possible.
4. Preserve working code unless a change is clearly required.
5. Do not redesign, refactor, or simplify working systems unless explicitly requested.
6. Do not remove existing functionality unless explicitly requested.
7. Do not introduce new dependencies unless necessary.
8. If a change affects data results, explain how results may change.

---

## Required Change Report

For every coding task, report:

* Files modified
* Why each file was modified
* Exact summary of changes
* Checks/tests run
* Possible side effects
* What still needs live testing

Show a diff or concise diff-style summary whenever possible.

---

## JavaScript, API, and Serverless Safety Rules

Whenever editing JavaScript, TypeScript, API routes, backend routes, or serverless functions:

1. Run syntax checks when possible.
2. Check imports and exports.
3. Check async/await logic.
4. Check fetch calls.
5. Check JSON parsing.
6. Check error handling.
7. Check environment variable references.
8. Check Vercel/serverless compatibility if applicable.
9. Confirm existing working behavior was not accidentally removed.

If tests cannot be run, state why and provide manual test steps.

---

## Python Test Verification

Run each `scripts/eia-lookup/*.test.py` file individually with `python3 -B` and aggregate exit statuses; `unittest discover` does not find these hyphenated test module names.

---

## Secrets and Environment Variables

Never expose API keys, tokens, or secrets in frontend files or public code.

Secrets may include:

* OPENAI_API_KEY
* IMF API keys or tokens if used
* OECD credentials if used
* EIA_API_KEY
* FRED_API_KEY
* Database credentials
* Private dataset keys or tokens

Use environment variables for secrets.

For Vercel projects, use Vercel Environment Variables.

Frontend code must call backend/serverless routes rather than directly exposing secrets.

---

## Metadata-First Rule

For statistical-data projects, resolve metadata before retrieving data.

Before pulling data, identify:

* Source
* Dataset
* Indicator or variable name
* Indicator or variable code
* Country/entity code
* Frequency
* Units
* Time coverage
* Dimensions
* Filters
* API endpoint/query structure

Do not invent variable codes, country codes, dataset IDs, units, dimensions, or API keys.

When metadata files exist in the repository, inspect those first before calling or changing live API logic.

---

## Source-Specific Rule

Only add source-specific behavior when needed.

Examples:

* OECD-only repository: use OECD metadata lookup before live API retrieval.
* IMF-only repository: resolve IMF database, frequency, country code, and indicator code before retrieval.
* World Bank-only repository: preserve WDI indicator codes, country codes, units, and coverage.
* EIA-only repository: preserve EIA route structure, series/category logic, and API-key security.

Do not hard-code source-specific assumptions into a general data app unless explicitly requested.

---

## Data Retrieval Rules

When retrieving data:

1. Use official APIs or official source files where possible.
2. Keep source-specific logic clear and isolated.
3. Preserve raw source codes and names.
4. Sort time series chronologically.
5. Check for duplicate observations.
6. Check for missing values.
7. Report coverage clearly.
8. Distinguish unavailable data from API errors.
9. Distinguish official source variables from computed variables.
10. Do not silently substitute one variable for another.

---

## Vague Variable Handling

For vague requests such as GDP, inflation, trade, debt, reserves, money, productivity, FDI, labor, unemployment, exchange rates, prices, energy, or consumption:

1. List plausible candidate variables when ambiguity matters.
2. Include source, dataset, code, unit, frequency, and coverage when available.
3. Ask for clarification only when ambiguity materially changes the result.
4. Otherwise make a reasonable default and state it.

---

## Frequency Rules

Do not merge incompatible frequencies without explicit handling.

Keep separate or clearly label:

* Annual
* Quarterly
* Monthly
* Weekly
* Daily

If converting frequency, state the method.

Examples:

* Annual average
* End-of-period
* Sum over period
* Last observation
* Percent change

---

## Computed Variables

Only compute derived variables when requested or clearly implied.

Label computed variables clearly.

Examples:

* growth_percent = 100 * (value_t / value_t_minus_1 - 1)
* share_percent = 100 * numerator / denominator
* index_normalized = 100 * value_t / value_base

Always distinguish computed series from official source series.

---

## Output and Export Rules

For Excel exports, use clean workbook structure.

Default sheets:

* All_Data
* Metadata
* Notes

When appropriate, add sheets by:

* Country
* Dataset
* Frequency
* Source
* Topic

Metadata sheet should include:

* Source
* Dataset
* Variable name
* Variable code
* Country/entity
* Frequency
* Unit
* Coverage
* API endpoint or query notes
* Download date
* Assumptions

Notes sheet should include:

* Missing-data issues
* Transformations
* Warnings
* Limitations
* API/query notes

---

## Front-End Rules

When editing UI files such as index.html, CSS, or frontend JavaScript:

1. Preserve existing working layout unless requested.
2. Preserve button behavior.
3. Preserve user workflows.
4. Keep forms clear and compact.
5. Avoid unnecessary cosmetic redesign.
6. Do not remove search, preview, download, diagnostics, or export features unless explicitly requested.
7. Check browser console and network behavior when debugging.

---

## Search, Button, and Download Diagnostics

If a button, form, search box, preview, chart, or download action does not work, investigate:

1. Browser console errors.
2. Network tab requests.
3. API route responses.
4. Event listeners.
5. DOM element IDs.
6. Fetch URLs.
7. Serverless function paths.
8. Environment variables.
9. CORS or deployment issues.
10. Data-shape mismatches between backend and frontend.

Do not assume the problem is only frontend or only backend.

---

## Deployment Rules

For GitHub + Vercel projects, assume this workflow:

Codex â†’ GitHub â†’ Vercel â†’ Live app testing

Before commit/push:

1. Confirm only intended files changed.
2. Confirm no secrets were added.
3. Run available checks.
4. Summarize the diff.
5. State what must be tested after deployment.

After Vercel deploys, test:

* Live page loads
* Search/query works
* API route responds
* Preview/output displays correctly
* Downloads work if relevant
* Browser console has no blocking errors
* Results match expected source/metadata

---

## Reliability Priority

Priority order:

1. Working deployment
2. Correct data
3. Secure handling of secrets
4. Reproducible source/metadata reporting
5. Backward compatibility
6. Maintainability
7. New features
8. Cosmetic improvements

Never sacrifice a working app for unnecessary refactoring.

---

## When Uncertain

If implementation choices differ:

1. Explain the options.
2. Identify tradeoffs.
3. Recommend the least disruptive option.
4. Preserve existing behavior by default.
5. Ask only if ambiguity materially changes the result.

Do not guess silently when source, variable, unit, frequency, or coverage ambiguity affects results.


---

## EIAapp Execution and Evidence Guardrails

Supplement existing guidance; explicit user authorization determines scope.

### Outcome and scope
Success means useful, compatible data or necessary clarification with understandable choices. Passing tests, JSON and candidate lists alone do not establish success.
Maintain one objective, authorized scope and completion criteria. Check whether another agent already started or completed the work. Backlog unrelated findings.

### State and preservation
Inspect applicable instructions, branch, commit, uncommitted changes and relevant evidence. Identify the deployed version when relevant. Never substitute stale work for current work.
Before substantial changes, establish a verified durable checkpoint within authorization. Preserve irreplaceable evidence outside temporary directories. Report remote-backup gaps. Authorized WIP preservation need not wait for passing tests; disclose failures. Never include credentials or private evidence.

### Research and native capabilities
Inspect current official OpenAI, EIA and Vercel documentation and relevant code as applicable. Use original papers for research claims. Check versions, applicability and exact support; cite material recommendations. Defaults, snippets and AI reports do not prove suitability.
Evaluate native capabilities before custom logic, including Structured Outputs, schema support, model compatibility, refusals and incomplete responses. Schema compliance does not guarantee meaning.
Use code for reliable bookkeeping such as locating quoted text; handle repeated and ambiguous matches explicitly.

### Requirements and shared causes
Reconcile intended behavior, prompt, schema, metadata, clarification and expected answers before implementation or paid testing. Freeze consistent expectations. Version changes and preserve historical results. Never redefine success to raise scores.
Correct shared causes rather than individual queries. Avoid growing phrase whitelists or rules silently overriding correct meaning. Reassess the design when successive fixes expose the same failure class.

### Verification and cost
Check the relevant request-to-data flow, including clarification, browser resubmission, routing, compatible series and observations/display/export.
Separate meaning, structure, evidence, availability and app behavior. Distinguish injected tests, real-model calls, offline replay and live-browser checks. Disclose unrun checks. Exposed challenges become regressions, not untouched holdouts.
Finish when agreed criteria are met; avoid endless review cycles.
Before paid calls, verify model IDs, supported settings and prices. Justify reasoning effort, validate scorers and calculate maximum cost including reasoning tokens and bounded retries. Distinguish maximum from expected spending. Stay within authorized ceilings. Preserve outputs and usage; never retry wrong answers to improve scores.

### Access, authorization and reporting
Reuse working authentication. Never request plaintext keys, copy credentials into evidence or create replacement keys merely because environments differ. State access limitations promptly.
Do not merge, deploy, switch live models or broaden cleanup without authorization. Check dependencies before deletion.
Distinguish proposed, implemented, tested, committed, pushed and deployed. Report outcome, checks, tested identity, blockers and next action. Separate verified evidence, reports, calculations and inference. Correct defective guidance rather than substituting assurances.

### EIAapp data decisions (owner, Oct 2026)
- Model: gpt-6-luna, reasoning low. No dated snapshot exists; rerun scored sets if results look odd.
- Places: use a country's own code (type c); never match places or codes by name alone. Lookalike region codes (e.g. WP13 "Brazil") only if the country code has no data, labelled.
- Never choose silently: ambiguous input uses a stated default (listed here) with a switch button, or buttons for each candidate; place words that are also ordinary words are never added or dropped silently; lowercase two-letter words never trigger suggestions.
- Approved ambiguity defaults: Georgia -> US state unless beside another non-US country; Korea -> South Korea.
- Values: EIA symbols stay non-numeric with EIA's meaning; only numeric 0 is "Reported as zero"; a blank never becomes 0 anywhere (screen, chart, Excel).
- Scope: use EIA's broader total if published; else EIA's headline figure, labelled with EIA's scope wording; "subset only" means a component or one sector when all were asked. Named parts: only "crude oil" and "gasoline", labelled.
- Existing lookup rows and defaults win; generated mappings only fill gaps. US-only datasets without a place filter count for the US only.
- Clarification buttons always come from the checked lookup list, never from the model.
- Years in typed replies: start and end are separate slots; a reply changes only what it states.
- Charts: top 10 places by latest value, labelled; all places in table and Excel; never mix units on one axis.
- Tests: when an older frozen answer conflicts with a recorded owner decision, keep the old one on record, freeze a versioned revision with only that change, list it in the report; do not ask.
- Every work-order requirement gets a test; the report lists each requirement with its test; no test = not done.
- Before any paid or scored test run, run the complete offline test suite against the final code, including replays of saved AI responses, and fix every failure first. If the AI's instructions or input format changed, say which saved responses are out of date. A scored run that fails on something the offline suite would have caught is a process failure; report it as one.

---

## Search and Candidate Discovery

1. Separate interpretation, metadata discovery, candidate validation and observation retrieval. Search hits are candidates, not verified answers.

2. Preserve the interpreted request separately from keyword queries. Respect the search tool's matching behavior; retain geography, exclusions, frequency and other constraints.

3. Resolve supplied identifiers against authoritative metadata first. Never silently replace an unrecognized identifier with a loose text match.

4. Search approved names, descriptions, routes and relevant filter values. Inspect full shortlisted metadata; titles and snippets are insufficient.

5. Check measure, product, activity, geography, units and frequency compatibility before ranking. Prefer exact requested concepts. Clearly label alternatives, breakdowns and substitutions.

6. Use bounded fallback searches: supported terminology, catalog browsing or broader keywords. Never silently relax actual user constraints. Record changed searches.

7. Report searched coverage, unavailable metadata, limits and truncation. No match within searched coverage does not establish that the source has no data.

8. Treat fuzzy scores as retrieval signals, not correctness probabilities. Calibrate thresholds on relevant and irrelevant cases; reassess after index or algorithm changes.

9. Verify route/series, filters, units, frequency and coverage before fetching. Track pagination and observation completeness separately from search relevance.

10. When materially different interpretations remain, offer focused, metadata-supported clarification choices and free text.
