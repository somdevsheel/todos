import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors } from "@/lib/theme";

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, style, ...props }: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, style]} placeholderTextColor={colors.inkMuted} {...props} />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  input: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.surface,
  },
  error: { fontSize: 12, color: colors.danger },
});
