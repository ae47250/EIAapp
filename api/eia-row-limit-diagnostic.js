const EIA_BASE_URL = "https://api.eia.gov/v2/international";
const COUNTRY_CODE = "USA";
const FREQUENCY = "annual";
const TIMEOUT_MS = 20000;

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
      userMessage: "Use a GET request for this diagnostic route."
    });
  }

  const apiKey = process.env.EIA_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      error: "Missing EIA_API_KEY environment variable.",
      userMessage: "The EIA API key is missing in Vercel."
    });
  }

  try {
    const request5000 = await fetchEiaSummary(apiKey, 5000);
    const request10000 = await fetchEiaSummary(apiKey, 10000);

    return res.status(200).json({
      length5000: summarizeResult(request5000),
      length10000: summarizeResult(request10000),
      length10000Accepted: request10000.httpStatus >= 200 && request10000.httpStatus < 300,
      rowsBeyond5000Exist: request10000.dataLength > request5000.dataLength
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Server error while contacting EIA API.",
      userMessage: friendlyErrorMessage(error)
    });
  }
}

async function fetchEiaSummary(apiKey, length) {
  const url = buildEiaDataUrl(apiKey, length);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    const elapsedMs = Date.now() - startedAt;
    const byteSize = Buffer.byteLength(text, "utf8");
    let json;

    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    const rows = Array.isArray(json?.response?.data) ? json.response.data : [];

    return {
      httpStatus: response.status,
      responseTotal: json?.response?.total ?? null,
      dataLength: rows.length,
      elapsedMs,
      byteSize,
      rows
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(`EIA request with length=${length} timed out.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildEiaDataUrl(apiKey, length) {
  const url = new URL(`${EIA_BASE_URL}/data/`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("frequency", FREQUENCY);
  url.searchParams.set("data[0]", "value");
  url.searchParams.append("facets[countryRegionId][]", COUNTRY_CODE);
  url.searchParams.set("sort[0][column]", "period");
  url.searchParams.set("sort[0][direction]", "desc");
  url.searchParams.set("offset", "0");
  url.searchParams.set("length", String(length));
  return url.toString();
}

function summarizeResult(result) {
  return {
    httpStatus: result.httpStatus,
    responseTotal: result.responseTotal,
    dataLength: result.dataLength,
    elapsedMs: result.elapsedMs,
    byteSize: result.byteSize
  };
}

function friendlyErrorMessage(error) {
  const message = String(error?.message || "");
  if (message.includes("timed out")) return "The EIA API request timed out.";
  return "The backend could not complete the EIA row-limit diagnostic.";
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
