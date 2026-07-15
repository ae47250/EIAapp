# New and improved version

This is the AI-assisted comparison version of the EIA country energy search app.

The baseline app is `ae47250/NewRepapp`. This repo, `ae47250/EIAapp`, is for testing whether OpenAI improves query interpretation before the app searches EIA data.

## Codex/AI coding instructions

This repository uses `AGENTS.md` for Codex and AI coding-agent instructions. Review that file before making repository changes so edits follow the project scope, change-reporting, data-source, security, and deployment rules.

## File structure 

```text
index.html
README.md
package.json
api/
  search-eia.js
  interpret-query.js
  openai-diagnostic.js
```

## File plan

| File | Action | Purpose |
|---|---:|---|
| `index.html` | Modified | Blue theme and visible title text: `New and improved version` |
| `api/interpret-query.js` | Modified | Adds OpenAI-assisted query interpretation with rule fallback |
| `api/openai-diagnostic.js` | Added | Tests whether the deployed backend can reach OpenAI |
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

The temporary single-user login also requires these server-only variables:

```text
APP_USERNAME=your chosen username
APP_PASSWORD_HASH=a generated scrypt hash, never the plain password
SESSION_SECRET=a random signing secret
```

Do not commit API keys to GitHub.

## Temporary single-user login

The app uses a signed, HTTP-only cookie that expires after 20 minutes of inactivity. Each authenticated request refreshes the cookie, so the timeout slides forward while the session is active. The cookie uses `SameSite=Strict` and is marked `Secure` in production. The cookie contains only signed session timing and random nonce data; it does not contain the username, password, password hash, or signing secret.

Protected routes:

```text
/
/index.html
/api/search-eia
/api/interpret-query
/api/openai-diagnostic
```

Public routes:

```text
/login
/login.html
/api/login
/api/logout
necessary static assets
```

Authentication is enforced both by Vercel Routing Middleware and inside every private API handler. The middleware protects the static application page and protects API routes by default; the handler-level checks prevent API access from relying only on a redirect or hidden user interface.

### Generate the password hash

Run this locally in an interactive terminal:

```text
npm run generate-password-hash
```

The script asks for the password without displaying it and prints a scrypt hash. Put only that hash in `APP_PASSWORD_HASH`. Do not paste your real password into Codex, a command-line argument, GitHub, or a tracked file.

### Generate the session secret

Run this command locally:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the output in `SESSION_SECRET`. Do not commit or share it.

### Configure Vercel

1. Open the EIAapp project in Vercel.
2. Open **Settings -> Environment Variables**.
3. Add `APP_USERNAME` with the username you chose.
4. Add `APP_PASSWORD_HASH` with the complete output from `npm run generate-password-hash`.
5. Add `SESSION_SECRET` with the complete output from the command above.
6. Apply each variable to Production and Preview. Add Development only if you use `vercel dev` locally.
7. Confirm none of these names use a `NEXT_PUBLIC_` prefix.
8. Save the variables, then redeploy the branch or production deployment because existing deployments do not receive newly added values automatically.

The login endpoint permits five failed attempts per 15-minute window for each observed client address. This state is stored in memory and is therefore limited to one Vercel function instance. It reduces basic repeated attempts but is not strong distributed rate limiting; multiple instances or cold starts can reset or split the counters. Use a distributed service such as Vercel Firewall rate limiting or a shared store if stronger protection becomes necessary.

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

## OpenAI diagnostic

After deploying and setting `OPENAI_API_KEY`, test this route:

```text
/api/openai-diagnostic
```

Expected success response:

```text
ok = true
openaiConfigured = true
userMessage = OpenAI diagnostic request succeeded.
```

If `OPENAI_API_KEY` is missing, the route returns `openaiConfigured = false` and explains that the key must be added in Vercel.

## Smoke tests

After deploying, test these API routes:

```text
/api/openai-diagnostic
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
