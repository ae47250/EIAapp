import openaiDiagnosticHandler from "../../../lib/server/openai-diagnostic.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return runRouteHandler(openaiDiagnosticHandler, request);
}

export function POST(request) {
  return runRouteHandler(openaiDiagnosticHandler, request);
}
