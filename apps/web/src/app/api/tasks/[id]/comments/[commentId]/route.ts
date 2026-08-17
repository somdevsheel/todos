import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params;
  return proxyMutate(`/tasks/${id}/comments/${commentId}`, "PATCH", req);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; commentId: string }> }) {
  const { id, commentId } = await params;
  return proxyMutate(`/tasks/${id}/comments/${commentId}`, "DELETE", req);
}
