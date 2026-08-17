"use client";

import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      // Always show the same confirmation regardless of outcome — the API
      // deliberately never reveals whether an account exists.
      setSent(true);
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <p className="text-sm text-[var(--color-ink-muted)]">
        If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link to it.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label="Company email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Button type="submit" loading={submitting} className="w-full">
        Send reset link
      </Button>
    </form>
  );
}
