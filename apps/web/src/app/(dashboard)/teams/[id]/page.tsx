import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { TeamMemberSummary, TeamSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { requireRole } from "@/lib/auth";
import { hasAnyRole } from "@/lib/rbac";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TeamMembersEditor } from "@/components/team/TeamMembersEditor";

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole(["SUPER_ADMIN", "ADMIN", "MANAGER"]);
  const accessToken = await getAccessTokenFromCookies();

  // No GET /teams/:id exists — TeamsService.findAll() is cheap for the
  // org sizes this app targets, so the detail page just finds its team in
  // the same list the /teams page already fetches, rather than adding a
  // new single-team endpoint for this one lookup.
  const [teams, members] = await Promise.all([
    apiFetch<TeamSummary[]>("/teams", { accessToken }),
    apiFetch<TeamMemberSummary[]>(`/teams/${id}/members`, { accessToken }),
  ]);
  const team = teams.find((t) => t.id === id);
  if (!team) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/teams" className="inline-flex w-fit items-center gap-1.5 text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Back to teams
      </Link>

      <div>
        <h1 className="text-lg font-semibold text-[var(--color-ink)]">{team.name}</h1>
        {team.description && <p className="mt-1 text-sm text-[var(--color-ink-muted)]">{team.description}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <TeamMembersEditor teamId={team.id} members={members} canManage={hasAnyRole(user, ["SUPER_ADMIN", "ADMIN", "MANAGER"])} />
      </Card>
    </div>
  );
}
