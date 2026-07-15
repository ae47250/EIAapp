import searchEiaHandler from "../../../lib/sources/eia/search.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return runRouteHandler(searchEiaHandler, request);
}

export function POST(request) {
  return runRouteHandler(searchEiaHandler, request);
}
