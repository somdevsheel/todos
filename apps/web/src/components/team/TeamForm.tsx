"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { DepartmentSummary, TeamSummary } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface TeamFormProps {
  team?: TeamSummary;
  departments: DepartmentSummary[];
  onSuccess: (team: TeamSummary) => void;
  onCancel: () => void;
}

export function TeamForm({ team, departments, onSuccess, onCancel }: TeamFormProps) {
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [departmentId, setDepartmentId] = useState(team?.departmentId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Give the team a name.");
      return;
    }

    setSubmitting(true);
    try {
      const path = team ? `/api/teams/${team.id}` : "/api/teams";
      const method = team ? "PATCH" : "POST";
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          departmentId: departmentId || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to save the team. Please try again.");
        return;
      }
      toast.success(team ? "Team updated" : "Team created");
      onSuccess(body.data);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      <Input label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="team-department" className="text-sm font-medium text-[var(--color-ink)]">
          Department
        </label>
        <select
          id="team-department"
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
        >
          <option value="">No department</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {team ? "Save changes" : "Create team"}
        </Button>
      </div>
    </form>
  );
}
