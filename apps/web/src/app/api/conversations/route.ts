import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET() {
  return proxyGet("/conversations");
}

export async function POST(req: NextRequest) {
  return proxyMutate("/conversations", "POST", req, 201);
}
