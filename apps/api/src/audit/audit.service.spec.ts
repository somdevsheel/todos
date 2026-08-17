import { AuditService } from "./audit.service";
import type { PrismaService } from "../prisma/prisma.service";

describe("AuditService", () => {
  it("persists the actor, entity, action, and metadata", async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { auditLog: { create } } as unknown as PrismaService;
    const service = new AuditService(prisma);

    await service.log({
      organizationId: "org-1",
      actorUserId: "user-1",
      action: "USER_INVITED",
      entityType: "User",
      entityId: "user-2",
      metadata: { email: "a@arutechconsultancy.com" },
      ipAddress: "127.0.0.1",
      userAgent: "jest",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: "org-1",
        actorUserId: "user-1",
        action: "USER_INVITED",
        entityType: "User",
        entityId: "user-2",
        ipAddress: "127.0.0.1",
        userAgent: "jest",
      }),
    });
  });

  it("swallows write failures instead of throwing (audit logging must never break the caller)", async () => {
    const create = jest.fn().mockRejectedValue(new Error("db down"));
    const prisma = { auditLog: { create } } as unknown as PrismaService;
    const service = new AuditService(prisma);

    await expect(service.log({ action: "USER_LOGIN", entityType: "User" })).resolves.toBeUndefined();
  });
});
