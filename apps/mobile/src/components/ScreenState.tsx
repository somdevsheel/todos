import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme";

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{message}</Text>
    </View>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 6 },
  error: { color: colors.danger, fontSize: 14, textAlign: "center" },
  title: { color: colors.ink, fontSize: 15, fontWeight: "600", textAlign: "center" },
  description: { color: colors.inkMuted, fontSize: 13, textAlign: "center" },
});
