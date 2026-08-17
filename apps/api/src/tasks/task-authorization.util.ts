import type { RoleName } from "@arutech/shared-types";

/** Roles that can assign *other* people to a task, edit any field of a task they didn't create, and manage team tasks broadly. */
const PRIVILEGED_TASK_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export function isPrivilegedForTasks(roles: string[]): boolean {
  return roles.some((role) => (PRIVILEGED_TASK_ROLES as string[]).includes(role));
}
