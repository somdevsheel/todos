import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { EVENT_RSVP_STATUS_LABELS, type EventDetail, type EventRsvpStatus } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";

const RSVP_OPTIONS: EventRsvpStatus[] = ["ACCEPTED", "TENTATIVE", "DECLINED"];

function formatDateTime(iso: string, isAllDay: boolean): string {
  const date = new Date(iso);
  return isAllDay
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : date.toLocaleString("en-GB", { day: "numeric", month: "long", hour: "numeric", minute: "2-digit", hour12: true });
}

export default function EventDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const event = useApiQuery<EventDetail>(`/events/${id}`);
  const [responding, setResponding] = useState(false);

  const respond = async (status: EventRsvpStatus) => {
    if (!id) return;
    setResponding(true);
    try {
      await apiFetch(`/events/${id}/rsvp`, { method: "PATCH", body: JSON.stringify({ status }) });
      event.reload();
    } catch {
      // no toast library on mobile yet — the reloaded RSVP badge is the feedback
    } finally {
      setResponding(false);
    }
  };

  if (event.loading && !event.data) return <LoadingState />;
  if (event.error || !event.data) return <ErrorState message={event.error ?? "Event not found"} />;

  const data = event.data;
  const mine = data.participants.find((p) => p.id === user?.id);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card style={styles.gap}>
        <Text style={styles.title}>{data.title}</Text>
        {data.description && <Text style={styles.description}>{data.description}</Text>}

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
          <Text style={styles.meta}>
            {formatDateTime(data.startAt, data.isAllDay)} – {formatDateTime(data.endAt, data.isAllDay)}
          </Text>
        </View>
        {data.location && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={colors.inkMuted} />
            <Text style={styles.meta}>{data.location}</Text>
          </View>
        )}
        {data.meetingUrl && (
          <View style={styles.metaRow}>
            <Ionicons name="videocam-outline" size={14} color={colors.inkMuted} />
            <Text style={styles.meta}>{data.meetingUrl}</Text>
          </View>
        )}

        {mine && (
          <View style={styles.rsvpRow}>
            {RSVP_OPTIONS.map((option) => (
              <Button
                key={option}
                label={EVENT_RSVP_STATUS_LABELS[option]}
                variant={mine.rsvpStatus === option ? "primary" : "secondary"}
                loading={responding}
                disabled={responding}
                onPress={() => respond(option)}
              />
            ))}
          </View>
        )}
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Participants</Text>
        {data.participants.map((participant) => (
          <View key={participant.id} style={styles.participantRow}>
            <Text style={styles.participantName}>
              {participant.firstName} {participant.lastName}
            </Text>
            <Badge label={EVENT_RSVP_STATUS_LABELS[participant.rsvpStatus]} color={colors.accentStrong} background={colors.accentSoft} />
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 12 },
    gap: { gap: 10 },
    title: { fontSize: 18, fontWeight: "700", color: colors.ink },
    description: { fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    meta: { fontSize: 13, color: colors.inkMuted, flexShrink: 1 },
    rsvpRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
    participantRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
    participantName: { fontSize: 14, color: colors.ink },
  });
}
