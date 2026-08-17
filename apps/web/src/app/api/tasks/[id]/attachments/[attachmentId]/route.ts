import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { id, attachmentId } = await params;
  return proxyMutate(`/tasks/${id}/attachments/${attachmentId}`, "DELETE", req);
}
