import { ForbiddenException } from "@nestjs/common";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { createTasksService } from "./tasks.test-utils";

const MANAGER: AuthenticatedUser = { sub: "manager-1", email: "kajal@arutechconsultancy.com", organizationId: "org-1", roles: ["MANAGER"] };
const EMPLOYEE: AuthenticatedUser = { sub: "employee-1", email: "rahul@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };
const OTHER_EMPLOYEE_ID = "employee-2";

function stubFindOneAfterWrite(prisma: ReturnType<typeof createTasksService>["prisma"], overrides: Record<string, unknown> = {}) {
  (prisma.task.findFirst as jest.Mock).mockResolvedValue({
    id: "task-1",
    organizationId: "org-1",
    title: "Complete API Integration",
    description: null,
    status: "TODO",
    priority: "MEDIUM",
    startDate: null,
    dueDate: null,
    createdByUserId: MANAGER.sub,
    teamId: null,
    departmentId: null,
    parentTaskId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    completedAt: null,
    assignees: [],
    subtasks: [],
    attachments: [],
    _count: { comments: 0 },
    ...overrides,
  });
}

describe("TasksService.create", () => {
  it("lets an employee create a task assigned only to themselves", async () => {
    const { tasksService, prisma } = createTasksService();
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: "task-1", title: "My task", dueDate: null });
    (prisma.taskAssignee.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    stubFindOneAfterWrite(prisma, { createdByUserId: EMPLOYEE.sub });

    await expect(tasksService.create(EMPLOYEE, { title: "My task" })).resolves.toBeDefined();
    expect(prisma.task.create).toHaveBeenCalled();
  });

  it("rejects an employee assigning the task to someone else", async () => {
    const { tasksService } = createTasksService();
    await expect(
      tasksService.create(EMPLOYEE, { title: "Handle this", assigneeUserIds: [OTHER_EMPLOYEE_ID] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("lets a manager assign a task to someone else and notifies that person, not the manager", async () => {
    const { tasksService, prisma, notificationsService, auditService } = createTasksService();
    (prisma.user.count as jest.Mock).mockResolvedValue(1); // assertUsersInOrg
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: "task-1", title: "Complete API Integration", dueDate: null });
    (prisma.taskAssignee.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    stubFindOneAfterWrite(prisma, { assignees: [{ user: { id: OTHER_EMPLOYEE_ID, firstName: "Rahul", lastName: "Iyer", avatarUrl: null } }] });

    await tasksService.create(MANAGER, { title: "Complete API Integration", assigneeUserIds: [OTHER_EMPLOYEE_ID] });

    expect(notificationsService.createMany).toHaveBeenCalledWith([
      expect.objectContaining({ userId: OTHER_EMPLOYEE_ID, type: "TASK_ASSIGNED" }),
    ]);
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "TASK_CREATED" }));
  });

  it("does not notify anyone when a manager creates a task assigned only to themselves", async () => {
    const { tasksService, prisma, notificationsService } = createTasksService();
    (prisma.task.create as jest.Mock).mockResolvedValue({ id: "task-1", title: "Solo task", dueDate: null });
    (prisma.taskAssignee.createMany as jest.Mock).mockResolvedValue({ count: 1 });
    stubFindOneAfterWrite(prisma, { createdByUserId: MANAGER.sub });

    await tasksService.create(MANAGER, { title: "Solo task" });

    expect(notificationsService.createMany).not.toHaveBeenCalled();
  });
});

describe("TasksService.updateStatus", () => {
  it("lets an assignee move their task to COMPLETED and sets completedAt", async () => {
    const { tasksService, prisma } = createTasksService();
    (prisma.task.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "task-1", organizationId: "org-1", status: "IN_PROGRESS", title: "T", createdByUserId: MANAGER.sub })
      // second call is TasksService.findOne() re-fetching the fresh state
      .mockResolvedValueOnce(undefined);
    (prisma.taskAssignee.findUnique as jest.Mock).mockResolvedValue({ taskId: "task-1", userId: EMPLOYEE.sub });
    (prisma.task.update as jest.Mock).mockResolvedValue({});
    stubFindOneAfterWrite(prisma, { status: "COMPLETED", completedAt: new Date() });
    // second findFirst call (inside findOne) should return the completed row — override the queue precisely:
    (prisma.task.findFirst as jest.Mock)
      .mockReset()
      .mockResolvedValueOnce({ id: "task-1", organizationId: "org-1", status: "IN_PROGRESS", title: "T", createdByUserId: MANAGER.sub })
      .mockResolvedValueOnce({
        id: "task-1",
        organizationId: "org-1",
        title: "T",
        status: "COMPLETED",
        priority: "MEDIUM",
        createdByUserId: MANAGER.sub,
        assignees: [],
        subtasks: [],
        attachments: [],
        _count: { comments: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      });

    const result = await tasksService.updateStatus("org-1", "task-1", EMPLOYEE, "COMPLETED");

    expect(result.status).toBe("COMPLETED");
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: "task-1" },
      data: { status: "COMPLETED", completedAt: expect.any(Date) },
    });
  });

  it("notifies the creator when someone else completes their task", async () => {
    const { tasksService, prisma, notificationsService } = createTasksService();
    (prisma.task.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "task-1", organizationId: "org-1", status: "TODO", title: "Ship it", createdByUserId: MANAGER.sub })
      .mockResolvedValueOnce({
        id: "task-1",
        organizationId: "org-1",
        title: "Ship it",
        status: "COMPLETED",
        priority: "MEDIUM",
        createdByUserId: MANAGER.sub,
        assignees: [],
        subtasks: [],
        attachments: [],
        _count: { comments: 0 },
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: new Date(),
      });
    (prisma.taskAssignee.findUnique as jest.Mock).mockResolvedValue({ taskId: "task-1", userId: EMPLOYEE.sub });
    (prisma.task.update as jest.Mock).mockResolvedValue({});

    await tasksService.updateStatus("org-1", "task-1", EMPLOYEE, "COMPLETED");

    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: MANAGER.sub, type: "TASK_COMPLETED" }));
  });

  it("rejects a status change from someone who is neither the creator, an assignee, nor privileged", async () => {
    const { tasksService, prisma } = createTasksService();
    const bystander: AuthenticatedUser = { sub: "bystander-1", email: "x@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: "task-1", organizationId: "org-1", status: "TODO", title: "T", createdByUserId: MANAGER.sub });
    (prisma.taskAssignee.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(tasksService.updateStatus("org-1", "task-1", bystander, "IN_PROGRESS")).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("TasksService.remove", () => {
  it("soft-deletes (never hard-deletes) via updating deletedAt", async () => {
    const { tasksService, prisma } = createTasksService();
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: "task-1", organizationId: "org-1", createdByUserId: MANAGER.sub });
    (prisma.task.update as jest.Mock).mockResolvedValue({});

    await tasksService.remove("org-1", "task-1", MANAGER);

    expect(prisma.task.update).toHaveBeenCalledWith({ where: { id: "task-1" }, data: { deletedAt: expect.any(Date) } });
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });

  it("rejects deletion by someone who isn't the creator or an admin", async () => {
    const { tasksService, prisma } = createTasksService();
    (prisma.task.findFirst as jest.Mock).mockResolvedValue({ id: "task-1", organizationId: "org-1", createdByUserId: MANAGER.sub });

    await expect(tasksService.remove("org-1", "task-1", EMPLOYEE)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
