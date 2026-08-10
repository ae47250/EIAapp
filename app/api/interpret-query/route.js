import interpretQueryHandler from "../../../lib/sources/eia/interpret-query.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return runRouteHandler(interpretQueryHandler, request);
}

export function POST(request) {
  return runRouteHandler(interpretQueryHandler, request);
}
