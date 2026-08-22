import { Link, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { useThemeColors } from "@/lib/theme";

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: "home",
  tasks: "checkbox",
  calendar: "calendar",
  chat: "chatbubbles",
  settings: "settings",
};

/**
 * Bell icon reaches /notifications — web never puts Notifications in its
 * bottom nav either (only Dashboard/Tasks/Calendar/Chat are
 * `showInBottomNav: true` in shared-types' NAV_ITEMS), it's a Topbar icon
 * instead. Matching that information architecture here rather than adding
 * a 6th tab.
 */
function NotificationsBellButton() {
  const colors = useThemeColors();
  return (
    <Link href="/notifications" asChild>
      <Pressable hitSlop={8} style={{ marginRight: 12 }}>
        <Ionicons name="notifications-outline" size={22} color={colors.ink} />
      </Pressable>
    </Link>
  );
}

export default function TabsLayout() {
  const colors = useThemeColors();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerTintColor: colors.ink,
        headerStyle: { backgroundColor: colors.surface },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        sceneStyle: { backgroundColor: colors.surfaceSubtle },
        tabBarIcon: ({ color, size }) => <Ionicons name={ICONS[route.name] ?? "ellipse"} size={size} color={color} />,
        headerRight: () => <NotificationsBellButton />,
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Dashboard" }} />
      <Tabs.Screen name="tasks" options={{ title: "Tasks", headerShown: false }} />
      <Tabs.Screen name="calendar" options={{ title: "Calendar", headerShown: false }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", headerShown: false }} />
      <Tabs.Screen name="settings" options={{ title: "Settings", headerShown: false }} />
    </Tabs>
  );
}
