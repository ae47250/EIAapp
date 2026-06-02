const DEFAULT_MODEL = "gpt-5.4-mini";

export default async function handler(req, res) {
  setJsonHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed.",
      userMessage: "Use a GET request for this diagnostic route."
    });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;

  if (!apiKey) {
    return res.status(500).json({
      ok: false,
      openaiConfigured: false,
      model,
      userMessage: "OPENAI_API_KEY is missing in Vercel. Add it under Project Settings -> Environment Variables, then redeploy."
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        input: "Return exactly this JSON: {\"diagnostic\":\"openai-ok\"}"
      })
    });

    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!response.ok) {
      return res.status(500).json({
        ok: false,
        openaiConfigured: true,
        model,
        status: response.status,
        userMessage: "OpenAI request failed. Check OPENAI_API_KEY, OPENAI_MODEL, account access, and Vercel function logs.",
        openaiError: scrubSecret(json?.error?.message || text, apiKey)
      });
    }

    return res.status(200).json({
      ok: true,
      openaiConfigured: true,
      model,
      status: response.status,
      outputText: extractResponseText(json),
      userMessage: "OpenAI diagnostic request succeeded."
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      openaiConfigured: true,
      model,
      userMessage: "The backend could not reach OpenAI. Check network access and Vercel function logs.",
      details: scrubSecret(error.message, apiKey)
    });
  }
}

function extractResponseText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  const output = Array.isArray(data?.output) ? data.output : [];
  return output
    .flatMap(item => Array.isArray(item.content) ? item.content : [])
    .map(part => part.text || part.output_text || "")
    .join("\n")
    .trim();
}

function scrubSecret(text, apiKey) {
  return String(text || "").replaceAll(apiKey || "", "[hidden-openai-key]");
}

function setJsonHeaders(res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
}
