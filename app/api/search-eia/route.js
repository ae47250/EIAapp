import candidateSearchHandler from "../../../lib/sources/eia/candidate-search.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return runRouteHandler(candidateSearchHandler, request);
}

export function POST(request) {
  return runRouteHandler(candidateSearchHandler, request);
}
