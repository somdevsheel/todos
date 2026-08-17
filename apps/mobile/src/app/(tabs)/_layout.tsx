import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  tasks: "checkbox",
  calendar: "calendar",
  chat: "chatbubbles",
  settings: "settings",
};

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTintColor: colors.ink,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name] ?? "ellipse"} size={size} color={color} />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", headerShown: false }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
