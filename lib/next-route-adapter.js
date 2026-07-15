export async function runRouteHandler(handler, request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(
    Array.from(request.headers.entries()).map(([name, value]) => [name.toLowerCase(), value])
  );
  const req = {
    method: request.method,
    query: Object.fromEntries(url.searchParams.entries()),
    headers,
    socket: { remoteAddress: headers["x-forwarded-for"] || headers["x-real-ip"] || "unknown" }
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    req.body = await request.text();
  }

  const responseHeaders = new Headers();
  let responseBody = null;
  const res = {
    statusCode: 200,
    get headersSent() {
      return responseBody !== null;
    },
    setHeader(name, value) {
      responseHeaders.set(String(name), Array.isArray(value) ? value.join(", ") : String(value));
      return this;
    },
    hasHeader(name) {
      return responseHeaders.has(String(name));
    },
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(value) {
      if (!responseHeaders.has("Content-Type")) {
        responseHeaders.set("Content-Type", "application/json; charset=utf-8");
      }
      responseBody = JSON.stringify(value);
      return this;
    },
    end(value) {
      responseBody = value === undefined ? "" : value;
      return this;
    }
  };

  await handler(req, res);
  return new Response(responseBody, {
    status: res.statusCode,
    headers: responseHeaders
  });
}
