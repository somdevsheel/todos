"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { CurrentUser } from "@arutech/shared-types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ProfileForm({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) {
        throw new Error(body?.error?.message ?? "Unable to update your profile. Please try again.");
      }
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update your profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
      <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
      <Input label="Email" value={user.email} disabled />
      <Button type="submit" loading={submitting} className="self-start">
        Save changes
      </Button>
    </form>
  );
}
