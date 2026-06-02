# New and improved version

This is the AI-assisted comparison version of the EIA country energy search app.

The baseline app is `ae47250/NewRepapp`. This repo, `ae47250/EIAapp`, is for testing whether OpenAI improves query interpretation before the app searches EIA data.

## File structure

```text
index.html
README.md
package.json
api/
  search-eia.js
  interpret-query.js
```

## File plan

| File | Action | Purpose |
|---|---:|---|
| `index.html` | Modified | Red theme and visible title text: `New and improved version` |
| `api/interpret-query.js` | Modified | Adds OpenAI-assisted query interpretation with rule fallback |
| `README.md` | Modified | Documents the AI comparison setup |
| `package.json` | Copied | Keeps Node/Vercel API files using ES modules |
| `api/search-eia.js` | Copied/adjusted | Calls `await interpretQuery(...)` and searches EIA |

## Required Vercel environment variables

The app needs the EIA API key for data:

```text
EIA_API_KEY=your_eia_api_key
```

The AI-assisted interpreter needs OpenAI configuration:

```text
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini
```

Do not commit API keys to GitHub.

## What OpenAI does

OpenAI only interprets the user's search text. It should correct obvious typos and return structured intent.

Example user input:

```text
brzil enrgy prducton
```

Expected AI interpretation:

```text
correctedQuery = Brazil energy production
country = Brazil
countryCode = BRA
product = total energy
activity = production
frequency = annual
```

EIA remains the source of all energy data. OpenAI must not invent data values.

## Expected app flow

```text
index.html
  -> /api/search-eia?q=...
  -> api/search-eia.js
  -> api/interpret-query.js
  -> OpenAI interprets query if configured
  -> rule-based interpreter is used as fallback
  -> EIA API returns real data
  -> frontend displays chart and table
```

## Fallback behavior

If `OPENAI_API_KEY` is missing, invalid, or OpenAI fails, the app falls back to the rule-based interpreter.

The app should still work without AI, but typo correction and flexible wording will be weaker.

## Smoke tests

After deploying, test these API routes:

```text
/api/interpret-query?q=brzil%20enrgy%20prducton
/api/search-eia?q=brzil%20enrgy%20prducton
/api/interpret-query?q=how%20much%20oil%20does%20japn%20use
/api/search-eia?q=how%20much%20oil%20does%20japn%20use
```

Also test standard baseline queries:

```text
/api/search-eia?q=Brazil%20energy%20consumption
/api/search-eia?q=Jordan%20electricity%20generation
/api/search-eia?q=Mexico%20natural%20gas%20production
/api/search-eia?q=Japan%20oil%20consumption
```

## Development rule

When changing query interpretation, compare results against `ae47250/NewRepapp`.

The key rule is:

```text
OpenAI interprets intent. EIA supplies data.
```
