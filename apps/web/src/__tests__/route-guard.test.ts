// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "@/lib/cookie-names";

function buildRequest(path: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(new URL(path, "http://localhost:3000"));
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value);
  }
  return req;
}

describe("middleware (route guard)", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("lets the request through when an access-token cookie is present", async () => {
    const req = buildRequest("/dashboard", { [ACCESS_TOKEN_COOKIE]: "some-access-token" });
    const res = await middleware(req);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects to /login when there is neither an access nor a refresh token", async () => {
    const req = buildRequest("/dashboard");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("silently refreshes when only a refresh-token cookie is present, and lets the request through", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            accessToken: "new-access",
            accessTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
            refreshToken: "new-refresh",
            refreshTokenExpiresAt: new Date(Date.now() + 60_000).toISOString(),
          },
        }),
        { status: 200 },
      ),
    ) as unknown as typeof fetch;

    const req = buildRequest("/dashboard", { [REFRESH_TOKEN_COOKIE]: "some-refresh-token" });
    const res = await middleware(req);

    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get(ACCESS_TOKEN_COOKIE)?.value).toBe("new-access");
  });

  it("redirects to /login when the refresh attempt fails", async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: { code: "TOKEN_INVALID", message: "bad" } }), { status: 400 }),
    ) as unknown as typeof fetch;

    const req = buildRequest("/dashboard", { [REFRESH_TOKEN_COOKIE]: "an-expired-refresh-token" });
    const res = await middleware(req);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
