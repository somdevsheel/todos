import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme";

export default function CalendarStackLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.surfaceSubtle },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Calendar" }} />
      <Stack.Screen name="[id]" options={{ title: "Event" }} />
    </Stack>
  );
}
