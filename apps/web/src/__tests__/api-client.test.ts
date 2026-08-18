import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiClientError } from "@/lib/api-client";

/**
 * Regression test for a real bug found live: logout/logout-all/
 * forgot-password/reset-password all return 204 No Content on success
 * (see auth.controller.ts). apiFetch used to unconditionally try to
 * .json()-parse every response, which throws on a 204's empty body,
 * silently swallowed into `body = null`, then treated as a FAILURE —
 * so a genuinely successful reset-password call was reported as an
 * error, and that error (status 204) then got wrapped into a
 * NextResponse.json(errorBody, {status: 204}) by the route handler,
 * which is itself invalid (a 204 response must carry no body) and threw
 * a real unhandled 500. Confirmed live against the deployed app: the
 * password was actually already changed on the backend every time.
 */
describe("apiFetch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves successfully (not an error) on a real 204 No Content response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );

    await expect(apiFetch("/auth/reset-password", { method: "POST" })).resolves.toBeUndefined();
  });

  it("still resolves normally for a real JSON success envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: { id: "user-1" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/users/me")).resolves.toEqual({ id: "user-1" });
  });

  it("still throws ApiClientError for a real JSON error envelope", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: false, error: { code: "TOKEN_INVALID", message: "This link is invalid or has expired." } }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(apiFetch("/auth/reset-password", { method: "POST" })).rejects.toMatchObject({
      code: "TOKEN_INVALID",
      status: 400,
    });
  });

  it("throws ApiClientError (not undefined) for a non-2xx status with no body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 500 })),
    );

    await expect(apiFetch("/whatever")).rejects.toBeInstanceOf(ApiClientError);
  });
});
