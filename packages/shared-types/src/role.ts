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
