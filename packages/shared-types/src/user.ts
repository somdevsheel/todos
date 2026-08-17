import type { RoleName } from "./role";

export const USER_STATUSES = ["PENDING_INVITE", "ACTIVE", "SUSPENDED", "DEACTIVATED"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserSummary {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  status: UserStatus;
  departmentId?: string | null;
  roles: RoleName[];
}

/** Shape returned by GET /users/me — what the frontend hydrates the session from. */
export interface CurrentUser extends UserSummary {
  lastLoginAt?: string | null;
}
