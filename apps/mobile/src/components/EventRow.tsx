import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { EventSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { Card } from "./Card";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true });
}

export function EventRow({ event }: { event: EventSummary }) {
  return (
    <Link href={`/calendar/${event.id}`} asChild>
      <Card style={styles.card}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{event.isAllDay ? "All day" : `${formatTime(event.startAt)} – ${formatTime(event.endAt)}`}</Text>
          {event.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color={colors.inkMuted} />
              <Text style={styles.meta}>{event.location}</Text>
            </View>
          )}
        </View>
      </Card>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4 },
  title: { fontSize: 15, fontWeight: "600", color: colors.ink },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  meta: { fontSize: 12, color: colors.inkMuted },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 3 },
});
