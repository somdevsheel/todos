import type { RoleName } from "@arutech/shared-types";

/**
 * Roles that can edit/cancel any event (not just ones they created) and
 * attach a team calendar without being a member of that team. Deliberately
 * NOT required to *create* an event or invite colleagues — see the
 * "Event visibility/permissions" note in ARCHITECTURE.md: inviting someone
 * to a meeting isn't a privileged action the way assigning them work is.
 */
const PRIVILEGED_EVENT_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export function isPrivilegedForEvents(roles: string[]): boolean {
  return roles.some((role) => (PRIVILEGED_EVENT_ROLES as string[]).includes(role));
}
