"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { MessageSummary } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";
import { AssigneePicker, type AssigneeOption } from "@/components/task/AssigneePicker";
import { useChatSocket } from "./SocketProvider";

const TYPING_STOP_DELAY_MS = 2000;

export function MessageComposer({ conversationId, onSent }: { conversationId: string; onSent: (message: MessageSummary) => void }) {
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<AssigneeOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const socket = useChatSocket();
  const typingStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTyping = useRef(false);

  const notifyTyping = () => {
    if (!socket) return;
    if (!isTyping.current) {
      isTyping.current = true;
      socket.emit("typing:start", { conversationId });
    }
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    typingStopTimer.current = setTimeout(() => {
      isTyping.current = false;
      socket.emit("typing:stop", { conversationId });
    }, TYPING_STOP_DELAY_MS);
  };

  const submit = async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    if (typingStopTimer.current) clearTimeout(typingStopTimer.current);
    if (isTyping.current) {
      isTyping.current = false;
      socket?.emit("typing:stop", { conversationId });
    }

    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim(), mentionedUserIds: mentions.map((m) => m.id) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "Unable to send that message.");
        return;
      }
      setBody("");
      setMentions([]);
      onSent(data.data as MessageSummary);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 border-t border-[var(--color-border)] pt-3">
      <textarea
        value={body}
        onChange={(e) => {
          setBody(e.target.value);
          notifyTyping();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        rows={2}
        placeholder="Write a message…"
        className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      />
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <AssigneePicker selected={mentions} onChange={setMentions} placeholder="Mention someone…" />
        </div>
        <Button size="sm" onClick={submit} loading={submitting} disabled={!body.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}
