import { NextResponse, type NextRequest } from "next/server";
import { getAccessTokenFromCookies, rawApiFetch } from "@/lib/api-client";
import { proxyMutate } from "@/lib/api-proxy";

/** Streams the file's raw bytes straight through — the response body here is never JSON. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const accessToken = await getAccessTokenFromCookies();
  const res = await rawApiFetch(`/files/${id}`, { accessToken });

  if (!res.ok || !res.body) {
    const body = await res.json().catch(() => ({
      success: false,
      error: { code: "NOT_FOUND", message: "File not found." },
    }));
    return NextResponse.json(body, { status: res.status });
  }

  const headers = new Headers();
  const contentType = res.headers.get("content-type");
  const contentDisposition = res.headers.get("content-disposition");
  if (contentType) headers.set("content-type", contentType);
  if (contentDisposition) headers.set("content-disposition", contentDisposition);

  return new NextResponse(res.body, { status: 200, headers });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyMutate(`/files/${id}`, "DELETE", req);
}
