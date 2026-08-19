import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { CALENDAR_VIEWS, type CalendarView, type EventSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { addDays, rangeForView } from "@/lib/calendar-dates";
import { AgendaView } from "@/components/calendar/AgendaView";
import { MonthView } from "@/components/calendar/MonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { DayView } from "@/components/calendar/DayView";

const VIEW_LABELS: Record<CalendarView, string> = { month: "Month", week: "Week", day: "Day", agenda: "Agenda" };
const STEP_DAYS: Record<CalendarView, number> = { month: 0, week: 7, day: 1, agenda: 30 };

function step(view: CalendarView, anchor: Date, direction: 1 | -1): Date {
  if (view === "month") return new Date(anchor.getFullYear(), anchor.getMonth() + direction, 1);
  return addDays(anchor, STEP_DAYS[view] * direction);
}

/**
 * Parent fetches once, hands `events` down to whichever view is active —
 * same architecture as apps/web/src/app/(dashboard)/calendar/page.tsx, and
 * the fix for the real infinite-loop bug this exact screen had before (see
 * AgendaView.tsx's docstring): `range`/`query` below are memoized on
 * `[view, anchor]`, not recomputed from a bare `new Date()` on every
 * render, so useApiQuery's effect only re-fires on an actual navigation
 * action, never on its own re-render.
 */
export default function CalendarScreen() {
  const [view, setView] = useState<CalendarView>("agenda");
  const [anchor, setAnchor] = useState(new Date());

  const range = useMemo(() => rangeForView(view, anchor), [view, anchor]);
  const query = useMemo(
    () => `/events?from=${encodeURIComponent(range.from.toISOString())}&to=${encodeURIComponent(range.to.toISOString())}`,
    [range.from, range.to],
  );
  const { data: events, loading, error, reload } = useApiQuery<EventSummary[]>(query);

  const goToday = () => setAnchor(view === "month" ? new Date(new Date().getFullYear(), new Date().getMonth(), 1) : new Date());
  const selectDay = (day: Date) => {
    setAnchor(day);
    setView("day");
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
    >
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

      <View style={styles.toggleRow}>
        {CALENDAR_VIEWS.map((option) => (
          <Pressable key={option} onPress={() => setView(option)} style={[styles.toggleOption, view === option && styles.toggleOptionActive]}>
            <Text style={[styles.toggleLabel, view === option && styles.toggleLabelActive]}>{VIEW_LABELS[option]}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={() => setAnchor(step(view, anchor, -1))} hitSlop={8}>
          <Ionicons name="chevron-back" size={20} color={colors.ink} />
        </Pressable>
        <Pressable onPress={goToday} style={styles.todayButton}>
          <Text style={styles.todayLabel}>Today</Text>
        </Pressable>
        <Pressable onPress={() => setAnchor(step(view, anchor, 1))} hitSlop={8}>
          <Ionicons name="chevron-forward" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.rangeLabel} numberOfLines={1}>
          {range.label}
        </Text>
      </View>

      {loading && !events ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : (
        <>
          {view === "agenda" && <AgendaView events={events ?? []} anchor={anchor} />}
          {view === "month" && <MonthView events={events ?? []} anchor={anchor} onSelectDay={selectDay} />}
          {view === "week" && <WeekView events={events ?? []} anchor={anchor} />}
          {view === "day" && <DayView events={events ?? []} anchor={anchor} />}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  content: { padding: 16, gap: 14 },
  toggleRow: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  toggleOption: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  toggleOptionActive: { backgroundColor: colors.accentSoft },
  toggleLabel: { fontSize: 12, fontWeight: "600", color: colors.inkMuted },
  toggleLabelActive: { color: colors.accentStrong },
  navRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  todayButton: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border },
  todayLabel: { fontSize: 12, fontWeight: "600", color: colors.ink },
  rangeLabel: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.ink, textAlign: "right" },
});
