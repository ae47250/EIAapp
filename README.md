# EIA++ AI Assisted Data Extraction Tool

This branch is the Next.js App Router migration of `ae47250/EIAapp`. The static production baseline remains on `main` so it can be used as a rollback and behavior-comparison point while this branch is tested.

## Architecture

```text
app/
  page.js                         protected search page
  login/page.js                   login page
  api/*/route.js                  Next.js Route Handlers
components/
  auth/LoginForm.js
  search/*                        search, results, chart, and export UI
lib/
  auth.js                         server-only session and password logic
  next-route-adapter.js           adapter for preserved backend handlers
  client/*                        formatting and browser-side XLSX export
  server/*                        login, logout, and OpenAI diagnostic handlers
  sources/eia/*                   EIA retrieval and query interpretation
proxy.js                          page gate and sliding-session refresh
tests/
  auth.test.js
  eia-contract.test.js
  fixtures/eia-search.json
```

The source-specific EIA code is isolated under `lib/sources/eia/`. Future World Bank, IMF, or OECD integrations should get separate sibling folders instead of adding source-specific assumptions to the EIA modules.

## Requirements

- Node.js 20.9 or newer
- An EIA API key
- Optional OpenAI configuration for typo correction and flexible query interpretation

Install and run locally:

```text
npm install
npm run dev
```

Production checks:

```text
npm test
npm run build
npm start
```

## Environment variables

Create `.env.local` from `.env.example`. Never commit API keys, passwords, password hashes, or session secrets.

```text
EIA_API_KEY=your_eia_api_key
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-5.4-mini

LOGIN_REQUIRED=off
APP_USERNAME=your chosen username
APP_PASSWORD_HASH=a generated scrypt hash
SESSION_SECRET=a random signing secret of at least 32 characters
```

Only the case-insensitive exact value `off` disables login. A missing value or any other value keeps login enabled. The migration preview should use `LOGIN_REQUIRED=off`; production `main` retains its login screen and should use `LOGIN_REQUIRED=on` or omit the toggle.

OpenAI is optional. If `OPENAI_API_KEY` is absent or the request fails, the app uses deterministic interpretation rules and EIA remains the source of every data value.

## Authentication

Authentication uses a signed, HTTP-only cookie with a 20-minute sliding session. `proxy.js` redirects unauthenticated page requests and refreshes valid sessions. Every private API handler also validates authorization directly, so security does not depend on the proxy alone.

Generate a password hash interactively:

```text
npm run generate-password-hash
```

Generate a separate session secret:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

The login endpoint permits five failed attempts per 15-minute window for each observed client address. This is in-memory protection per function instance, not distributed rate limiting.

## Search behavior

Flow:

```text
SearchWorkspace
  -> /api/search-eia?q=...
  -> lib/sources/eia/search.js
  -> lib/sources/eia/interpret-query.js
  -> OpenAI interpretation when configured, otherwise rule fallback
  -> official EIA API
  -> matching variables, selected series, chart, and XLSX export
```

The current HTTP response shape is protected by `tests/eia-contract.test.js`. It checks country metadata, variable ranking, chronological observations, alternate-series selection, secret removal, and the `All_Data` and `Metadata` workbook sheets.

Migration parity tests use correctly spelled country names with minor variable-name typos, for example:

```text
Brazil enrgy production
Japan oil consumpton
Mexico natural gas prduction
```

Misspelled country names such as `brzil` depend on the optional OpenAI path and are tested separately from deterministic migration parity.

## Vercel

Vercel auto-detects Next.js. Configure the environment variables separately for Preview and Production, then redeploy after changing them. Do not use a `NEXT_PUBLIC_` prefix for any secret.

After a preview deployment, verify:

1. The page loads without a login screen when Preview has `LOGIN_REQUIRED=off`.
2. A standard Brazil search returns matching variables and observations.
3. Graph selection loads an alternate series.
4. The range controls redraw the chart.
5. Excel download contains the full selected series and metadata.
6. The browser console has no blocking errors.
