import Link from "next/link";
import type { PaginatedResult, UserSummary } from "@arutech/shared-types";
import { ROLE_LABELS } from "@arutech/shared-types";
import { requireRole } from "@/lib/auth";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserStatusBadge } from "@/components/user/UserStatusBadge";

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
                <tr key={employee.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--color-ink)]">
                    <Link href={`/employees/${employee.id}`} className="hover:underline">
                      {employee.firstName} {employee.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">{employee.email}</td>
                  <td className="px-4 py-3 text-[var(--color-ink-muted)]">
                    {employee.roles.map((role) => ROLE_LABELS[role]).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <UserStatusBadge status={employee.status} />
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
