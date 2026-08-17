import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Announcement } from "@prisma/client";
import { AUDIT_ACTIONS, NOTIFICATION_TYPES, type AnnouncementSummary, type PaginatedResult } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import type { CreateAnnouncementDto } from "./dto/create-announcement.dto";

const AUTHOR_SELECT = { id: true, firstName: true, lastName: true } as const;

type AnnouncementWithAuthor = Announcement & { createdByUser: { id: string; firstName: string; lastName: string } };

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateAnnouncementDto): Promise<AnnouncementSummary> {
    const announcement = await this.prisma.announcement.create({
      data: { organizationId: actor.organizationId, createdByUserId: actor.sub, title: dto.title, body: dto.body },
      include: { createdByUser: { select: AUTHOR_SELECT } },
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_CREATED,
      entityType: "Announcement",
      entityId: announcement.id,
      metadata: { title: dto.title },
    });

    await this.notifyOrg(actor, announcement);

    return this.toSummary(announcement);
  }

  async findAll(organizationId: string, query: PaginationQueryDto): Promise<PaginatedResult<AnnouncementSummary>> {
    const where = { organizationId, deletedAt: null };
    const [items, totalItems] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        include: { createdByUser: { select: AUTHOR_SELECT } },
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.announcement.count({ where }),
    ]);

    return {
      items: items.map((a) => this.toSummary(a)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async remove(organizationId: string, id: string, actor: AuthenticatedUser): Promise<void> {
    const announcement = await this.prisma.announcement.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!announcement) throw new NotFoundException("Announcement not found");

    // Same creator-or-{ADMIN,SUPER_ADMIN} gate as TasksService.remove — not
    // MANAGER, deleting an org-wide broadcast is more consequential than
    // editing a task.
    const privileged = announcement.createdByUserId === actor.sub || actor.roles.includes("ADMIN") || actor.roles.includes("SUPER_ADMIN");
    if (!privileged) throw new ForbiddenException("Only the author or an admin can delete this announcement.");

    await this.prisma.announcement.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.ANNOUNCEMENT_DELETED,
      entityType: "Announcement",
      entityId: id,
    });
  }

  private async notifyOrg(actor: AuthenticatedUser, announcement: Announcement): Promise<void> {
    const members = await this.prisma.user.findMany({
      where: { organizationId: actor.organizationId, deletedAt: null, status: "ACTIVE", id: { not: actor.sub } },
      select: { id: true },
    });
    if (members.length === 0) return;

    await this.notificationsService.createMany(
      members.map((member) => ({
        organizationId: actor.organizationId,
        userId: member.id,
        type: NOTIFICATION_TYPES.SYSTEM_NOTIFICATION,
        title: "New announcement",
        body: announcement.title,
        data: { announcementId: announcement.id },
      })),
    );
  }

  private toSummary(announcement: AnnouncementWithAuthor): AnnouncementSummary {
    return {
      id: announcement.id,
      organizationId: announcement.organizationId,
      title: announcement.title,
      body: announcement.body,
      createdByUser: {
        id: announcement.createdByUser.id,
        firstName: announcement.createdByUser.firstName,
        lastName: announcement.createdByUser.lastName,
      },
      createdAt: announcement.createdAt.toISOString(),
    };
  }
}
