import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({ title = "Unable to load this page.", description = "Please try again.", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-[var(--color-danger)]" aria-hidden />
      <p className="text-sm font-medium text-[var(--color-ink)]">{title}</p>
      <p className="max-w-sm text-sm text-[var(--color-ink-muted)]">{description}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}
