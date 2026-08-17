import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import type { NotificationType, PaginatedResult } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import type { PaginationQueryDto } from "../common/dto/pagination-query.dto";

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

export interface CreateNotificationParams {
  organizationId: string;
  userId: string;
  type: NotificationType | string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Read/mark-read side has been real since Phase 1; `create()`/`createMany()`
 * are the first real producers (Phase 2's tasks module calls them on
 * assignment and @mention — see NOTIFICATIONS.md's "Business Event ->
 * NotificationsService.create() -> DB row -> notification center"
 * pipeline). FCM push is a separate, later concern (Phase 4) — these
 * methods only ever write to Postgres.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Never throws — a failed notification write must not roll back or fail
   * the business operation that triggered it (same philosophy as
   * AuditService.log(); see its docstring). Errors are logged, not thrown.
   */
  async create(params: CreateNotificationParams): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          data: params.data as never,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create notification "${params.type}" for user ${params.userId}`, (error as Error).stack);
    }
  }

  async createMany(paramsList: CreateNotificationParams[]): Promise<void> {
    if (paramsList.length === 0) return;
    try {
      await this.prisma.notification.createMany({
        data: paramsList.map((params) => ({
          organizationId: params.organizationId,
          userId: params.userId,
          type: params.type,
          title: params.title,
          body: params.body,
          data: params.data as never,
        })),
      });
    } catch (error) {
      this.logger.error(`Failed to create ${paramsList.length} notifications`, (error as Error).stack);
    }
  }

  async findAll(organizationId: string, userId: string, query: PaginationQueryDto): Promise<PaginatedResult<NotificationDto>> {
    const where = { organizationId, userId };
    const [items, totalItems] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        data: n.data,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
      })),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async unreadCount(organizationId: string, userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({ where: { organizationId, userId, isRead: false } });
    return { count };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException("Notification not found");
    await this.prisma.notification.update({ where: { id }, data: { isRead: true, readAt: new Date() } });
  }

  async markAllRead(organizationId: string, userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { organizationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
