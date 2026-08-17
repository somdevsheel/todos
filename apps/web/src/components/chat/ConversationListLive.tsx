"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ConversationSummary, MessageSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserAvatar } from "@/components/user/UserAvatar";
import { useChatSocket } from "./SocketProvider";

export interface ConversationListLiveProps {
  conversations: ConversationSummary[];
  currentUserId: string;
}

function displayName(conversation: ConversationSummary, currentUserId: string): string {
  if (conversation.type === "GROUP") return conversation.name ?? "Group";
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other ? `${other.firstName} ${other.lastName}` : "Direct message";
}

function formatPreviewTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/**
 * Hydrates with the server-fetched list (fast first paint, same pattern
 * every other list page in the app uses) then patches itself live off the
 * shared socket — every conversation room is auto-joined on connect (see
 * ChatGateway), so `message:new` for *any* of this user's conversations
 * arrives here even while browsing the list, not just inside an open thread.
 */
export function ConversationListLive({ conversations: initial, currentUserId }: ConversationListLiveProps) {
  const [conversations, setConversations] = useState(initial);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const socket = useChatSocket();
  const pathname = usePathname();
  const openConversationId = pathname.startsWith("/chat/") ? pathname.slice("/chat/".length) : null;

  useEffect(() => setConversations(initial), [initial]);

  useEffect(() => {
    if (!socket) return;

    const onMessageNew = (message: MessageSummary) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: { id: message.id, body: message.body, senderUserId: message.senderUser.id, createdAt: message.createdAt },
                unreadCount: c.id === openConversationId || message.senderUser.id === currentUserId ? c.unreadCount : c.unreadCount + 1,
              }
            : c,
        );
        return [...next].sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt));
      });
    };

    const onOnline = ({ userId }: { userId: string }) => setOnlineUserIds((prev) => new Set(prev).add(userId));
    const onOffline = ({ userId }: { userId: string }) =>
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    const onSnapshot = ({ onlineUserIds: ids }: { onlineUserIds: string[] }) => setOnlineUserIds(new Set(ids));

    socket.on("message:new", onMessageNew);
    socket.on("presence:online", onOnline);
    socket.on("presence:offline", onOffline);
    socket.on("presence:snapshot", onSnapshot);
    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("presence:online", onOnline);
      socket.off("presence:offline", onOffline);
      socket.off("presence:snapshot", onSnapshot);
    };
  }, [socket, currentUserId, openConversationId]);

  if (conversations.length === 0) {
    return <EmptyState title="No conversations yet" description="Start a direct message or create a group to get chatting." />;
  }

  return (
    <div className="flex flex-col gap-2">
      {conversations.map((conversation) => {
        const other = conversation.type === "DIRECT" ? conversation.participants.find((p) => p.id !== currentUserId) : undefined;
        return (
          <Link key={conversation.id} href={`/chat/${conversation.id}`}>
            <Card className="flex items-center gap-3 p-3 transition-shadow hover:shadow-md">
              <UserAvatar
                firstName={other?.firstName ?? conversation.name ?? "?"}
                lastName={other?.lastName ?? ""}
                presence={conversation.type === "DIRECT" && other ? (onlineUserIds.has(other.id) ? "online" : "offline") : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-[var(--color-ink)]">{displayName(conversation, currentUserId)}</p>
                  {conversation.lastMessage && (
                    <span className="flex-none text-xs text-[var(--color-ink-muted)]">{formatPreviewTime(conversation.lastMessage.createdAt)}</span>
                  )}
                </div>
                <p className="truncate text-xs text-[var(--color-ink-muted)]">{conversation.lastMessage?.body ?? "No messages yet"}</p>
              </div>
              {conversation.unreadCount > 0 && (
                <span className="flex h-5 min-w-5 flex-none items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-xs font-semibold text-white">
                  {conversation.unreadCount}
                </span>
              )}
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
