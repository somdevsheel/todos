import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { DepartmentSummary } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

/** SUPER_ADMIN/ADMIN only — gated by not being reachable from settings/index.tsx's tile list for anyone else; the API enforces the same roles server-side regardless. */
export default function DepartmentsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, loading, error, reload } = useApiQuery<DepartmentSummary[]>("/departments");

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const startCreate = () => {
    setEditingId("new");
    setName("");
    setDescription("");
  };
  const startEdit = (department: DepartmentSummary) => {
    setEditingId(department.id);
    setName(department.name);
    setDescription(department.description ?? "");
  };
  const cancel = () => setEditingId(null);

  const save = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editingId === "new") {
        await apiFetch("/departments", { method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }) });
      } else if (editingId) {
        await apiFetch(`/departments/${editingId}`, { method: "PATCH", body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }) });
      }
      setEditingId(null);
      reload();
    } catch (err) {
      Alert.alert("Unable to save", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (department: DepartmentSummary) => {
    Alert.alert("Delete department?", `"${department.name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/departments/${department.id}`, { method: "DELETE" });
            reload();
          } catch (err) {
            Alert.alert("Unable to delete", err instanceof ApiClientError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {editingId && (
        <Card style={styles.gap}>
          <TextField label="Name" value={name} onChangeText={setName} autoFocus />
          <TextField label="Description" value={description} onChangeText={setDescription} multiline />
          <View style={styles.formActions}>
            <Button label="Cancel" variant="secondary" onPress={cancel} />
            <Button label="Save" onPress={save} loading={submitting} disabled={!name.trim()} />
          </View>
        </Card>
      )}

      {!data || data.length === 0 ? (
        <EmptyState title="No departments yet" description="Create one to start organizing teams." />
      ) : (
        data.map((department) => (
          <Card key={department.id} style={styles.row}>
            <View style={styles.rowContent}>
              <Text style={styles.name}>{department.name}</Text>
              {department.description && <Text style={styles.description}>{department.description}</Text>}
            </View>
            <Pressable hitSlop={8} onPress={() => startEdit(department)}>
              <Ionicons name="pencil-outline" size={18} color={colors.inkMuted} />
            </Pressable>
            <Pressable hitSlop={8} onPress={() => remove(department)}>
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
            </Pressable>
          </Card>
        ))
      )}

      {!editingId && <Button label="Add department" variant="secondary" onPress={startCreate} />}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 10 },
    gap: { gap: 10 },
    formActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    rowContent: { flex: 1, gap: 2 },
    name: { fontSize: 14, fontWeight: "600", color: colors.ink },
    description: { fontSize: 12, color: colors.inkMuted },
  });
}
