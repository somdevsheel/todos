"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [submitting, setSubmitting] = useState(false);

  const handleLogout = () => {
    setSubmitting(true);
    startTransition(async () => {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        // Even if the network call fails, the local cookies get cleared by
        // the route handler on a best-effort basis — always send the user
        // back to /login rather than leaving them stuck on a dead session.
      } finally {
        toast.success("Signed out");
        router.push("/login");
        router.refresh();
      }
    });
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleLogout} loading={isPending || submitting} aria-label="Sign out">
      <LogOut className="h-4 w-4" aria-hidden />
      Sign out
    </Button>
  );
}
