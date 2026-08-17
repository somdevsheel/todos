import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  return proxyMutate(`/conversations/${id}/messages/${messageId}`, "PATCH", req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  const { id, messageId } = await params;
  return proxyMutate(`/conversations/${id}/messages/${messageId}`, "DELETE", req);
}
