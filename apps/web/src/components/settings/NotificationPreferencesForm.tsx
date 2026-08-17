"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { NOTIFICATION_CATEGORY_LABELS, type NotificationPreferenceItem } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";

export interface NotificationPreferencesFormProps {
  preferences: NotificationPreferenceItem[];
}

/**
 * Only PUSH is exposed here — IN_APP always writes (see
 * NotificationsService.isPushEnabled's docstring) and EMAIL has no
 * business-event producer yet, so a toggle for either would just be a
 * control that silently does nothing. Mirrors ProfileForm.tsx's pattern
 * exactly: client component, server-fetched data as a prop, one save button.
 */
export function NotificationPreferencesForm({ preferences }: NotificationPreferencesFormProps) {
  const [items, setItems] = useState(preferences);
  const [submitting, setSubmitting] = useState(false);

  const toggle = (category: NotificationPreferenceItem["category"]) => {
    setItems((prev) => prev.map((item) => (item.category === category ? { ...item, enabled: !item.enabled } : item)));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body?.error?.message ?? "Unable to save your preferences. Please try again.");
      }
      toast.success("Preferences saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <label key={item.category} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--color-border)] px-3 py-2">
            <span className="text-sm text-[var(--color-ink)]">{NOTIFICATION_CATEGORY_LABELS[item.category]}</span>
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={() => toggle(item.category)}
              aria-label={`Push notifications for ${NOTIFICATION_CATEGORY_LABELS[item.category]}`}
              className="h-4 w-4 rounded border-[var(--color-border)]"
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">
        Push notifications require a registered device — the Android app lands in a later phase. Email and in-app delivery
        aren&apos;t gated by these toggles yet.
      </p>
      <Button type="submit" loading={submitting} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
