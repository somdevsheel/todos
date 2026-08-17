// NOTE: Next.js 16 is migrating this file convention from `middleware.ts`
// to `proxy.ts` (see `npx @next/codemod@canary middleware-to-proxy .`).
// `middleware.ts` still works (deprecated, not removed) as of Next 16.3 —
// left as-is until the new convention's exact contract is verified against
// a real upgrade, rather than guessing at an unfamiliar API surface.
import { NextResponse, type NextRequest } from "next/server";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/cookie-names";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";
const isProduction = process.env.NODE_ENV === "production";

interface RefreshResponseBody {
  success: boolean;
  data?: { accessToken: string; accessTokenExpiresAt: string; refreshToken: string; refreshTokenExpiresAt: string };
}

/**
 * Runs before every protected route. Two jobs only:
 *  1. If there's no access-token cookie but there IS a refresh-token
 *     cookie, attempt one silent rotation (middleware is the only place
 *     in the App Router that can both call the API and set cookies
 *     before a protected Server Component renders — see AUTHENTICATION.md).
 *  2. Otherwise, gate on cookie *presence* only. Full authorization
 *     (is this token actually still valid server-side?) is re-checked on
 *     every real data fetch by the API itself returning 401/403, which
 *     requireAuth()/requireRole() in lib/auth.ts handle by redirecting.
 */
export async function middleware(req: NextRequest): Promise<NextResponse> {
  const accessToken = req.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) return NextResponse.next();

  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  if (!refreshToken) return redirectToLogin(req);

  try {
    const refreshRes = await fetch(`${API_INTERNAL_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const body = (await refreshRes.json()) as RefreshResponseBody;
    if (!refreshRes.ok || !body.success || !body.data) return redirectToLogin(req);

    const res = NextResponse.next();
    setCookiePair(res, body.data);
    return res;
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest): NextResponse {
  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", req.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

function setCookiePair(res: NextResponse, tokens: NonNullable<RefreshResponseBody["data"]>): void {
  const accessMaxAge = Math.max(0, Math.floor((new Date(tokens.accessTokenExpiresAt).getTime() - Date.now()) / 1000));
  const refreshMaxAge = Math.max(0, Math.floor((new Date(tokens.refreshTokenExpiresAt).getTime() - Date.now()) / 1000));
  res.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: accessMaxAge });
  res.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: refreshMaxAge });
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/tasks/:path*",
    "/calendar/:path*",
    "/chat/:path*",
    "/notifications/:path*",
    "/teams/:path*",
    "/employees/:path*",
    "/settings/:path*",
    "/admin/:path*",
  ],
};
