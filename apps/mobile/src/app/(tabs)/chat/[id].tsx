import { useEffect, useRef, useState } from "react";
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import type { MessageSummary, PaginatedResult } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useChatSocket } from "@/lib/socket-context";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { Button } from "@/components/Button";

const TYPING_TIMEOUT_MS = 4000;
const TYPING_STOP_DELAY_MS = 2000;

export default function ConversationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const socket = useChatSocket();
  const initial = useApiQuery<PaginatedResult<MessageSummary>>(id ? `/conversations/${id}/messages?pageSize=50` : null, [id]);

  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const isTyping = useRef(false);
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listRef = useRef<FlatList<MessageSummary>>(null);

  useEffect(() => setMessages(initial.data?.items ?? []), [initial.data]);

  // Focus/blur — same server-side effect as apps/web/src/components/chat/ConversationView.tsx:
  // marks read and tells MessagesService's online/push notification dedup this thread is being watched live.
  useEffect(() => {
    if (!socket || !id) return;
    const focus = () => socket.emit("conversation:focus", { conversationId: id });
    focus();
    socket.on("connect", focus);
    return () => {
      socket.emit("conversation:blur");
      socket.off("connect", focus);
    };
  }, [socket, id]);

  useEffect(() => {
    if (!socket || !id || !user) return;

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

    const onNew = (message: MessageSummary) => {
      if (message.conversationId !== id) return;
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      clearTyping(message.senderUser.id);
    };
    const onUpdated = (message: MessageSummary) => {
      if (message.conversationId !== id) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };
    const onDeleted = ({ id: messageId, conversationId }: { id: string; conversationId: string }) => {
      if (conversationId !== id) return;
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    };
    const onTypingStart = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId !== id || userId === user.id) return;
      setTypingUserIds((prev) => new Set(prev).add(userId));
      const existing = typingTimers.current.get(userId);
      if (existing) clearTimeout(existing);
      typingTimers.current.set(userId, setTimeout(() => clearTyping(userId), TYPING_TIMEOUT_MS));
    };
    const onTypingStop = ({ conversationId, userId }: { conversationId: string; userId: string }) => {
      if (conversationId === id) clearTyping(userId);
    };

    socket.on("message:new", onNew);
    socket.on("message:updated", onUpdated);
    socket.on("message:deleted", onDeleted);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    const timers = typingTimers.current; // stable for the component's lifetime — captured so cleanup doesn't read the ref directly
    return () => {
      socket.off("message:new", onNew);
      socket.off("message:updated", onUpdated);
      socket.off("message:deleted", onDeleted);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, [socket, id, user]);

  const notifyTyping = () => {
    if (!socket || !id) return;
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit("typing:start", { conversationId: id });
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit("typing:stop", { conversationId: id });
    }, TYPING_STOP_DELAY_MS);
  };

  const send = async () => {
    if (!body.trim() || !id) return;
    setSending(true);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      socket?.emit("typing:stop", { conversationId: id });
    }
    try {
      const message = await apiFetch<MessageSummary>(`/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: body.trim() }),
      });
      setMessages((prev) => (prev.some((m) => m.id === message.id) ? prev : [...prev, message]));
      setBody("");
    } catch {
      // no toast library on mobile yet
    } finally {
      setSending(false);
    }
  };

  if (initial.loading && messages.length === 0) return <LoadingState />;
  if (initial.error) return <ErrorState message={initial.error} />;

  const typingLabel =
    typingUserIds.size > 0
      ? `${typingUserIds.size === 1 ? "Someone is" : `${typingUserIds.size} people are`} typing…`
      : null;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const mine = item.senderUser.id === user?.id;
          return (
            <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {!mine && (
                  <Text style={styles.senderName}>
                    {item.senderUser.firstName} {item.senderUser.lastName}
                  </Text>
                )}
                <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
              </View>
            </View>
          );
        }}
      />

      {typingLabel && <Text style={styles.typing}>{typingLabel}</Text>}

      <View style={styles.composer}>
        <TextInput
          value={body}
          onChangeText={(text) => {
            setBody(text);
            notifyTyping();
          }}
          placeholder="Write a message…"
          placeholderTextColor={colors.inkMuted}
          style={styles.input}
          multiline
        />
        <Button label="Send" onPress={send} loading={sending} disabled={!body.trim()} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  list: { padding: 12, gap: 8 },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleTheirs: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  bubbleMine: { backgroundColor: colors.accent },
  senderName: { fontSize: 11, fontWeight: "600", color: colors.inkMuted, marginBottom: 2 },
  bubbleText: { fontSize: 14, color: colors.ink },
  bubbleTextMine: { color: colors.white },
  typing: { fontSize: 12, fontStyle: "italic", color: colors.inkMuted, paddingHorizontal: 16, paddingBottom: 4 },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
  },
});
