import { StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS, type TaskSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { Card } from "./Card";
import { Badge } from "./Badge";

export const STATUS_COLORS: Record<string, { color: string; background: string }> = {
  TODO: { color: colors.inkMuted, background: colors.surfaceSubtle },
  IN_PROGRESS: { color: "#1e40af", background: "#dbeafe" },
  IN_REVIEW: { color: "#92400e", background: "#fef3c7" },
  COMPLETED: { color: colors.accentStrong, background: colors.accentSoft },
  CANCELLED: { color: "#991b1b", background: "#fee2e2" },
};

function formatDueDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function TaskRow({ task }: { task: TaskSummary }) {
  const isOverdue = task.dueDate && task.status !== "COMPLETED" && task.status !== "CANCELLED" && new Date(task.dueDate) < new Date();
  const statusStyle = STATUS_COLORS[task.status] ?? STATUS_COLORS.TODO;

  return (
    <Link href={`/tasks/${task.id}`} asChild>
      <Card style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {task.title}
          </Text>
          <Badge label={TASK_STATUS_LABELS[task.status]} {...statusStyle} />
        </View>
        <View style={styles.meta}>
          <Text style={styles.priority}>{TASK_PRIORITY_LABELS[task.priority]}</Text>
          {task.dueDate && (
            <Text style={[styles.due, isOverdue && styles.overdue]}>Due {formatDueDate(task.dueDate)}</Text>
          )}
        </View>
      </Card>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink },
  meta: { flexDirection: "row", gap: 12 },
  priority: { fontSize: 12, color: colors.inkMuted },
  due: { fontSize: 12, color: colors.inkMuted },
  overdue: { color: colors.danger, fontWeight: "600" },
});
