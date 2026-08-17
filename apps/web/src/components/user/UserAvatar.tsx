import { cn } from "@/lib/cn";

export interface UserAvatarProps {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md";
  className?: string;
}

const SIZE_CLASSES = { sm: "h-6 w-6 text-[10px]", md: "h-8 w-8 text-xs" } as const;

/** No avatarUrl handling yet (nothing uploads a profile photo in Phase 1/2) — always renders initials. */
export function UserAvatar({ firstName, lastName, size = "md", className }: UserAvatarProps) {
  const initials = `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
  return (
    <span
      title={`${firstName} ${lastName}`}
      className={cn(
        "inline-flex flex-none items-center justify-center rounded-full bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-strong)]",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {initials || "?"}
    </span>
  );
}
