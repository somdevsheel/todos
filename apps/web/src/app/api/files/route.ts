import { NextResponse, type NextRequest } from "next/server";
import { getAccessTokenFromCookies, rawApiFetch } from "@/lib/api-client";

/**
 * Reads the browser's multipart upload and re-posts it as `FormData` to
 * the NestJS API — the one place this app forwards multipart, not JSON
 * (see api-client.ts's `rawApiFetch` docstring for why `apiFetch` can't
 * be used here).
 */
export async function POST(req: NextRequest) {
  const accessToken = await getAccessTokenFromCookies();
  const formData = await req.formData();

  const res = await rawApiFetch("/files", { method: "POST", accessToken, body: formData });
  const body = await res.json().catch(() => ({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "Unable to upload the file. Please try again." },
  }));
  return NextResponse.json(body, { status: res.status });
}
