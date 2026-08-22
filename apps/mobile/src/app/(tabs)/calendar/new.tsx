import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { router } from "expo-router";
import type { EventDetail } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { DateTimeField } from "@/components/DateTimeField";

export default function NewEventScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim() || !startAt || !endAt) return;
    setError(null);
    if (endAt.getTime() <= startAt.getTime()) {
      setError("End time must be after the start time.");
      return;
    }
    setSubmitting(true);
    try {
      const event = await apiFetch<EventDetail>("/events", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          location: location.trim() || undefined,
          startAt: startAt.toISOString(),
          endAt: endAt.toISOString(),
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
        <DateTimeField label="Starts" value={startAt} onChange={setStartAt} />
        <DateTimeField label="Ends" value={endAt} onChange={setEndAt} />
        {error && <Text style={styles.error}>{error}</Text>}
        <Button label="Create event" onPress={submit} loading={submitting} disabled={!title.trim() || !startAt || !endAt} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 16 },
    error: { color: colors.danger, fontSize: 13 },
  });
}
