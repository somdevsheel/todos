import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { TASK_VIEWS, type PaginatedResult, type TaskSummary, type TaskView } from "@arutech/shared-types";
import { colors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { TaskRow } from "@/components/TaskRow";

// Same labels/order as apps/web/src/components/task/TaskFilters.tsx's local VIEW_LABELS — not centralized in shared-types there either, so kept consistent rather than introducing a new shared constant unprompted.
const VIEW_LABELS: Record<TaskView, string> = {
  mine: "My tasks",
  assigned: "Assigned to me",
  created: "Created by me",
  team: "My team",
  completed: "Completed",
  overdue: "Overdue",
};

export default function TasksListScreen() {
  const [view, setView] = useState<TaskView>("mine");
  const { data, loading, error, reload } = useApiQuery<PaginatedResult<TaskSummary>>(`/tasks?view=${view}&pageSize=50`, [view]);

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/tasks/new" asChild>
              <Pressable hitSlop={8}>
                <Ionicons name="add" size={26} color={colors.accent} />
              </Pressable>
            </Link>
          ),
        }}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
        data={TASK_VIEWS}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <Pressable onPress={() => setView(item)} style={[styles.filterChip, view === item && styles.filterChipActive]}>
            <Text style={[styles.filterLabel, view === item && styles.filterLabelActive]}>{VIEW_LABELS[item]}</Text>
          </Pressable>
        )}
      />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No tasks here" description="Nothing matches this view." />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TaskRow task={item} />}
          onRefresh={reload}
          refreshing={loading}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
  filterRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  filterContent: { padding: 10, gap: 8 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceSubtle },
  filterChipActive: { backgroundColor: colors.accentSoft },
  filterLabel: { fontSize: 12, color: colors.inkMuted, fontWeight: "500" },
  filterLabelActive: { color: colors.accentStrong },
  list: { padding: 12, gap: 10 },
});
