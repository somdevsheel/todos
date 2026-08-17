import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; role: string }> }) {
  const { id, role } = await params;
  return proxyMutate(`/users/${id}/roles/${role}`, "DELETE", req);
}
