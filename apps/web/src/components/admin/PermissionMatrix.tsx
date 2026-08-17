"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ROLE_LABELS, type PermissionSummary, type RoleWithPermissions } from "@arutech/shared-types";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function PermissionMatrix({ roles: initial, permissions }: { roles: RoleWithPermissions[]; permissions: PermissionSummary[] }) {
  const [roles, setRoles] = useState(initial);
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);

  const toggle = (roleId: string, permissionId: string) => {
    setRoles((prev) =>
      prev.map((role) => {
        if (role.id !== roleId) return role;
        const has = role.permissionIds.includes(permissionId);
        return { ...role, permissionIds: has ? role.permissionIds.filter((id) => id !== permissionId) : [...role.permissionIds, permissionId] };
      }),
    );
  };

  const save = async (role: RoleWithPermissions) => {
    setSavingRoleId(role.id);
    try {
      const res = await fetch(`/api/roles/${role.id}/permissions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissionIds: role.permissionIds }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to save this role's permissions.");
        return;
      }
      toast.success(`${ROLE_LABELS[role.name]}'s permissions saved`);
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSavingRoleId(null);
    }
  };

  if (permissions.length === 0) {
    return <p className="text-sm text-[var(--color-ink-muted)]">No permissions in the catalog yet.</p>;
  }

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-ink-muted)]">
          <tr>
            <th className="px-4 py-3 font-medium">Role</th>
            {permissions.map((permission) => (
              <th key={permission.id} className="px-3 py-3 text-center font-mono font-medium normal-case">
                {permission.key}
              </th>
            ))}
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="px-4 py-3 font-medium text-[var(--color-ink)]">{ROLE_LABELS[role.name]}</td>
              {permissions.map((permission) => (
                <td key={permission.id} className="px-3 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={role.permissionIds.includes(permission.id)}
                    onChange={() => toggle(role.id, permission.id)}
                    aria-label={`${ROLE_LABELS[role.name]} — ${permission.key}`}
                    className="h-4 w-4 rounded border-[var(--color-border)]"
                  />
                </td>
              ))}
              <td className="px-4 py-3">
                <Button type="button" size="sm" variant="secondary" loading={savingRoleId === role.id} onClick={() => save(role)}>
                  Save
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
