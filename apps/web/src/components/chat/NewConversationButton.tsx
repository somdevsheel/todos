"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import type { ConversationSummary, ConversationType } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { AssigneePicker, type AssigneeOption } from "@/components/task/AssigneePicker";

export function NewConversationButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ConversationType>("DIRECT");
  const [name, setName] = useState("");
  const [members, setMembers] = useState<AssigneeOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setType("DIRECT");
    setName("");
    setMembers([]);
  };

  const submit = async () => {
    if (members.length === 0) {
      toast.error("Pick at least one person.");
      return;
    }
    if (type === "GROUP" && !name.trim()) {
      toast.error("Give the group a name.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, name: type === "GROUP" ? name.trim() : undefined, memberUserIds: members.map((m) => m.id) }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to start this conversation.");
        return;
      }
      setOpen(false);
      reset();
      const conversation = body.data as ConversationSummary;
      router.push(`/chat/${conversation.id}`);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        New conversation
      </Button>
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="New conversation"
      >
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit rounded-lg border border-[var(--color-border)] p-0.5">
            {(["DIRECT", "GROUP"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                aria-pressed={type === option}
                className={
                  type === option
                    ? "rounded-md bg-[var(--color-accent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--color-accent-strong)]"
                    : "rounded-md px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)]"
                }
              >
                {option === "DIRECT" ? "Direct message" : "Group"}
              </button>
            ))}
          </div>

          {type === "GROUP" && <Input label="Group name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[var(--color-ink)]">{type === "DIRECT" ? "With" : "Members"}</span>
            <AssigneePicker
              selected={members}
              onChange={(next) => setMembers(type === "DIRECT" ? next.slice(-1) : next)}
              placeholder="Search employees…"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={submitting} onClick={submit}>
              {type === "DIRECT" ? "Start conversation" : "Create group"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
