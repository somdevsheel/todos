import type { UserStatus } from "@arutech/shared-types";

const STYLES: Record<UserStatus, string> = {
  ACTIVE: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
  PENDING_INVITE: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  DEACTIVATED: "bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]",
};

const LABELS: Record<UserStatus, string> = {
  ACTIVE: "Active",
  PENDING_INVITE: "Invited",
  SUSPENDED: "Suspended",
  DEACTIVATED: "Deactivated",
};

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STYLES[status]}`}>{LABELS[status]}</span>;
}
