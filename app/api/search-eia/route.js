import searchEiaHandler from "../../../lib/sources/eia/search.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request) {
  if (String(process.env.EIA_CANDIDATE_PIPELINE || "").trim().toLowerCase() === "on") {
    const { default: candidateSearchHandler } = await import("../../../lib/sources/eia/candidate-search.js");
    return runRouteHandler(candidateSearchHandler, request);
  }
  return runRouteHandler(searchEiaHandler, request);
}

export function POST(request) {
  return runRouteHandler(searchEiaHandler, request);
}
