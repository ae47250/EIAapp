import { clearSessionCookie } from "../auth.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  res.setHeader("Set-Cookie", clearSessionCookie());
  res.statusCode = 303;
  res.setHeader("Location", "/login");
  return res.end();
}
