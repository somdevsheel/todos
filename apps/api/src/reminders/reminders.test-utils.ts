import type { DeepMockProxy } from "../auth/test-types";
import { RemindersService } from "./reminders.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { TasksService } from "../tasks/tasks.service";
import type { EventsService } from "../events/events.service";

export function createMockRemindersPrisma(): DeepMockProxy<PrismaService> {
  const model = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  });

  return { reminder: model() } as unknown as DeepMockProxy<PrismaService>;
}

export function createRemindersService(prisma?: DeepMockProxy<PrismaService>) {
  const mockPrisma = prisma ?? createMockRemindersPrisma();
  const tasksService = { getTaskOrThrow: jest.fn() } as unknown as TasksService;
  const eventsService = { getEventOrThrow: jest.fn() } as unknown as EventsService;
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

  const remindersService = new RemindersService(
    mockPrisma as unknown as PrismaService,
    tasksService,
    eventsService,
    auditService,
  );

  return { remindersService, prisma: mockPrisma, tasksService, eventsService, auditService };
}
