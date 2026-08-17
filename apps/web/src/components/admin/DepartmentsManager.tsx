"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { DepartmentSummary } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { DepartmentForm } from "./DepartmentForm";

export function DepartmentsManager({ departments: initial }: { departments: DepartmentSummary[] }) {
  const [departments, setDepartments] = useState(initial);
  const [editing, setEditing] = useState<DepartmentSummary | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const upsert = (department: DepartmentSummary) => {
    setDepartments((prev) => {
      const exists = prev.some((d) => d.id === department.id);
      return exists ? prev.map((d) => (d.id === department.id ? department : d)) : [...prev, department];
    });
  };

  const remove = async (department: DepartmentSummary) => {
    if (!confirm(`Delete "${department.name}"? This can't be undone.`)) return;
    setDeletingId(department.id);
    try {
      const res = await fetch(`/api/departments/${department.id}`, { method: "DELETE" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to delete this department.");
        return;
      }
      setDepartments((prev) => prev.filter((d) => d.id !== department.id));
      toast.success("Department deleted");
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" aria-hidden />
          New department
        </Button>
      </div>

      {departments.length === 0 ? (
        <EmptyState title="No departments yet" description="Create your first department to organize employees." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((department) => (
            <Card key={department.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-[var(--color-ink)]">{department.name}</p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(department)}
                    aria-label={`Edit ${department.name}`}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(department)}
                    disabled={deletingId === department.id}
                    aria-label={`Delete ${department.name}`}
                    className="text-[var(--color-ink-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                </div>
              </div>
              {department.description && <p className="text-sm text-[var(--color-ink-muted)]">{department.description}</p>}
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title="Create department">
        <DepartmentForm
          onCancel={() => setCreating(false)}
          onSuccess={(department) => {
            upsert(department);
            setCreating(false);
          }}
        />
      </Modal>

      <Modal open={editing !== null} onClose={() => setEditing(null)} title="Edit department">
        {editing && (
          <DepartmentForm
            department={editing}
            onCancel={() => setEditing(null)}
            onSuccess={(department) => {
              upsert(department);
              setEditing(null);
            }}
          />
        )}
      </Modal>
    </div>
  );
}
