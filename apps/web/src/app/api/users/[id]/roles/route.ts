import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyMutate(`/users/${id}/roles`, "POST", req, 201);
}
