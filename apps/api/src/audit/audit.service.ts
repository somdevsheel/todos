import { Injectable, Logger } from "@nestjs/common";
import type { AuditActionName } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";

export interface WriteAuditLogParams {
  organizationId?: string;
  actorUserId?: string;
  action: AuditActionName | string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface ListAuditLogsParams {
  organizationId: string;
  action?: string;
  entityType?: string;
  page: number;
  pageSize: number;
}

/**
 * Audit logs are immutable and must never be lost — `log()` is written to
 * swallow its own errors (logged, not thrown) so a broken audit write can
 * never fail the business operation it's describing.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: WriteAuditLogParams): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          organizationId: params.organizationId,
          actorUserId: params.actorUserId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          metadata: params.metadata as never,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log for action "${params.action}"`, (error as Error).stack);
    }
  }

  async findAll(params: ListAuditLogsParams) {
    const where = {
      organizationId: params.organizationId,
      ...(params.action ? { action: params.action } : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
    };

    const [items, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      meta: {
        page: params.page,
        pageSize: params.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / params.pageSize)),
      },
    };
  }
}
