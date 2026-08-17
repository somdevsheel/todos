import type { CurrentUser } from "@arutech/shared-types";
import { ROLE_LABELS } from "@arutech/shared-types";
import { LogoutButton } from "./LogoutButton";

export function Topbar({ user }: { user: CurrentUser }) {
  return (
    <header className="flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:px-6">
      <div>
        <p className="text-sm font-medium text-[var(--color-ink)]">
          {user.firstName} {user.lastName}
        </p>
        <p className="text-xs text-[var(--color-ink-muted)]">{user.roles.map((role) => ROLE_LABELS[role]).join(", ")}</p>
      </div>
      <LogoutButton />
    </header>
  );
}
