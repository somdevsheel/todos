import { NextResponse, type NextRequest } from "next/server";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookies();
  await apiFetch(`/notifications/${id}/read`, { method: "PATCH", accessToken });
  return NextResponse.json({ success: true });
}
