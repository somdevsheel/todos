import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(`/tasks/${id}/comments${req.nextUrl.search}`);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyMutate(`/tasks/${id}/comments`, "POST", req, 201);
}
