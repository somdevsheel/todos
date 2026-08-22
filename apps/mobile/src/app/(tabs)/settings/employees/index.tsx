import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { ROLE_LABELS, type PaginatedResult, type UserStatus, type UserSummary } from "@arutech/shared-types";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Badge } from "@/components/Badge";

// Not centralized in shared-types — apps/web/src/components/employee/UserStatusBadge.tsx
// defines its own labels locally too, kept consistent with those rather than
// introducing a new shared constant unprompted (same rationale as tasks/index.tsx's VIEW_LABELS).
const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  PENDING_INVITE: "Invited",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
};

const STATUS_COLORS: Record<UserStatus, { color: string; background: string }> = {
  ACTIVE: { color: "#1e6b45", background: "#e7efec" },
  PENDING_INVITE: { color: "#9a6700", background: "#fef3c7" },
  SUSPENDED: { color: "#b3261e", background: "#fee2e2" },
  DEACTIVATED: { color: "#6b6b74", background: "#f7f7f8" },
};

/** SUPER_ADMIN/ADMIN only, matching web's employees list — no filter UI here either, same simplification web made (the query DTO supports search/departmentId/status server-side, unused by either client's list page today). */
export default function EmployeesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data, loading, error } = useApiQuery<PaginatedResult<UserSummary>>("/users?page=1&pageSize=50");

  if (loading && !data) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data || data.items.length === 0) return <EmptyState title="No employees yet" description="Invite someone from Settings → Invite an employee." />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      {data.items.map((employee) => (
        <Link key={employee.id} href={`/settings/employees/${employee.id}`} asChild>
          <Pressable>
            <Card style={styles.row}>
              <View style={styles.rowContent}>
                <Text style={styles.name}>
                  {employee.firstName} {employee.lastName}
                </Text>
                <Text style={styles.email}>{employee.email}</Text>
                <Text style={styles.roles}>{employee.roles.map((r) => ROLE_LABELS[r]).join(", ")}</Text>
              </View>
              <Badge label={STATUS_LABELS[employee.status]} {...STATUS_COLORS[employee.status]} />
            </Card>
          </Pressable>
        </Link>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    rowContent: { flex: 1, gap: 2 },
    name: { fontSize: 14, fontWeight: "600", color: colors.ink },
    email: { fontSize: 12, color: colors.inkMuted },
    roles: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  });
}
