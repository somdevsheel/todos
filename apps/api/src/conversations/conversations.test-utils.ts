import type { DeepMockProxy } from "../auth/test-types";
import { ConversationsService } from "./conversations.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";

export function createMockConversationsPrisma(): DeepMockProxy<PrismaService> {
  const model = () => ({
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findFirst: jest.fn(),
    findFirstOrThrow: jest.fn(),
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
    conversation: model(),
    conversationMember: model(),
    message: model(),
    user: model(),
  } as unknown as DeepMockProxy<PrismaService>;

  (mock as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(async (arg: unknown) => {
    if (typeof arg === "function") return arg(mock);
    if (Array.isArray(arg)) return Promise.all(arg);
    return arg;
  });

  return mock;
}

export function createConversationsService(prisma?: DeepMockProxy<PrismaService>) {
  const mockPrisma = prisma ?? createMockConversationsPrisma();
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

  const conversationsService = new ConversationsService(mockPrisma as unknown as PrismaService, auditService);

  return { conversationsService, prisma: mockPrisma, auditService };
}
