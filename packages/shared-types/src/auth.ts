import type { RoleName } from "./role";

export interface InviteUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: RoleName;
  departmentId?: string;
  teamId?: string;
}

export interface InvitationPreview {
  email: string;
  organizationName: string;
  role: RoleName;
  invitedByName: string;
  expiresAt: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

/** Token pair returned by the API in the JSON body (never as a browser-facing cookie —
 *  the Next.js BFF route handlers turn this into httpOnly cookies; a future mobile
 *  client instead stores these in secure device storage). See AUTHENTICATION.md. */
export interface AuthTokenPair {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSession extends AuthTokenPair {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    roles: RoleName[];
    organizationId: string;
  };
}
