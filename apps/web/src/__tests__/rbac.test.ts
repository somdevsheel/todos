import { describe, expect, it } from "vitest";
import type { NavItem } from "@arutech/shared-types";
import { hasAnyRole, filterNavForUser } from "@/lib/rbac";

describe("hasAnyRole", () => {
  it("allows any authenticated user when no roles are required", () => {
    expect(hasAnyRole({ roles: ["EMPLOYEE"] }, undefined)).toBe(true);
    expect(hasAnyRole({ roles: ["EMPLOYEE"] }, [])).toBe(true);
  });

  it("denies an unauthenticated (null/undefined) user when roles are required", () => {
    expect(hasAnyRole(null, ["ADMIN"])).toBe(false);
    expect(hasAnyRole(undefined, ["ADMIN"])).toBe(false);
  });

  it("allows when the user has one of the required roles", () => {
    expect(hasAnyRole({ roles: ["MANAGER"] }, ["ADMIN", "MANAGER"])).toBe(true);
  });

  it("denies when the user has none of the required roles", () => {
    expect(hasAnyRole({ roles: ["EMPLOYEE"] }, ["ADMIN", "SUPER_ADMIN"])).toBe(false);
  });
});

describe("filterNavForUser", () => {
  const items: NavItem[] = [
    { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "home" },
    { key: "admin", label: "Admin", href: "/admin", icon: "shield", roles: ["SUPER_ADMIN", "ADMIN"] },
  ];

  it("shows unrestricted items to every role", () => {
    const result = filterNavForUser(items, { roles: ["EMPLOYEE"] });
    expect(result.map((i) => i.key)).toEqual(["dashboard"]);
  });

  it("shows role-restricted items only to matching roles", () => {
    const result = filterNavForUser(items, { roles: ["ADMIN"] });
    expect(result.map((i) => i.key)).toEqual(["dashboard", "admin"]);
  });
});
