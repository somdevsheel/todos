import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { PermissionSummary, RoleWithPermissions } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireRole } from "@/lib/auth";
import { PermissionMatrix } from "@/components/admin/PermissionMatrix";

export default async function AdminRolesPage() {
  await requireRole(["SUPER_ADMIN"]);
  const accessToken = await getAccessTokenFromCookies();
  const [roles, permissions] = await Promise.all([
    apiFetch<RoleWithPermissions[]>("/roles", { accessToken }),
    apiFetch<PermissionSummary[]>("/permissions", { accessToken }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to admin
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Roles &amp; permissions</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">
          Which permissions each role carries. <strong>This doesn&apos;t change what anyone can do yet</strong> — every
          authorization check in the app today is based on role name (SUPER_ADMIN/ADMIN/MANAGER/EMPLOYEE), not these
          permission keys. This screen makes the data real and saved correctly, ahead of any endpoint reading it.
        </p>
      </div>
      <PermissionMatrix roles={roles} permissions={permissions} />
    </div>
  );
}
