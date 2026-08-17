import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AUDIT_ACTIONS, NOTIFICATION_TYPES, type PaginatedResult, type TaskCommentSummary } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { TasksService } from "../tasks/tasks.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import type { CreateTaskCommentDto } from "./dto/create-task-comment.dto";

interface CommentRow {
  id: string;
  taskId: string;
  body: string;
  mentionedUserIds: string[];
  createdAt: Date;
  updatedAt: Date;
  authorUser: { id: string; firstName: string; lastName: string; avatarUrl: string | null };
}

@Injectable()
export class TaskCommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasksService: TasksService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(organizationId: string, taskId: string, query: PaginationQueryDto): Promise<PaginatedResult<TaskCommentSummary>> {
    await this.tasksService.getTaskOrThrow(organizationId, taskId);

    const where = { taskId, deletedAt: null };
    const [comments, totalItems] = await Promise.all([
      this.prisma.taskComment.findMany({
        where,
        include: { authorUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
        orderBy: { createdAt: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.taskComment.count({ where }),
    ]);

    return {
      items: comments.map((c) => this.toSummary(c)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async create(organizationId: string, taskId: string, actor: AuthenticatedUser, dto: CreateTaskCommentDto): Promise<TaskCommentSummary> {
    const task = await this.tasksService.getTaskOrThrow(organizationId, taskId);
    const mentionedUserIds = [...new Set(dto.mentionedUserIds ?? [])].filter((id) => id !== actor.sub);
    if (mentionedUserIds.length) await this.assertUsersInOrg(organizationId, mentionedUserIds);

    const comment = await this.prisma.taskComment.create({
      data: { taskId, authorUserId: actor.sub, body: dto.body, mentionedUserIds },
      include: { authorUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_COMMENT_CREATED,
      entityType: "Task",
      entityId: taskId,
      metadata: { commentId: comment.id },
    });

    await this.notifyComment(organizationId, task.title, taskId, actor, mentionedUserIds);

    return this.toSummary(comment);
  }

  async update(organizationId: string, taskId: string, commentId: string, actor: AuthenticatedUser, body: string): Promise<TaskCommentSummary> {
    const comment = await this.getOwnCommentOrThrow(organizationId, taskId, commentId, actor.sub);
    const updated = await this.prisma.taskComment.update({
      where: { id: comment.id },
      data: { body },
      include: { authorUser: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    return this.toSummary(updated);
  }

  async remove(organizationId: string, taskId: string, commentId: string, actor: AuthenticatedUser): Promise<void> {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, taskId, deletedAt: null, task: { organizationId } },
    });
    if (!comment) throw new NotFoundException("Comment not found");

    const isPrivileged = actor.roles.includes("SUPER_ADMIN") || actor.roles.includes("ADMIN");
    if (comment.authorUserId !== actor.sub && !isPrivileged) {
      throw new ForbiddenException("You can only delete your own comments.");
    }

    await this.prisma.taskComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_COMMENT_DELETED,
      entityType: "Task",
      entityId: taskId,
      metadata: { commentId },
    });
  }

  private async getOwnCommentOrThrow(organizationId: string, taskId: string, commentId: string, authorUserId: string) {
    const comment = await this.prisma.taskComment.findFirst({
      where: { id: commentId, taskId, deletedAt: null, task: { organizationId } },
    });
    if (!comment) throw new NotFoundException("Comment not found");
    if (comment.authorUserId !== authorUserId) throw new ForbiddenException("You can only edit your own comments.");
    return comment;
  }

  private async notifyComment(
    organizationId: string,
    taskTitle: string,
    taskId: string,
    actor: AuthenticatedUser,
    mentionedUserIds: string[],
  ): Promise<void> {
    const { createdByUserId, assigneeUserIds } = await this.tasksService.getTaskParticipantUserIds(taskId);
    const authorName = `${actor.email}`; // firstName/lastName aren't on the JWT; fine for a notification body

    const participantIds = new Set([createdByUserId, ...assigneeUserIds]);
    participantIds.delete(actor.sub);
    for (const id of mentionedUserIds) participantIds.delete(id); // mentioned users get the more specific notification below, not both

    await this.notificationsService.createMany(
      [...participantIds].map((userId) => ({
        organizationId,
        userId,
        type: NOTIFICATION_TYPES.TASK_COMMENTED,
        title: "New comment",
        body: `${authorName} commented on "${taskTitle}"`,
        data: { taskId },
      })),
    );

    await this.notificationsService.createMany(
      mentionedUserIds.map((userId) => ({
        organizationId,
        userId,
        type: NOTIFICATION_TYPES.TASK_MENTIONED,
        title: "You were mentioned",
        body: `${authorName} mentioned you on "${taskTitle}"`,
        data: { taskId },
      })),
    );
  }

  private async assertUsersInOrg(organizationId: string, userIds: string[]): Promise<void> {
    const count = await this.prisma.user.count({ where: { id: { in: userIds }, organizationId, deletedAt: null } });
    if (count !== userIds.length) throw new NotFoundException("One or more mentioned users were not found.");
  }

  private toSummary(comment: CommentRow): TaskCommentSummary {
    return {
      id: comment.id,
      taskId: comment.taskId,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      author: comment.authorUser,
      mentionedUserIds: comment.mentionedUserIds,
    };
  }
}
