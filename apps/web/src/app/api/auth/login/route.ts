import { NextResponse, type NextRequest } from "next/server";
import type { AuthSession } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { setSessionCookies } from "@/lib/session-cookies";

export async function POST(req: NextRequest) {
  const body = await req.json();

  try {
    const session = await apiFetch<AuthSession>("/auth/login", { method: "POST", body: JSON.stringify(body) });
    const res = NextResponse.json({ success: true, data: { user: session.user } });
    setSessionCookies(res, session);
    return res;
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }
}
