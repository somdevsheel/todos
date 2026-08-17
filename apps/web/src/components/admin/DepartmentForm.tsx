"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import type { DepartmentSummary } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface DepartmentFormProps {
  department?: DepartmentSummary;
  onSuccess: (department: DepartmentSummary) => void;
  onCancel: () => void;
}

export function DepartmentForm({ department, onSuccess, onCancel }: DepartmentFormProps) {
  const [name, setName] = useState(department?.name ?? "");
  const [description, setDescription] = useState(department?.description ?? "");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Give the department a name.");
      return;
    }

    setSubmitting(true);
    try {
      const path = department ? `/api/departments/${department.id}` : "/api/departments";
      const method = department ? "PATCH" : "POST";
      const res = await fetch(path, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to save the department. Please try again.");
        return;
      }
      toast.success(department ? "Department updated" : "Department created");
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
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {department ? "Save changes" : "Create department"}
        </Button>
      </div>
    </form>
  );
}
