import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  comingSoon?: boolean;
}

export function StatCard({ icon: Icon, label, value, hint, comingSoon }: StatCardProps) {
  return (
    <Card className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-ink-muted)]">{label}</p>
        <p className={cn("mt-1 text-2xl font-semibold text-[var(--color-ink)]", comingSoon && "text-[var(--color-ink-muted)]")}>
          {comingSoon ? "—" : value}
        </p>
        {hint && <p className="mt-0.5 text-xs text-[var(--color-ink-muted)]">{hint}</p>}
      </div>
      <div className="rounded-lg bg-[var(--color-accent-soft)] p-2 text-[var(--color-accent-strong)]">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
    </Card>
  );
}
