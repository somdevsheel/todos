import type { DeepMockProxy } from "../auth/test-types";
import { MessagesService } from "./messages.service";
import type { PrismaService } from "../prisma/prisma.service";
import type { AuditService } from "../audit/audit.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { ConversationsService } from "../conversations/conversations.service";
import type { ChatGateway } from "../websocket/chat.gateway";
import type { PresenceService } from "../websocket/presence.service";

export function createMockMessagesPrisma(): DeepMockProxy<PrismaService> {
  const model = () => ({
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  });

  return { message: model() } as unknown as DeepMockProxy<PrismaService>;
}

export function createMessagesService(prisma?: DeepMockProxy<PrismaService>) {
  const mockPrisma = prisma ?? createMockMessagesPrisma();
  const conversationsService = {
    getMembershipOrThrow: jest.fn().mockResolvedValue({}),
    listMemberUserIds: jest.fn().mockResolvedValue([]),
    markReadForUser: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConversationsService;
  const auditService = { log: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const notificationsService = { createMany: jest.fn().mockResolvedValue(undefined) } as unknown as NotificationsService;
  const presenceService = { isFocused: jest.fn().mockReturnValue(false) } as unknown as PresenceService;
  const chatGateway = {
    broadcastMessageNew: jest.fn(),
    broadcastMessageUpdated: jest.fn(),
    broadcastMessageDeleted: jest.fn(),
  } as unknown as ChatGateway;

  const messagesService = new MessagesService(
    mockPrisma as unknown as PrismaService,
    conversationsService,
    auditService,
    notificationsService,
    presenceService,
    chatGateway,
  );

  return { messagesService, prisma: mockPrisma, conversationsService, auditService, notificationsService, presenceService, chatGateway };
}
