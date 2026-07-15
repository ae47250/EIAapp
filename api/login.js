import {
  INVALID_CREDENTIALS_MESSAGE,
  createSessionCookie,
  createSessionToken,
  getAuthConfig,
  normalizeReturnTo,
  verifyCredentials
} from "../lib/auth.js";

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = globalThis.__EIA_LOGIN_ATTEMPTS__ || new Map();
globalThis.__EIA_LOGIN_ATTEMPTS__ = attempts;

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!getAuthConfig()) {
    return res.status(503).json({ error: INVALID_CREDENTIALS_MESSAGE });
  }

  const clientKey = getClientKey(req);
  if (isThrottled(clientKey)) {
    return res.status(429).json({ error: INVALID_CREDENTIALS_MESSAGE });
  }

  const body = parseBody(req.body);
  const username = String(body.username || "");
  const password = String(body.password || "");
  const returnTo = normalizeReturnTo(body.returnTo);
  const valid = await verifyCredentials(username, password);

  if (!valid) {
    recordFailure(clientKey);
    return res.status(401).json({ error: INVALID_CREDENTIALS_MESSAGE });
  }

  attempts.delete(clientKey);
  const token = createSessionToken();
  if (!token) return res.status(503).json({ error: INVALID_CREDENTIALS_MESSAGE });

  res.setHeader("Set-Cookie", createSessionCookie(token));
  return res.status(200).json({ ok: true, returnTo });
}

export function resetLoginAttemptsForTests() {
  attempts.clear();
}

function parseBody(body) {
  if (body && typeof body === "object" && !Buffer.isBuffer(body)) return body;
  const params = new URLSearchParams(Buffer.isBuffer(body) ? body.toString("utf8") : String(body || ""));
  return Object.fromEntries(params.entries());
}

function getClientKey(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || String(req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown");
}

function isThrottled(key, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry) return false;
  if (now - entry.startedAt >= ATTEMPT_WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key, now = Date.now()) {
  const entry = attempts.get(key);
  if (!entry || now - entry.startedAt >= ATTEMPT_WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: now });
    return;
  }
  entry.count += 1;
}
