import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_LABELS, SYSTEM_ROLES, type RoleName } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useThemeColors } from "@/lib/theme";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

/** departmentId isn't offered here either (same no-native-picker note as elsewhere in settings/) — matches web's own invite form, which doesn't expose the DTO's optional teamId field at all. */
export default function InviteScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<RoleName>("EMPLOYEE");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch("/auth/invite", {
        method: "POST",
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), role }),
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to send the invitation.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Card style={styles.gap}>
        <TextField label="First name" value={firstName} onChangeText={setFirstName} autoFocus />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} />
        <TextField
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="employee@arutechconsultancy.com"
        />

        <View style={styles.field}>
          <Text style={styles.label}>Role</Text>
          <View style={styles.roleRow}>
            {SYSTEM_ROLES.map((option) => (
              <Text
                key={option}
                onPress={() => setRole(option)}
                style={[styles.roleChip, role === option && styles.roleChipActive]}
              >
                {ROLE_LABELS[option]}
              </Text>
            ))}
          </View>
        </View>

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.error}>{error}</Text>
          </View>
        )}

        <Button
          label="Send invitation"
          onPress={submit}
          loading={submitting}
          disabled={!firstName.trim() || !lastName.trim() || !email.trim()}
        />
      </Card>
    </ScrollView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16 },
    gap: { gap: 14 },
    field: { gap: 6 },
    label: { fontSize: 13, fontWeight: "600", color: colors.ink },
    roleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    roleChip: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      fontSize: 13,
      fontWeight: "600",
      color: colors.inkMuted,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: "hidden",
    },
    roleChipActive: { backgroundColor: colors.accentSoft, color: colors.accentStrong, borderColor: colors.accent },
    errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    error: { color: colors.danger, fontSize: 13, flexShrink: 1 },
  });
}
