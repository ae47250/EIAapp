"use client";

import { useState } from "react";

export default function LoginForm({ returnTo }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    const form = event.currentTarget;
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        body: new URLSearchParams(new FormData(form))
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error("login-failed");
      window.location.assign(data.returnTo || "/");
    } catch {
      setError("Invalid username or password.");
      form.elements.password.value = "";
      form.elements.password.focus();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-shell">
      <main className="login-card">
        <div className="eyebrow">Protected access</div>
        <h1>Login</h1>
        <p>Sign in to use the EIA Data Extraction Tool.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required autoFocus />

          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />

          <input name="returnTo" type="hidden" value={returnTo} />
          <button type="submit" disabled={submitting}>{submitting ? "Signing in..." : "Login"}</button>
          {error ? <div className="login-error" role="alert" aria-live="polite">{error}</div> : null}
        </form>
      </main>
    </div>
  );
}
