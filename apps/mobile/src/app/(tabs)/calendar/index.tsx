import { useMemo } from "react";
import { Pressable, SectionList, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { EventSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { EventRow } from "@/components/EventRow";

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayHeading(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Agenda-only on mobile, not the web app's month/week/day grid views — a
 * scrollable list grouped by day (rolling 30-day window off the same
 * GET /events?from=&to= range endpoint) is the standard mobile calendar
 * pattern given the smaller screen. Known simplification, see ANDROID.md.
 */
export default function CalendarAgendaScreen() {
  // Computed once per mount, not on every render — a real bug found live:
  // `new Date()` here, unmemoized, produces a millisecond-different string
  // on every render, and useApiQuery's effect depends on that exact string
  // (see use-api.ts), so each render triggered a brand new fetch, whose
  // resulting setLoading/setData re-render triggered the next one —
  // an infinite loop that hammered the real production API into its own
  // rate limiter within seconds. Confirmed via real server logs, not
  // theoretical. useMemo(() => ..., []) computes it exactly once, matching
  // the actual intent ("agenda for the next 30 days from when I opened
  // this screen"), not "recomputed every render."
  const query = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + 30 * 24 * 60 * 60 * 1000);
    return `/events?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}`;
  }, []);
  const { data: events, loading, error, reload } = useApiQuery<EventSummary[]>(query);

  if (loading && !events) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const sections = Object.values(
    (events ?? []).reduce<Record<string, { title: string; data: EventSummary[] }>>((acc, event) => {
      const key = dayKey(event.startAt);
      if (!acc[key]) acc[key] = { title: dayHeading(event.startAt), data: [] };
      acc[key].data.push(event);
      return acc;
    }, {}),
  );

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/calendar/new" asChild>
              <Pressable hitSlop={8}>
                <Ionicons name="add" size={26} color={colors.accent} />
              </Pressable>
            </Link>
          ),
        }}
      />

      {sections.length === 0 ? (
        <EmptyState title="Nothing scheduled" description="Nothing on your calendar in the next 30 days." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <EventRow event={item} />}
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
          onRefresh={reload}
          refreshing={loading}
          stickySectionHeadersEnabled={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  list: { padding: 12, gap: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
  },
});
