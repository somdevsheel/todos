import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ROLE_LABELS } from "@arutech/shared-types";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { hasAnyRole } from "@/lib/rbac";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

interface SettingsTile {
  href: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function SettingsScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  // Same tile set / role gates as apps/web/src/app/(dashboard)/admin/page.tsx's card grid.
  const tiles: SettingsTile[] = [
    { href: "/settings/employees", label: "Employees", icon: "people-outline" },
    { href: "/settings/teams", label: "Teams", icon: "people-circle-outline" },
    { href: "/settings/departments", label: "Departments", icon: "business-outline" },
    { href: "/settings/announcements", label: "Announcements", icon: "megaphone-outline" },
    { href: "/settings/invite", label: "Invite an employee", icon: "person-add-outline" },
  ];
  const superAdminTiles: SettingsTile[] = [
    { href: "/settings/audit-log", label: "Audit log", icon: "document-text-outline" },
    { href: "/settings/permissions", label: "Roles & permissions", icon: "key-outline" },
  ];

  const showAdminSection = hasAnyRole(user, ["SUPER_ADMIN", "ADMIN"]);
  const showSuperAdminSection = hasAnyRole(user, ["SUPER_ADMIN"]);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
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

      {showAdminSection && (
        <View style={styles.gap}>
          <Text style={styles.sectionTitle}>Organization</Text>
          {tiles.map((tile) => (
            <SettingsTileRow key={tile.href} tile={tile} colors={colors} styles={styles} />
          ))}
        </View>
      )}

      {showSuperAdminSection && (
        <View style={styles.gap}>
          <Text style={styles.sectionTitle}>Super admin</Text>
          {superAdminTiles.map((tile) => (
            <SettingsTileRow key={tile.href} tile={tile} colors={colors} styles={styles} />
          ))}
        </View>
      )}

      <Button label="Sign out" variant="danger" loading={signingOut} onPress={() => { setSigningOut(true); void logout(); }} />
    </ScrollView>
  );
}

function SettingsTileRow({
  tile,
  colors,
  styles,
}: {
  tile: SettingsTile;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <Link href={tile.href} asChild>
      <Pressable>
        <Card style={styles.tileRow}>
          <Ionicons name={tile.icon} size={20} color={colors.accentStrong} />
          <Text style={styles.tileLabel}>{tile.label}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
        </Card>
      </Pressable>
    </Link>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { padding: 16, gap: 16 },
    gap: { gap: 10 },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
    name: { fontSize: 16, fontWeight: "700", color: colors.ink },
    email: { fontSize: 13, color: colors.inkMuted, marginTop: 2 },
    roles: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    roleChip: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    roleLabel: { fontSize: 12, fontWeight: "600", color: colors.accentStrong },
    note: { fontSize: 13, color: colors.inkMuted, lineHeight: 19 },
    tileRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    tileLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.ink },
  });
}
