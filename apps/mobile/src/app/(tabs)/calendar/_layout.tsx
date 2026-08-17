import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function CalendarStackLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.ink, headerStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" options={{ title: "Calendar" }} />
      <Stack.Screen name="[id]" options={{ title: "Event" }} />
    </Stack>
  );
}
