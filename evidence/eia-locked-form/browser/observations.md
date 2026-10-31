# Local browser check, original frozen prompt

Local production build from a187941. LOGIN_REQUIRED=off and OPENAI_MODEL=gpt-6-luna only in the local server process. Existing key loaded in memory. Evaluation-only fetch transport supplies low reasoning, 16000 output tokens, and a 90-second network timeout; it does not change production application settings. Four generation calls (three scheduled plus one failed-check re-ask). No EIA calls, no series selection.

- F9: exact natural-gas versus petroleum (including gasoline) clarification; no candidates.
- O6: only Iceland; first result Total energy consumption, Iceland, Annual, million metric tons of oil equivalent, 1980–2024.
- O7: generic validation clarification; the model invented a noncontiguous natural-gas consumption quote twice. No candidates or observation fetch.
- Console: no warnings/errors captured.

Screenshots and DOM snapshots are beside this file. Raw model outputs and usage are preserved. This check is before the one E.6 prompt revision; the revised prompt is not browser-retested to avoid exceeding the requested three-query browser schedule.
