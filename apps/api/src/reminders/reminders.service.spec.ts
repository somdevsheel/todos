import { BadRequestException, ConflictException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { createRemindersService } from "./reminders.test-utils";

const EMPLOYEE: AuthenticatedUser = { sub: "employee-1", email: "rahul@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };

describe("RemindersService.create", () => {
  it("rejects a remindAt that isn't in the future", async () => {
    const { remindersService } = createRemindersService();
    await expect(
      remindersService.create(EMPLOYEE, { relatedEntityType: "TASK", relatedEntityId: "task-1", remindAt: "2020-01-01T00:00:00Z" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("validates the target task's visibility via TasksService before creating the row", async () => {
    const { remindersService, prisma, tasksService } = createRemindersService();
    (tasksService.getTaskOrThrow as jest.Mock).mockResolvedValue({ id: "task-1", title: "Ship it" });
    (prisma.reminder.create as jest.Mock).mockResolvedValue({
      id: "reminder-1",
      relatedEntityType: "TASK",
      relatedEntityId: "task-1",
      taskId: "task-1",
      eventId: null,
      remindAt: new Date(Date.now() + 60_000),
      message: null,
      isSent: false,
      createdAt: new Date(),
    });

    const remindAt = new Date(Date.now() + 60_000).toISOString();
    const result = await remindersService.create(EMPLOYEE, { relatedEntityType: "TASK", relatedEntityId: "task-1", remindAt });

    expect(tasksService.getTaskOrThrow).toHaveBeenCalledWith("org-1", "task-1");
    expect(result.relatedEntityTitle).toBe("Ship it");
  });

  it("surfaces a duplicate (userId, entity, remindAt) as a 409, not a raw Prisma error", async () => {
    const { remindersService, prisma, eventsService } = createRemindersService();
    (eventsService.getEventOrThrow as jest.Mock).mockResolvedValue({ id: "event-1", title: "Standup" });
    (prisma.reminder.create as jest.Mock).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6.19.3" }),
    );

    const remindAt = new Date(Date.now() + 60_000).toISOString();
    await expect(
      remindersService.create(EMPLOYEE, { relatedEntityType: "EVENT", relatedEntityId: "event-1", remindAt }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe("RemindersService.remove", () => {
  it("rejects removing a reminder that has already been sent", async () => {
    const { remindersService, prisma } = createRemindersService();
    (prisma.reminder.findFirst as jest.Mock).mockResolvedValue({ id: "reminder-1", isSent: true });

    await expect(remindersService.remove(EMPLOYEE, "reminder-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.reminder.delete).not.toHaveBeenCalled();
  });
});

describe("RemindersService.claim", () => {
  it("returns null when the reminder was already claimed (updateMany matched nothing)", async () => {
    const { remindersService, prisma } = createRemindersService();
    (prisma.reminder.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    const result = await remindersService.claim("reminder-1");

    expect(result).toBeNull();
    expect(prisma.reminder.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns the full reminder (with task/event join) when this call wins the claim", async () => {
    const { remindersService, prisma } = createRemindersService();
    (prisma.reminder.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.reminder.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      id: "reminder-1",
      relatedEntityType: "TASK",
      taskId: "task-1",
      eventId: null,
      task: { title: "Ship it", dueDate: null, deletedAt: null },
      event: null,
    });

    const result = await remindersService.claim("reminder-1");

    expect(result?.task?.title).toBe("Ship it");
  });
});
