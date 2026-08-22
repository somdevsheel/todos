import { useMemo } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import type { TeamMemberSummary, TeamSummary, UserSummary } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { hasAnyRole } from "@/lib/rbac";
import { useApiQuery } from "@/lib/use-api";
import { LoadingState, ErrorState } from "@/components/ScreenState";
import { Card } from "@/components/Card";
import { UserSearchPicker } from "@/components/UserSearchPicker";

/** No GET /teams/:id (see teams/index.tsx's note) — fetch the list, find this team client-side, same as web. */
export default function TeamDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const teams = useApiQuery<TeamSummary[]>("/teams");
  const members = useApiQuery<TeamMemberSummary[]>(id ? `/teams/${id}/members` : null, [id]);

  const canManage = hasAnyRole(user, ["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const team = teams.data?.find((t) => t.id === id);

  const addMember = async (candidate: UserSummary) => {
    try {
      await apiFetch(`/teams/${id}/members`, { method: "POST", body: JSON.stringify({ userId: candidate.id }) });
      members.reload();
    } catch (err) {
      Alert.alert("Unable to add member", err instanceof ApiClientError ? err.message : "Please try again.");
    }
  };

  const removeMember = (member: TeamMemberSummary) => {
    Alert.alert("Remove member?", `${member.user.firstName} ${member.user.lastName} will be removed from this team.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await apiFetch(`/teams/${id}/members/${member.userId}`, { method: "DELETE" });
            members.reload();
          } catch (err) {
            Alert.alert("Unable to remove", err instanceof ApiClientError ? err.message : "Please try again.");
          }
        },
      },
    ]);
  };

  if ((teams.loading && !teams.data) || (members.loading && !members.data)) return <LoadingState />;
  if (teams.error || members.error || !team) return <ErrorState message={teams.error ?? members.error ?? "Team not found"} />;

  const existingUserIds = (members.data ?? []).map((m) => m.userId);

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <Card style={styles.gap}>
        <Text style={styles.title}>{team.name}</Text>
        {team.description && <Text style={styles.description}>{team.description}</Text>}
      </Card>

      <Card style={styles.gap}>
        <Text style={styles.sectionTitle}>Members</Text>
        {(members.data ?? []).length === 0 && <Text style={styles.meta}>No members yet.</Text>}
        {(members.data ?? []).map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <Text style={styles.memberName}>
              {member.user.firstName} {member.user.lastName}
            </Text>
            {canManage && (
              <Pressable hitSlop={8} onPress={() => removeMember(member)}>
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
              </Pressable>
            )}
          </View>
        ))}
      </Card>

      {canManage && (
        <Card style={styles.gap}>
          <Text style={styles.sectionTitle}>Add a member</Text>
          <UserSearchPicker onSelect={addMember} excludeUserIds={existingUserIds} />
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
    title: { fontSize: 18, fontWeight: "700", color: colors.ink },
    description: { fontSize: 14, color: colors.inkMuted },
    sectionTitle: { fontSize: 13, fontWeight: "700", color: colors.inkMuted, textTransform: "uppercase" },
    meta: { fontSize: 13, color: colors.inkMuted },
    memberRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 4 },
    memberName: { fontSize: 14, color: colors.ink },
  });
}
