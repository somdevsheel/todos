import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { ApiClientError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import { useThemeColors } from "@/lib/theme";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";

export default function LoginScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // Success flips AuthProvider's `user`, and the root layout's
      // Stack.Protected guards handle the redirect into (tabs) themselves.
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Arutech Workspace</Text>
        <Text style={styles.subtitle}>Sign in with your company account</Text>

        <View style={styles.form}>
          <TextField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@arutechconsultancy.com"
          />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Sign in" onPress={submit} loading={submitting} disabled={!email.trim() || !password} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.surfaceSubtle },
    content: { flexGrow: 1, justifyContent: "center", padding: 24, gap: 24 },
    title: { fontSize: 22, fontWeight: "700", color: colors.ink, textAlign: "center" },
    subtitle: { fontSize: 14, color: colors.inkMuted, textAlign: "center" },
    form: { gap: 14 },
    error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  });
}
