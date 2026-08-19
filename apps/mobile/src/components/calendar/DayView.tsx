import { StyleSheet, View } from "react-native";
import type { EventSummary } from "@arutech/shared-types";
import { eventsForDay } from "@/lib/calendar-dates";
import { EventRow } from "@/components/EventRow";
import { EmptyState } from "@/components/ScreenState";

export function DayView({ events, anchor }: { events: EventSummary[]; anchor: Date }) {
  const dayEvents = eventsForDay(events, anchor).sort((a, b) => a.startAt.localeCompare(b.startAt));

  if (dayEvents.length === 0) {
    return <EmptyState title="Nothing scheduled" description="Create an event to put it on this day's calendar." />;
  }

  return (
    <View style={styles.container}>
      {dayEvents.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
});
