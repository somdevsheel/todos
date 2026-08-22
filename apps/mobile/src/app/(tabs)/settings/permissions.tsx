import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_LABELS, type PermissionSummary, type RoleWithPermissions } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

/**
 * SUPER_ADMIN only. Same caveat web's page states explicitly: this matrix
 * is real and persists correctly, but doesn't gate anything yet — every
 * authorization check in the app is by role *name*, not these permission
 * keys. Shown here too so it doesn't imply more than it does.
 */
export default function PermissionsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const roles = useApiQuery<RoleWithPermissions[]>("/roles");
  const permissions = useApiQuery<PermissionSummary[]>("/permissions");
  const [draft, setDraft] = useState<Record<string, Set<string>>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  useEffect(() => {
    if (!roles.data) return;
    setDraft(Object.fromEntries(roles.data.map((r) => [r.id, new Set(r.permissionIds)])));
  }, [roles.data]);

  const toggle = (roleId: string, permissionId: string) => {
    setDraft((prev) => {
      const next = new Set(prev[roleId]);
      if (next.has(permissionId)) next.delete(permissionId);
      else next.add(permissionId);
      return { ...prev, [roleId]: next };
    });
  };

  const save = async (roleId: string) => {
    setSavingRoleId(roleId);
    try {
      await apiFetch(`/roles/${roleId}/permissions`, {
        method: "PATCH",
        body: JSON.stringify({ permissionIds: Array.from(draft[roleId] ?? []) }),
      });
      roles.reload();
    } catch (err) {
      Alert.alert("Unable to save", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setSavingRoleId(null);
    }
  };

  if ((roles.loading && !roles.data) || (permissions.loading && !permissions.data)) return <LoadingState />;
  if (roles.error || permissions.error) return <ErrorState message={roles.error ?? permissions.error ?? "Unable to load"} />;

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Text style={styles.caveat}>
        These toggles are saved but don&apos;t change what anyone can actually do yet — every permission check in the app is
        still based on role name, not these keys.
      </Text>

      {(roles.data ?? []).map((role) => (
        <Card key={role.id} style={styles.gap}>
          <Text style={styles.roleTitle}>{ROLE_LABELS[role.name]}</Text>
          {(permissions.data ?? []).map((permission) => {
            const has = draft[role.id]?.has(permission.id) ?? false;
            return (
              <Pressable key={permission.id} style={styles.permissionRow} onPress={() => toggle(role.id, permission.id)}>
                <Ionicons name={has ? "checkbox" : "square-outline"} size={20} color={has ? colors.accent : colors.inkMuted} />
                <Text style={styles.permissionKey}>{permission.key}</Text>
              </Pressable>
            );
          })}
          <Button label="Save" variant="secondary" loading={savingRoleId === role.id} onPress={() => save(role.id)} />
        </Card>
      ))}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 12 },
    gap: { gap: 8 },
    caveat: { fontSize: 12, color: colors.inkMuted, lineHeight: 17 },
    roleTitle: { fontSize: 15, fontWeight: "700", color: colors.ink, marginBottom: 4 },
    permissionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 5 },
    permissionKey: { fontSize: 13, color: colors.ink, fontFamily: "monospace" },
  });
}
