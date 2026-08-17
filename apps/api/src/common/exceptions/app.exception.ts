import { HttpException, HttpStatus } from "@nestjs/common";
import { API_ERROR_CODES, type ApiErrorCode } from "@arutech/shared-types";

/**
 * Base for every domain-specific exception thrown by services. Carries a
 * stable machine-readable `code` (from the shared ApiErrorCode contract)
 * alongside the HTTP status, so HttpExceptionFilter can build the standard
 * `{success:false,error:{code,message}}` envelope without guessing.
 */
export class AppException extends HttpException {
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(code: ApiErrorCode, message: string, status: HttpStatus, details?: unknown) {
    super(message, status);
    this.code = code;
    this.details = details;
  }
}

export class DomainNotAllowedException extends AppException {
  constructor(email: string) {
    super(
      API_ERROR_CODES.DOMAIN_NOT_ALLOWED,
      "This email is not authorized for Arutech Workspace.",
      HttpStatus.BAD_REQUEST,
      { email },
    );
  }
}

export class InvalidCredentialsException extends AppException {
  constructor() {
    // Deliberately generic — never reveals whether the account exists.
    super(API_ERROR_CODES.INVALID_CREDENTIALS, "Invalid email or password.", HttpStatus.UNAUTHORIZED);
  }
}

export class AccountNotActiveException extends AppException {
  constructor() {
    super(
      API_ERROR_CODES.ACCOUNT_NOT_ACTIVE,
      "Your account is not active. Contact your workspace admin.",
      HttpStatus.FORBIDDEN,
    );
  }
}

export class InvitationInvalidException extends AppException {
  constructor() {
    super(API_ERROR_CODES.INVITATION_INVALID, "This invitation link is invalid.", HttpStatus.BAD_REQUEST);
  }
}

export class InvitationExpiredException extends AppException {
  constructor() {
    super(
      API_ERROR_CODES.INVITATION_EXPIRED,
      "This invitation has expired. Ask an admin to resend it.",
      HttpStatus.BAD_REQUEST,
    );
  }
}

export class TokenInvalidException extends AppException {
  constructor(message = "This link is invalid or has expired.") {
    super(API_ERROR_CODES.TOKEN_INVALID, message, HttpStatus.BAD_REQUEST);
  }
}
