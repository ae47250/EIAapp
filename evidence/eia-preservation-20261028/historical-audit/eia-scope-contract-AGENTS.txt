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
