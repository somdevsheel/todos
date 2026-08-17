"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { UserSummary } from "@arutech/shared-types";
import { UserAvatar } from "@/components/user/UserAvatar";

/** Only what the picker actually renders — a TaskDetail's `assignees` (no email/roles) satisfy this just as well as a full UserSummary from search results. */
export type AssigneeOption = Pick<UserSummary, "id" | "firstName" | "lastName" | "avatarUrl">;

export interface AssigneePickerProps {
  selected: AssigneeOption[];
  onChange: (users: AssigneeOption[]) => void;
  /** Users already shown elsewhere (e.g. don't suggest someone already an assignee twice). */
  excludeUserIds?: string[];
  placeholder?: string;
}

/** Multi-select employee search, backed by GET /api/users (BFF proxy to GET /users). Reused for both task assignment and @mention pickers. */
export function AssigneePicker({ selected, onChange, excludeUserIds = [], placeholder = "Search employees…" }: AssigneePickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSummary[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?search=${encodeURIComponent(query)}&pageSize=8`, { signal: controller.signal });
        const body = await res.json();
        if (body.success) setResults(body.data.items);
      } catch {
        // Aborted (new keystroke) or a transient network error — the user can just keep typing.
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      clearTimeout(debounce);
      controller.abort();
    };
  }, [query]);

  const selectedIds = new Set(selected.map((u) => u.id));
  const visibleResults = results.filter((u) => !selectedIds.has(u.id) && !excludeUserIds.includes(u.id));

  return (
    <div className="relative">
      {selected.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-subtle)] py-1 pl-1 pr-2 text-xs text-[var(--color-ink)]"
            >
              <UserAvatar firstName={user.firstName} lastName={user.lastName} size="sm" />
              {user.firstName} {user.lastName}
              <button
                type="button"
                onClick={() => onChange(selected.filter((u) => u.id !== user.id))}
                aria-label={`Remove ${user.firstName} ${user.lastName}`}
                className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      />
      {open && (loading || visibleResults.length > 0) && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
          {loading && <div className="px-3 py-2 text-xs text-[var(--color-ink-muted)]">Searching…</div>}
          {visibleResults.map((user) => (
            <button
              key={user.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange([...selected, user]);
                setQuery("");
                setResults([]);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-subtle)]"
            >
              <UserAvatar firstName={user.firstName} lastName={user.lastName} size="sm" />
              <span>
                {user.firstName} {user.lastName}
              </span>
              <span className="ml-auto truncate text-xs text-[var(--color-ink-muted)]">{user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
