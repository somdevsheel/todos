import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ROLE_LABELS } from "@arutech/shared-types";
import { useAuth } from "@/lib/auth-context";
import { colors } from "@/lib/theme";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View>
          <Text style={styles.name}>
            {user.firstName} {user.lastName}
          </Text>
          <Text style={styles.email}>{user.email}</Text>
        </View>
        <View style={styles.roles}>
          {user.roles.map((role) => (
            <View key={role} style={styles.roleChip}>
              <Text style={styles.roleLabel}>{ROLE_LABELS[role]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.note}>
          Push registration happens automatically on sign-in — see Settings on the web app for per-category
          preferences.
        </Text>
      </Card>

      <Button label="Sign out" variant="danger" loading={signingOut} onPress={() => { setSigningOut(true); void logout(); }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, backgroundColor: colors.surfaceSubtle },
  gap: { gap: 10 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
  name: { fontSize: 16, fontWeight: "700", color: colors.ink },
  email: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  roleChip: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  roleLabel: { fontSize: 12, fontWeight: "600", color: colors.accentStrong },
  note: { fontSize: 13, color: colors.inkMuted, lineHeight: 19 },
});
