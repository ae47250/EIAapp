import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomBytes } from "node:crypto";

import loginHandler, { resetLoginAttemptsForTests } from "../lib/server/login.js";
import logoutHandler from "../lib/server/logout.js";
import openaiDiagnosticHandler from "../lib/server/openai-diagnostic.js";
import interpretQueryHandler from "../lib/sources/eia/interpret-query.js";
import plantMetadataHandler from "../lib/sources/eia/plant-metadata.js";
import searchEiaHandler from "../lib/sources/eia/search.js";
import { proxy as middleware } from "../proxy.js";
import {
  INVALID_CREDENTIALS_MESSAGE,
  SESSION_COOKIE_NAME,
  SESSION_DURATION_SECONDS,
  createSessionCookie,
  createSessionToken,
  hashPassword,
  normalizeReturnTo,
  verifySessionToken
} from "../lib/auth.js";

const originalEnvironment = {
  APP_USERNAME: process.env.APP_USERNAME,
  APP_PASSWORD_HASH: process.env.APP_PASSWORD_HASH,
  SESSION_SECRET: process.env.SESSION_SECRET,
  LOGIN_REQUIRED: process.env.LOGIN_REQUIRED,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV
};

let username;
let password;
let passwordHash;
let sessionSecret;

before(async () => {
  username = `user-${randomBytes(8).toString("hex")}`;
  password = randomBytes(24).toString("base64url");
  passwordHash = await hashPassword(password);
  sessionSecret = randomBytes(32).toString("hex");
});

beforeEach(() => {
  process.env.APP_USERNAME = username;
  process.env.APP_PASSWORD_HASH = passwordHash;
  process.env.SESSION_SECRET = sessionSecret;
  process.env.NODE_ENV = "test";
  delete process.env.LOGIN_REQUIRED;
  delete process.env.VERCEL_ENV;
  resetLoginAttemptsForTests();
});

after(() => {
  restoreEnvironment(originalEnvironment);
});

test("successful login creates an HTTP-only 20-minute sliding session", async () => {
  const res = createMockResponse();
  await loginHandler(createRequest({
    method: "POST",
    ip: "192.0.2.1",
    body: { username, password, returnTo: "/?q=safe" }
  }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { ok: true, returnTo: "/?q=safe" });
  const cookie = res.headers["set-cookie"];
  assert.match(cookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, new RegExp(`Max-Age=${SESSION_DURATION_SECONDS}`));
  assert.doesNotMatch(cookie, new RegExp(escapeRegExp(username)));
  assert.doesNotMatch(cookie, new RegExp(escapeRegExp(password)));
  assert.doesNotMatch(cookie, new RegExp(escapeRegExp(passwordHash)));
  assert.doesNotMatch(cookie, new RegExp(escapeRegExp(sessionSecret)));

  const protectedResponse = await middleware(new Request("https://example.test/", {
    headers: { cookie: cookie.split(";")[0] }
  }));
  assert.equal(protectedResponse.headers.get("x-middleware-next"), "1");
  const refreshedCookie = protectedResponse.headers.get("set-cookie");
  assert.match(refreshedCookie, new RegExp(`^${SESSION_COOKIE_NAME}=`));
  assert.match(refreshedCookie, new RegExp(`Max-Age=${SESSION_DURATION_SECONDS}`));
});

test("incorrect username and password return the same generic response", async () => {
  const wrongUsernameResponse = createMockResponse();
  const wrongPasswordResponse = createMockResponse();

  await loginHandler(createRequest({
    method: "POST",
    ip: "192.0.2.2",
    body: { username: `${username}-wrong`, password }
  }), wrongUsernameResponse);
  await loginHandler(createRequest({
    method: "POST",
    ip: "192.0.2.3",
    body: { username, password: `${password}-wrong` }
  }), wrongPasswordResponse);

  assert.equal(wrongUsernameResponse.statusCode, 401);
  assert.equal(wrongPasswordResponse.statusCode, 401);
  assert.deepEqual(wrongUsernameResponse.body, { error: INVALID_CREDENTIALS_MESSAGE });
  assert.deepEqual(wrongPasswordResponse.body, wrongUsernameResponse.body);
});

test("unauthenticated protected-page requests redirect to login", async () => {
  const response = await middleware(new Request("https://example.test/index.html?view=recent"));
  assert.equal(response.status, 302);
  const location = new URL(response.headers.get("location"));
  assert.equal(location.pathname, "/login");
  assert.equal(location.searchParams.get("returnTo"), "/index.html?view=recent");
});

test("LOGIN_REQUIRED=off bypasses page and API authentication", async () => {
  process.env.LOGIN_REQUIRED = "OFF";

  const pageResponse = await middleware(new Request("https://example.test/"));
  assert.equal(pageResponse.headers.get("x-middleware-next"), "1");
  assert.equal(pageResponse.headers.get("set-cookie"), null);

  const handlers = [searchEiaHandler, interpretQueryHandler, plantMetadataHandler, openaiDiagnosticHandler];
  for (const handler of handlers) {
    const res = createMockResponse();
    await handler(createRequest({ method: "POST" }), res);
    assert.equal(res.statusCode, 405);
  }

  process.env.LOGIN_REQUIRED = "false";
  const failSafeResponse = await middleware(new Request("https://example.test/"));
  assert.equal(failSafeResponse.status, 302);
});

test("every private API handler rejects requests without a session", async () => {
  const handlers = [
    ["search-eia", searchEiaHandler],
    ["interpret-query", interpretQueryHandler],
    ["plant-metadata", plantMetadataHandler],
    ["openai-diagnostic", openaiDiagnosticHandler]
  ];

  for (const [name, handler] of handlers) {
    const res = createMockResponse();
    await handler(createRequest({ method: "GET" }), res);
    assert.equal(res.statusCode, 401, `${name} should return 401`);
    assert.deepEqual(res.body, { error: "Authentication required." });
  }
});

test("proxy passes API requests to handlers for direct authorization", async () => {
  const response = await middleware(new Request("https://example.test/api/search-eia?q=test"));
  assert.equal(response.headers.get("x-middleware-next"), "1");
});

test("proxy does not refresh sessions on public login and logout routes", async () => {
  const token = createSessionToken();
  const cookie = createSessionCookie(token).split(";")[0];

  for (const pathname of ["/api/login", "/api/logout"]) {
    const response = await middleware(new Request(`https://example.test${pathname}`, {
      headers: { cookie }
    }));
    assert.equal(response.headers.get("x-middleware-next"), "1");
    assert.equal(response.headers.get("set-cookie"), null);
  }
});

test("logout deletes the session cookie and redirects to login", () => {
  const res = createMockResponse();
  logoutHandler(createRequest({ method: "POST" }), res);

  assert.equal(res.statusCode, 303);
  assert.equal(res.headers.location, "/login");
  assert.match(res.headers["set-cookie"], new RegExp(`^${SESSION_COOKIE_NAME}=;`));
  assert.match(res.headers["set-cookie"], /Max-Age=0/);
});

test("expired, malformed, and tampered session cookies are rejected", () => {
  const now = Date.now();
  const token = createSessionToken(process.env, now);
  const finalCharacter = token.at(-1);
  const tampered = `${token.slice(0, -1)}${finalCharacter === "a" ? "b" : "a"}`;

  assert.equal(verifySessionToken(token, process.env, now), true);
  assert.equal(verifySessionToken(token, process.env, now + SESSION_DURATION_SECONDS * 1000 + 1), false);
  assert.equal(verifySessionToken("malformed", process.env, now), false);
  assert.equal(verifySessionToken(tampered, process.env, now), false);
});

test("missing required environment variables fail securely", async () => {
  for (const variableName of ["APP_USERNAME", "APP_PASSWORD_HASH", "SESSION_SECRET"]) {
    const value = process.env[variableName];
    delete process.env[variableName];
    const res = createMockResponse();
    await loginHandler(createRequest({
      method: "POST",
      ip: `192.0.2.${10 + variableName.length}`,
      body: { username, password }
    }), res);

    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { error: INVALID_CREDENTIALS_MESSAGE });
    assert.equal(JSON.stringify(res.body).includes(variableName), false);
    process.env[variableName] = value;
  }
});

test("unsafe return URLs are replaced with the internal root", async () => {
  const unsafeValues = [
    "https://attacker.example/path",
    "//attacker.example/path",
    "/\\attacker.example/path",
    "javascript:alert(1)"
  ];

  for (const value of unsafeValues) assert.equal(normalizeReturnTo(value), "/");
  assert.equal(normalizeReturnTo("/results?country=USA"), "/results?country=USA");

  const res = createMockResponse();
  await loginHandler(createRequest({
    method: "POST",
    ip: "192.0.2.5",
    body: { username, password, returnTo: "//attacker.example/path" }
  }), res);
  assert.equal(res.body.returnTo, "/");
});

test("production session cookies include Secure", () => {
  process.env.VERCEL_ENV = "production";
  const token = createSessionToken();
  assert.match(createSessionCookie(token), /; Secure$/);
});

test("login attempts are throttled per function instance", async () => {
  const request = () => createRequest({
    method: "POST",
    ip: "192.0.2.6",
    body: { username, password: `${password}-wrong` }
  });

  for (let index = 0; index < 5; index += 1) {
    const res = createMockResponse();
    await loginHandler(request(), res);
    assert.equal(res.statusCode, 401);
  }

  const throttledResponse = createMockResponse();
  await loginHandler(request(), throttledResponse);
  assert.equal(throttledResponse.statusCode, 429);
  assert.deepEqual(throttledResponse.body, { error: INVALID_CREDENTIALS_MESSAGE });
});

function createRequest({ method, body = {}, ip = "192.0.2.100", cookie = "" }) {
  return {
    method,
    body,
    query: {},
    headers: {
      "x-forwarded-for": ip,
      cookie
    },
    socket: { remoteAddress: ip }
  };
}

function createMockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
    end(value) {
      this.body = value;
      return this;
    }
  };
}

function restoreEnvironment(values) {
  for (const [name, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
