import type { DeepMockProxy } from "../auth/test-types";
import { AnnouncementsService } from "./announcements.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { NotificationsService } from "../notifications/notifications.service";

export function createMockAnnouncementsPrisma(): DeepMockProxy<PrismaService> {
  const model = () => ({
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  });

  return { announcement: model(), user: model() } as unknown as DeepMockProxy<PrismaService>;
}

export function createAnnouncementsService(prisma?: DeepMockProxy<PrismaService>) {
  const mockPrisma = prisma ?? createMockAnnouncementsPrisma();
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const notificationsService = { createMany: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;

  const service = new AnnouncementsService(mockPrisma as unknown as PrismaService, auditService, notificationsService);

  return { service, prisma: mockPrisma, auditService, notificationsService };
}
