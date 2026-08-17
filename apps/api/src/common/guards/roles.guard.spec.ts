import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";

function buildContext(userRoles: string[] | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: userRoles ? { roles: userRoles } : undefined }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  it("allows the request when no @Roles() metadata is present", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext(["EMPLOYEE"]))).toBe(true);
  });

  it("allows the request when the user has one of the required roles", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["ADMIN", "SUPER_ADMIN"]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext(["ADMIN"]))).toBe(true);
  });

  it("denies the request when the user has none of the required roles", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["SUPER_ADMIN"]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext(["EMPLOYEE"]))).toBe(false);
  });

  it("denies the request when there is no authenticated user at all", () => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(["ADMIN"]) } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
