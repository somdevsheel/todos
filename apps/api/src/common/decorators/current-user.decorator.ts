import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { AuthenticatedRequest, AuthenticatedUser } from "../types/authenticated-request";

/** Injects the authenticated user (from the verified JWT) into a controller handler. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
  return request.user;
});
