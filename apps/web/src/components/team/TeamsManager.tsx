"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users2 } from "lucide-react";
import type { DepartmentSummary, TeamSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TeamForm } from "./TeamForm";

export interface TeamsManagerProps {
  teams: TeamSummary[];
  departments: DepartmentSummary[];
  /** Matches the backend's own gates exactly: POST/PATCH /teams allow MANAGER too, DELETE doesn't — see TeamsController. */
  canCreateOrEdit: boolean;
  canDelete: boolean;
}

export function TeamsManager({ teams: initial, departments, canCreateOrEdit, canDelete }: TeamsManagerProps) {
  const [teams, setTeams] = useState(initial);
  const [editing, setEditing] = useState<TeamSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const upsert = (team: TeamSummary) => {
    setTeams((prev) => {
      const exists = prev.some((t) => t.id === team.id);
      return exists ? prev.map((t) => (t.id === team.id ? team : t)) : [...prev, team];
    });
  };

  const remove = async (team: TeamSummary) => {
    if (!confirm(`Delete "${team.name}"? This can't be undone.`)) return;
    setDeletingId(team.id);
    try {
      const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to delete this team.");
        return;
      }
      setTeams((prev) => prev.filter((t) => t.id !== team.id));
      toast.success("Team deleted");
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {canCreateOrEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden />
            New team
          </Button>
        </div>
      )}

      {teams.length === 0 ? (
        <EmptyState icon={Users2} title="No teams yet" description="Create your first team to start assigning work." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <Link href={`/teams/${team.id}`} className="font-medium text-[var(--color-ink)] hover:underline">
                  {team.name}
                </Link>
                {canCreateOrEdit && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(team)}
                      aria-label={`Edit ${team.name}`}
                      className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => remove(team)}
                        disabled={deletingId === team.id}
                        aria-label={`Delete ${team.name}`}
                        className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {team.description && <p className="text-sm text-[var(--color-ink-muted)]">{team.description}</p>}
              <p className="text-xs text-[var(--color-ink-muted)]">{team.memberCount ?? 0} member{team.memberCount === 1 ? "" : "s"}</p>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create team">
        <TeamForm
          departments={departments}
          onCancel={() => setCreating(false)}
          onSuccess={(team) => {
            upsert(team);
            setCreating(false);
          }}
        />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit team">
        {editing && (
          <TeamForm
            team={editing}
            departments={departments}
            onCancel={() => setEditing(null)}
            onSuccess={(team) => {
              upsert(team);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
