import type { NextRequest } from "next/server";
import { proxyGet, proxyMutate } from "@/lib/api-proxy";

export async function GET() {
  return proxyGet("/reminders");
}

export async function POST(req: NextRequest) {
  return proxyMutate("/reminders", "POST", req, 201);
}
