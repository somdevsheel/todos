import type { DepartmentSummary, TeamSummary } from "@arutech/shared-types";
import { requireRole } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { TeamsManager } from "@/components/team/TeamsManager";

export default async function TeamsPage() {
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const accessToken = await getAccessTokenFromCookies();
  const [teams, departments] = await Promise.all([
    apiFetch<TeamSummary[]>("/teams", { accessToken }),
    apiFetch<DepartmentSummary[]>("/departments", { accessToken }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Teams</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">{teams.length} team{teams.length === 1 ? "" : "s"} in the organization.</p>
      </div>

      <TeamsManager
        teams={teams}
        departments={departments}
        canCreateOrEdit={hasAnyRole(user, ["SUPER_ADMIN", "ADMIN", "MANAGER"])}
        canDelete={hasAnyRole(user, ["SUPER_ADMIN", "ADMIN"])}
      />
    </div>
  );
}
