import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET() {
  return proxyGet("/notifications/preferences");
}

export async function PATCH(req: NextRequest) {
  return proxyMutate("/notifications/preferences", "PATCH", req);
}
