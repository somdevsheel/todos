import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AnnouncementSummary, PaginatedResult } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { hasAnyRole } from "@/lib/rbac";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * DELETE /announcements/:id has no @Roles() guard at all server-side —
 * the service allows the author OR an ADMIN/SUPER_ADMIN, not just
 * privileged roles. Same call here as web makes: show delete for anyone
 * with admin/super-admin, per-post for the author too (author check is
 * against `createdByUser.id`, which we have).
 */
export default function AnnouncementsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user } = useAuth();
  const { data, loading, error, reload } = useApiQuery<PaginatedResult<AnnouncementSummary>>("/announcements?pageSize=50");

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canPost = hasAnyRole(user, ["SUPER_ADMIN", "ADMIN"]);
  const canDeleteAny = hasAnyRole(user, ["SUPER_ADMIN", "ADMIN"]);

  const submit = async () => {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    try {
      await apiFetch("/announcements", { method: "POST", body: JSON.stringify({ title: title.trim(), body: body.trim() }) });
      setTitle("");
      setBody("");
      setComposing(false);
      reload();
    } catch (err) {
      Alert.alert("Unable to post", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const remove = (announcement: AnnouncementSummary) => {
    Alert.alert("Delete announcement?", `"${announcement.title}" will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/announcements/${announcement.id}`, { method: "DELETE" });
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
      {canPost && (
        <Card style={styles.gap}>
          {composing ? (
            <>
              <TextField label="Title" value={title} onChangeText={setTitle} autoFocus />
              <TextField label="Body" value={body} onChangeText={setBody} multiline style={styles.multiline} />
              <Text style={styles.helper}>Posts to the notification center for every other active employee in the organization.</Text>
              <View style={styles.formActions}>
                <Button label="Cancel" variant="secondary" onPress={() => setComposing(false)} />
                <Button label="Post" onPress={submit} loading={submitting} disabled={!title.trim() || !body.trim()} />
              </View>
            </>
          ) : (
            <Button label="New announcement" onPress={() => setComposing(true)} />
          )}
        </Card>
      )}

      {!data || data.items.length === 0 ? (
        <EmptyState title="No announcements yet" description="Company-wide posts will show up here." />
      ) : (
        data.items.map((announcement) => {
          const canDeleteThis = canDeleteAny || announcement.createdByUser.id === user?.id;
          return (
            <Card key={announcement.id} style={styles.gap}>
              <View style={styles.announcementHeader}>
                <Text style={styles.title}>{announcement.title}</Text>
                {canDeleteThis && (
                  <Pressable hitSlop={8} onPress={() => remove(announcement)}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.body}>{announcement.body}</Text>
              <Text style={styles.meta}>
                {announcement.createdByUser.firstName} {announcement.createdByUser.lastName} · {formatDate(announcement.createdAt)}
              </Text>
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 10 },
    gap: { gap: 10 },
    multiline: { minHeight: 80, textAlignVertical: "top", paddingTop: 10 },
    helper: { fontSize: 12, color: colors.inkMuted },
    formActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
    announcementHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    title: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink },
    body: { fontSize: 14, color: colors.ink },
    meta: { fontSize: 12, color: colors.inkMuted },
  });
}
