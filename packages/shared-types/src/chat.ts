/** Mirrors the Prisma ConversationType enum — not otherwise represented in shared-types until Phase 5 needed a client-facing type. */
export const CONVERSATION_TYPES = ["DIRECT", "GROUP"] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export interface ConversationParticipant {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface ConversationLastMessage {
  id: string;
  body: string;
  senderUserId: string;
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  organizationId: string;
  type: ConversationType;
  /** Only meaningful for GROUP — a DIRECT conversation's display name is derived client-side from the other participant. */
  name?: string | null;
  createdByUserId: string;
  createdAt: string;
  participants: ConversationParticipant[];
  lastMessage?: ConversationLastMessage | null;
  /** Derived from ConversationMember.lastReadAt vs. the newest message — never a separately-maintained counter (see CHAT.md). */
  unreadCount: number;
}

export interface MessageSender {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface MessageSummary {
  id: string;
  conversationId: string;
  body: string;
  mentionedUserIds: string[];
  senderUser: MessageSender;
  editedAt?: string | null;
  createdAt: string;
}
