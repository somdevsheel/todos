import { StyleSheet, Text } from "react-native";
import { Link } from "expo-router";
import { TASK_PRIORITY_LABELS, type TaskSummary } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { Card } from "@/components/Card";

/**
 * Tap to open the task detail screen for the actual status change, rather
 * than an inline status control on the card — web's own Kanban isn't drag-
 * and-drop either, it's a <select> dropdown per card (see TaskKanbanCard.tsx
 * on web), but that doesn't port cleanly: Android's Alert.alert reliably
 * renders at most ~3 buttons, not the 5 TASK_STATUSES values, and a
 * cramped narrow Kanban column is a worse place than the detail screen for
 * a real status control. The detail screen's status buttons already exist,
 * are already tested, and aren't duplicated here.
 */
export function TaskKanbanCard({ task }: { task: TaskSummary }) {
  return (
    <Link href={`/tasks/${task.id}`} asChild>
      <Card style={styles.card}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <Text style={styles.priority}>{TASK_PRIORITY_LABELS[task.priority]}</Text>
      </Card>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { gap: 4, width: 180 },
  title: { fontSize: 13, fontWeight: "600", color: colors.ink },
  priority: { fontSize: 11, color: colors.inkMuted },
});
