"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DepartmentSummary, UserSummary } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function EmployeeProfileForm({ employee, departments }: { employee: UserSummary; departments: DepartmentSummary[] }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(employee.firstName);
  const [lastName, setLastName] = useState(employee.lastName);
  const [departmentId, setDepartmentId] = useState(employee.departmentId ?? "");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${employee.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim(), lastName: lastName.trim(), departmentId: departmentId || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to save changes.");
        return;
      }
      toast.success("Profile updated");
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <Input label="Email" value={employee.email} disabled />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="employee-department" className="text-sm font-medium text-[var(--color-ink)]">
          Department
        </label>
        <select
          id="employee-department"
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
      <Button type="submit" loading={submitting} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
