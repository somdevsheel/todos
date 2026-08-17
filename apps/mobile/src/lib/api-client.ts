import * as SecureStore from "expo-secure-store";
import { API_ERROR_CODES, type ApiResult } from "@arutech/shared-types";

// 10.0.2.2 is the Android emulator's alias for the host machine's
// localhost — the standard way to reach a locally-running API from an
// emulator. A physical device needs the host's real LAN IP instead; set
// EXPO_PUBLIC_API_URL (Expo only exposes env vars prefixed EXPO_PUBLIC_ to
// client code) to override.
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4000/api/v1";

const ACCESS_TOKEN_KEY = "arutech_access_token";
const REFRESH_TOKEN_KEY = "arutech_refresh_token";

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Secure device storage, not a cookie — this is exactly the client
 * AuthTokenPair's docstring in shared-types anticipated ("a future mobile
 * client instead stores these in secure device storage"). There's no
 * BFF/httpOnly-cookie layer here because the threat model that pattern
 * defends against (XSS token theft in a browser) doesn't apply on-device;
 * see AUTHENTICATION.md's "WebSocket authentication" section for the one
 * other place this app's trust model already differs from the web app's.
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function storeTokens(tokens: StoredTokens): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}

async function rawFetch(path: string, options: RequestInit & { accessToken?: string } = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);
  return fetch(`${API_URL}${path}`, { ...options, headers });
}

let refreshPromise: Promise<string | null> | null = null;

/** One shared in-flight refresh — concurrent 401s from several requests at once only trigger a single POST /auth/refresh call, never a stampede. */
function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) return null;
      try {
        const res = await rawFetch("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken }) });
        const body = await res.json();
        if (!res.ok || !body.success) return null;
        await storeTokens({ accessToken: body.data.accessToken, refreshToken: body.data.refreshToken });
        return body.data.accessToken as string;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * Every authenticated call in the app goes through this — mirrors the
 * *policy* of apps/web/src/middleware.ts's silent refresh (try one
 * refresh-and-retry before giving up) but as a plain function, since
 * mobile has no middleware layer to hook into. A thrown UNAUTHORIZED
 * (after the retry also failed) is AuthContext's signal to sign the user
 * out — see auth-context.tsx.
 */
export async function apiFetch<T>(path: string, options: RequestInit = {}, config: { skipAuth?: boolean } = {}): Promise<T> {
  const accessToken = config.skipAuth ? undefined : ((await getAccessToken()) ?? undefined);
  let res = await rawFetch(path, { ...options, accessToken });

  if (res.status === 401 && !config.skipAuth) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      await clearTokens();
      throw new ApiClientError(API_ERROR_CODES.UNAUTHORIZED, "Your session expired. Please log in again.", 401);
    }
    res = await rawFetch(path, { ...options, accessToken: newToken });
  }

  const body = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!res.ok || !body || !body.success) {
    const code = body && "error" in body ? body.error.code : API_ERROR_CODES.INTERNAL_ERROR;
    const message = body && "error" in body ? body.error.message : "Something went wrong. Please try again.";
    throw new ApiClientError(code, message, res.status);
  }
  return body.data;
}

export { API_URL };
