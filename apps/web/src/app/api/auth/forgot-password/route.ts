import { NextResponse, type NextRequest } from "next/server";
import { apiFetch } from "@/lib/api-client";

export async function POST(req: NextRequest) {
  const body = await req.json();
  // Deliberately ignore the outcome here too — forgot-password never
  // reveals whether an account exists, at the API layer or this one.
  await apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify(body) }).catch(() => undefined);
  return NextResponse.json({ success: true });
}
