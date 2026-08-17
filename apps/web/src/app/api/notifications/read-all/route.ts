import { NextResponse } from "next/server";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";

export async function PATCH() {
  const accessToken = await getAccessTokenFromCookies();
  await apiFetch("/notifications/read-all", { method: "PATCH", accessToken });
  return NextResponse.json({ success: true });
}
