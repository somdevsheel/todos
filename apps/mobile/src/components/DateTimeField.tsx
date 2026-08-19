import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { colors } from "@/lib/theme";

/**
 * Native date + time picker — Android-only (this app targets Android
 * only, no iOS build), so the two-dialog pattern here (date first, then
 * time) matches how @react-native-community/datetimepicker actually
 * behaves on Android: it has no single combined date+time dialog the way
 * iOS's picker does, so each mode renders its own modal, and the
 * component must unmount itself after a selection (Android's native
 * dialog doesn't self-dismiss from the JS tree) — hence the `step` state
 * machine below, not a single always-mounted picker.
 *
 * Replaces the plain-text "YYYY-MM-DD HH:MM" fields this app shipped with
 * before real EAS Build access existed to actually verify a native module
 * renders correctly on-device (see ANDROID.md).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  mode = "datetime",
}: {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  /** "date": just the date step, skips the time dialog — matches web's task due-date field (a date-only `<input type="date">`, see TaskForm.tsx). Default "datetime" is for events, which need both. */
  mode?: "datetime" | "date";
}) {
  const [step, setStep] = useState<"idle" | "date" | "time">("idle");

  const displayValue = value
    ? mode === "date"
      ? value.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : value.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
    : "Tap to set";

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    const goToTimeNext = mode === "datetime" && event.type !== "dismissed" && selectedDate;
    setStep(goToTimeNext ? "time" : "idle");
    if (event.type === "dismissed" || !selectedDate) return;
    const next = new Date(selectedDate);
    if (mode === "date") {
      // No time step follows — zero the time out rather than leaving
      // whatever arbitrary "now" happened to be, matching web's date-only
      // <input type="date"> semantics for this same field (see TaskForm.tsx).
      next.setHours(0, 0, 0, 0);
    } else {
      // Carry forward the existing time-of-day (or now, if none set yet) —
      // only the date itself changed in this step; the time step follows.
      const base = value ?? new Date();
      next.setHours(base.getHours(), base.getMinutes());
    }
    onChange(next);
  };

  const onTimeChange = (event: DateTimePickerEvent, selectedTime?: Date) => {
    setStep("idle");
    if (event.type === "dismissed" || !selectedTime) return;
    const next = new Date(value ?? new Date());
    next.setHours(selectedTime.getHours(), selectedTime.getMinutes());
    onChange(next);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.field} onPress={() => setStep("date")}>
        <Text style={[styles.value, !value && styles.placeholder]}>{displayValue}</Text>
      </Pressable>

      {step === "date" && <DateTimePicker value={value ?? new Date()} mode="date" display="default" onChange={onDateChange} />}
      {step === "time" && <DateTimePicker value={value ?? new Date()} mode="time" display="default" onChange={onTimeChange} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  field: {
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  value: { fontSize: 15, color: colors.ink },
  placeholder: { color: colors.inkMuted },
});
