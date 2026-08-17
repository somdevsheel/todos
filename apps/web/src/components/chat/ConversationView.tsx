"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationSummary, MessageSummary } from "@arutech/shared-types";
import { MessageBubble } from "./MessageBubble";
import { MessageComposer } from "./MessageComposer";
import { useChatSocket } from "./SocketProvider";

export interface ConversationViewProps {
  conversation: ConversationSummary;
  initialMessages: MessageSummary[];
  currentUserId: string;
}

const TYPING_TIMEOUT_MS = 4000;

export function ConversationView({ conversation, initialMessages, currentUserId }: ConversationViewProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const socket = useChatSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => setMessages(initialMessages), [initialMessages]);

  // Opening/leaving this specific thread — drives both the live room
  // delivery already established at connect time and the online/push
  // notification-dedup rule on the server (see MessagesService).
  useEffect(() => {
    if (!socket) return;
    const focus = () => socket.emit("conversation:focus", { conversationId: conversation.id });
    focus();
    socket.on("connect", focus); // re-focus after a reconnect (new socket, server-side focus state reset)
    return () => {
      socket.emit("conversation:blur");
      socket.off("connect", focus);
    };
  }, [socket, conversation.id]);

  useEffect(() => {
    if (!socket) return;

    const onNew = (message: MessageSummary) => {
      if (message.conversationId !== conversation.id) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      clearTyping(message.senderUser.id);
    };
    const onUpdated = (message: MessageSummary) => {
      if (message.conversationId !== conversation.id) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };
    const onDeleted = ({ id, conversationId }: { id: string; conversationId: string }) => {
      if (conversationId !== conversation.id) return;
      setMessages((prev) => prev.filter((m) => m.id !== id));
    };
    const onTypingStart = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId !== conversation.id || userId === currentUserId) return;
      setTypingUserIds((prev) => new Set(prev).add(userId));
      const existing = typingTimers.current.get(userId);
      if (existing) clearTimeout(existing);
      typingTimers.current.set(
        userId,
        setTimeout(() => clearTyping(userId), TYPING_TIMEOUT_MS),
      );
    };
    const onTypingStop = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId !== conversation.id) return;
      clearTyping(userId);
    };

    function clearTyping(userId: string) {
      const timer = typingTimers.current.get(userId);
      if (timer) clearTimeout(timer);
      typingTimers.current.delete(userId);
      setTypingUserIds((prev) => {
        if (!prev.has(userId)) return prev;
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }

    socket.on("message:new", onNew);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      for (const timer of typingTimers.current.values()) clearTimeout(timer);
    };
  }, [socket, conversation.id, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const typingNames = [...typingUserIds]
    .map((id) => conversation.participants.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .map((p) => p.firstName);

  return (
    <div className="flex h-[calc(100vh-14rem)] flex-col gap-3">
      <div className="flex-1 overflow-y-auto pr-1">
        <div className="flex flex-col gap-3">
          {messages.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No messages yet — say hello.</p>}
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} isMine={message.senderUser.id === currentUserId} />
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      {typingNames.length > 0 && (
        <p className="text-xs italic text-[var(--color-ink-muted)]">
          {typingNames.join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
        </p>
      )}

      <MessageComposer
        conversationId={conversation.id}
        onSent={(message) => setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]))}
      />
    </div>
  );
}
