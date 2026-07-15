import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import SearchWorkspace from "../components/search/SearchWorkspace.js";
import {
  SESSION_COOKIE_NAME,
  isLoginRequired,
  verifySessionToken
} from "../lib/auth.js";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const loginRequired = isLoginRequired();
  if (loginRequired) {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || "";
    if (!verifySessionToken(token)) redirect("/login?returnTo=/");
  }

  return <SearchWorkspace showLogout={loginRequired} />;
}
