"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { X } from "lucide-react";
import { ROLE_LABELS, SYSTEM_ROLES, type RoleName } from "@arutech/shared-types";

export function RoleAssignmentEditor({ userId, roles }: { userId: string; roles: RoleName[] }) {
  const router = useRouter();
  const [busyRole, setBusyRole] = useState<RoleName | null>(null);

  const assignedSet = new Set(roles);
  const availableRoles = SYSTEM_ROLES.filter((role) => !assignedSet.has(role));

  const assign = async (role: RoleName) => {
    setBusyRole(role);
    try {
      const res = await fetch(`/api/users/${userId}/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to assign this role.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyRole(null);
    }
  };

  const revoke = async (role: RoleName) => {
    setBusyRole(role);
    try {
      const res = await fetch(`/api/users/${userId}/roles/${role}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to revoke this role.");
        return;
      }
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <span
            key={role}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent-soft)] py-1 pl-3 pr-2 text-xs font-medium text-[var(--color-accent-strong)]"
          >
            {ROLE_LABELS[role]}
            <button
              type="button"
              onClick={() => revoke(role)}
              disabled={busyRole === role}
              aria-label={`Revoke ${ROLE_LABELS[role]}`}
              className="text-[var(--color-accent-strong)] hover:opacity-70 disabled:opacity-50"
            >
              <X className="h-3 w-3" aria-hidden />
            </button>
          </span>
        ))}
      </div>

      {availableRoles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableRoles.map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => assign(role)}
              disabled={busyRole === role}
              className="rounded-full border border-dashed border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-ink-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent-strong)] disabled:opacity-50"
            >
              + {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
