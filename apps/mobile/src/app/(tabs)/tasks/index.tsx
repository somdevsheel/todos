import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { TASK_VIEWS, type PaginatedResult, type TaskSummary, type TaskView } from "@arutech/shared-types";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { TaskRow } from "@/components/TaskRow";
import { TaskKanban } from "@/components/task/TaskKanban";

type TaskLayout = "list" | "board";

// Same labels/order as apps/web/src/components/task/TaskFilters.tsx's local VIEW_LABELS — not centralized in shared-types there either, so kept consistent rather than introducing a new shared constant unprompted.
const VIEW_LABELS: Record<TaskView, string> = {
  mine: "My tasks",
  assigned: "Assigned to me",
  created: "Created by me",
  team: "My team",
  completed: "Completed",
  overdue: "Overdue",
};

const LAYOUTS: TaskLayout[] = ["list", "board"];
const LAYOUT_LABELS: Record<TaskLayout, string> = { list: "List", board: "Board" };

export default function TasksListScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [view, setView] = useState<TaskView>("mine");
  const [layout, setLayout] = useState<TaskLayout>("list");
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

      <View style={styles.topBar}>
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
        <View style={styles.layoutToggle}>
          {LAYOUTS.map((option) => (
            <Pressable
              key={option}
              onPress={() => setLayout(option)}
              style={[styles.layoutOption, layout === option && styles.layoutOptionActive]}
            >
              <Text style={[styles.layoutLabel, layout === option && styles.layoutLabelActive]}>{LAYOUT_LABELS[option]}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="No tasks here" description="Nothing matches this view." />
      ) : layout === "list" ? (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <TaskRow task={item} />}
          onRefresh={reload}
          refreshing={loading}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.boardScroll}>
          <TaskKanban tasks={data.items} />
        </ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    topBar: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    filterRow: { flexGrow: 0 },
    filterContent: { padding: 10, gap: 8 },
    filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.surfaceSubtle },
    filterChipActive: { backgroundColor: colors.accentSoft },
    filterLabel: { fontSize: 12, color: colors.inkMuted, fontWeight: "500" },
    filterLabelActive: { color: colors.accentStrong },
    layoutToggle: {
      flexDirection: "row",
      alignSelf: "flex-start",
      marginHorizontal: 10,
      marginBottom: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 2,
    },
    layoutOption: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    layoutOptionActive: { backgroundColor: colors.accentSoft },
    layoutLabel: { fontSize: 12, fontWeight: "600", color: colors.inkMuted },
    layoutLabelActive: { color: colors.accentStrong },
    list: { padding: 12, gap: 10 },
    boardScroll: { padding: 12 },
  });
}
