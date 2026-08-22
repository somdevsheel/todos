import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { EventSummary } from "@arutech/shared-types";
import { useThemeColors } from "@/lib/theme";
import { eventsForDay, getWeekDays, isSameDay, startOfWeek } from "@/lib/calendar-dates";
import { EventRow } from "@/components/EventRow";
import { EmptyState } from "@/components/ScreenState";

function formatDayHeading(date: Date): string {
  return date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}

/**
 * A vertical stack of all 7 days (unlike Agenda, which skips empty days) —
 * web's WeekView lays these out as 7 side-by-side columns, which doesn't
 * fit a phone's width; stacking keeps every day legible instead of
 * cramming 7 narrow columns onto one screen.
 */
export function WeekView({ events, anchor }: { events: EventSummary[]; anchor: Date }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const days = getWeekDays(startOfWeek(anchor));
  const today = new Date();

  if (events.length === 0) {
    return <EmptyState title="Nothing scheduled this week" description="Create an event to put it on the calendar." />;
  }

  return (
    <View style={styles.container}>
      {days.map((day) => {
        const dayEvents = eventsForDay(events, day);
        return (
          <View key={day.toISOString()} style={styles.section}>
            <Text style={[styles.heading, isSameDay(day, today) && styles.headingToday]}>{formatDayHeading(day)}</Text>
            {dayEvents.length === 0 ? (
              <Text style={styles.empty}>—</Text>
            ) : (
              <View style={styles.eventsGap}>
                {dayEvents.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    container: { gap: 16 },
    section: { gap: 8 },
    heading: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
    headingToday: { color: colors.accentStrong },
    empty: { fontSize: 13, color: colors.inkMuted },
    eventsGap: { gap: 8 },
  });
}
