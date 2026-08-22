import { useMemo } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Stack, router } from "expo-router";
import type { PaginatedResult } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";

/** Mirrors apps/api/src/notifications/notifications.service.ts's NotificationDto — not exported via shared-types, so duplicated here rather than reaching into the API's own internal service file. */
interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string;
  data: unknown;
  isRead: boolean;
  createdAt: string;
}

/**
 * Reached via the bell icon in (tabs)/_layout.tsx's header, not a tab of
 * its own — matches web, which never puts Notifications in its bottom nav
 * either (see NAV_ITEMS' showInBottomNav flags), only its Topbar. Lives
 * outside the (tabs) group at the top level so it's a plain push from
 * wherever the bell is tapped, not a 6th tab.
 */
export default function NotificationsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, loading, error, reload } = useApiQuery<PaginatedResult<NotificationDto>>("/notifications?pageSize=50");

  const markRead = async (notification: NotificationDto) => {
    if (notification.isRead) {
      navigateToEntity(notification);
      return;
    }
    try {
      await apiFetch(`/notifications/${notification.id}/read`, { method: "PATCH" });
      reload();
    } catch {
      // navigation still proceeds even if the mark-read call fails — not worth blocking on
    }
    navigateToEntity(notification);
  };

  const navigateToEntity = (notification: NotificationDto) => {
    const data = notification.data as { taskId?: string; eventId?: string; conversationId?: string } | null;
    if (data?.taskId) router.push(`/tasks/${data.taskId}`);
    else if (data?.eventId) router.push(`/calendar/${data.eventId}`);
    else if (data?.conversationId) router.push(`/chat/${data.conversationId}`);
  };

  const markAllRead = async () => {
    try {
      await apiFetch("/notifications/read-all", { method: "PATCH" });
      reload();
    } catch {
      // the list just won't reflect it until the next successful reload
    }
  };

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: "Notifications",
          headerRight: () => (
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text style={styles.markAllLabel}>Mark all read</Text>
            </Pressable>
          ),
        }}
      />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No notifications yet" description="You're all caught up." />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onRefresh={reload}
          refreshing={loading}
          renderItem={({ item }) => (
            <Pressable onPress={() => markRead(item)}>
              <Card style={[styles.row, !item.isRead && styles.rowUnread]}>
                <View style={styles.rowHeader}>
                  {!item.isRead && <View style={styles.dot} />}
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
                <Text style={styles.body} numberOfLines={2}>
                  {item.body}
                </Text>
                <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
              </Card>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    markAllLabel: { fontSize: 13, fontWeight: "600", color: colors.accent },
    list: { padding: 12, gap: 8 },
    row: { gap: 4 },
    rowUnread: { borderColor: colors.accent },
    rowHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    title: { fontSize: 14, fontWeight: "600", color: colors.ink, flexShrink: 1 },
    body: { fontSize: 13, color: colors.inkMuted },
    time: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  });
}
