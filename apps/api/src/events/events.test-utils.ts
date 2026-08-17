import type { DeepMockProxy } from "../auth/test-types";
import { EventsService } from "./events.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { NotificationsService } from "../notifications/notifications.service";

export function createMockEventsPrisma(): DeepMockProxy<PrismaService> {
  const model = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  });

  const mock = {
    event: model(),
    eventParticipant: model(),
    team: model(),
    teamMember: model(),
    user: model(),
  } as unknown as DeepMockProxy<PrismaService>;

  // Same-object transaction mock as tasks.test-utils.ts's createMockTasksPrisma — see its comment.
  (mock as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === "function") return arg(mock);
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg;
  });

  return mock;
}

export function createEventsService(prisma?: DeepMockProxy<PrismaService>) {
  const mockPrisma = prisma ?? createMockEventsPrisma();
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const notificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
    createMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  const eventsService = new EventsService(mockPrisma as unknown as PrismaService, auditService, notificationsService);

  return { eventsService, prisma: mockPrisma, auditService, notificationsService };
}
