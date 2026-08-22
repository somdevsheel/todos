import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_LABELS, SYSTEM_ROLES, type CurrentUser, type RoleName } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

const STATUS_LABELS: Record<string, string> = { ACTIVE: "Active", PENDING_INVITE: "Invited", SUSPENDED: "Suspended", DEACTIVATED: "Deactivated" };

/**
 * departmentId isn't editable here (no native picker component installed
 * yet — same simplification as settings/teams/index.tsx) — firstName/
 * lastName/phone are.
 */
export default function EmployeeDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: actor } = useAuth();
  const employee = useApiQuery<CurrentUser>(id ? `/users/${id}` : null, [id]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [statusActionBusy, setStatusActionBusy] = useState(false);
  const [roleBusy, setRoleBusy] = useState<RoleName | null>(null);

  const data = employee.data;

  const startEditing = () => {
    if (!data) return;
    setFirstName(data.firstName);
    setLastName(data.lastName);
    setPhone("");
    setEditing(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await apiFetch(`/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || undefined }),
      });
      setEditing(false);
      employee.reload();
    } catch (err) {
      Alert.alert("Unable to save", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const runStatusAction = async (action: "reinvite" | "activate" | "deactivate") => {
    setStatusActionBusy(true);
    try {
      await apiFetch(`/users/${id}/${action}`, { method: "POST" });
      employee.reload();
    } catch (err) {
      Alert.alert("Unable to complete this action", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setStatusActionBusy(false);
    }
  };

  const toggleRole = async (role: RoleName, has: boolean) => {
    setRoleBusy(role);
    try {
      if (has) {
        await apiFetch(`/users/${id}/roles/${role}`, { method: "DELETE" });
      } else {
        await apiFetch(`/users/${id}/roles`, { method: "POST", body: JSON.stringify({ role }) });
      }
      employee.reload();
    } catch (err) {
      Alert.alert("Unable to update roles", err instanceof ApiClientError ? err.message : "Please try again.");
    } finally {
      setRoleBusy(null);
    }
  };

  if (employee.loading && !data) return <LoadingState />;
  if (employee.error || !data) return <ErrorState message={employee.error ?? "Employee not found"} />;

  const isSuperAdmin = (actor?.roles ?? []).includes("SUPER_ADMIN");

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card style={styles.gap}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.name}>
              {data.firstName} {data.lastName}
            </Text>
            <Text style={styles.email}>{data.email}</Text>
          </View>
          <Text style={styles.status}>{STATUS_LABELS[data.status] ?? data.status}</Text>
        </View>

        {data.status === "PENDING_INVITE" ? (
          <Button label="Resend invitation" variant="secondary" loading={statusActionBusy} onPress={() => runStatusAction("reinvite")} />
        ) : (
          <Button
            label={data.status === "ACTIVE" ? "Deactivate" : "Activate"}
            variant={data.status === "ACTIVE" ? "danger" : "primary"}
            loading={statusActionBusy}
            onPress={() => runStatusAction(data.status === "ACTIVE" ? "deactivate" : "activate")}
          />
        )}
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Profile</Text>
        {editing ? (
          <>
            <TextField label="First name" value={firstName} onChangeText={setFirstName} />
            <TextField label="Last name" value={lastName} onChangeText={setLastName} />
            <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <View style={styles.formActions}>
              <Button label="Cancel" variant="secondary" onPress={() => setEditing(false)} />
              <Button label="Save" onPress={saveProfile} loading={savingProfile} />
            </View>
          </>
        ) : (
          <Button label="Edit profile" variant="secondary" onPress={startEditing} />
        )}
      </Card>

      {isSuperAdmin && (
        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>Roles</Text>
          {SYSTEM_ROLES.map((role) => {
            const has = data.roles.includes(role);
            return (
              <Pressable key={role} style={styles.roleRow} onPress={() => toggleRole(role, has)} disabled={roleBusy === role}>
                <Ionicons name={has ? "checkbox" : "square-outline"} size={20} color={has ? colors.accent : colors.inkMuted} />
                <Text style={styles.roleLabel}>{ROLE_LABELS[role]}</Text>
              </Pressable>
            );
          })}
        </Card>
      )}
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 12 },
    gap: { gap: 10 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    name: { fontSize: 16, fontWeight: "700", color: colors.ink },
    email: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
    status: { fontSize: 12, fontWeight: "600", color: colors.inkMuted },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
    formActions: { flexDirection: "row", gap: 8, justifyContent: "flex-end" },
    roleRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
    roleLabel: { fontSize: 14, color: colors.ink },
  });
}
