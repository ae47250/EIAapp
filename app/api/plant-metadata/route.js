import plantMetadataHandler from "../../../lib/sources/eia/plant-metadata.js";
import { runRouteHandler } from "../../../lib/next-route-adapter.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request) {
  return runRouteHandler(plantMetadataHandler, request);
}

export function POST(request) {
  return runRouteHandler(plantMetadataHandler, request);
}
