import { Pressable, StyleSheet, Text, View } from "react-native";
import type { EventSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { eventsForDay, getMonthGridDays, isSameDay, startOfMonth } from "@/lib/calendar-dates";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Dot-indicator grid, not web's MonthView's full event chips crammed into
 * cells — a phone-width grid cell can't fit 3 legible event titles the way
 * a desktop one can. Tap a day to jump straight to that day's Day view
 * instead, the standard mobile calendar pattern (Google/Apple Calendar
 * both do this).
 */
export function MonthView({ events, anchor, onSelectDay }: { events: EventSummary[]; anchor: Date; onSelectDay: (day: Date) => void }) {
  const days = getMonthGridDays(startOfMonth(anchor));
  const today = new Date();

  return (
    <View style={styles.container}>
      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {days.map((day) => {
          const dayEvents = eventsForDay(events, day);
          const inMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);
          return (
            <Pressable key={day.toISOString()} style={styles.cell} onPress={() => onSelectDay(day)}>
              <View style={[styles.dateBubble, isToday && styles.dateBubbleToday]}>
                <Text style={[styles.dateText, isToday && styles.dateTextToday, !inMonth && styles.dateTextOutOfMonth]}>{day.getDate()}</Text>
              </View>
              {dayEvents.length > 0 && (
                <View style={styles.dotsRow}>
                  {dayEvents.slice(0, 3).map((event) => (
                    <View key={event.id} style={styles.dot} />
                  ))}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  weekdayRow: { flexDirection: "row" },
  weekdayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", color: colors.inkMuted, paddingBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 6, gap: 4 },
  dateBubble: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  dateBubbleToday: { backgroundColor: colors.accent },
  dateText: { fontSize: 13, color: colors.ink },
  dateTextToday: { color: colors.white, fontWeight: "700" },
  dateTextOutOfMonth: { color: colors.inkMuted, opacity: 0.5 },
  dotsRow: { flexDirection: "row", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent },
});
