import type { ReactNode } from "react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-subtle)] px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold text-[var(--color-ink)]">Arutech Workspace</p>
          <p className="text-xs text-[var(--color-ink-muted)]">Arutech Consultancy Services LLP</p>
        </div>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{subtitle}</p>}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
