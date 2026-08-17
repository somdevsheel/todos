import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function ChatStackLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.ink, headerStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" options={{ title: "Chat" }} />
      <Stack.Screen name="[id]" options={{ title: "Conversation" }} />
    </Stack>
  );
}
