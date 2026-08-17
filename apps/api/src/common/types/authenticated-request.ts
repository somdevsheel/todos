import type { Request } from "express";

/** Decoded JWT access-token payload, attached to `request.user` by JwtAuthGuard. */
export interface AuthenticatedUser {
  sub: string; // userId
  email: string;
  organizationId: string;
  roles: string[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
