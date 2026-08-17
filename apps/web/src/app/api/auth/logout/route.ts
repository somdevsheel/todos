import { NextResponse } from "next/server";
import { apiFetch, getAccessTokenFromCookies, getRefreshTokenFromCookies } from "@/lib/api-client";
import { clearSessionCookies } from "@/lib/session-cookies";

export async function POST() {
  const accessToken = await getAccessTokenFromCookies();
  const refreshToken = await getRefreshTokenFromCookies();

  // Best-effort: even if the API call fails (e.g. token already expired),
  // the browser's cookies are cleared regardless — a user must always be
  // able to sign out locally.
  if (accessToken) {
    await apiFetch("/auth/logout", { method: "POST", accessToken, body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
  }

  const res = NextResponse.json({ success: true });
  clearSessionCookies(res);
  return res;
}
