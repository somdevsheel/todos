import type { NextRequest } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyGet(`/conversations/${id}`);
}
