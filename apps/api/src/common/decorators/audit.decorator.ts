import { SetMetadata } from "@nestjs/common";
import type { AuditActionName } from "@arutech/shared-types";

export const AUDIT_METADATA_KEY = "auditMetadata";

export interface AuditMetadata {
  action: AuditActionName;
  entityType: string;
  /**
   * Name of the route param holding the entity id (e.g. "id" for
   * PATCH /users/:id). If omitted, AuditInterceptor falls back to
   * `response.id` when the handler's return value has one.
   */
  entityIdParam?: string;
}

/**
 * Declarative audit logging: annotate a controller method and
 * AuditInterceptor writes an AuditLog row after the handler succeeds,
 * with no manual AuditService calls scattered through business logic.
 */
export const Audit = (metadata: AuditMetadata) => SetMetadata(AUDIT_METADATA_KEY, metadata);
