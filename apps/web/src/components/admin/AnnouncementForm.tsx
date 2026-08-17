"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { AnnouncementSummary } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function AnnouncementForm({ onPosted }: { onPosted: (announcement: AnnouncementSummary) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Give the announcement a title and a message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const responseBody = await res.json();
      if (!res.ok || !responseBody.success) {
        toast.error(responseBody?.error?.message ?? "Unable to post the announcement. Please try again.");
        return;
      }
      toast.success("Announcement posted — everyone in the organization has been notified.");
      setTitle("");
      setBody("");
      onPosted(responseBody.data);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="announcement-body" className="text-sm font-medium text-[var(--color-ink)]">
          Message
        </label>
        <textarea
          id="announcement-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
      </div>
      <p className="text-xs text-[var(--color-ink-muted)]">Posts to the notification center for every other active employee in the organization.</p>
      <Button type="submit" loading={submitting} className="self-start">
        Post announcement
      </Button>
    </form>
  );
}
