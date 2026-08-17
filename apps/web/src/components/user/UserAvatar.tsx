import { cn } from "@/lib/cn";

export interface UserAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
  /** Small colored dot in the corner — online/offline presence (Phase 5's chat). Omitted entirely unless explicitly passed, so every existing call site is unaffected. */
  presence?: "online" | "offline";
}

const SIZE_CLASSES = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs" } as const;

/** No avatarUrl handling yet (nothing uploads a profile photo in Phase 1/2) — always renders initials. */
export function UserAvatar({ firstName, lastName, size = "md", className, presence }: UserAvatarProps) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <span className="relative inline-flex flex-none">
      <span
        title={`${firstName} ${lastName}`}
        className={cn(
          "inline-flex items-center justify-center rounded-full bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-strong)]",
          SIZE_CLASSES[size],
          className,
        )}
      >
        {initials || "?"}
      </span>
      {presence && (
        <span
          aria-label={presence === "online" ? "Online" : "Offline"}
          className={cn(
            "absolute bottom-0 right-0 h-2 w-2 rounded-full ring-2 ring-[var(--color-surface)]",
            presence === "online" ? "bg-emerald-500" : "bg-[var(--color-ink-muted)]",
          )}
        />
      )}
    </span>
  );
}
