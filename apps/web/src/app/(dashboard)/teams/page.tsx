import { Users2 } from "lucide-react";
import type { TeamSummary } from "@arutech/shared-types";
import { requireRole } from "@/lib/auth";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function TeamsPage() {
  await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const accessToken = await getAccessTokenFromCookies();
  const teams = await apiFetch<TeamSummary[]>("/teams", { accessToken });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-ink)]">Teams</h1>
        <p className="text-sm text-[var(--color-ink-muted)]">{teams.length} team{teams.length === 1 ? "" : "s"} in the organization.</p>
      </div>

      {teams.length === 0 ? (
        <EmptyState icon={Users2} title="No teams yet" description="Teams are created from the Admin panel." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <p className="font-medium text-[var(--color-ink)]">{team.name}</p>
              {team.description && <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{team.description}</p>}
              <p className="mt-3 text-xs text-[var(--color-ink-muted)]">{team.memberCount ?? 0} member{team.memberCount === 1 ? "" : "s"}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
