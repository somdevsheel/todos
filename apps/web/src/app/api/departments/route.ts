import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET() {
  return proxyGet("/departments");
}

export async function POST(req: NextRequest) {
  return proxyMutate("/departments", "POST", req, 201);
}
