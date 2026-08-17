import type { ExecutionContext } from "@nestjs/common";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { OrgScopeGuard } from "./org-scope.guard";
import type { OrgScopeResourceMetadata } from "../decorators/org-scope-resource.decorator";

function buildContext(params: Record<string, string>, callerOrgId: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ params, user: { organizationId: callerOrgId } }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildReflector(metadata: OrgScopeResourceMetadata | undefined) {
  return { getAllAndOverride: jest.fn().mockReturnValue(metadata) } as unknown as Reflector;
}

describe("OrgScopeGuard", () => {
  it("allows the request when the route has no @OrgScopeResource() metadata", async () => {
    const guard = new OrgScopeGuard(buildReflector(undefined), { department: { findUnique: jest.fn() } } as never);
    await expect(guard.canActivate(buildContext({ id: "dep-1" }, "org-1"))).resolves.toBe(true);
  });

  it("allows the request when the resource belongs to the caller's organization", async () => {
    const findUnique = jest.fn().mockResolvedValue({ organizationId: "org-1" });
    const guard = new OrgScopeGuard(buildReflector({ model: "department" }), { department: { findUnique } } as never);
    await expect(guard.canActivate(buildContext({ id: "dep-1" }, "org-1"))).resolves.toBe(true);
  });

  it("denies (403) when the resource belongs to a different organization", async () => {
    const findUnique = jest.fn().mockResolvedValue({ organizationId: "org-2" });
    const guard = new OrgScopeGuard(buildReflector({ model: "department" }), { department: { findUnique } } as never);
    await expect(guard.canActivate(buildContext({ id: "dep-1" }, "org-1"))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws 404 when the resource does not exist at all", async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const guard = new OrgScopeGuard(buildReflector({ model: "department" }), { department: { findUnique } } as never);
    await expect(guard.canActivate(buildContext({ id: "missing" }, "org-1"))).rejects.toBeInstanceOf(NotFoundException);
  });
});
