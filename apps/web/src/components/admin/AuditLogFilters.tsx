"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AUDIT_ACTIONS } from "@arutech/shared-types";

// Every entityType literal actually used across apps/api/src's AuditService.log() calls.
const ENTITY_TYPES = [
  "Conversation",
  "Department",
  "Event",
  "File",
  "Message",
  "NotificationPreference",
  "Organization",
  "Reminder",
  "Session",
  "Task",
  "Team",
  "User",
  "Announcement",
  "Role",
];

const SELECT_CLASS =
  "h-9 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm text-[var(--color-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

export function AuditLogFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select className={SELECT_CLASS} value={searchParams.get("action") ?? ""} onChange={(e) => setParam("action", e.target.value)}>
        <option value="">All actions</option>
        {Object.values(AUDIT_ACTIONS).map((action) => (
          <option key={action} value={action}>
            {action}
          </option>
        ))}
      </select>
      <select className={SELECT_CLASS} value={searchParams.get("entityType") ?? ""} onChange={(e) => setParam("entityType", e.target.value)}>
        <option value="">All entities</option>
        {ENTITY_TYPES.map((entityType) => (
          <option key={entityType} value={entityType}>
            {entityType}
          </option>
        ))}
      </select>
    </div>
  );
}
