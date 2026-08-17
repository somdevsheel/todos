import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET(req: NextRequest) {
  return proxyGet(`/announcements${req.nextUrl.search}`);
}

export async function POST(req: NextRequest) {
  return proxyMutate("/announcements", "POST", req, 201);
}
