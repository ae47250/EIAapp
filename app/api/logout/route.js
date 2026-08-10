import logoutHandler from "../../../lib/server/logout.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request) {
  return runRouteHandler(logoutHandler, request);
}

export function GET(request) {
  return runRouteHandler(logoutHandler, request);
}
