import type { DeepMockProxy } from "../auth/test-types";
import { TasksService } from "./tasks.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { NotificationsService } from "../notifications/notifications.service";

export function createMockTasksPrisma(): DeepMockProxy<PrismaService> {
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
    task: model(),
    taskAssignee: model(),
    taskComment: model(),
    taskAttachment: model(),
    teamMember: model(),
    team: model(),
    department: model(),
    user: model(),
    file: model(),
  } as unknown as DeepMockProxy<PrismaService>;

  // Same-object transaction mock: tx.task.create etc. resolve exactly like
  // the outer mock's configured `mockResolvedValue`s, so a test only ever
  // configures one set of mocks regardless of whether the real service
  // code happens to run inside a `$transaction` callback or not.
  (mock as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === "function") return arg(mock);
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg;
  });

  return mock;
}

export function createTasksService(prisma?: DeepMockProxy<PrismaService>) {
  const mockPrisma = prisma ?? createMockTasksPrisma();
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const notificationsService = {
    create: jest.fn().mockResolvedValue(undefined),
    createMany: jest.fn().mockResolvedValue(undefined),
  } as unknown as NotificationsService;

  const tasksService = new TasksService(mockPrisma as unknown as PrismaService, auditService, notificationsService);

  return { tasksService, prisma: mockPrisma, auditService, notificationsService };
}
