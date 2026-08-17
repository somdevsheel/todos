import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import type { Message } from "@prisma/client";
import { AUDIT_ACTIONS, NOTIFICATION_TYPES, type MessageSummary, type PaginatedResult } from "@arutech/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { NotificationsService } from "../notifications/notifications.service";
import { ConversationsService } from "../conversations/conversations.service";
import { ChatGateway } from "../websocket/chat.gateway";
import { PresenceService } from "../websocket/presence.service";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import type { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import type { CreateMessageDto } from "./dto/create-message.dto";

const SENDER_SELECT = { id: true, firstName: true, lastName: true, avatarUrl: true } as const;

type MessageWithSender = Message & { senderUser: { id: string; firstName: string; lastName: string; avatarUrl: string | null } };

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationsService: ConversationsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly presenceService: PresenceService,
    private readonly chatGateway: ChatGateway,
  ) {}

  async findAll(organizationId: string, actor: AuthenticatedUser, conversationId: string, query: PaginationQueryDto): Promise<PaginatedResult<MessageSummary>> {
    await this.conversationsService.getMembershipOrThrow(conversationId, actor.sub, organizationId);

    const where = { conversationId, deletedAt: null };
    const [messages, totalItems] = await Promise.all([
      this.prisma.message.findMany({
        where,
        include: { senderUser: { select: SENDER_SELECT } },
        orderBy: { createdAt: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.message.count({ where }),
    ]);

    return {
      items: messages.map((m) => this.toSummary(m)),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / query.pageSize)),
      },
    };
  }

  async create(organizationId: string, actor: AuthenticatedUser, conversationId: string, dto: CreateMessageDto): Promise<MessageSummary> {
    await this.conversationsService.getMembershipOrThrow(conversationId, actor.sub, organizationId);

    const mentionedUserIds = [...new Set(dto.mentionedUserIds ?? [])].filter((id) => id !== actor.sub);
    const memberIds = await this.conversationsService.listMemberUserIds(conversationId);
    if (mentionedUserIds.some((id) => !memberIds.includes(id))) {
      throw new BadRequestException("You can only mention people in this conversation.");
    }

    const message = await this.prisma.message.create({
      data: { conversationId, senderUserId: actor.sub, body: dto.body, mentionedUserIds },
      include: { senderUser: { select: SENDER_SELECT } },
    });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.MESSAGE_CREATED,
      entityType: "Message",
      entityId: message.id,
      metadata: { conversationId },
    });

    const summary = this.toSummary(message);
    this.chatGateway.broadcastMessageNew(conversationId, summary);
    await this.notifyRecipients(organizationId, conversationId, actor.sub, mentionedUserIds, memberIds, summary);

    return summary;
  }

  async update(organizationId: string, actor: AuthenticatedUser, conversationId: string, messageId: string, body: string): Promise<MessageSummary> {
    const message = await this.getMessageOrThrow(organizationId, conversationId, messageId);
    if (message.senderUserId !== actor.sub) throw new ForbiddenException("You can only edit your own messages.");

    await this.prisma.message.update({ where: { id: messageId }, data: { body, editedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.MESSAGE_UPDATED,
      entityType: "Message",
      entityId: messageId,
      metadata: { conversationId },
    });

    const updated = await this.getMessageOrThrow(organizationId, conversationId, messageId);
    const summary = this.toSummary(updated);
    this.chatGateway.broadcastMessageUpdated(conversationId, summary);
    return summary;
  }

  async remove(organizationId: string, actor: AuthenticatedUser, conversationId: string, messageId: string): Promise<void> {
    const message = await this.getMessageOrThrow(organizationId, conversationId, messageId);
    if (message.senderUserId !== actor.sub) throw new ForbiddenException("You can only delete your own messages.");

    await this.prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } });

    await this.auditService.log({
      organizationId,
      actorUserId: actor.sub,
      action: AUDIT_ACTIONS.MESSAGE_DELETED,
      entityType: "Message",
      entityId: messageId,
      metadata: { conversationId },
    });

    this.chatGateway.broadcastMessageDeleted(conversationId, messageId);
  }

  /**
   * The online/push dedup rule from CHAT.md: a recipient currently focused
   * on this exact conversation (i.e. their WS client has it open) already
   * got the message live via broadcastMessageNew above — a Notification
   * row would just be noise, so they're skipped entirely, not merely
   * "push-skipped." Everyone else gets the normal pipeline (in-app row +
   * Phase 4 push, subject to their own NotificationPreference), same as
   * every other notification type.
   */
  private async notifyRecipients(
    organizationId: string,
    conversationId: string,
    senderUserId: string,
    mentionedUserIds: string[],
    memberIds: string[],
    message: MessageSummary,
  ): Promise<void> {
    const others = memberIds.filter((id) => id !== senderUserId);
    const focused = others.filter((id) => this.presenceService.isFocused(id, conversationId));
    const recipients = others.filter((id) => !focused.includes(id));

    // A focused member is watching this land live — same treatment as
    // opening the conversation fresh: their unread count must not drift
    // upward while they're staring right at it. See markReadForUser's docstring.
    await Promise.all(focused.map((userId) => this.conversationsService.markReadForUser(conversationId, userId)));

    if (recipients.length === 0) return;

    const preview = message.body.length > 140 ? `${message.body.slice(0, 140)}…` : message.body;

    await this.notificationsService.createMany(
      recipients.map((userId) => {
        const mentioned = mentionedUserIds.includes(userId);
        return {
          organizationId,
          userId,
          type: mentioned ? NOTIFICATION_TYPES.MESSAGE_MENTION : NOTIFICATION_TYPES.NEW_MESSAGE,
          title: mentioned ? "You were mentioned" : "New message",
          body: preview,
          data: { conversationId, messageId: message.id },
        };
      }),
    );
  }

  private async getMessageOrThrow(organizationId: string, conversationId: string, messageId: string): Promise<MessageWithSender> {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, conversationId, deletedAt: null, conversation: { organizationId } },
      include: { senderUser: { select: SENDER_SELECT } },
    });
    if (!message) throw new NotFoundException("Message not found");
    return message;
  }

  private toSummary(message: MessageWithSender): MessageSummary {
    return {
      id: message.id,
      conversationId: message.conversationId,
      body: message.body,
      mentionedUserIds: message.mentionedUserIds,
      senderUser: {
        id: message.senderUser.id,
        firstName: message.senderUser.firstName,
        lastName: message.senderUser.lastName,
        avatarUrl: message.senderUser.avatarUrl,
      },
      editedAt: message.editedAt?.toISOString() ?? null,
      createdAt: message.createdAt.toISOString(),
    };
  }
}
