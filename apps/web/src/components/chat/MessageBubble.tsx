import type { MessageSummary } from "@arutech/shared-types";
import { UserAvatar } from "@/components/user/UserAvatar";
import { cn } from "@/lib/cn";

export function MessageBubble({ message, isMine }: { message: MessageSummary; isMine: boolean }) {
  return (
    <div className={cn("flex items-end gap-2", isMine && "flex-row-reverse")}>
      <UserAvatar firstName={message.senderUser.firstName} lastName={message.senderUser.lastName} size="sm" />
      <div className={cn("flex max-w-[75%] flex-col gap-0.5", isMine && "items-end")}>
        {!isMine && (
          <span className="text-xs font-medium text-[var(--color-ink-muted)]">
            {message.senderUser.firstName} {message.senderUser.lastName}
          </span>
        )}
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm",
            isMine ? "bg-[var(--color-accent)] text-white" : "bg-[var(--color-surface-subtle)] text-[var(--color-ink)]",
          )}
        >
          {message.body}
        </div>
        <span className="text-[10px] text-[var(--color-ink-muted)]">
          {new Date(message.createdAt).toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit", hour12: true })}
          {message.editedAt && " · edited"}
        </span>
      </div>
    </div>
  );
}
