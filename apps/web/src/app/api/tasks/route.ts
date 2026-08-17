import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET(req: NextRequest) {
  return proxyGet(`/tasks${req.nextUrl.search}`);
}

export async function POST(req: NextRequest) {
  return proxyMutate("/tasks", "POST", req, 201);
}
