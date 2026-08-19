import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useCallback, useMemo, useState } from "react";
import type { ConversationSummary, EventSummary, TaskStats } from "@arutech/shared-types";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { StatCard } from "@/components/StatCard";
import { LoadingState } from "@/components/ScreenState";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  // Computed once per mount — see the Calendar tab's identical fix for why
  // an unmemoized `new Date()` here is a real bug, not just style: this
  // exact pattern, on this exact screen, was confirmed live to be one of
  // the two sources hammering the production API into its own rate
  // limiter (the other being the Calendar tab's 30-day version — the two
  // interleaved in the real server logs, which is what made the pattern
  // legible as "two different window sizes firing at once" rather than one).
  const eventsQuery = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 7 * 24 * 60 * 60 * 1000);
    return `/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  }, []);

  const taskStats = useApiQuery<TaskStats>("/tasks/stats");
  const upcomingEvents = useApiQuery<EventSummary[]>(eventsQuery);
  const conversations = useApiQuery<ConversationSummary[]>("/conversations");
  const unreadNotifications = useApiQuery<{ count: number }>("/notifications/unread-count");

  const reloadAll = useCallback(() => {
    taskStats.reload();
    upcomingEvents.reload();
    conversations.reload();
    unreadNotifications.reload();
  }, [taskStats, upcomingEvents, conversations, unreadNotifications]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    reloadAll();
    setTimeout(() => setRefreshing(false), 400);
  }, [reloadAll]);

  if (taskStats.loading && !taskStats.data) return <LoadingState />;

  const unreadMessages = (conversations.data ?? []).reduce((sum, c) => sum + c.unreadCount, 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
    >
      <View>
        <Text style={styles.title}>
          {greeting()}, {user?.firstName}
        </Text>
        <Text style={styles.subtitle}>Here&apos;s what&apos;s happening today.</Text>
      </View>

      <View style={styles.grid}>
        <StatCard icon="checkbox-outline" label="My tasks" value={taskStats.data?.myTasks ?? 0} />
        <StatCard icon="time-outline" label="Due today" value={taskStats.data?.dueToday ?? 0} />
        <StatCard icon="alert-circle-outline" label="Overdue" value={taskStats.data?.overdue ?? 0} />
        <StatCard icon="calendar-outline" label="Upcoming events" value={upcomingEvents.data?.length ?? 0} />
        <StatCard icon="chatbubble-outline" label="Unread messages" value={unreadMessages} />
        <StatCard icon="notifications-outline" label="Notifications" value={unreadNotifications.data?.count ?? 0} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 20, backgroundColor: colors.surfaceSubtle },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink },
  subtitle: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
