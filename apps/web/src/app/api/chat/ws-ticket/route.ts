import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function POST(req: NextRequest) {
  return proxyMutate("/auth/ws-ticket", "POST", req);
}
