import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PaginatedResult, UserSummary } from "@arutech/shared-types";
import { apiFetch } from "@/lib/api-client";
import { colors } from "@/lib/theme";
import { TextField } from "./TextField";

/**
 * Multi-select employee search — the mobile equivalent of the web app's
 * AssigneePicker, built specifically for GROUP conversation creation (see
 * chat/new.tsx). Deliberately a separate component from UserSearchPicker
 * rather than adding a multi-select mode to it: UserSearchPicker's
 * single-select "tap a result, navigate immediately" flow for starting a
 * DIRECT conversation stays untouched and unregressed by this addition.
 */
export function MultiUserSearchPicker({
  selected,
  onChange,
}: {
  selected: UserSummary[];
  onChange: (users: UserSummary[]) => void;
}) {
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

  const selectedIds = new Set(selected.map((u) => u.id));
  const visibleResults = results.filter((u) => !selectedIds.has(u.id));

  const add = (user: UserSummary) => {
    onChange([...selected, user]);
    setQuery("");
    setResults([]);
  };
  const remove = (userId: string) => onChange(selected.filter((u) => u.id !== userId));

  return (
    <View style={styles.container}>
      {selected.length > 0 && (
        <View style={styles.chipRow}>
          {selected.map((user) => (
            <Pressable key={user.id} style={styles.chip} onPress={() => remove(user.id)}>
              <Text style={styles.chipLabel}>
                {user.firstName} {user.lastName}
              </Text>
              <Ionicons name="close-circle" size={16} color={colors.accentStrong} />
            </Pressable>
          ))}
        </View>
      )}
      <TextField label="Add members" value={query} onChangeText={setQuery} autoCapitalize="none" placeholder="Name or email…" />
      {loading && <ActivityIndicator color={colors.accent} />}
      <FlatList
        data={visibleResults}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => add(item)}>
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
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
  },
  chipLabel: { fontSize: 13, fontWeight: "600", color: colors.accentStrong },
  row: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 14, fontWeight: "600", color: colors.ink },
  email: { fontSize: 12, color: colors.inkMuted },
});
