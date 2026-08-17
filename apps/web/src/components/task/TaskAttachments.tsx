"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Paperclip, Trash2 } from "lucide-react";
import type { TaskAttachmentSummary } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId, attachments }: { taskId: string; attachments: TaskAttachmentSummary[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleFileSelected = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch("/api/files", { method: "POST", body: formData });
      const uploadBody = await uploadRes.json();
      if (!uploadRes.ok || !uploadBody.success) {
        toast.error(uploadBody?.error?.message ?? "Unable to upload the file.");
        return;
      }

      const attachRes = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: uploadBody.data.id }),
      });
      const attachBody = await attachRes.json();
      if (!attachRes.ok || !attachBody.success) {
        toast.error(attachBody?.error?.message ?? "Unable to attach the file.");
        return;
      }

      toast.success("File attached");
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async (attachmentId: string) => {
    setDeletingId(attachmentId);
    try {
      const res = await fetch(`/api/tasks/${taskId}/attachments/${attachmentId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to remove the attachment.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {attachments.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No attachments yet.</p>}
      {attachments.map((attachment) => (
        <div key={attachment.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2">
          <a
            href={`/api/files/${attachment.file.id}`}
            className="flex min-w-0 items-center gap-2 text-sm text-[var(--color-ink)] hover:underline"
          >
            <Paperclip className="h-4 w-4 flex-none text-[var(--color-ink-muted)]" aria-hidden />
            <span className="truncate">{attachment.file.filename}</span>
            <span className="flex-none text-xs text-[var(--color-ink-muted)]">{formatSize(attachment.file.sizeBytes)}</span>
          </a>
          <button
            type="button"
            onClick={() => handleRemove(attachment.id)}
            disabled={deletingId === attachment.id}
            aria-label={`Remove ${attachment.file.filename}`}
            className="flex-none text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ))}

      <div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFileSelected(file);
          }}
        />
        <Button type="button" variant="secondary" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          <Paperclip className="h-3.5 w-3.5" aria-hidden />
          Attach a file
        </Button>
      </div>
    </div>
  );
}
