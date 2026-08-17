import { SafeAreaView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

/**
 * Phase 1 placeholder only. Real screens (login, tasks, calendar, chat),
 * FCM push notifications, deep linking, and device registration land in
 * Phase 6 — see ANDROID.md. This screen exists purely to prove the Expo
 * app boots and points at the same backend the web app uses.
 */
export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.content}>
        <Text style={styles.title}>Arutech Workspace</Text>
        <Text style={styles.subtitle}>Android app coming in Phase 6</Text>
        <Text style={styles.body}>
          This placeholder confirms the Expo project builds and runs. Authentication, tasks, calendar, chat, and FCM
          push notifications will be built against the same backend API the web app uses — see ANDROID.md.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f7f7f8" },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 8 },
  title: { fontSize: 20, fontWeight: "600", color: "#17171a" },
  subtitle: { fontSize: 14, color: "#2f5d50", fontWeight: "500" },
  body: { fontSize: 13, color: "#6b6b74", textAlign: "center", marginTop: 12, lineHeight: 19 },
});
