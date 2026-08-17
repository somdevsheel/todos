"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("Unhandled error in Arutech Workspace:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-[var(--color-surface-subtle)] px-4">
        <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-[var(--color-ink)]">Something went wrong</h1>
          <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
            Unable to load this page. Please try again — if this keeps happening, contact your workspace admin.
          </p>
          <Button className="mt-4 w-full" onClick={reset}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}
