import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(`/tasks/${id}`);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyMutate(`/tasks/${id}`, "PATCH", req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyMutate(`/tasks/${id}`, "DELETE", req);
}
