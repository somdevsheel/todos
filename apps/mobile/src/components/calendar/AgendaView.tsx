import { SectionList, StyleSheet, Text } from "react-native";
import type { EventSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { EventRow } from "@/components/EventRow";
import { EmptyState } from "@/components/ScreenState";

function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

function dayHeading(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

/**
 * Extracted from calendar/index.tsx (Phase 6's original agenda-only
 * screen) into its own component, matching MonthView/WeekView/DayView's
 * `{events, anchor}` prop shape now that index.tsx fetches once at the top
 * and hands events down to whichever view is active, rather than each view
 * self-fetching (agenda's own useApiQuery call here is what originally had
 * the unmemoized-Date infinite-loop bug — see ANDROID.md/the fix commit;
 * this refactor is also what made that class of bug structurally
 * impossible to reintroduce per-view, since only index.tsx computes dates
 * into a query string now).
 */
export function AgendaView({ events }: { events: EventSummary[]; anchor: Date }) {
  const sections = Object.values(
    events.reduce<Record<string, { title: string; data: EventSummary[] }>>((acc, event) => {
      const key = dayKey(event.startAt);
      if (!acc[key]) acc[key] = { title: dayHeading(event.startAt), data: [] };
      acc[key].data.push(event);
      return acc;
    }, {}),
  );

  if (sections.length === 0) {
    return <EmptyState title="Nothing scheduled" description="Nothing on your calendar in this range." />;
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <EventRow event={item} />}
      renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
      stickySectionHeadersEnabled={false}
      scrollEnabled={false}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.inkMuted,
    textTransform: "uppercase",
    marginTop: 10,
    marginBottom: 6,
  },
});
