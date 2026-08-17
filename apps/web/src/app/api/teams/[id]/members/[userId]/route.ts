import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  const { id, userId } = await params;
  return proxyMutate(`/teams/${id}/members/${userId}`, "DELETE", req);
}
