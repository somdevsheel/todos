import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { TASK_STATUS_LABELS, type TaskSummary } from "@arutech/shared-types";
import { useThemeColors } from "@/lib/theme";
import { groupTasksByStatus } from "@/lib/task-kanban";
import { TaskKanbanCard } from "./TaskKanbanCard";

export function TaskKanban({ tasks }: { tasks: TaskSummary[] }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const columns = groupTasksByStatus(tasks);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {columns.map((column) => (
        <View key={column.status} style={styles.column}>
          <View style={styles.columnHeader}>
            <Text style={styles.columnTitle}>{TASK_STATUS_LABELS[column.status]}</Text>
            <Text style={styles.columnCount}>{column.tasks.length}</Text>
          </View>
          <View style={styles.cardsGap}>
            {column.tasks.map((task) => (
              <TaskKanbanCard key={task.id} task={task} />
            ))}
            {column.tasks.length === 0 && <Text style={styles.empty}>Nothing here</Text>}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    row: { flexDirection: "row", gap: 10, paddingRight: 10 },
    column: { width: 200, gap: 10, backgroundColor: colors.surfaceSubtle, borderRadius: 12, padding: 10 },
    columnHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 2 },
    columnTitle: { fontSize: 11, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
    columnCount: { fontSize: 11, color: colors.inkMuted },
    cardsGap: { gap: 8 },
    empty: { fontSize: 12, color: colors.inkMuted, paddingHorizontal: 2 },
  });
}
