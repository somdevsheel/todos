import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-surface-subtle)] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">Page not found</h1>
        <p className="mt-2 text-sm text-[var(--color-ink-muted)]">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-[var(--color-accent-strong)] hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
