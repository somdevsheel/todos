import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskDetail, type TaskPriority } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { DateTimeField } from "@/components/DateTimeField";

export default function NewTaskScreen() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const task = await apiFetch<TaskDetail>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
        }),
      });
      router.replace(`/tasks/${task.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to create the task.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <TextField label="Title" value={title} onChangeText={setTitle} autoFocus placeholder="What needs doing?" />
        <TextField label="Description" value={description} onChangeText={setDescription} multiline style={styles.multiline} />
        <DateTimeField label="Due date" value={dueDate} onChange={setDueDate} mode="date" />

        <View style={styles.field}>
          <Text style={styles.label}>Priority</Text>
          <View style={styles.priorityRow}>
            {TASK_PRIORITIES.map((option) => (
              <Pressable
                key={option}
                onPress={() => setPriority(option)}
                style={[styles.priorityChip, priority === option && styles.priorityChipActive]}
              >
                <Text style={[styles.priorityLabel, priority === option && styles.priorityLabelActive]}>
                  {TASK_PRIORITY_LABELS[option]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button label="Create task" onPress={submit} loading={submitting} disabled={!title.trim()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  content: { padding: 16, gap: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  priorityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  priorityChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  priorityChipActive: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  priorityLabel: { fontSize: 13, color: colors.inkMuted },
  priorityLabelActive: { color: colors.accentStrong, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13 },
});
