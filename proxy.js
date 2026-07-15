import { NextResponse } from "next/server.js";

import {
  createSessionCookie,
  createSessionToken,
  isAuthenticatedRequest,
  isLoginRequired,
  normalizeReturnTo
} from "./lib/auth.js";

const PUBLIC_API_ROUTES = new Set(["/api/login", "/api/logout"]);

export function proxy(request) {
  if (!isLoginRequired()) return NextResponse.next();

  const url = new URL(request.url);
  if (PUBLIC_API_ROUTES.has(url.pathname)) return NextResponse.next();
  const authenticated = isAuthenticatedRequest(request);
  if (url.pathname.startsWith("/api/")) {
    return authenticated ? refreshSession() : NextResponse.next();
  }
  if (authenticated) return refreshSession();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "returnTo",
    normalizeReturnTo(`${url.pathname}${url.search}`)
  );
  return NextResponse.redirect(loginUrl, 302);
}

export const config = {
  matcher: ["/", "/index.html", "/api/:path*"]
};

function refreshSession() {
  const response = NextResponse.next();
  const token = createSessionToken();
  response.headers.set("Cache-Control", "no-store");
  if (token) response.headers.set("Set-Cookie", createSessionCookie(token));
  return response;
}
