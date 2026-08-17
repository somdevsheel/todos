import type { DepartmentSummary, PaginatedResult } from "@arutech/shared-types";
import { requireRole } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { InviteEmployeeForm } from "@/components/admin/InviteEmployeeForm";

interface AuditLogRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
  actor: { firstName: string; lastName: string; email: string } | null;
}

export default async function AdminPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();
  const departments = await apiFetch<DepartmentSummary[]>("/departments", { accessToken });

  const isSuperAdmin = hasAnyRole(user, ["SUPER_ADMIN"]);
  const auditLogs = isSuperAdmin
    ? await apiFetch<PaginatedResult<AuditLogRow>>("/audit-logs?page=1&pageSize=20", { accessToken })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Admin</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Employee management, teams, and announcements land here in full over Phase 7 — see ARCHITECTURE.md.
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Invite an employee</CardTitle>
        </CardHeader>
        <InviteEmployeeForm departments={departments} />
      </Card>

      {isSuperAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Audit log</CardTitle>
          </CardHeader>
          {auditLogs && auditLogs.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-ink-muted)]">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Action</th>
                    <th className="py-2 pr-4 font-medium">Entity</th>
                    <th className="py-2 pr-4 font-medium">Actor</th>
                    <th className="py-2 pr-4 font-medium">When</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.items.map((entry) => (
                    <tr key={entry.id} className="border-b border-[var(--color-border)] last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs text-[var(--color-ink)]">{entry.action}</td>
                      <td className="py-2 pr-4 text-[var(--color-ink-muted)]">{entry.entityType}</td>
                      <td className="py-2 pr-4 text-[var(--color-ink-muted)]">{entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : "System"}</td>
                      <td className="py-2 pr-4 text-[var(--color-ink-muted)]">{new Date(entry.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No audit activity yet" description="Every invite, login, and role change will appear here." />
          )}
        </Card>
      )}
    </div>
  );
}
