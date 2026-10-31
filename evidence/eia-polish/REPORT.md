# PASS — Job 7 polish, including F8

Base: `f4138a879c0ca45709977ffb4340fd3245bebfae` (the pushed Set D rerun evidence required by the start condition). Branch: `codex/eia-polish`. Set F was frozen before implementation in `5ac5d88`. Application code tested: `4c17f53`. No schema, vocabulary, dependency, model, authentication, production or coverage expansion.

| Required mark | Result |
|---|---|
| D ≥53/58; D1–D3 both times | **54/58; 6/6 — PASS** |
| C ≥18/20 | **20/20 — PASS** |
| Independent I ≥21/24 | **24/24 — PASS** |
| E all; F all | **16/16; 8/8 — PASS** |
| Every-output P3/P4/P6 checks | **126/126 — PASS** |
| Dead ends; unlabelled wrong data | **0; 0 — PASS** |
| Offline tests; build | **806 JavaScript; 447 Python; build PASS** |
| Model and budget | **gpt-6-luna, explicit low; $0.117044 upper bound / $0.30 — PASS** |

The run finished October 30, 2026, 9:41:02 PM EDT, within the three-hour work window. The 114 scheduled turns used 115 unique generation calls: one permitted validation re-ask for an invalid quote in E14. No wrong-answer retry. The 2,048-output-token allowance includes reasoning. The pre-run scheduled maximum was $0.240664 including counting; a guard reserved every remaining call and allowed re-asks only from realized savings. Its enforced ceiling was $0.30. An unfunded full-retry schedule would have cost $0.475433 and was not permitted. These are conservative calculations, not invoices.

## Requirements and before/after evidence

The unchanged final regression file was run against an archive of the starting commit: **21 fail, 5 pass before; 26 pass after**. Existing behaviors that already worked were retained, not falsely counted as new fixes. Each P requirement has a failing-before, passing-after test. All checks and commands are in `checks/`.

| Requirement | Regression test in `tests/eia-polish.test.js` | Before → after |
|---|---|---|
| P1 visible ambiguity | Tied Nambia candidates; explicit activity, region and year alternatives; bare ambiguous product; year button resubmission | FAIL → PASS; approved defaults and explicit “show both” remain preserved |
| P2 ordinary codes, including F8 | Seven specified queries; harmless transposed linker; negative controls; typed replies | FAIL → PASS; US suggestion preservation already passed |
| P3 correct periods | Exact month headline, annual headline/monthly chart using the same measure, monthly fallback, incomplete-year caption | FAIL → PASS |
| P4 plain descriptions | No research instructions in card or actual XLSX; separate metadata-builder regression | FAIL → PASS |
| P5 place headers | State-only and mixed table/export headers, read from actual workbook XML | FAIL → PASS |
| P6 consistent statuses | DC/Vermont/unchecked examples, card/table helpers and XLSX statuses | FAIL → PASS |
| P7 instruction | Exact owner sentence quoted in the test | FAIL → PASS |

The actual all-states run kept **51 entries**. DC and Vermont were consistently **“Not yet in our checked list”** in the visible output and Excel; they were not called numeric zero. A supplemental read-only audit checked **137 displayed headline values and 529 complete series exports**, with no mismatch. Serverless tracing includes the three changed/new metadata assets with matching hashes.

## Set F

| Case | Result |
|---|---|
| F1 World marine capacity | PASS; no Indiana suggestion |
| F2 US gasoline prices last year | PASS; official 2025 annual value and monthly chart |
| F3 all states coal generation | PASS; 51 entries, State header, consistent statuses |
| F4 Nambia | PASS; Namibia |
| F5 Japan “us” | PASS; Japan data and optional US suggestion |
| F6 gas prices Ohio | PASS; natural-gas/gasoline question |
| F7 gas in OH vs us | PASS; Ohio and US retained; product clarification remains appropriate |
| F8 petroleum consumption ni Burma | PASS; Burma petroleum consumption data, no “ni” question |

The scored calls used real Luna and EIA responses. The browser rendered the returned results and downloaded actual Excel files; it did not make another AI call. A separate final **real built Next API → live EIA → browser → Excel** check used F8's saved AI response with the server's OpenAI key blank: HTTP 200, MMR petroleum consumption, 45 observations, 45 Excel rows, no clarification or browser errors. This is injected interpretation plus live retrieval, not another live-model run.

## October 2025 gasoline

Verified API series/selector: **MSN `MGUCUUS`, `total-energy`, value**, annual/monthly. Annual request (key omitted):

`https://api.eia.gov/v2/total-energy/data/?frequency=annual&data[0]=value&facets[msn][]=MGUCUUS&start=2025&end=2025&length=5000`

Response begins:

```json
{"total":"1","data":[{"period":"2025","msn":"MGUCUUS","seriesDescription":"All Grades of Gasoline, U.S. City Average Retail Price in Dollars per Gallon Including Taxes","value":"3.396","unit":"Dollars per Gallon Including Taxes"}]}
```

Monthly request uses `frequency=monthly&start=2025-01&end=2025-12` with the same MSN. Its 12 observations include `{"period":"2025-10","msn":"MGUCUUS","value":"Not Available"}`. October has **no numeric value**. December is 3.195. The annual 3.396 is EIA's published figure, not an average computed from the available months. Full safe URLs, responses and hashes are in `period-source-checks.json`; the 2026 annual probe returned zero rows.

## Pre-run revisions and retained failures

`expectation-revisions.json` lists each revision and **quotes its complete P-line**. The exact button-list check remains; D4a now forbids the unwanted Indiana suggestion under P2. P6 versions exact missing-status expectations/checks. P3 changes E12's same-MSN frequency to annual. P5 versions the independent Excel reader and adds exact place-header checks. P7 updates the instruction-block hash. Every-output checks were added, with negative-control tests. Historical expectations, scorers and original tests remain on record. No expectation or scorer changed after the run started; all 310 frozen files remained unchanged.

Four scored failures remain: **D6a both repetitions** expected “No data for these years (EIA returned none)” for its missing states, while the app displays “Not yet in our checked list”; **D21 both repetitions** now asks a product question for “gas reserves” instead of returning natural-gas reserves directly. No score was adjusted after seeing these failures. They meet the agreed D threshold but remain follow-up defects; this PASS does not claim universal correctness.

A harness failure is separately retained. A misplaced presentation check in the model logging callback raised `result is not defined`. Execution stopped after six saved responses. The recovery runner removed only that misplaced check and reused all six identical request/response objects with matching request hashes; it made no duplicate model calls. The original runner, ten interrupted outcomes and logs remain in `interrupted-harness/`; the completed schedule is in `scored-run/`. Three added runner tests verify the callback and budget boundary. This was recovery of the same schedule, not a second model run or an expectation revision.

## Changes, reproduction and preservation

- `lookup-geography`, new `lookup-ambiguity`, locked-form normalization/replies/context/search: shared ambiguity and word handling, clarification-source preservation, annual/monthly retrieval.
- Display helpers, chart/table components and XLSX: exact periods, plain descriptions, place headers and canonical statuses; full numeric export precision retained.
- Two metadata builders and their generated files: remove research instructions at the source. **810 description fields changed; selectors and coverage did not.** Route frequency metadata is supported by the official EIA response.
- `AGENTS.md`: exact P7 sentence; approved defaults retained separately.
- Versioned harness/readers/scorer, regression tests and evidence: reproducible checks without replacing historical records. See `changed-files.json` for the full inventory.

Commands: `OPENAI_API_KEY= EIA_API_KEY= npm test`; run every `scripts/eia-lookup/*.test.py` directly with `python3 -B`; `OPENAI_API_KEY= EIA_API_KEY= npm run build`. New JS runner/scorer files also pass `node --check`. The runtime build was restarted after rebuilding. **Do not rerun either paid evaluation script without new authorization and a fresh budget/evidence freeze.**

Raw responses, screenshots and workbooks remain in `~/Documents/EIAapp-Evidence/20261030/polish/`, with hashed manifests and verified durable copies of public evidence. The scored schedule recorded 356 EIA calls; the interrupted attempt recorded 19, plus four initial source probes and the final live-EIA HTTP check. One interrupted in-flight EIA request may be unrecorded. Requests were sequential with 500 ms pacing, below the rate limits.

Unrelated files remain untouched: `docs/eia-interpretation-audit.md`, three untracked earlier finish-test logs, and Python caches. Dependencies/build output, credentials, private raw model records and bulky screenshots/workbooks are excluded from Git. Actual key-value scanning is clean; credential-pattern hits are key-using code, not keys. No redactions were needed. No main push, merge, explicit deployment, promotion or settings change. The authorized branch push may create an automatic **preview**; its URL, final SHA and production comparison are recorded in the delivery receipt and final message.
