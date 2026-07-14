import { next } from "@vercel/functions";
import { createSessionCookie, createSessionToken, isAuthenticatedRequest, normalizeReturnTo } from "./lib/auth.js";

const PUBLIC_API_ROUTES = new Set(["/api/login", "/api/logout"]);

export const config = {
  matcher: ["/", "/index.html", "/api/:path*"],
  runtime: "nodejs"
};

export default function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC_API_ROUTES.has(url.pathname)) return next();
  if (isAuthenticatedRequest(request)) {
    const token = createSessionToken();
    if (!token) return next({ headers: { "Cache-Control": "no-store" } });
    return next({
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie": createSessionCookie(token)
      }
    });
  }

  if (url.pathname.startsWith("/api/")) {
    return Response.json({ error: "Authentication required." }, {
      status: 401,
      headers: { "Cache-Control": "no-store" }
    });
  }

  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("returnTo", normalizeReturnTo(`${url.pathname}${url.search}`));
  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
      Location: loginUrl.toString()
    }
  });
}
