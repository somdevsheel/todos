"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { SYSTEM_ROLES, ROLE_LABELS, type DepartmentSummary, type RoleName } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function InviteEmployeeForm({ departments }: { departments: DepartmentSummary[] }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [role, setRole] = useState<RoleName>("EMPLOYEE");
  const [departmentId, setDepartmentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, lastName, role, departmentId: departmentId || undefined }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body?.error?.message ?? "Unable to send the invitation. Please try again.");
      }
      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      setFirstName("");
      setLastName("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to send the invitation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      </div>
      <Input
        label="Company email"
        type="email"
        placeholder="employee@arutechconsultancy.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="role" className="text-sm font-medium text-[var(--color-ink)]">
            Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as RoleName)}
            className="h-10 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-ink)]"
          >
            {SYSTEM_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="department" className="text-sm font-medium text-[var(--color-ink)]">
            Department (optional)
          </label>
          <select
            id="department"
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
      </div>
      <Button type="submit" loading={submitting} className="self-start">
        Send invitation
      </Button>
    </form>
  );
}
