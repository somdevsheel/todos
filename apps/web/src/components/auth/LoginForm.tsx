"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export interface LoginFormProps {
  /** Where to send the user after a successful login. Defaults to /dashboard. */
  redirectTo?: string;
}

export function LoginForm({ redirectTo = "/dashboard" }: LoginFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    if (!email.trim()) errors.email = "Enter your company email.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();

      if (!res.ok || !body.success) {
        const message = body?.error?.message ?? "Unable to sign in. Please try again.";
        toast.error(message);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      toast.error("Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Company email"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@arutechconsultancy.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
      />
      <Input
        label="Password"
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
      />
      <div className="flex justify-end">
        <a href="/forgot-password" className="text-xs font-medium text-[var(--color-accent-strong)] hover:underline">
          Forgot password?
        </a>
      </div>
      <Button type="submit" loading={submitting} className="w-full">
        Sign in
      </Button>
    </form>
  );
}
