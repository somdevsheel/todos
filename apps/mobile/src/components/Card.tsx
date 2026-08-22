import { useMemo } from "react";
import { StyleSheet, View, type ViewProps } from "react-native";
import { radius, useThemeColors } from "@/lib/theme";

export function Card({ style, ...props }: ViewProps) {
  const colors = useThemeColors();
  const styles = useMemo(
    () => StyleSheet.create({ card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 } }),
    [colors],
  );
  return <View style={[styles.card, style]} {...props} />;
}
