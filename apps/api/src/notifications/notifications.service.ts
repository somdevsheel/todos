import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  AUDIT_ACTIONS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_TYPE_CATEGORY,
  type NotificationCategory,
  type NotificationChannel,
  type NotificationPreferenceItem,
  type NotificationType,
  type PaginatedResult,
} from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { FcmService } from "../fcm/fcm.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
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
 * pipeline). Since Phase 4, the same two methods also fan out to
 * FcmService — every current and future producer gets push for free
 * without touching tasks/events/reminders services individually.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcmService: FcmService,
    private readonly auditService: AuditService,
  ) {}

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
      return; // don't push a notification that was never actually persisted
    }

    const pushEnabled = await this.isPushEnabled(params.userId, params.type);
    await this.fcmService.sendToUser(params.userId, { type: params.type, title: params.title, body: params.body, data: params.data }, pushEnabled);
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
      return;
    }

    await Promise.all(
      paramsList.map(async (params) => {
        const pushEnabled = await this.isPushEnabled(params.userId, params.type);
        await this.fcmService.sendToUser(params.userId, { type: params.type, title: params.title, body: params.body, data: params.data }, pushEnabled);
      }),
    );
  }

  /** Every category defaulted to enabled unless an explicit PUSH-channel row says otherwise — see NOTIFICATION_CATEGORIES. */
  async getPreferences(userId: string): Promise<NotificationPreferenceItem[]> {
    const rows = await this.prisma.notificationPreference.findMany({ where: { userId, channel: "PUSH" } });
    const byCategory = new Map(rows.map((row) => [row.category, row.enabled]));
    return NOTIFICATION_CATEGORIES.map((category) => ({ channel: "PUSH" as const, category, enabled: byCategory.get(category) ?? true }));
  }

  async updatePreferences(actor: AuthenticatedUser, items: NotificationPreferenceItem[]): Promise<NotificationPreferenceItem[]> {
    const userId = actor.sub;
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.notificationPreference.upsert({
          where: { userId_channel_category: { userId, channel: item.channel, category: item.category } },
          create: { userId, channel: item.channel, category: item.category, enabled: item.enabled },
          update: { enabled: item.enabled },
        }),
      ),
    );

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: userId,
      action: AUDIT_ACTIONS.NOTIFICATION_PREFERENCE_UPDATED,
      entityType: "NotificationPreference",
      entityId: userId,
      metadata: { items: items as unknown as Record<string, unknown> },
    });

    return this.getPreferences(userId);
  }

  /**
   * Only PUSH is actually gated by preference today — IN_APP always writes
   * (the notification center losing your own history silently would be
   * worse than a stray toggle doing nothing) and EMAIL has no business-event
   * producer at all yet. See the "Preference enforcement scope" note in
   * NOTIFICATIONS.md.
   */
  private async isPushEnabled(userId: string, type: string): Promise<boolean> {
    const category = NOTIFICATION_TYPE_CATEGORY[type as NotificationType] as NotificationCategory | undefined;
    if (!category) return true; // a type outside the known map (future/ad-hoc) has no preference concept to gate on

    const preference = await this.prisma.notificationPreference.findUnique({
      where: { userId_channel_category: { userId, channel: "PUSH" satisfies NotificationChannel, category } },
    });
    return preference?.enabled ?? true;
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
