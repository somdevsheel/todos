import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { AnnouncementSummary, PaginatedResult } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireRole } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { AnnouncementsList } from "@/components/admin/AnnouncementsList";

export default async function AdminAnnouncementsPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();
  const { items } = await apiFetch<PaginatedResult<AnnouncementSummary>>("/announcements?pageSize=50", { accessToken });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to admin
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Announcements</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">Org-wide broadcasts — every active employee gets a notification.</p>
      </div>
      <AnnouncementsList announcements={items} canDelete={hasAnyRole(user, ["SUPER_ADMIN", "ADMIN"])} />
    </div>
  );
}
