import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { ConversationSummary, MessageSummary } from "@arutech/shared-types";
import { useAuth } from "@/lib/auth-context";
import { useChatSocket } from "@/lib/socket-context";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";

function displayName(conversation: ConversationSummary, currentUserId: string): string {
  if (conversation.type === "GROUP") return conversation.name ?? "Group";
  const other = conversation.participants.find((p) => p.id !== currentUserId);
  return other ? `${other.firstName} ${other.lastName}` : "Direct message";
}

export default function ChatListScreen() {
  const { user } = useAuth();
  const socket = useChatSocket();
  const { data, loading, error, reload } = useApiQuery<ConversationSummary[]>("/conversations");
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => setConversations(data ?? []), [data]);

  // Same live-list-patching approach as apps/web/src/components/chat/ConversationListLive.tsx —
  // every conversation room is auto-joined server-side on connect, so
  // message:new for any of this user's conversations arrives here too.
  useEffect(() => {
    if (!socket || !user) return;
    const onMessageNew = (message: MessageSummary) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === message.conversationId
            ? {
                ...c,
                lastMessage: { id: message.id, body: message.body, senderUserId: message.senderUser.id, createdAt: message.createdAt },
                unreadCount: message.senderUser.id === user.id ? c.unreadCount : c.unreadCount + 1,
              }
            : c,
        );
        return [...next].sort((a, b) => (b.lastMessage?.createdAt ?? b.createdAt).localeCompare(a.lastMessage?.createdAt ?? a.createdAt));
      });
    };
    socket.on("message:new", onMessageNew);
    return () => {
      socket.off("message:new", onMessageNew);
    };
  }, [socket, user]);

  if (loading && conversations.length === 0) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/chat/new" asChild>
              <Pressable hitSlop={8}>
                <Ionicons name="add" size={26} color={colors.accent} />
              </Pressable>
            </Link>
          ),
        }}
      />

      {conversations.length === 0 ? (
        <EmptyState title="No conversations yet" description="Start a direct message to get chatting." />
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={reload}
          refreshing={loading}
          renderItem={({ item }) => (
            <Link href={`/chat/${item.id}`} asChild>
              <Card style={styles.row}>
                <View style={styles.rowContent}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user ? displayName(item, user.id) : ""}
                  </Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage?.body ?? "No messages yet"}
                  </Text>
                </View>
                {item.unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadLabel}>{item.unreadCount}</Text>
                  </View>
                )}
              </Card>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  list: { padding: 12, gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowContent: { flex: 1, gap: 2 },
  name: { fontSize: 15, fontWeight: "600", color: colors.ink },
  preview: { fontSize: 13, color: colors.inkMuted },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  unreadLabel: { color: colors.white, fontSize: 11, fontWeight: "700" },
});
