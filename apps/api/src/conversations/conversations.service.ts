import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Conversation, ConversationMember } from "@prisma/client";
import { AUDIT_ACTIONS, type ConversationSummary } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { CreateConversationDto } from "./dto/create-conversation.dto";

@Injectable()
export class ConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async create(actor: AuthenticatedUser, dto: CreateConversationDto): Promise<ConversationSummary> {
    const otherIds = [...new Set(dto.memberUserIds)].filter((id) => id !== actor.sub);
    if (otherIds.length === 0) throw new BadRequestException("A conversation needs at least one other participant.");
    if (dto.type === "DIRECT" && otherIds.length > 1) {
      throw new BadRequestException("A direct conversation is between exactly two people — create a GROUP conversation for more.");
    }
    await this.assertUsersInOrg(actor.organizationId, otherIds);

    if (dto.type === "DIRECT") {
      const existing = await this.prisma.conversation.findFirst({
        where: {
          organizationId: actor.organizationId,
          type: "DIRECT",
          deletedAt: null,
          AND: [{ members: { some: { userId: actor.sub } } }, { members: { some: { userId: otherIds[0] } } }],
        },
      });
      // Reuse the existing 1:1 thread rather than creating a duplicate —
      // a DIRECT conversation is always exactly {actor, otherUser} by
      // construction (see addMember's DIRECT guard), so matching both
      // member rows is sufficient to prove it's the same pair.
      if (existing) return this.findOne(actor.organizationId, actor, existing.id);
    }

    const memberIds = [actor.sub, ...otherIds];
    const conversation = await this.prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: { organizationId: actor.organizationId, type: dto.type, name: dto.type === "GROUP" ? dto.name : undefined, createdByUserId: actor.sub },
      });
      await tx.conversationMember.createMany({
        data: memberIds.map((userId) => ({ conversationId: created.id, userId, lastReadAt: new Date() })),
      });
      return created;
    });

    await this.auditService.log({
      organizationId: actor.organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.CONVERSATION_CREATED,
      entityType: "Conversation",
      entityId: conversation.id,
      metadata: { type: dto.type, memberUserIds: memberIds },
    });

    return this.findOne(actor.organizationId, actor, conversation.id);
  }

  async findAll(organizationId: string, actor: AuthenticatedUser): Promise<ConversationSummary[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { organizationId, deletedAt: null, members: { some: { userId: actor.sub } } },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    const summaries = await Promise.all(conversations.map((c) => this.toSummary(c, actor.sub)));
    return summaries.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt ?? a.createdAt;
      const bTime = b.lastMessage?.createdAt ?? b.createdAt;
      return bTime.localeCompare(aTime);
    });
  }

  async findOne(organizationId: string, actor: AuthenticatedUser, id: string): Promise<ConversationSummary> {
    await this.getMembershipOrThrow(id, actor.sub, organizationId);

    const conversation = await this.prisma.conversation.findFirstOrThrow({
      where: { id, organizationId, deletedAt: null },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } } },
        messages: { where: { deletedAt: null }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    });

    return this.toSummary(conversation, actor.sub);
  }

  async markRead(organizationId: string, actor: AuthenticatedUser, id: string): Promise<void> {
    await this.getMembershipOrThrow(id, actor.sub, organizationId);
    await this.markReadForUser(id, actor.sub);
  }

  /**
   * The membership-check-free variant, for callers that already know the
   * user is a member (MessagesService, for every recipient currently
   * focused on the conversation when a new message arrives — see its
   * notifyRecipients). Without this, a focused user's unread count would
   * only reset at the moment they first opened the thread and then drift
   * upward with every message that streamed in afterward, even though
   * they're watching it live — same bug class as the notification-dedup
   * rule exists to prevent, just for the read-receipt instead of the push.
   */
  async markReadForUser(conversationId: string, userId: string): Promise<void> {
    await this.prisma.conversationMember.update({
      where: { conversationId_userId: { conversationId, userId } },
      data: { lastReadAt: new Date() },
    });
  }

  async addMember(organizationId: string, actor: AuthenticatedUser, id: string, userId: string): Promise<void> {
    const conversation = await this.getConversationOrThrow(organizationId, id);
    await this.getMembershipOrThrow(id, actor.sub, organizationId);
    if (conversation.type === "DIRECT") throw new BadRequestException("Can't add a third person to a direct conversation — create a group instead.");
    await this.assertUsersInOrg(organizationId, [userId]);

    const existing = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId } } });
    if (existing) return; // idempotent

    await this.prisma.conversationMember.create({ data: { conversationId: id, userId, lastReadAt: new Date() } });
  }

  async removeMember(organizationId: string, actor: AuthenticatedUser, id: string, userId: string): Promise<void> {
    const conversation = await this.getConversationOrThrow(organizationId, id);
    if (userId !== actor.sub && conversation.createdByUserId !== actor.sub) {
      throw new ForbiddenException("Only the conversation's creator can remove someone else.");
    }

    const existing = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId } } });
    if (!existing) throw new NotFoundException("This person isn't in this conversation.");

    await this.prisma.conversationMember.delete({ where: { conversationId_userId: { conversationId: id, userId } } });
  }

  // ---------------------------------------------------------------------
  // Shared helpers — getMembershipOrThrow is also used by MessagesService
  // and ChatGateway (mirrors TasksService.getTaskOrThrow's cross-module reuse).
  // ---------------------------------------------------------------------

  async getConversationOrThrow(organizationId: string, id: string): Promise<Conversation> {
    const conversation = await this.prisma.conversation.findFirst({ where: { id, organizationId, deletedAt: null } });
    if (!conversation) throw new NotFoundException("Conversation not found");
    return conversation;
  }

  /**
   * Not-a-member is reported identically to not-found (never a 403) — chat
   * membership is the thing being protected here, so this deliberately
   * doesn't confirm a conversation id's existence to a non-member, unlike
   * OrgScopeGuard's model (which only hides *other organizations'*
   * resources, not fellow-org resources the caller simply isn't part of).
   */
  async getMembershipOrThrow(conversationId: string, userId: string, organizationId?: string): Promise<ConversationMember> {
    if (organizationId) await this.getConversationOrThrow(organizationId, conversationId);
    const membership = await this.prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) throw new NotFoundException("Conversation not found");
    return membership;
  }

  async listMemberUserIds(conversationId: string): Promise<string[]> {
    const members = await this.prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } });
    return members.map((m) => m.userId);
  }

  /** Used once per WS connection (ChatGateway.handleConnection) to auto-join every room the user belongs to. */
  async listMemberConversationIds(userId: string, organizationId: string): Promise<string[]> {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, conversation: { organizationId, deletedAt: null } },
      select: { conversationId: true },
    });
    return memberships.map((m) => m.conversationId);
  }

  /**
   * Everyone the caller shares at least one conversation with, excluding
   * themselves — used once per WS connection (ChatGateway.handleConnection)
   * to send an initial "presence:snapshot" so a freshly-opened chat UI
   * knows who's online immediately, not only after the next transition.
   * Deliberately not exposed on ConversationsService's REST surface —
   * WebsocketModule is the only caller, and PresenceService (which
   * actually answers "is this user online") lives there too, so this stays
   * a query helper rather than a full presence API.
   */
  async listCoMemberUserIds(userId: string, organizationId: string): Promise<string[]> {
    const rows = await this.prisma.conversationMember.findMany({
      where: { conversation: { organizationId, deletedAt: null, members: { some: { userId } } }, userId: { not: userId } },
      select: { userId: true },
      distinct: ["userId"],
    });
    return rows.map((r) => r.userId);
  }

  private async assertUsersInOrg(organizationId: string, userIds: string[]): Promise<void> {
    const count = await this.prisma.user.count({ where: { id: { in: userIds }, organizationId, deletedAt: null } });
    if (count !== userIds.length) throw new BadRequestException("One or more participants are not part of this organization.");
  }

  private async toSummary(
    conversation: Conversation & {
      members: Array<{ userId: string; lastReadAt: Date | null; user: { id: string; firstName: string; lastName: string; avatarUrl: string | null } }>;
      messages: Array<{ id: string; body: string; senderUserId: string; createdAt: Date }>;
    },
    viewerUserId: string,
  ): Promise<ConversationSummary> {
    const viewer = conversation.members.find((m) => m.userId === viewerUserId);
    const unreadCount = await this.prisma.message.count({
      where: {
        conversationId: conversation.id,
        deletedAt: null,
        senderUserId: { not: viewerUserId },
        createdAt: { gt: viewer?.lastReadAt ?? new Date(0) },
      },
    });

    const lastMessage = conversation.messages[0];

    return {
      id: conversation.id,
      organizationId: conversation.organizationId,
      type: conversation.type,
      name: conversation.name,
      createdByUserId: conversation.createdByUserId,
      createdAt: conversation.createdAt.toISOString(),
      participants: conversation.members.map((m) => ({
        id: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarUrl: m.user.avatarUrl,
      })),
      lastMessage: lastMessage ? { id: lastMessage.id, body: lastMessage.body, senderUserId: lastMessage.senderUserId, createdAt: lastMessage.createdAt.toISOString() } : null,
      unreadCount,
    };
  }
}
