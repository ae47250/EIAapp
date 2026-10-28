# Limited transcript-cleanup audit — 2026-10-28

Preservation commit: `cccb20eb495131b113c96a98a9ed686bb478abbf`.

Requested inventory: 11 top-level HOHO transcript Markdown files.
Observed inventory: **10 top-level Markdown files, plus one separate `HOHO.txt` text report**.
Confirmed historical chat transcripts: **0**. Files removed: **none**.

The instruction permits removing only positively identified historical chat transcripts. The actual files are generated benchmark results, technical/architecture audits, and human-review packets. Their contents include methodology, queries, results, metrics, hashes and review instructions; they are not role-labelled chat exports. No additional file was guessed to reach eleven. No repository-wide filename rule was applied.

| File | Observed document title | Decision |
|---|---|---|
| `HOHO.md` | Live EIA intent-model comparison with deterministic ranking | Retain: report/audit/review packet, not a confirmed chat transcript |
| `HOHO2.md` | Raw-only versus raw-plus-cleaned EIA interpretation A/B test | Retain: report/audit/review packet, not a confirmed chat transcript |
| `HOHO3.md` | Live EIA intent-model comparison with deterministic ranking | Retain: report/audit/review packet, not a confirmed chat transcript |
| `HOHO4.md` | Live EIA intent-model comparison with deterministic ranking | Retain: report/audit/review packet, not a confirmed chat transcript |
| `HOHO5.md` | Raw-only versus raw-plus-cleaned EIA interpretation A/B test | Retain: report/audit/review packet, not a confirmed chat transcript |
| `HoHo6.md` | Raw-Only AI Input and Preserved Cleaned-Note Architecture Review | Retain: report/audit/review packet, not a confirmed chat transcript |
| `hoho7.md` | HoHo7 Technical Benchmark Report | Retain: report/audit/review packet, not a confirmed chat transcript |
| `hoho7HR.md` | HoHo7 Blinded Human Review Packet | Retain: report/audit/review packet, not a confirmed chat transcript |
| `hoho8.md` | HoHo8 Release-Candidate Development Comparison | Retain: report/audit/review packet, not a confirmed chat transcript |
| `hoho8HR.md` | HoHo8 Blinded Release-Candidate Review | Retain: report/audit/review packet, not a confirmed chat transcript |

`HOHO.txt` is an EIA facet-audit summary, not Markdown and not a chat transcript; retained.

## Active references and functional files

- `scripts/eia-benchmark/run-hoho7.js` writes `hoho7.md` and `hoho7HR.md`, and reads both when producing artifact hashes.
- `scripts/eia-benchmark/run-hoho8.js` writes `hoho8.md` and `hoho8HR.md`, and reads both when producing artifact hashes.
- `scripts/eia-metadata/run-live-model-comparison.js` uses `HOHO.md` as its default output report.
- `docs/eia-pipeline-promotion-signoff.md` cites `HOHO3.md` and its SHA-256 as historical evidence.

Retained executable/benchmark files: `scripts/eia-benchmark/hoho7-corpus.js`, `scripts/eia-benchmark/run-hoho7.js`, `scripts/eia-benchmark/run-hoho8.js`, `tests/hoho7-benchmark.test.js`, `tests/hoho8-benchmark.test.js`. All data under `test-artifacts/hoho7/` and `test-artifacts/hoho8/` remain unchanged. No reference refactoring was performed.

## Checks and limits

- All 6 HOHO benchmark tests passed offline, with provider keys blanked.
- All 69 evaluation-scorer/runner checks passed offline.
- Every top-level HOHO file and every functional HOHO-named file remains byte-identical to the preservation commit and requested base.
- This second commit changes only this audit document; no application, prompt, scorer, configuration, test, fixture or data behavior changes.
- Historical evidence whitespace warnings were retained, not repaired. Source whitespace checks passed.
- No new model/EIA calls, key creation, merge, production deployment or deployment-setting changes.

The requested deletion cannot be completed under the supplied identification rule because no confirmed transcripts were found. Removing these benchmark/audit reports would require a different, explicit cleanup scope. Preservation does not depend on that decision.
