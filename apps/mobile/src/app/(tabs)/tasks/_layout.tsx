import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme";

export default function TasksStackLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.surfaceSubtle },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Tasks" }} />
      <Stack.Screen name="[id]" options={{ title: "Task" }} />
    </Stack>
  );
}
