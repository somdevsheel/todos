import { ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * First guard in the global chain (see app.module.ts). Verifies the access
 * token via the "jwt-access" passport strategy and attaches `request.user`.
 * Routes annotated with @Public() (login, refresh, accept-invitation,
 * forgot/reset-password, health) skip verification entirely.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt-access") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
