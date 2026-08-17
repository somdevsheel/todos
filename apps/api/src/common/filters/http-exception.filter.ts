import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { API_ERROR_CODES, type ApiErrorCode, type ApiErrorShape } from "@arutech/shared-types";
import { AppException } from "../exceptions/app.exception";

const STATUS_TO_CODE: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: API_ERROR_CODES.VALIDATION_ERROR,
  [HttpStatus.UNAUTHORIZED]: API_ERROR_CODES.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: API_ERROR_CODES.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: API_ERROR_CODES.NOT_FOUND,
  [HttpStatus.CONFLICT]: API_ERROR_CODES.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: API_ERROR_CODES.RATE_LIMITED,
};

/**
 * Every error response leaving the API goes through this filter and comes
 * out as `{success:false,error:{code,message,details?}}`. Unknown/unexpected
 * errors are logged in full server-side (with stack trace) but the client
 * only ever receives a generic message — raw stack traces never cross the
 * wire, in any environment.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const { status, body } = this.buildResponse(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}: ${(exception as Error)?.message ?? "unknown error"}`,
        (exception as Error)?.stack,
      );
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${body.error.message}`);
    }

    response.status(status).json(body);
  }

  private buildResponse(exception: unknown): { status: number; body: ApiErrorShape } {
    if (exception instanceof AppException) {
      return {
        status: exception.getStatus(),
        body: {
          success: false,
          error: { code: exception.code, message: exception.message, details: exception.details },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message = this.extractMessage(payload, exception.message);
      const code = STATUS_TO_CODE[status] ?? API_ERROR_CODES.INTERNAL_ERROR;
      return { status, body: { success: false, error: { code, message } } };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: {
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: "Something went wrong on our end. Please try again.",
        },
      },
    };
  }

  /** class-validator's ValidationPipe throws BadRequestException with `{message: string[]}`. */
  private extractMessage(payload: unknown, fallback: string): string {
    if (payload && typeof payload === "object" && "message" in payload) {
      const message = (payload as { message: unknown }).message;
      if (Array.isArray(message)) return message.join(" ");
      if (typeof message === "string") return message;
    }
    return fallback;
  }
}
