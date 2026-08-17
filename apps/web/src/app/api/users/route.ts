import type { NextRequest } from "next/server";
import { proxyGet } from "@/lib/api-proxy";

/** Used by client components (e.g. AssigneePicker) that need to search employees — the browser never calls the Nest API directly. */
export async function GET(req: NextRequest) {
  return proxyGet(`/users${req.nextUrl.search}`);
}
