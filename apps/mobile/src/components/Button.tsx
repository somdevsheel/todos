import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { colors } from "@/lib/theme";

export interface ButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
}

export function Button({ label, loading, variant = "primary", disabled, ...props }: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "danger" && styles.danger,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? colors.accent : colors.white} />
      ) : (
        <Text style={[styles.label, variant === "secondary" && styles.labelSecondary]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { height: 46, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surfaceSubtle, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.danger },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.85 },
  label: { color: colors.white, fontWeight: "600", fontSize: 15 },
  labelSecondary: { color: colors.ink },
});
