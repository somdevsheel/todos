import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import { handleNotificationResponse, registerForPushNotificationsAsync } from "@/lib/notifications";
import { useThemeColors } from "@/lib/theme";

function RootNavigator() {
  const colors = useThemeColors();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!user) return;
    void registerForPushNotificationsAsync();
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);
    return () => subscription.remove();
  }, [user]);

  // A blank frame during the very first session check (SecureStore read +
  // GET /users/me) is preferable to a flash of the login screen for
  // someone who's already signed in — this window is brief.
  if (loading) return null;

  return (
    // contentStyle here is a safety net, not the primary fix: it's what
    // shows through behind a screen whose own content is shorter than the
    // viewport (see ANDROID.md's "white gap below short screens" entry —
    // every individual screen also needs its own ScrollView styled to
    // fill the screen; this alone doesn't replace that).
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surfaceSubtle } }}>
      <Stack.Protected guard={Boolean(user)}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <StatusBar style="auto" />
          <RootNavigator />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
