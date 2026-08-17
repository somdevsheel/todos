import type { NextResponse } from "next/server";
import type { AuthTokenPair } from "@arutech/shared-types";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookie-names";

const isProduction = process.env.NODE_ENV === "production";

/**
 * Turns a token pair from the API's JSON response into httpOnly cookies on
 * the Next.js origin. This is the ONLY place raw tokens ever reach a
 * browser-facing response header — client-side JavaScript never sees them
 * (see AUTHENTICATION.md).
 */
export function setSessionCookies(res: NextResponse, tokens: AuthTokenPair): void {
  const accessMaxAge = Math.max(0, Math.floor((new Date(tokens.accessTokenExpiresAt).getTime() - Date.now()) / 1000));
  const refreshMaxAge = Math.max(0, Math.floor((new Date(tokens.refreshTokenExpiresAt).getTime() - Date.now()) / 1000));

  res.cookies.set(ACCESS_TOKEN_COOKIE, tokens.accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: accessMaxAge,
  });
  res.cookies.set(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: refreshMaxAge,
  });
}

export function clearSessionCookies(res: NextResponse): void {
  res.cookies.set(ACCESS_TOKEN_COOKIE, "", { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: 0 });
  res.cookies.set(REFRESH_TOKEN_COOKIE, "", { httpOnly: true, secure: isProduction, sameSite: "lax", path: "/", maxAge: 0 });
}
