import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { DepartmentSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireRole } from "@/lib/auth";
import { DepartmentsManager } from "@/components/admin/DepartmentsManager";

export default async function AdminDepartmentsPage() {
  await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();
  const departments = await apiFetch<DepartmentSummary[]>("/departments", { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to admin
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Departments</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">{departments.length} department{departments.length === 1 ? "" : "s"} in the organization.</p>
      </div>
      <DepartmentsManager departments={departments} />
    </div>
  );
}
