import { Stack } from "expo-router";
import { colors } from "@/lib/theme";

export default function TasksStackLayout() {
  return (
    <Stack screenOptions={{ headerTintColor: colors.ink, headerStyle: { backgroundColor: colors.surface } }}>
      <Stack.Screen name="index" options={{ title: "Tasks" }} />
      <Stack.Screen name="[id]" options={{ title: "Task" }} />
    </Stack>
  );
}
