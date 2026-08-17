/**
 * Consistent API envelope used by every apps/api endpoint (see
 * apps/api/src/common/interceptors/transform.interceptor.ts and
 * apps/api/src/common/filters/http-exception.filter.ts). The frontend's
 * lib/api-client.ts narrows on `success` to get a typed result.
 */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiErrorShape {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResult<T> = ApiSuccess<T> | ApiErrorShape;

export interface PaginationMeta {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

/** Standard machine-readable error codes used across the API. Extend, never repurpose. */
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  DOMAIN_NOT_ALLOWED: "DOMAIN_NOT_ALLOWED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_NOT_ACTIVE: "ACCOUNT_NOT_ACTIVE",
  INVITATION_INVALID: "INVITATION_INVALID",
  INVITATION_EXPIRED: "INVITATION_EXPIRED",
  TOKEN_INVALID: "TOKEN_INVALID",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
