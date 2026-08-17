import { ForbiddenException } from "@nestjs/common";
import { TaskCommentsService } from "./task-comments.service";
import { createMockTasksPrisma } from "../tasks/tasks.test-utils";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { TasksService } from "../tasks/tasks.service";

const AUTHOR: AuthenticatedUser = { sub: "manager-1", email: "kajal@arutechconsultancy.com", organizationId: "org-1", roles: ["MANAGER"] };

function build() {
  const prisma = createMockTasksPrisma();
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const notificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
    createMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;
  const tasksService = {
    getTaskOrThrow: jest.fn().mockResolvedValue({ id: "task-1", title: "Complete API Integration" }),
    getTaskParticipantUserIds: jest.fn().mockResolvedValue({ createdByUserId: "creator-1", assigneeUserIds: ["assignee-1"] }),
  } as unknown as TasksService;

  const service = new TaskCommentsService(prisma as unknown as PrismaService, tasksService, auditService, notificationsService);
  return { service, prisma, auditService, notificationsService, tasksService };
}

describe("TaskCommentsService.create", () => {
  it("notifies participants (creator + assignees, excluding the author) with TASK_COMMENTED", async () => {
    const { service, prisma, notificationsService } = build();
    (prisma.taskComment.create as jest.Mock).mockResolvedValue({
      id: "comment-1",
      taskId: "task-1",
      body: "Looks good",
      mentionedUserIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      authorUser: { id: AUTHOR.sub, firstName: "Kajal", lastName: "Verma", avatarUrl: null },
    });

    await service.create("org-1", "task-1", AUTHOR, { body: "Looks good" });

    expect(notificationsService.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ userId: "creator-1", type: "TASK_COMMENTED" }),
        expect.objectContaining({ userId: "assignee-1", type: "TASK_COMMENTED" }),
      ]),
    );
  });

  it("sends the mentioned user a TASK_MENTIONED notification instead of the generic TASK_COMMENTED one", async () => {
    const { service, prisma, notificationsService } = build();
    (prisma.user.count as jest.Mock).mockResolvedValue(1); // assertUsersInOrg
    (prisma.taskComment.create as jest.Mock).mockResolvedValue({
      id: "comment-1",
      taskId: "task-1",
      body: "@assignee-1 please check",
      mentionedUserIds: ["assignee-1"],
      createdAt: new Date(),
      updatedAt: new Date(),
      authorUser: { id: AUTHOR.sub, firstName: "Kajal", lastName: "Verma", avatarUrl: null },
    });

    await service.create("org-1", "task-1", AUTHOR, { body: "@assignee-1 please check", mentionedUserIds: ["assignee-1"] });

    const calls = (notificationsService.createMany as jest.Mock).mock.calls.flat(2) as Array<{ userId: string; type: string }>;
    const assigneeNotifications = calls.filter((n) => n.userId === "assignee-1");
    expect(assigneeNotifications).toHaveLength(1);
    expect(assigneeNotifications[0]?.type).toBe("TASK_MENTIONED");
  });

  it("never notifies the comment's own author", async () => {
    const { service, prisma, notificationsService, tasksService } = build();
    (tasksService.getTaskParticipantUserIds as jest.Mock).mockResolvedValue({ createdByUserId: AUTHOR.sub, assigneeUserIds: [] });
    (prisma.taskComment.create as jest.Mock).mockResolvedValue({
      id: "comment-1",
      taskId: "task-1",
      body: "note to self",
      mentionedUserIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      authorUser: { id: AUTHOR.sub, firstName: "Kajal", lastName: "Verma", avatarUrl: null },
    });

    await service.create("org-1", "task-1", AUTHOR, { body: "note to self" });

    expect(notificationsService.createMany).toHaveBeenCalledWith([]);
  });
});

describe("TaskCommentsService.update / remove", () => {
  it("rejects editing someone else's comment", async () => {
    const { service, prisma } = build();
    (prisma.taskComment.findFirst as jest.Mock).mockResolvedValue({ id: "comment-1", authorUserId: "someone-else" });

    await expect(service.update("org-1", "task-1", "comment-1", AUTHOR, "edited")).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects deleting someone else's comment unless the actor is an admin", async () => {
    const { service, prisma } = build();
    (prisma.taskComment.findFirst as jest.Mock).mockResolvedValue({ id: "comment-1", authorUserId: "someone-else" });

    await expect(service.remove("org-1", "task-1", "comment-1", AUTHOR)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows an admin to delete someone else's comment", async () => {
    const { service, prisma, auditService } = build();
    const admin: AuthenticatedUser = { sub: "admin-1", email: "priya@arutechconsultancy.com", organizationId: "org-1", roles: ["ADMIN"] };
    (prisma.taskComment.findFirst as jest.Mock).mockResolvedValue({ id: "comment-1", authorUserId: "someone-else" });
    (prisma.taskComment.update as jest.Mock).mockResolvedValue({});

    await service.remove("org-1", "task-1", "comment-1", admin);

    expect(prisma.taskComment.update).toHaveBeenCalledWith({ where: { id: "comment-1" }, data: { deletedAt: expect.any(Date) } });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "TASK_COMMENT_DELETED" }));
  });
});
