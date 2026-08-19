import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import type { PaginatedResult, UserSummary } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { TextField } from "./TextField";

/**
 * Single-select, DIRECT-conversation-starting search — tap a result,
 * navigate immediately, no confirm step. GROUP conversation creation uses
 * a separate sibling component instead (MultiUserSearchPicker, selected via
 * the DIRECT/GROUP toggle in chat/new.tsx) rather than adding a
 * multi-select mode here, so this flow's fast single-tap UX stays
 * unchanged and unregressed by that addition.
 */
export function UserSearchPicker({ onSelect }: { onSelect: (user: UserSummary) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const page = await apiFetch<PaginatedResult<UserSummary>>(`/users?search=${encodeURIComponent(query)}&pageSize=10`);
        if (!cancelled) setResults(page.items);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <View style={styles.container}>
      <TextField label="Search employees" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Name or email…" />
      {loading && <ActivityIndicator color={colors.accent} />}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => onSelect(item)}>
            <Text style={styles.name}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.email}>{item.email}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 14, fontWeight: "600", color: colors.ink },
  email: { fontSize: 12, color: colors.inkMuted },
});
