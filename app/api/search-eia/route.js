import lookupSearchHandler from "../../../lib/sources/eia/lookup-search.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return runRouteHandler(lookupSearchHandler, request);
}

export function POST(request) {
  return runRouteHandler(lookupSearchHandler, request);
}
