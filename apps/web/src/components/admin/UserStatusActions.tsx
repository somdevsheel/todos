"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { UserStatus } from "@arutech/shared-types";
import { Button } from "@/components/ui/Button";

export function UserStatusActions({ userId, status }: { userId: string; status: UserStatus }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  if (status === "PENDING_INVITE") {
    const reinvite = async () => {
      setSubmitting(true);
      try {
        const res = await fetch(`/api/users/${userId}/reinvite`, { method: "POST" });
        const body = await res.json();
        if (!res.ok || !body.success) {
          toast.error(body?.error?.message ?? "Unable to resend this invitation.");
          return;
        }
        toast.success("Invitation resent. The previous link no longer works.");
        router.refresh();
      } catch {
        toast.error("Unable to reach the server. Please try again.");
      } finally {
        setSubmitting(false);
      }
    };

    return (
      <div className="flex items-center gap-3">
        <p className="text-sm text-[var(--color-ink-muted)]">Waiting for this person to accept their invitation.</p>
        <Button type="button" variant="secondary" size="sm" loading={submitting} onClick={reinvite}>
          Resend invitation
        </Button>
      </div>
    );
  }

  const isActive = status === "ACTIVE";

  const toggle = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userId}/${isActive ? "deactivate" : "activate"}`, { method: "POST" });
      const body = await res.json();
      if (!res.ok || !body.success) {
        toast.error(body?.error?.message ?? "Unable to update this employee's status.");
        return;
      }
      toast.success(isActive ? "Employee deactivated" : "Employee activated");
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button type="button" variant={isActive ? "danger" : "primary"} size="sm" loading={submitting} onClick={toggle}>
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}
