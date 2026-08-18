import { cookies } from "next/headers";
import { API_ERROR_CODES, type ApiResult } from "@arutech/shared-types";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./cookie-names";

const API_INTERNAL_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000/api/v1";

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };

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

interface ApiFetchOptions extends RequestInit {
  accessToken?: string;
}

/**
 * Server-side-only fetch helper for calling the NestJS API. Every route
 * handler / server component that talks to the API goes through this so
 * the `{success,data}` / `{success,error}` envelope is unwrapped in
 * exactly one place. Never called from client components — the browser
 * never talks to the API directly (see AUTHENTICATION.md).
 */
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const res = await rawApiFetch(path, options);

  // 204 No Content (logout, logout-all, forgot-password, reset-password —
  // see auth.controller.ts) has no body to parse at all, by HTTP spec — a
  // genuinely successful empty response, not a failure. Checked before
  // attempting .json() below: without this, res.json() throws on the empty
  // body, gets silently caught into `body = null`, and a *successful* 204
  // was being treated as a failure — which callers then wrapped into
  // NextResponse.json(errorBody, {status: 204}), itself invalid (a 204
  // response must not carry a body), producing a real unhandled 500. Found
  // live: a real password reset was succeeding on the backend every time
  // while the frontend reported failure.
  if (res.status === 204) {
    if (!res.ok) throw new ApiClientError(API_ERROR_CODES.INTERNAL_ERROR, "Something went wrong. Please try again.", res.status);
    return undefined as T;
  }

  const body = (await res.json().catch(() => null)) as ApiResult<T> | null;

  if (!res.ok || !body || !body.success) {
    const code = body && "error" in body ? body.error.code : API_ERROR_CODES.INTERNAL_ERROR;
    const message = body && "error" in body ? body.error.message : "Something went wrong. Please try again.";
    throw new ApiClientError(code, message, res.status);
  }

  return body.data;
}

/**
 * Returns the raw `Response` instead of unwrapping the `{success,data}`
 * envelope — for the two request shapes that don't fit it: file uploads
 * (`FormData` bodies, which must NOT get a manually-set `Content-Type` —
 * `fetch` sets its own multipart boundary) and file downloads (the
 * response body is the file's raw bytes, not JSON). Route handlers using
 * this are responsible for their own error handling.
 */
export async function rawApiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  if (options.body && !isFormData && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.accessToken) headers.set("Authorization", `Bearer ${options.accessToken}`);

  try {
    return await fetch(`${API_INTERNAL_URL}${path}`, { ...options, headers, cache: "no-store" });
  } catch {
    throw new ApiClientError(API_ERROR_CODES.INTERNAL_ERROR, "Unable to reach the server. Please try again.", 503);
  }
}

/** Server Component / Route Handler only: reads the httpOnly access-token cookie set by the BFF. */
export async function getAccessTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

export async function getRefreshTokenFromCookies(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}
