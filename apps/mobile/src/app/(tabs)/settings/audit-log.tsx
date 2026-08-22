import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { AUDIT_ACTIONS, type AuditActionName, type PaginatedResult } from "@arutech/shared-types";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";

const ACTION_OPTIONS = ["", ...Object.values(AUDIT_ACTIONS)] as const;
const ENTITY_OPTIONS = ["", "Task", "Event", "Message", "Conversation", "User", "Team", "Department", "File", "Announcement", "Role"] as const;

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

/** SUPER_ADMIN only, mirroring GET /audit-logs's own role gate. A picker library isn't installed, so filters are horizontal chip rows rather than dropdowns — same underlying query params as web's AuditLogFilters. */
export default function AuditLogScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditActionName | "">("");
  const [entityType, setEntityType] = useState<string>("");

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    if (action) params.set("action", action);
    if (entityType) params.set("entityType", entityType);
    return `/audit-logs?${params.toString()}`;
  }, [page, action, entityType]);

  const { data, loading, error } = useApiQuery<PaginatedResult<AuditLogRow>>(query, [query]);

  const setActionFilter = (value: AuditActionName | "") => {
    setAction(value);
    setPage(1);
  };
  const setEntityFilter = (value: string) => {
    setEntityType(value);
    setPage(1);
  };

  return (
    <View style={styles.flex}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
        data={ACTION_OPTIONS}
        keyExtractor={(item) => `action-${item}`}
        renderItem={({ item }) => (
          <Pressable onPress={() => setActionFilter(item)} style={[styles.chip, action === item && styles.chipActive]}>
            <Text style={[styles.chipLabel, action === item && styles.chipLabelActive]}>{item || "All actions"}</Text>
          </Pressable>
        )}
      />
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
        data={ENTITY_OPTIONS}
        keyExtractor={(item) => `entity-${item}`}
        renderItem={({ item }) => (
          <Pressable onPress={() => setEntityFilter(item)} style={[styles.chip, entityType === item && styles.chipActive]}>
            <Text style={[styles.chipLabel, entityType === item && styles.chipLabelActive]}>{item || "All entities"}</Text>
          </Pressable>
        )}
      />

      {loading && !data ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Nothing here" description="No audit log entries match these filters." />
      ) : (
        <FlatList
          data={data.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <Text style={styles.action}>{item.action}</Text>
              <Text style={styles.meta}>
                {item.entityType} · {item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : "System"} · {formatDateTime(item.createdAt)}
              </Text>
            </Card>
          )}
          ListFooterComponent={
            data.meta.totalPages > 1 ? (
              <View style={styles.pagination}>
                <Pressable disabled={page <= 1} onPress={() => setPage((p) => p - 1)}>
                  <Text style={[styles.pageLabel, page <= 1 && styles.pageLabelDisabled]}>Previous</Text>
                </Pressable>
                <Text style={styles.pageLabel}>
                  Page {data.meta.page} of {data.meta.totalPages}
                </Text>
                <Pressable disabled={page >= data.meta.totalPages} onPress={() => setPage((p) => p + 1)}>
                  <Text style={[styles.pageLabel, page >= data.meta.totalPages && styles.pageLabelDisabled]}>Next</Text>
                </Pressable>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    filterRow: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
    filterContent: { padding: 8, gap: 6 },
    chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: colors.surfaceSubtle },
    chipActive: { backgroundColor: colors.accentSoft },
    chipLabel: { fontSize: 11, color: colors.inkMuted, fontWeight: "500" },
    chipLabelActive: { color: colors.accentStrong },
    list: { padding: 12, gap: 8 },
    row: { gap: 2 },
    action: { fontSize: 13, fontWeight: "600", color: colors.ink },
    meta: { fontSize: 11, color: colors.inkMuted },
    pagination: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12 },
    pageLabel: { fontSize: 12, fontWeight: "600", color: colors.accentStrong },
    pageLabelDisabled: { color: colors.inkMuted, opacity: 0.5 },
  });
}
