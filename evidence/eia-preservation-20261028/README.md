# EIAapp preservation checkpoint, 2026-10-28

WIP preservation only. No application fixes or model change in this checkpoint.
The application tree contains the previously authorized, unfinished interpretation-contract work.
Base and original HEAD: `5b60a094ecd10e1ca80492bc8558652768d93366`.

## Evidence

- `evaluation/`: safe sharing copies of original and corrected scorer, runners, frozen inputs, all 120 recorded calls, app replays, costs and audits.
- `historical-audit/`: prior-phase scripts, frozen cases, test/build logs, review records and patches. Historical failures and prototypes are not current successful checks.
- `audit/eia-interpretation-audit.redacted.md`: public copy of the worktree audit; its original remains untracked in the worktree and in the protected local backup because it contains a local identity path.
- `bundle-verification/`: review-bundle verification records. Full ZIPs remain locally preserved.
- `public-manifest.json`: original/public hashes, per-file redactions, local-only inventory and exclusions.

Archived executable scripts use an additional `.txt` suffix so Node/Next cannot discover or execute historical tests from this evidence directory. The manifest maps each original filename to its sharing copy. These are labelled PUBLIC SHARING COPIES. Provider/account identifiers and opaque encrypted reasoning payloads are not required to assess answer quality and are redacted. Local identity paths and emails are redacted. Original evidence is unchanged. Original internal hashes refer to originals; use publicSHA256 to verify sharing copies. Historical absolute import paths may require relocation to replay; do not execute paid runners merely to inspect evidence.

The latest scorer-correction prompt ran: 63 pre-labelled fixtures plus six runner checks passed; original 40 responses were re-scored; 80 new reasoning calls completed; all 120 responses were replayed offline. Cost $0.08924735; no retries or truncations. No production correction followed those evaluation findings. No model calls were made during preservation.

## Local preservation

`~/Documents/EIAapp-Evidence/20261028/copy-manifest.json` records exact source paths and hashes. The sources/ tree preserves directory structure. Identical destination files may share hardlinks with other backup files, never with originals. Credentials, environment files, dependency trees, build output and caches are not copied. No original is removed, reset, stashed or reorganized.

The baseline review ZIPs and prototypes are preserved locally, not all uploaded as redundant binaries. Existing tracked source, configuration, metadata, benchmarks and data remain in Git. The raw worktree audit is deliberately excluded from staging; the redacted copy above preserves its public content.

## Offline check commands

From the application worktree (credentials blanked):

```sh
OPENAI_API_KEY= EIA_API_KEY= node --test tests/hoho7-benchmark.test.js tests/hoho8-benchmark.test.js
git diff --check
```

From the original temporary evaluation directory (or a correctly relocated exact local backup):

```sh
node --test harness/scorer-v2.test.mjs harness/runner-v2.test.mjs
```

No build, benchmark generator, EIA query, paid comparison or deployment command is necessary for this documentation-only cleanup inspection. Full source verification/build records from prior phases are included; their recorded failures/limits remain valid.

## Deployment boundary

Only the new preservation branch is authorized for push. Do not merge, promote, deploy to production or change Vercel settings. Pre-push GitHub main is `0d6d312a89aea9112efff559ba8fc969cafb2780`; Vercel production deployment `dpl_3rg9tDYVud6F1VhLXednKpEUbqBk` is READY at that commit. Branch preview status and final remote verification are recorded locally after push.
