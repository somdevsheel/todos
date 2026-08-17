import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import type { ConversationSummary, UserSummary } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { UserSearchPicker } from "@/components/UserSearchPicker";

export default function NewConversationScreen() {
  const start = async (user: UserSummary) => {
    const conversation = await apiFetch<ConversationSummary>("/conversations", {
      method: "POST",
      body: JSON.stringify({ type: "DIRECT", memberUserIds: [user.id] }),
    });
    router.replace(`/chat/${conversation.id}`);
  };

  return (
    <View style={styles.content}>
      <UserSearchPicker onSelect={start} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 16, backgroundColor: colors.surfaceSubtle },
});
