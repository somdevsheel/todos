import { AuthCard } from "@/components/auth/AuthCard";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Link invalid">
        <p className="text-sm text-[var(--color-ink-muted)]">This password reset link is missing its token. Request a new one.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password">
      <ResetPasswordForm token={token} />
    </AuthCard>
  );
}
