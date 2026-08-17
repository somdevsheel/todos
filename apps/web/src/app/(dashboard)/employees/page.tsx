import type { PaginatedResult, UserSummary } from "@arutech/shared-types";
import { ROLE_LABELS } from "@arutech/shared-types";
import { requireRole } from "@/lib/auth";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function EmployeesPage() {
  await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();
  const { items, meta } = await apiFetch<PaginatedResult<UserSummary>>("/users?page=1&pageSize=50", { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Employees</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">{meta.totalItems} total across the organization.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState title="No employees yet" description="Invite your first teammate from the Admin panel." />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((employee) => (
                <tr key={employee.id} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                    {employee.firstName} {employee.lastName}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">{employee.email}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {employee.roles.map((role) => ROLE_LABELS[role]).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={employee.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: UserSummary["status"] }) {
  const styles: Record<UserSummary["status"], string> = {
    ACTIVE: "bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)]",
    PENDING_INVITE: "bg-amber-100 text-amber-800",
    SUSPENDED: "bg-red-100 text-red-800",
    DEACTIVATED: "bg-[var(--color-surface-subtle)] text-[var(--color-ink-muted)]",
  };
  const labels: Record<UserSummary["status"], string> = {
    ACTIVE: "Active",
    PENDING_INVITE: "Invited",
    SUSPENDED: "Suspended",
    DEACTIVATED: "Deactivated",
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
}
