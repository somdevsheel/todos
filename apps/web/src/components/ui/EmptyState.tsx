import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--color-border)] px-6 py-10 text-center">
      {Icon && <Icon className="h-8 w-8 text-[var(--color-ink-muted)]" aria-hidden />}
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--color-ink-muted)]">{description}</p>}
      {action}
    </div>
  );
}
