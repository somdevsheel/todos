import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import {
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type PaginatedResult,
  type TaskCommentSummary,
  type TaskDetail,
  type TaskStatus,
  type UserSummary,
} from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { MultiUserSearchPicker } from "@/components/MultiUserSearchPicker";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const task = useApiQuery<TaskDetail>(`/tasks/${id}`);
  const comments = useApiQuery<PaginatedResult<TaskCommentSummary>>(`/tasks/${id}/comments?pageSize=50`);
  const [changingStatus, setChangingStatus] = useState(false);
  const [commentBody, setCommentBody] = useState("");
  const [commentMentions, setCommentMentions] = useState<UserSummary[]>([]);
  const [postingComment, setPostingComment] = useState(false);

  const changeStatus = async (status: TaskStatus) => {
    if (!id) return;
    setChangingStatus(true);
    try {
      await apiFetch(`/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) });
      task.reload();
    } catch {
      // status buttons re-render from the reloaded task either way; a toast library isn't wired up on mobile yet
    } finally {
      setChangingStatus(false);
    }
  };

  const postComment = async () => {
    if (!commentBody.trim() || !id) return;
    setPostingComment(true);
    try {
      await apiFetch(`/tasks/${id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: commentBody.trim(), mentionedUserIds: commentMentions.map((u) => u.id) }),
      });
      setCommentBody("");
      setCommentMentions([]);
      comments.reload();
    } catch {
      // same no-toast-library note as changeStatus above
    } finally {
      setPostingComment(false);
    }
  };

  if (task.loading && !task.data) return <LoadingState />;
  if (task.error || !task.data) return <ErrorState message={task.error ?? "Task not found"} />;

  const data = task.data;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.gap}>
          <Text style={styles.title}>{data.title}</Text>
          {data.description && <Text style={styles.description}>{data.description}</Text>}
          {data.dueDate && <Text style={styles.meta}>Due {formatDate(data.dueDate)}</Text>}
          <Text style={styles.meta}>Created {formatDate(data.createdAt)}</Text>

          <View style={styles.statusRow}>
            {TASK_STATUSES.map((status) => (
              <Button
                key={status}
                label={TASK_STATUS_LABELS[status]}
                variant={status === data.status ? "primary" : "secondary"}
                loading={changingStatus && status === data.status}
                disabled={changingStatus}
                onPress={() => changeStatus(status)}
              />
            ))}
          </View>
        </Card>

        {data.assignees.length > 0 && (
          <Card style={styles.gap}>
            <Text style={styles.sectionTitle}>Assignees</Text>
            <View style={styles.chipsRow}>
              {data.assignees.map((assignee) => (
                <Badge
                  key={assignee.id}
                  label={`${assignee.firstName} ${assignee.lastName}`}
                  color={colors.accentStrong}
                  background={colors.accentSoft}
                />
              ))}
            </View>
          </Card>
        )}

        {data.subtasks.length > 0 && (
          <Card style={styles.gap}>
            <Text style={styles.sectionTitle}>Subtasks</Text>
            {data.subtasks.map((subtask) => (
              <View key={subtask.id} style={styles.subtaskRow}>
                <Text style={styles.subtaskTitle} numberOfLines={1}>
                  {subtask.title}
                </Text>
                <Text style={styles.meta}>{TASK_STATUS_LABELS[subtask.status]}</Text>
              </View>
            ))}
          </Card>
        )}

        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>Comments</Text>
          {(comments.data?.items ?? []).length === 0 && <Text style={styles.meta}>No comments yet.</Text>}
          {(comments.data?.items ?? []).map((comment) => (
            <View key={comment.id} style={styles.commentRow}>
              <Text style={styles.commentAuthor}>
                {comment.author.firstName} {comment.author.lastName}
              </Text>
              <Text style={styles.commentBody}>{comment.body}</Text>
            </View>
          ))}

          <View style={styles.composer}>
            <TextInput
              value={commentBody}
              onChangeText={setCommentBody}
              placeholder="Write a comment…"
              placeholderTextColor={colors.inkMuted}
              style={styles.commentInput}
              multiline
            />
            <MultiUserSearchPicker selected={commentMentions} onChange={setCommentMentions} />
            <Button label="Post" onPress={postComment} loading={postingComment} disabled={!commentBody.trim()} />
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  content: { padding: 16, gap: 12 },
  gap: { gap: 10 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink },
  description: { fontSize: 14, color: colors.inkMuted, lineHeight: 20 },
  meta: { fontSize: 12, color: colors.inkMuted },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  subtaskRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  subtaskTitle: { flex: 1, fontSize: 14, color: colors.ink, marginRight: 8 },
  commentRow: { gap: 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 },
  commentAuthor: { fontSize: 12, fontWeight: "600", color: colors.ink },
  commentBody: { fontSize: 13, color: colors.ink },
  composer: { gap: 8, marginTop: 4 },
  commentInput: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: colors.ink,
    textAlignVertical: "top",
  },
});
