import type { NextRequest } from "next/server";
import { proxyMutate } from "@/lib/api-proxy";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyMutate(`/events/${id}/rsvp`, "PATCH", req);
}
