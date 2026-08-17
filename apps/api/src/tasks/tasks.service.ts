import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma, Task } from "@prisma/client";
import {
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
  type PaginatedResult,
  type TaskDetail,
  type TaskStats,
  type TaskStatus,
  type TaskSummary,
  type TaskView,
} from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { CreateTaskDto } from "./dto/create-task.dto";
import type { UpdateTaskDto } from "./dto/update-task.dto";
import type { ListTasksQueryDto } from "./dto/list-tasks-query.dto";
import { isPrivilegedForTasks } from "./task-authorization.util";
import { formatDueDate } from "./format-due-date.util";

const OPEN_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "IN_REVIEW"];

type TaskWithAssigneesAndCounts = Task & {
  assignees: Array<{ user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }>;
  _count: { comments: number; attachments: number; subtasks: number };
};

type TaskWithDetail = Task & {
  assignees: Array<{ user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }>;
  subtasks: Array<{ id: string; title: string; status: TaskStatus }>;
  attachments: Array<{ id: string; file: { id: string; filename: string; mimeType: string; sizeBytes: number } }>;
  _count: { comments: number };
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateTaskDto): Promise<TaskDetail> {
    const assigneeIds = new Set(dto.assigneeUserIds ?? []);
    const assigningOthers = [...assigneeIds].some((id) => id !== actor.sub);
    if (assigningOthers && !isPrivilegedForTasks(actor.roles)) {
      throw new ForbiddenException("Only managers and admins can assign a task to someone else.");
    }

    if (dto.teamId) await this.assertTeamInOrg(actor.organizationId, dto.teamId);
    if (dto.departmentId) await this.assertDepartmentInOrg(actor.organizationId, dto.departmentId);
    if (dto.parentTaskId) await this.assertTaskInOrg(actor.organizationId, dto.parentTaskId);
    if (assigneeIds.size) await this.assertUsersInOrg(actor.organizationId, [...assigneeIds]);

    // A task always has at least one owner — defaulting to the creator
    // when no assignees are given matches the "personal task" case (an
    // employee creating a task for themselves) without a special code path.
    if (assigneeIds.size === 0) assigneeIds.add(actor.sub);

    const task = await this.prisma.$transaction(async (tx) => {
      const created = await tx.task.create({
        data: {
          organizationId: actor.organizationId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority ?? "MEDIUM",
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          teamId: dto.teamId,
          departmentId: dto.departmentId,
          parentTaskId: dto.parentTaskId,
          createdByUserId: actor.sub,
        },
      });
      await tx.taskAssignee.createMany({
        data: [...assigneeIds].map((userId) => ({ taskId: created.id, userId })),
      });
      return created;
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_CREATED,
      entityType: "Task",
      entityId: task.id,
      // Initial assignment happens atomically with creation — one audit
      // event for one business action, rather than a second TASK_ASSIGNED
      // entry that would imply assignment happened as a separate step.
      metadata: { title: dto.title, assigneeUserIds: [...assigneeIds] },
    });

    await this.notifyAssignment(actor, task, [...assigneeIds]);

    return this.findOne(actor.organizationId, task.id);
  }

  async findAll(organizationId: string, actor: AuthenticatedUser, query: ListTasksQueryDto): Promise<PaginatedResult<TaskSummary>> {
    const andConditions: Prisma.TaskWhereInput[] = [];

    if (query.status) andConditions.push({ status: query.status });
    if (query.priority) andConditions.push({ priority: query.priority });
    if (query.teamId) andConditions.push({ teamId: query.teamId });
    if (query.departmentId) andConditions.push({ departmentId: query.departmentId });
    if (query.assigneeUserId) andConditions.push({ assignees: { some: { userId: query.assigneeUserId } } });
    if (query.createdByUserId) andConditions.push({ createdByUserId: query.createdByUserId });
    if (query.search) {
      andConditions.push({
        OR: [
          { title: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      });
    }

    // Employees default to their own tasks when no view/filter narrows the
    // list; managers/admins see the whole organization unless they ask for
    // a specific view — matches the spec's "Employees view assigned tasks /
    // managers view team progress" split without a separate endpoint.
    const effectiveView: TaskView | undefined = query.view ?? (isPrivilegedForTasks(actor.roles) ? undefined : "mine");
    if (effectiveView) {
      andConditions.push(...(await this.buildViewConditions(effectiveView, organizationId, actor.sub)));
    }

    const where: Prisma.TaskWhereInput = { organizationId, deletedAt: null, AND: andConditions };

    const [tasks, totalItems] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
          _count: { select: { comments: true, attachments: true, subtasks: true } },
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items: tasks.map((task) => this.toSummary(task)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async stats(organizationId: string, userId: string): Promise<TaskStats> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    const mineOpen: Prisma.TaskWhereInput = {
      organizationId,
      deletedAt: null,
      status: { in: OPEN_STATUSES },
      assignees: { some: { userId } },
    };

    const [myTasks, dueToday, overdue] = await Promise.all([
      this.prisma.task.count({ where: mineOpen }),
      this.prisma.task.count({ where: { ...mineOpen, dueDate: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.task.count({ where: { ...mineOpen, dueDate: { lt: todayStart } } }),
    ]);

    return { myTasks, dueToday, overdue };
  }

  async findOne(organizationId: string, id: string): Promise<TaskDetail> {
    const task = await this.prisma.task.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: {
        assignees: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        subtasks: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true },
          orderBy: { createdAt: "asc" },
        },
        attachments: {
          include: { file: { select: { id: true, filename: true, mimeType: true, sizeBytes: true } } },
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { comments: true } },
      },
    });
    if (!task) throw new NotFoundException("Task not found");
    return this.toDetail(task);
  }

  async update(organizationId: string, id: string, actor: AuthenticatedUser, dto: UpdateTaskDto): Promise<TaskDetail> {
    const task = await this.getTaskOrThrow(organizationId, id);
    this.assertIsCreatorOrPrivileged(task, actor);

    if (dto.teamId) await this.assertTeamInOrg(organizationId, dto.teamId);
    if (dto.departmentId) await this.assertDepartmentInOrg(organizationId, dto.departmentId);

    await this.prisma.task.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        teamId: dto.teamId,
        departmentId: dto.departmentId,
      },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_UPDATED,
      entityType: "Task",
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return this.findOne(organizationId, id);
  }

  async updateStatus(organizationId: string, id: string, actor: AuthenticatedUser, status: TaskStatus): Promise<TaskDetail> {
    const task = await this.getTaskOrThrow(organizationId, id);

    const isAssignee = await this.prisma.taskAssignee.findUnique({
      where: { taskId_userId: { taskId: id, userId: actor.sub } },
    });
    const canManage = task.createdByUserId === actor.sub || isPrivilegedForTasks(actor.roles);
    if (!isAssignee && !canManage) {
      throw new ForbiddenException("You can only update the status of tasks assigned to you.");
    }

    const becomingCompleted = status === "COMPLETED" && task.status !== "COMPLETED";

    await this.prisma.task.update({
      where: { id },
      data: { status, completedAt: status === "COMPLETED" ? new Date() : null },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: becomingCompleted ? AUDIT_ACTIONS.TASK_COMPLETED : AUDIT_ACTIONS.TASK_UPDATED,
      entityType: "Task",
      entityId: id,
      metadata: { status },
    });

    if (becomingCompleted && task.createdByUserId !== actor.sub) {
      await this.notificationsService.create({
        organizationId,
        userId: task.createdByUserId,
        type: NOTIFICATION_TYPES.TASK_COMPLETED,
        title: "Task completed",
        body: `"${task.title}" was marked complete.`,
        data: { taskId: id },
      });
    }

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string, actor: AuthenticatedUser): Promise<void> {
    const task = await this.getTaskOrThrow(organizationId, id);
    const privileged = task.createdByUserId === actor.sub || actor.roles.includes("ADMIN") || actor.roles.includes("SUPER_ADMIN");
    if (!privileged) throw new ForbiddenException("Only the task creator or an admin can delete this task.");

    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_DELETED,
      entityType: "Task",
      entityId: id,
    });
  }

  async addAssignee(organizationId: string, id: string, actor: AuthenticatedUser, userId: string): Promise<void> {
    const task = await this.getTaskOrThrow(organizationId, id);
    if (userId !== actor.sub) this.assertIsCreatorOrPrivileged(task, actor);
    await this.assertUsersInOrg(organizationId, [userId]);

    const existing = await this.prisma.taskAssignee.findUnique({ where: { taskId_userId: { taskId: id, userId } } });
    if (existing) return; // idempotent — no duplicate audit/notification noise

    await this.prisma.taskAssignee.create({ data: { taskId: id, userId } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_ASSIGNED,
      entityType: "Task",
      entityId: id,
      metadata: { userId },
    });

    await this.notifyAssignment(actor, task, [userId]);
  }

  async removeAssignee(organizationId: string, id: string, actor: AuthenticatedUser, userId: string): Promise<void> {
    const task = await this.getTaskOrThrow(organizationId, id);
    if (userId !== actor.sub) this.assertIsCreatorOrPrivileged(task, actor);

    const existing = await this.prisma.taskAssignee.findUnique({ where: { taskId_userId: { taskId: id, userId } } });
    if (!existing) throw new NotFoundException("This person is not assigned to this task.");

    await this.prisma.taskAssignee.delete({ where: { taskId_userId: { taskId: id, userId } } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_UNASSIGNED,
      entityType: "Task",
      entityId: id,
      metadata: { userId },
    });
  }

  async addAttachment(organizationId: string, id: string, actor: AuthenticatedUser, fileId: string): Promise<void> {
    await this.getTaskOrThrow(organizationId, id);
    const file = await this.prisma.file.findFirst({ where: { id: fileId, organizationId, deletedAt: null } });
    if (!file) throw new NotFoundException("File not found");

    await this.prisma.taskAttachment.upsert({
      where: { taskId_fileId: { taskId: id, fileId } },
      create: { taskId: id, fileId },
      update: {},
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_ATTACHMENT_ADDED,
      entityType: "Task",
      entityId: id,
      metadata: { fileId },
    });
  }

  async removeAttachment(organizationId: string, id: string, attachmentId: string, actor: AuthenticatedUser): Promise<void> {
    const attachment = await this.prisma.taskAttachment.findFirst({
      where: { id: attachmentId, taskId: id, task: { organizationId } },
    });
    if (!attachment) throw new NotFoundException("Attachment not found");

    await this.prisma.taskAttachment.delete({ where: { id: attachmentId } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.TASK_ATTACHMENT_REMOVED,
      entityType: "Task",
      entityId: id,
      metadata: { fileId: attachment.fileId },
    });
  }

  // ---------------------------------------------------------------------
  // Shared helpers (also used by TaskCommentsService — see its constructor)
  // ---------------------------------------------------------------------

  async getTaskOrThrow(organizationId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!task) throw new NotFoundException("Task not found");
    return task;
  }

  assertIsCreatorOrPrivileged(task: Task, actor: AuthenticatedUser): void {
    if (task.createdByUserId === actor.sub || isPrivilegedForTasks(actor.roles)) return;
    throw new ForbiddenException("You don't have permission to modify this task.");
  }

  /** Everyone with visibility on a task (creator, assignees, privileged roles) may comment / be @mentioned targets — used by TaskCommentsService. */
  async getTaskParticipantUserIds(taskId: string): Promise<{ createdByUserId: string; assigneeUserIds: string[] }> {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
      include: { assignees: { select: { userId: true } } },
    });
    return { createdByUserId: task.createdByUserId, assigneeUserIds: task.assignees.map((a) => a.userId) };
  }

  private async notifyAssignment(actor: AuthenticatedUser, task: Task, assigneeUserIds: string[]): Promise<void> {
    const notifyIds = assigneeUserIds.filter((id) => id !== actor.sub);
    if (notifyIds.length === 0) return;

    await this.notificationsService.createMany(
      notifyIds.map((userId) => ({
        organizationId: actor.organizationId,
        userId,
        type: NOTIFICATION_TYPES.TASK_ASSIGNED,
        title: "New task assigned",
        body: `You have been assigned: "${task.title}"${task.dueDate ? ` — due ${formatDueDate(task.dueDate)}` : ""}`,
        data: { taskId: task.id },
      })),
    );
  }

  private async assertUsersInOrg(organizationId: string, userIds: string[]): Promise<void> {
    const count = await this.prisma.user.count({ where: { id: { in: userIds }, organizationId, deletedAt: null } });
    if (count !== userIds.length) throw new BadRequestException("One or more assignees are not part of this organization.");
  }

  private async assertTeamInOrg(organizationId: string, teamId: string): Promise<void> {
    const team = await this.prisma.team.findFirst({ where: { id: teamId, organizationId, deletedAt: null } });
    if (!team) throw new NotFoundException("Team not found");
  }

  private async assertDepartmentInOrg(organizationId: string, departmentId: string): Promise<void> {
    const department = await this.prisma.department.findFirst({ where: { id: departmentId, organizationId, deletedAt: null } });
    if (!department) throw new NotFoundException("Department not found");
  }

  private async assertTaskInOrg(organizationId: string, taskId: string): Promise<void> {
    const task = await this.prisma.task.findFirst({ where: { id: taskId, organizationId, deletedAt: null } });
    if (!task) throw new NotFoundException("Parent task not found");
  }

  private async buildViewConditions(view: TaskView, organizationId: string, userId: string): Promise<Prisma.TaskWhereInput[]> {
    const ownedByOrAssignedToMe: Prisma.TaskWhereInput = {
      OR: [{ createdByUserId: userId }, { assignees: { some: { userId } } }],
    };

    switch (view) {
      case "mine":
        return [ownedByOrAssignedToMe];
      case "assigned":
        return [{ assignees: { some: { userId } } }];
      case "created":
        return [{ createdByUserId: userId }];
      case "completed":
        return [{ status: "COMPLETED" }, ownedByOrAssignedToMe];
      case "overdue":
        return [{ dueDate: { lt: new Date() } }, { status: { in: OPEN_STATUSES } }, ownedByOrAssignedToMe];
      case "team": {
        const memberships = await this.prisma.teamMember.findMany({ where: { userId }, select: { teamId: true } });
        return [{ teamId: { in: memberships.map((m) => m.teamId) } }];
      }
      default:
        return [];
    }
  }

  private toSummary(task: TaskWithAssigneesAndCounts): TaskSummary {
    return {
      id: task.id,
      organizationId: task.organizationId,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      startDate: task.startDate?.toISOString() ?? null,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdByUserId: task.createdByUserId,
      teamId: task.teamId,
      departmentId: task.departmentId,
      parentTaskId: task.parentTaskId,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      completedAt: task.completedAt?.toISOString() ?? null,
      assignees: task.assignees.map((a) => ({
        id: a.user.id,
        firstName: a.user.firstName,
        lastName: a.user.lastName,
        avatarUrl: a.user.avatarUrl,
      })),
      commentCount: task._count.comments,
      attachmentCount: task._count.attachments,
      subtaskCount: task._count.subtasks,
    };
  }

  private toDetail(task: TaskWithDetail): TaskDetail {
    return {
      ...this.toSummary({
        ...task,
        _count: { ...task._count, subtasks: task.subtasks.length, attachments: task.attachments.length },
      }),
      subtasks: task.subtasks,
      attachments: task.attachments,
    };
  }
}
