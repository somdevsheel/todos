/**
 * Seeded system roles (see apps/api/prisma/seed.ts). These are the four
 * roles the spec mandates for Phase 1. The Role table in the database is
 * NOT a hardcoded enum — additional roles can be created later — but the
 * app ships knowing about these four by name so guards/nav/UI can branch
 * on them without a round trip.
 */
export const SYSTEM_ROLES = ["SUPER_ADMIN", "ADMIN", "MANAGER", "EMPLOYEE"] as const;

export type RoleName = (typeof SYSTEM_ROLES)[number];

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
};

/** Roles that see organization-wide dashboard/nav affordances rather than just their own work. */
export const ORG_LEVEL_ROLES: RoleName[] = ["SUPER_ADMIN", "ADMIN", "MANAGER"];

export interface PermissionSummary {
  id: string;
  key: string;
  description?: string | null;
}

/**
 * A Role plus the ids of the Permissions currently attached to it (Phase
 * 7's `PATCH /roles/:id/permissions` editing UI). Note this data is real
 * and persisted correctly but doesn't gate anything yet — every guard in
 * this app checks role *names* (`@Roles('ADMIN')`), never permission keys.
 * See ARCHITECTURE.md's Phase 7 entry.
 */
export interface RoleWithPermissions {
  id: string;
  name: RoleName;
  description?: string | null;
  isSystem: boolean;
  permissionIds: string[];
}
