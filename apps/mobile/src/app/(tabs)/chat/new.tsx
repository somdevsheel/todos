import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import type { ConversationSummary, ConversationType, UserSummary } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { UserSearchPicker } from "@/components/UserSearchPicker";
import { MultiUserSearchPicker } from "@/components/MultiUserSearchPicker";
import { TextField } from "@/components/TextField";
import { Button } from "@/components/Button";

export default function NewConversationScreen() {
  const [type, setType] = useState<ConversationType>("DIRECT");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<UserSummary[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const startDirect = async (user: UserSummary) => {
    const conversation = await apiFetch<ConversationSummary>("/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "DIRECT", memberUserIds: [user.id] }),
    });
    router.replace(`/chat/${conversation.id}`);
  };

  const createGroup = async () => {
    if (!name.trim()) {
      Alert.alert("Group name required", "Give the group a name before creating it.");
      return;
    }
    if (members.length === 0) {
      Alert.alert("Pick at least one person", "A group needs at least one other member.");
      return;
    }
    setSubmitting(true);
    try {
      const conversation = await apiFetch<ConversationSummary>("/conversations", {
        method: "POST",
        body: JSON.stringify({ type: "GROUP", name: name.trim(), memberUserIds: members.map((m) => m.id) }),
      });
      router.replace(`/chat/${conversation.id}`);
    } catch {
      Alert.alert("Unable to create group", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.toggleRow}>
        {(["DIRECT", "GROUP"] as const).map((option) => (
          <Text
            key={option}
            onPress={() => setType(option)}
            style={[styles.toggleOption, type === option && styles.toggleOptionActive]}
          >
            {option === "DIRECT" ? "Direct message" : "Group"}
          </Text>
        ))}
      </View>

      {type === "DIRECT" ? (
        <UserSearchPicker onSelect={startDirect} />
      ) : (
        <View style={styles.groupForm}>
          <TextField label="Group name" value={name} onChangeText={setName} placeholder="e.g. Design Team" autoFocus />
          <MultiUserSearchPicker selected={members} onChange={setMembers} />
          <Button label="Create group" onPress={createGroup} loading={submitting} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: 16, backgroundColor: colors.surfaceSubtle, gap: 16 },
  toggleRow: {
    flexDirection: "row",
    alignSelf: "flex-start",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 2,
  },
  toggleOption: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    fontSize: 13,
    fontWeight: "600",
    color: colors.inkMuted,
    borderRadius: 8,
  },
  toggleOptionActive: { backgroundColor: colors.accentSoft, color: colors.accentStrong },
  groupForm: { gap: 16 },
});
