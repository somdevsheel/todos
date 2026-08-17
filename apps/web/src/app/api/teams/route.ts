import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function POST(req: NextRequest) {
  return proxyMutate("/teams", "POST", req, 201);
}
