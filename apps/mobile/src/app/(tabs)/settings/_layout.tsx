import { Stack } from "expo-router";
import { useThemeColors } from "@/lib/theme";

export default function SettingsStackLayout() {
  const colors = useThemeColors();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.surfaceSubtle },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="departments" options={{ title: "Departments" }} />
      <Stack.Screen name="teams/index" options={{ title: "Teams" }} />
      <Stack.Screen name="teams/[id]" options={{ title: "Team" }} />
      <Stack.Screen name="employees/index" options={{ title: "Employees" }} />
      <Stack.Screen name="employees/[id]" options={{ title: "Employee" }} />
      <Stack.Screen name="invite" options={{ title: "Invite an employee" }} />
      <Stack.Screen name="announcements" options={{ title: "Announcements" }} />
      <Stack.Screen name="audit-log" options={{ title: "Audit log" }} />
      <Stack.Screen name="permissions" options={{ title: "Roles & permissions" }} />
    </Stack>
  );
}
