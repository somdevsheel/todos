"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import type { AnnouncementSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { AnnouncementForm } from "./AnnouncementForm";

export function AnnouncementsList({ announcements: initial, canDelete }: { announcements: AnnouncementSummary[]; canDelete: boolean }) {
  const [announcements, setAnnouncements] = useState(initial);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const remove = async (announcement: AnnouncementSummary) => {
    if (!confirm(`Delete "${announcement.title}"?`)) return;
    setDeletingId(announcement.id);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to delete this announcement.");
        return;
      }
      setAnnouncements((prev) => prev.filter((a) => a.id !== announcement.id));
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <AnnouncementForm onPosted={(announcement) => setAnnouncements((prev) => [announcement, ...prev])} />
      </Card>

      {announcements.length === 0 ? (
        <EmptyState title="No announcements yet" description="Post one above to notify the whole organization." />
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[var(--color-ink)]">{announcement.title}</p>
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => remove(announcement)}
                    disabled={deletingId === announcement.id}
                    aria-label={`Delete ${announcement.title}`}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-ink-muted)]">{announcement.body}</p>
              <p className="text-xs text-[var(--color-ink-muted)]">
                {announcement.createdByUser.firstName} {announcement.createdByUser.lastName} · {new Date(announcement.createdAt).toLocaleString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
