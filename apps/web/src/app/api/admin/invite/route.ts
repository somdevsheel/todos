import { NextResponse, type NextRequest } from "next/server";
import { apiFetch, getAccessTokenFromCookies, ApiClientError } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const accessToken = await getAccessTokenFromCookies();
  const body = await req.json();

  try {
    const invitation = await apiFetch("/auth/invite", { method: "POST", accessToken, body: JSON.stringify(body) });
    return NextResponse.json({ success: true, data: invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }
}
