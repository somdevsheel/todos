import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { TeamSummary } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { hasAnyRole } from "@/lib/rbac";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

/**
 * Same "no GET /teams/:id" note as web's teams/[id]/page.tsx applies here
 * too — the detail screen fetches this list and finds its team client-side.
 * departmentId assignment isn't exposed in this form (no native picker
 * component is installed in this app yet) — a team can still be created/
 * edited here, just without linking it to a department from mobile; that
 * remains a web-only action for now.
 */
export default function TeamsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { data, loading, error, reload } = useApiQuery<TeamSummary[]>("/teams");

  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canDelete = hasAnyRole(user, ["SUPER_ADMIN", "ADMIN"]);

  const startCreate = () => {
    setEditingId("new");
    setName("");
    setDescription("");
  };
  const startEdit = (team: TeamSummary) => {
    setEditingId(team.id);
    setName(team.name);
    setDescription(team.description ?? "");
  };

  const save = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      if (editingId === "new") {
        await apiFetch("/teams", { method: "POST", body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }) });
      } else if (editingId) {
        await apiFetch(`/teams/${editingId}`, { method: "PATCH", body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }) });
      }
      setEditingId(null);
      reload();
    } catch (err) {
      Alert.alert("Unable to save", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (team: TeamSummary) => {
    Alert.alert("Delete team?", `"${team.name}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/teams/${team.id}`, { method: "DELETE" });
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
            <Button label="Cancel" variant="secondary" onPress={() => setEditingId(null)} />
            <Button label="Save" onPress={save} loading={submitting} disabled={!name.trim()} />
          </View>
        </Card>
      )}

      {!data || data.length === 0 ? (
        <EmptyState title="No teams yet" description="Create one to start grouping employees." />
      ) : (
        data.map((team) => (
          <Card key={team.id} style={styles.row}>
            <Link href={`/settings/teams/${team.id}`} asChild>
              <Pressable style={styles.rowContent}>
                <Text style={styles.name}>{team.name}</Text>
                <Text style={styles.meta}>{team.memberCount ?? 0} members</Text>
              </Pressable>
            </Link>
            <Pressable hitSlop={8} onPress={() => startEdit(team)}>
              <Ionicons name="pencil-outline" size={18} color={colors.inkMuted} />
            </Pressable>
            {canDelete && (
              <Pressable hitSlop={8} onPress={() => remove(team)}>
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </Pressable>
            )}
          </Card>
        ))
      )}

      {!editingId && <Button label="Add team" variant="secondary" onPress={startCreate} />}
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
    meta: { fontSize: 12, color: colors.inkMuted },
  });
}
