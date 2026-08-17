import { useEffect } from "react";
import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";
import { handleNotificationResponse, registerForPushNotificationsAsync } from "@/lib/notifications";

function RootNavigator() {
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
    <Stack screenOptions={{ headerShown: false }}>
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
