import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PaginatedResult } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireRole } from "@/lib/auth";
import { AuditLogFilters } from "@/components/admin/AuditLogFilters";
import { AuditLogTable, type AuditLogRow } from "@/components/admin/AuditLogTable";
import { Pagination } from "@/components/admin/Pagination";

interface AuditLogPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminAuditLogPage({ searchParams }: AuditLogPageProps) {
  await requireRole(["SUPER_ADMIN"]);
  const params = await searchParams;
  const accessToken = await getAccessTokenFromCookies();

  const query = new URLSearchParams();
  query.set("page", params.page ?? "1");
  query.set("pageSize", "25");
  if (params.action) query.set("action", params.action);
  if (params.entityType) query.set("entityType", params.entityType);

  const { items, meta } = await apiFetch<PaginatedResult<AuditLogRow>>(`/audit-logs?${query.toString()}`, { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to admin
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Audit log</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Every invite, login, and change of consequence across the organization.</p>
      </div>

      <Suspense>
        <AuditLogFilters />
      </Suspense>

      <AuditLogTable entries={items} />
      <Pagination meta={meta} />
    </div>
  );
}
