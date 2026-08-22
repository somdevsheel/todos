import type { CurrentUser, RoleName } from "@arutech/shared-types";

/**
 * Port of apps/web/src/lib/rbac.ts's hasAnyRole — pure logic, no
 * server-only dependency, so it copies over verbatim rather than being
 * imported cross-app (there's no shared "client lib" package, only
 * shared-types). Keep this in sync with web's version if that one changes.
 */
export function hasAnyRole(user: Pick<CurrentUser, "roles"> | null | undefined, roles?: RoleName[]): boolean {
  if (!roles || roles.length === 0) return true;
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}
