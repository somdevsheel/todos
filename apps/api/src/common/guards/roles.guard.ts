import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { RoleName } from "@arutech/shared-types";
import { ROLES_KEY } from "../decorators/roles.decorator";
import type { AuthenticatedRequest } from "../types/authenticated-request";

/**
 * Second guard in the global chain. Passes through when a route has no
 * @Roles() metadata (any authenticated user may proceed). Otherwise
 * requires the caller's JWT-embedded role list to intersect the required set.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userRoles = request.user?.roles ?? [];
    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
