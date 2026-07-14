import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const SESSION_COOKIE_NAME = "eia_session";
export const SESSION_DURATION_SECONDS = 8 * 60 * 60;
export const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password.";

const DEFAULT_SCRYPT_OPTIONS = Object.freeze({ N: 32768, r: 8, p: 1, keyLength: 64 });
const MIN_SESSION_SECRET_LENGTH = 32;

export function getAuthConfig(env = process.env) {
  const username = String(env.APP_USERNAME || "");
  const passwordHash = String(env.APP_PASSWORD_HASH || "");
  const sessionSecret = String(env.SESSION_SECRET || "");
  const parsedHash = parseScryptHash(passwordHash);

  if (!username || !parsedHash || sessionSecret.length < MIN_SESSION_SECRET_LENGTH) return null;
  return { username, passwordHash, sessionSecret, parsedHash };
}

export async function hashPassword(password, options = {}) {
  const value = String(password || "");
  if (value.length < 16) throw new Error("Password must be at least 16 characters.");

  const N = options.N || DEFAULT_SCRYPT_OPTIONS.N;
  const r = options.r || DEFAULT_SCRYPT_OPTIONS.r;
  const p = options.p || DEFAULT_SCRYPT_OPTIONS.p;
  const keyLength = options.keyLength || DEFAULT_SCRYPT_OPTIONS.keyLength;
  const salt = options.salt || randomBytes(16);
  const derivedKey = await scrypt(value, salt, keyLength, { N, r, p, maxmem: 128 * 1024 * 1024 });

  return ["scrypt", N, r, p, Buffer.from(salt).toString("base64url"), Buffer.from(derivedKey).toString("base64url")].join("$");
}

export async function verifyCredentials(username, password, env = process.env) {
  const config = getAuthConfig(env);
  if (!config) return false;

  const suppliedPassword = String(password || "").slice(0, 1024);
  const { N, r, p, salt, derivedKey } = config.parsedHash;

  try {
    const candidateKey = await scrypt(suppliedPassword, salt, derivedKey.length, {
      N,
      r,
      p,
      maxmem: 128 * 1024 * 1024
    });
    return safeStringEqual(String(username || ""), config.username) && timingSafeEqual(candidateKey, derivedKey);
  } catch {
    return false;
  }
}

export function createSessionToken(env = process.env, now = Date.now()) {
  const config = getAuthConfig(env);
  if (!config) return null;

  const issuedAt = Math.floor(now / 1000);
  const payload = Buffer.from(JSON.stringify({
    v: 1,
    iat: issuedAt,
    exp: issuedAt + SESSION_DURATION_SECONDS,
    nonce: randomBytes(16).toString("base64url")
  })).toString("base64url");
  const signature = sign(payload, config.sessionSecret);
  return `${payload}.${signature}`;
}

export function verifySessionToken(token, env = process.env, now = Date.now()) {
  const config = getAuthConfig(env);
  if (!config || typeof token !== "string") return false;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const expectedSignature = sign(parts[0], config.sessionSecret);
  if (!safeStringEqual(parts[1], expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    const currentTime = Math.floor(now / 1000);
    return payload?.v === 1 &&
      Number.isInteger(payload.iat) &&
      Number.isInteger(payload.exp) &&
      typeof payload.nonce === "string" &&
      payload.iat <= currentTime + 60 &&
      payload.exp > currentTime &&
      payload.exp - payload.iat === SESSION_DURATION_SECONDS;
  } catch {
    return false;
  }
}

export function isAuthenticatedRequest(req, env = process.env, now = Date.now()) {
  const cookieHeader = getHeader(req, "cookie");
  const token = readCookie(cookieHeader, SESSION_COOKIE_NAME);
  return verifySessionToken(token, env, now);
}

export function requireAuthentication(req, res, env = process.env) {
  if (isAuthenticatedRequest(req, env)) return true;

  res.setHeader("Cache-Control", "no-store");
  res.status(401).json({ error: "Authentication required." });
  return false;
}

export function createSessionCookie(token, env = process.env) {
  const secure = isProduction(env) ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}${secure}`;
}

export function clearSessionCookie(env = process.env) {
  const secure = isProduction(env) ? "; Secure" : "";
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT${secure}`;
}

export function normalizeReturnTo(value, fallback = "/") {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (!candidate || candidate.length > 2048 || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return fallback;
  }

  try {
    const base = new URL("https://internal.invalid");
    const parsed = new URL(candidate, base);
    if (parsed.origin !== base.origin) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function parseScryptHash(value) {
  const parts = String(value || "").split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;

  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(N) || N < 16384 || (N & (N - 1)) !== 0 || !Number.isInteger(r) || r < 8 || !Number.isInteger(p) || p < 1) {
    return null;
  }

  try {
    const salt = Buffer.from(parts[4], "base64url");
    const derivedKey = Buffer.from(parts[5], "base64url");
    if (salt.length < 16 || derivedKey.length < 32) return null;
    return { N, r, p, salt, derivedKey };
  } catch {
    return null;
  }
}

function sign(payload, secret) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeStringEqual(left, right) {
  const leftDigest = createHmac("sha256", "constant-time-compare").update(String(left)).digest();
  const rightDigest = createHmac("sha256", "constant-time-compare").update(String(right)).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function readCookie(header, name) {
  for (const part of String(header || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return "";
}

function getHeader(req, name) {
  if (req?.headers?.get) return req.headers.get(name) || "";
  return req?.headers?.[name] || req?.headers?.[name.toLowerCase()] || "";
}

function isProduction(env) {
  return env.VERCEL_ENV === "production" || env.NODE_ENV === "production";
}
