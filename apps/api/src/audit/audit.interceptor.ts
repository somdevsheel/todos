import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { AUDIT_METADATA_KEY, type AuditMetadata } from "../common/decorators/audit.decorator";
import type { AuthenticatedRequest } from "../common/types/authenticated-request";
import { firstValue } from "../common/utils/http.util";
import { AuditService } from "./audit.service";

/**
 * Reads @Audit() metadata off the route handler and writes an AuditLog row
 * after the handler succeeds — controllers/services stay free of manual
 * audit bookkeeping. No-ops for routes without @Audit() metadata.
 *
 * Registered as the innermost global interceptor (see app.module.ts) so it
 * observes the RAW handler return value, before TransformInterceptor wraps
 * it in the `{success,data}` envelope.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditMetadata | undefined>(AUDIT_METADATA_KEY, context.getHandler());
    if (!metadata) return next.handle();

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((data) => {
        const entityId = this.resolveEntityId(metadata, request, data);
        void this.auditService.log({
          organizationId: request.user?.organizationId,
          actorUserId: request.user?.sub,
          action: metadata.action,
          entityType: metadata.entityType,
          entityId,
          ipAddress: request.ip,
          userAgent: firstValue(request.headers["user-agent"]),
        });
      }),
    );
  }

  private resolveEntityId(metadata: AuditMetadata, request: AuthenticatedRequest, data: unknown): string | undefined {
    if (metadata.entityIdParam) {
      const fromParam = firstValue(request.params?.[metadata.entityIdParam]);
      if (fromParam) return fromParam;
    }
    if (data && typeof data === "object") {
      const record = data as Record<string, unknown>;
      if (typeof record.id === "string") return record.id;
      if (record.user && typeof record.user === "object") {
        const userId = (record.user as Record<string, unknown>).id;
        if (typeof userId === "string") return userId;
      }
    }
    return undefined;
  }
}
