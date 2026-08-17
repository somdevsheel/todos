import { NextResponse, type NextRequest } from "next/server";
import { apiFetch, ApiClientError } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    await apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify(body) });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof ApiClientError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    throw error;
  }
}
