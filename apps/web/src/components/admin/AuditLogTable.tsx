import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

export function AuditLogTable({ entries }: { entries: AuditLogRow[] }) {
  if (entries.length === 0) {
    return <EmptyState title="No matching audit activity" description="Try clearing the filters, or check back after more activity happens." />;
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-ink-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Entity</th>
            <th className="px-4 py-3 font-medium">Actor</th>
            <th className="px-4 py-3 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink)]">{entry.action}</td>
              <td className="px-4 py-3 text-[var(--color-ink-muted)]">{entry.entityType}</td>
              <td className="px-4 py-3 text-[var(--color-ink-muted)]">{entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System"}</td>
              <td className="px-4 py-3 text-[var(--color-ink-muted)]">{new Date(entry.createdAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
