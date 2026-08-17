import { NextResponse, type NextRequest } from "next/server";
import { apiFetch, ApiClientError, getAccessTokenFromCookies } from "./api-client";

/**
 * Thin, shared BFF proxy helpers for Route Handlers that just forward a
 * request to the NestJS API with the caller's access-token cookie turned
 * into an Authorization header, and turn the result back into the
 * standard `{success,data}` / `{success,error}` envelope. Route Handlers
 * that need something bespoke (the file upload/download proxies, which
 * can't go through JSON) don't use these — see app/api/files/*.
 */

function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiClientError) {
    return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
  }
  throw error;
}

export async function proxyGet(path: string): Promise<NextResponse> {
  const accessToken = await getAccessTokenFromCookies();
  try {
    const data = await apiFetch(path, { accessToken });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function proxyMutate(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  req: NextRequest,
  successStatus = 200,
): Promise<NextResponse> {
  const accessToken = await getAccessTokenFromCookies();
  const raw = method === "DELETE" ? "" : await req.text();
  try {
    const data = await apiFetch(path, { method, accessToken, body: raw.length ? raw : undefined });
    return NextResponse.json({ success: true, data }, { status: successStatus });
  } catch (error) {
    return errorResponse(error);
  }
}
