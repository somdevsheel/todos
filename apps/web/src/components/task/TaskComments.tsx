"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TaskCommentSummary } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";
import { UserAvatar } from "@/components/user/UserAvatar";
import { AssigneePicker, type AssigneeOption } from "./AssigneePicker";

export function TaskComments({ taskId, comments }: { taskId: string; comments: TaskCommentSummary[] }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<AssigneeOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), mentionedUserIds: mentions.map((m) => m.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "Unable to post the comment. Please try again.");
        return;
      }
      setBody("");
      setMentions([]);
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {comments.length === 0 && <p className="text-sm text-[var(--color-ink-muted)]">No comments yet — be the first.</p>}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-2">
            <UserAvatar firstName={comment.author.firstName} lastName={comment.author.lastName} size="sm" />
            <div className="min-w-0">
              <p className="flex items-baseline gap-2">
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  {comment.author.firstName} {comment.author.lastName}
                </span>
                <span className="text-xs text-[var(--color-ink-muted)]">{new Date(comment.createdAt).toLocaleString()}</span>
              </p>
              <p className="whitespace-pre-wrap text-sm text-[var(--color-ink)]">{comment.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={2}
          placeholder="Write a comment…"
          className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        />
        <AssigneePicker selected={mentions} onChange={setMentions} placeholder="Mention someone…" />
        <Button size="sm" className="self-end" onClick={submit} loading={submitting} disabled={!body.trim()}>
          Comment
        </Button>
      </div>
    </div>
  );
}
