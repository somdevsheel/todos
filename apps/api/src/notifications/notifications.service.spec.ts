import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { FcmService } from "../fcm/fcm.service";
import { NotificationsService } from "./notifications.service";

const ACTOR: AuthenticatedUser = { sub: "user-1", email: "a@arutechconsultancy.com", organizationId: "org-1", roles: ["EMPLOYEE"] };

function createNotificationsService() {
  const notificationCreate = jest.fn().mockResolvedValue({});
  const notificationCreateMany = jest.fn().mockResolvedValue({ count: 1 });
  const preferenceFindUnique = jest.fn().mockResolvedValue(null);
  const preferenceFindMany = jest.fn().mockResolvedValue([]);
  const preferenceUpsert = jest.fn();
  const transaction = jest.fn((ops: unknown[]) => Promise.all(ops));

  const prisma = {
    notification: { create: notificationCreate, createMany: notificationCreateMany },
    notificationPreference: { findUnique: preferenceFindUnique, findMany: preferenceFindMany, upsert: preferenceUpsert },
    $transaction: transaction,
  } as unknown as PrismaService;

  const sendToUser = jest.fn().mockResolvedValue(undefined);
  const fcmService = { sendToUser } as unknown as FcmService;
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

  const service = new NotificationsService(prisma, fcmService, auditService);
  return { service, notificationCreate, notificationCreateMany, preferenceFindUnique, preferenceFindMany, preferenceUpsert, sendToUser, auditService };
}

describe("NotificationsService.create", () => {
  it("defaults to push-enabled when no preference row exists", async () => {
    const { service, sendToUser } = createNotificationsService();

    await service.create({ organizationId: "org-1", userId: "user-2", type: "TASK_ASSIGNED", title: "t", body: "b" });

    expect(sendToUser).toHaveBeenCalledWith("user-2", { type: "TASK_ASSIGNED", title: "t", body: "b", data: undefined }, true);
  });

  it("passes pushEnabled=false through to FcmService when the category is disabled", async () => {
    const { service, preferenceFindUnique, sendToUser } = createNotificationsService();
    preferenceFindUnique.mockResolvedValue({ enabled: false });

    await service.create({ organizationId: "org-1", userId: "user-2", type: "TASK_ASSIGNED", title: "t", body: "b" });

    expect(preferenceFindUnique).toHaveBeenCalledWith({
      where: { userId_channel_category: { userId: "user-2", channel: "PUSH", category: "tasks" } },
    });
    expect(sendToUser).toHaveBeenCalledWith("user-2", expect.anything(), false);
  });

  it("never calls FcmService when the DB write itself fails", async () => {
    const { service, notificationCreate, sendToUser } = createNotificationsService();
    notificationCreate.mockRejectedValue(new Error("db down"));

    await expect(service.create({ organizationId: "org-1", userId: "user-2", type: "TASK_ASSIGNED", title: "t", body: "b" })).resolves.toBeUndefined();

    expect(sendToUser).not.toHaveBeenCalled();
  });

  it("treats a notification type outside the known category map as always push-enabled", async () => {
    const { service, preferenceFindUnique, sendToUser } = createNotificationsService();

    await service.create({ organizationId: "org-1", userId: "user-2", type: "SOME_FUTURE_TYPE", title: "t", body: "b" });

    expect(preferenceFindUnique).not.toHaveBeenCalled();
    expect(sendToUser).toHaveBeenCalledWith("user-2", expect.anything(), true);
  });
});

describe("NotificationsService.createMany", () => {
  it("fans out a push send per recipient", async () => {
    const { service, sendToUser } = createNotificationsService();

    await service.createMany([
      { organizationId: "org-1", userId: "user-2", type: "EVENT_CREATED", title: "t1", body: "b1" },
      { organizationId: "org-1", userId: "user-3", type: "EVENT_CREATED", title: "t2", body: "b2" },
    ]);

    expect(sendToUser).toHaveBeenCalledTimes(2);
    expect(sendToUser).toHaveBeenCalledWith("user-2", expect.objectContaining({ title: "t1" }), true);
    expect(sendToUser).toHaveBeenCalledWith("user-3", expect.objectContaining({ title: "t2" }), true);
  });
});

describe("NotificationsService.updatePreferences", () => {
  it("upserts every item and audits the change", async () => {
    const { service, preferenceUpsert, auditService } = createNotificationsService();

    await service.updatePreferences(ACTOR, [{ channel: "PUSH", category: "tasks", enabled: false }]);

    expect(preferenceUpsert).toHaveBeenCalledWith({
      where: { userId_channel_category: { userId: "user-1", channel: "PUSH", category: "tasks" } },
      create: { userId: "user-1", channel: "PUSH", category: "tasks", enabled: false },
      update: { enabled: false },
    });
    expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({ action: "NOTIFICATION_PREFERENCE_UPDATED", actorUserId: "user-1" }));
  });
});

describe("NotificationsService.getPreferences", () => {
  it("returns every category, defaulted to enabled, overridden by existing rows", async () => {
    const { service, preferenceFindMany } = createNotificationsService();
    preferenceFindMany.mockResolvedValue([{ category: "tasks", enabled: false }]);

    const result = await service.getPreferences("user-1");

    expect(result).toEqual([
      { channel: "PUSH", category: "tasks", enabled: false },
      { channel: "PUSH", category: "reminders", enabled: true },
      { channel: "PUSH", category: "events", enabled: true },
      { channel: "PUSH", category: "chat", enabled: true },
    ]);
  });
});
