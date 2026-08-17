"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function TaskDeleteButton({ taskId }: { taskId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!confirming) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(true)}>
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
        Delete
      </Button>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to delete this task.");
        return;
      }
      toast.success("Task deleted");
      router.push("/tasks");
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--color-ink-muted)]">Delete this task?</span>
      <Button type="button" variant="danger" size="sm" loading={deleting} onClick={handleDelete}>
        Confirm
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={() => setConfirming(false)}>
        Cancel
      </Button>
    </div>
  );
}
