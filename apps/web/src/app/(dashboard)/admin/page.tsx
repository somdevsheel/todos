import Link from "next/link";
import { Building2, Megaphone, ScrollText, ShieldCheck, Users2 } from "lucide-react";
import type { DepartmentSummary, PaginatedResult } from "@arutech/shared-types";
import { requireRole } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { InviteEmployeeForm } from "@/components/admin/InviteEmployeeForm";
import { AuditLogTable, type AuditLogRow } from "@/components/admin/AuditLogTable";

const SECTIONS = [
  { href: "/employees", icon: Users2, title: "Employees", description: "Profiles, departments, activation, and roles." },
  { href: "/teams", icon: Users2, title: "Teams", description: "Create teams and manage membership." },
  { href: "/admin/departments", icon: Building2, title: "Departments", description: "Create, rename, and remove departments." },
  { href: "/admin/announcements", icon: Megaphone, title: "Announcements", description: "Org-wide broadcasts to the notification center." },
  { href: "/admin/roles", icon: ShieldCheck, title: "Roles & permissions", description: "Fine-grained permission editing per role." },
  { href: "/admin/audit-log", icon: ScrollText, title: "Audit log", description: "Full filterable history, not just a teaser." },
];

export default async function AdminPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();
  const departments = await apiFetch<DepartmentSummary[]>("/departments", { accessToken });

  const isSuperAdmin = hasAnyRole(user, ["SUPER_ADMIN"]);
  const recentActivity = isSuperAdmin
    ? await apiFetch<PaginatedResult<AuditLogRow>>("/audit-logs?page=1&pageSize=8", { accessToken })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Admin</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Manage the organization — employees, teams, departments, and more.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.filter((section) => section.href !== "/admin/roles" || isSuperAdmin).map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="flex h-full flex-col gap-2 transition-shadow hover:shadow-md">
              <div className="flex items-center gap-2">
                <section.icon className="h-4 w-4 text-[var(--color-accent-strong)]" aria-hidden />
                <p className="font-medium text-[var(--color-ink)]">{section.title}</p>
              </div>
              <p className="text-sm text-[var(--color-ink-muted)]">{section.description}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Invite an employee</CardTitle>
        </CardHeader>
        <InviteEmployeeForm departments={departments} />
      </Card>

      {recentActivity && (
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <AuditLogTable entries={recentActivity.items} />
          {recentActivity.items.length > 0 && (
            <Link href="/admin/audit-log" className="mt-3 inline-block text-sm text-[var(--color-accent-strong)] hover:underline">
              View the full audit log →
            </Link>
          )}
        </Card>
      )}
    </div>
  );
}
