# Paired on/off differences

P = pass; F = fail; — = no observable snapshot difference. All five pairs use their own saved model responses. **No case diverged**; all 451 replayed calls matched the source request and response. Natural gasoline is excluded from joint scores.

| Case | ON/OFF | ON2/OFF2 | Terra | Medium | High | Effect of switching off |
|---|---|---|---|---|---|---|
| D-D4b | P → F | P → F | P → F | P → F | P → F | Typed country reference no longer resolves Georgia (country). |
| D-D6a | P → P | P → P | P → P | P → P | P → P | Adds a United States suggestion; selected states and score remain unchanged. |
| E-E8 | P → F | — | — | — | — | European region no longer resolves from the typed reply. |
| E-E13 | P → F | — | P → F | P → F | P → F | Korea reference loses the selected place and specific candidate buttons. |
| E-E14 | P → F | P → F | P → F | P → F | P → F | Typed all-states expansion is absent or incomplete (including DC). |
| F-F4 | P → F | P → F | P → F | P → F | P → F | Accepts Namibia instead of asking about the tied spelling candidates. |
| F-F5 | F → F | — | — | — | — | Retains an extra USA place and changes activity buttons; both settings fail. |
| Q1-Q1-national-gas-prices | P → F | P → F | P → F | P → F | — | Shows natural gas rather than asking the product question. |
| Q1-Q1-natural-gasoline | F → F | — | — | — | — | Drops the model-omitted Texas place and changes product buttons; both fail the separate notice requirement. |
| F-F7 | — | P → F | — | — | — | Leaves out model-omitted places. |
| Q1-Q1-gas-station-prices | — | — | P → F | — | — | Shows natural gas rather than the accepted gasoline/product-question outcome. |
| I-I4 | — | — | — | P → F | — | Leaves out model-omitted Michigan. |

The full [430-row per-case table](job9b-paired-cases.json) includes unchanged cases, failed fields, failure kinds and divergence markers. [Replay audit](job9b-replay-audit.json). The separate historical-fixture differences and explanations remain in [the offline comparison](job9b-gate-1-differences.json) and [its existing causes](offline-difference-causes.json).
