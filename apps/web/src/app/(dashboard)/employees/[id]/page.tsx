import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { DepartmentSummary, UserSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireRole } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { UserStatusBadge } from "@/components/user/UserStatusBadge";
import { EmployeeProfileForm } from "@/components/admin/EmployeeProfileForm";
import { UserStatusActions } from "@/components/admin/UserStatusActions";
import { RoleAssignmentEditor } from "@/components/admin/RoleAssignmentEditor";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();

  const [employee, departments] = await Promise.all([
    apiFetch<UserSummary>(`/users/${id}`, { accessToken }),
    apiFetch<DepartmentSummary[]>("/departments", { accessToken }),
  ]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/employees" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to employees
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-ink)]">
              {employee.firstName} {employee.lastName}
            </h1>
            <p className="text-sm text-[var(--color-ink-muted)]">{employee.email}</p>
          </div>
          <UserStatusBadge status={employee.status} />
        </div>
        <div className="mt-4 border-t border-[var(--color-border)] pt-3">
          <UserStatusActions userId={employee.id} status={employee.status} />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <EmployeeProfileForm employee={employee} departments={departments} />
      </Card>

      {hasAnyRole(actor, ["SUPER_ADMIN"]) && (
        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
          </CardHeader>
          <RoleAssignmentEditor userId={employee.id} roles={employee.roles} />
        </Card>
      )}
    </div>
  );
}
