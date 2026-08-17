import { SetMetadata } from "@nestjs/common";
import type { RoleName } from "@arutech/shared-types";

export const ROLES_KEY = "roles";

/** Restricts a route to the given role set. Read by RolesGuard. Omit for "any authenticated user". */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
