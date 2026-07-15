import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import LoginForm from "../../components/auth/LoginForm.js";
import {
  SESSION_COOKIE_NAME,
  isLoginRequired,
  normalizeReturnTo,
  verifySessionToken
} from "../../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }) {
  if (!isLoginRequired()) redirect("/");

  const cookieStore = await cookies();
  if (verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value || "")) redirect("/");

  const params = await searchParams;
  return <LoginForm returnTo={normalizeReturnTo(params?.returnTo)} />;
}
