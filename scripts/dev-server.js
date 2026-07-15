import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { loadEnvFile } from "node:process";
import { resolve } from "node:path";

import loginHandler from "../api/login.js";
import logoutHandler from "../api/logout.js";
import interpretQueryHandler from "../api/interpret-query.js";
import openAiDiagnosticHandler from "../api/openai-diagnostic.js";
import searchEiaHandler from "../api/search-eia.js";
import {
  createSessionCookie,
  createSessionToken,
  isAuthenticatedRequest,
  normalizeReturnTo
} from "../lib/auth.js";

const root = resolve(import.meta.dirname, "..");
const host = "127.0.0.1";
const port = Number(process.env.PORT || 4173);
const maxBodyBytes = 1024 * 1024;

loadEnvFile(resolve(root, ".env.local"));

const apiHandlers = new Map([
  ["/api/login", loginHandler],
  ["/api/logout", logoutHandler],
  ["/api/interpret-query", interpretQueryHandler],
  ["/api/openai-diagnostic", openAiDiagnosticHandler],
  ["/api/search-eia", searchEiaHandler]
]);

const server = createServer(async (req, res) => {
  decorateResponse(res);

  try {
    const url = new URL(req.url || "/", `http://${host}:${port}`);
    req.query = Object.fromEntries(url.searchParams.entries());

    if (url.pathname.startsWith("/api/")) {
      const handler = apiHandlers.get(url.pathname);
      if (!handler) return res.status(404).json({ error: "Not found." });
      if (!applyApiAuthentication(req, res, url.pathname)) return;
      if (req.method !== "GET" && req.method !== "HEAD") req.body = await readBody(req);
      return await handler(req, res);
    }

    if (url.pathname === "/login" || url.pathname === "/login.html") {
      return serveHtml(res, "login.html");
    }

    if (url.pathname === "/" || url.pathname === "/index.html") {
      if (!isAuthenticatedRequest(req)) {
        const returnTo = normalizeReturnTo(`${url.pathname}${url.search}`);
        res.statusCode = 302;
        res.setHeader("Cache-Control", "no-store");
        res.setHeader("Location", `/login?returnTo=${encodeURIComponent(returnTo)}`);
        return res.end();
      }

      refreshSession(res);
      return serveHtml(res, "index.html");
    }

    return res.status(404).json({ error: "Not found." });
  } catch (error) {
    console.error("[dev-server] Request failed:", error instanceof Error ? error.message : String(error));
    if (!res.headersSent) return res.status(500).json({ error: "Local server error." });
    return res.end();
  }
});

server.on("error", error => {
  if (error?.code === "EADDRINUSE") {
    console.error(`[dev-server] Port ${port} is already in use.`);
  } else {
    console.error("[dev-server] Failed to start:", error);
  }
  process.exitCode = 1;
});

server.listen(port, host, () => {
  console.log(`[dev-server] EIA app available at http://${host}:${port}`);
});

function applyApiAuthentication(req, res, pathname) {
  if (pathname === "/api/login" || pathname === "/api/logout") return true;
  if (!isAuthenticatedRequest(req)) {
    res.setHeader("Cache-Control", "no-store");
    res.status(401).json({ error: "Authentication required." });
    return false;
  }
  refreshSession(res);
  return true;
}

function refreshSession(res) {
  const token = createSessionToken();
  res.setHeader("Cache-Control", "no-store");
  if (token) res.setHeader("Set-Cookie", createSessionCookie(token));
}

async function serveHtml(res, fileName) {
  const content = await readFile(resolve(root, fileName));
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(content);
}

function decorateResponse(res) {
  res.status = statusCode => {
    res.statusCode = statusCode;
    return res;
  };
  res.json = payload => {
    if (!res.hasHeader("Content-Type")) res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(payload));
    return res;
  };
}

function readBody(req) {
  return new Promise((resolveBody, rejectBody) => {
    const chunks = [];
    let size = 0;

    req.on("data", chunk => {
      size += chunk.length;
      if (size > maxBodyBytes) {
        rejectBody(new Error("Request body is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolveBody(Buffer.concat(chunks).toString("utf8")));
    req.on("error", rejectBody);
  });
}
