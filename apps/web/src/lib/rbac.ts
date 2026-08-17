import type { CurrentUser, NavItem, RoleName } from "@arutech/shared-types";

/** A route/widget with no `roles` list is visible to every authenticated user. */
export function hasAnyRole(user: Pick<CurrentUser, "roles"> | null | undefined, roles?: RoleName[]): boolean {
  if (!roles || roles.length === 0) return true;
  if (!user) return false;
  return roles.some((role) => user.roles.includes(role));
}

export function filterNavForUser(items: NavItem[], user: Pick<CurrentUser, "roles"> | null | undefined): NavItem[] {
  return items.filter((item) => hasAnyRole(user, item.roles));
}
