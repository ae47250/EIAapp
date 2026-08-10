import loginHandler from "../../../lib/server/login.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function POST(request) {
  return runRouteHandler(loginHandler, request);
}

export function GET(request) {
  return runRouteHandler(loginHandler, request);
}
