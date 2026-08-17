import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import type { EventDetail } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

/**
 * Plain text date/time fields, not a native date-time picker widget — that
 * would mean pulling in @react-native-community/datetimepicker with no
 * way to visually verify it renders correctly on-device in this
 * environment (see ANDROID.md's verification note). Known simplification.
 */
export default function NewEventScreen() {
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !startAt || !endAt) return;
    setError(null);
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Use the format YYYY-MM-DD HH:MM for start/end.");
      return;
    }
    setSubmitting(true);
    try {
      const event = await apiFetch<EventDetail>("/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim() || undefined,
          startAt: start.toISOString(),
          endAt: end.toISOString(),
        }),
      });
      router.replace(`/calendar/${event.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create the event.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField label="Title" value={title} onChangeText={setTitle} autoFocus placeholder="Sprint planning" />
        <TextField label="Location" value={location} onChangeText={setLocation} placeholder="Room 4, or leave blank" />
        <TextField label="Starts" value={startAt} onChangeText={setStartAt} placeholder="2026-08-20 10:00" autoCapitalize="none" />
        <TextField label="Ends" value={endAt} onChangeText={setEndAt} placeholder="2026-08-20 11:00" autoCapitalize="none" />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Create event" onPress={submit} loading={submitting} disabled={!title.trim() || !startAt || !endAt} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  content: { padding: 16, gap: 16 },
  error: { color: colors.danger, fontSize: 13 },
});
