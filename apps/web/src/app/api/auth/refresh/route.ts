import { NextResponse } from "next/server";
import type { AuthSession } from "@arutech/shared-types";
import { apiFetch, ApiClientError, getRefreshTokenFromCookies } from "@/lib/api-client";
import { clearSessionCookies, setSessionCookies } from "@/lib/session-cookies";

/**
 * Explicit refresh endpoint for client-triggered retries. The primary
 * refresh path for page loads is middleware.ts (it can set cookies before
 * a protected page renders); this route exists for client components that
 * want to retry a failed mutation after a 401 without a full navigation.
 */
export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    return NextResponse.json({ success: false, error: { code: "UNAUTHORIZED", message: "No session to refresh." } }, { status: 401 });
  }

  try {
    const session = await apiFetch<AuthSession>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) });
    const res = NextResponse.json({ success: true, data: { user: session.user } });
    setSessionCookies(res, session);
    return res;
  } catch (error) {
    const res = NextResponse.json(
      { success: false, error: { code: error instanceof ApiClientError ? error.code : "INTERNAL_ERROR", message: "Session expired." } },
      { status: error instanceof ApiClientError ? error.status : 500 },
    );
    clearSessionCookies(res);
    return res;
  }
}
