import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";

/**
 * Arutech Workspace verifies company-email ownership implicitly: clicking
 * the invitation link IS the verification (only someone with access to the
 * inbox can have the token). This page exists for the URL shape the spec
 * calls out, and forwards straight into the accept-invitation flow.
 */
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (token) redirect(`/register?token=${encodeURIComponent(token)}`);

  return (
    <AuthCard title="Check your inbox">
      <p className="text-sm text-[var(--color-ink-muted)]">
        We sent an invitation link to your Arutech company email. Open it to verify your email and set up your account.
      </p>
    </AuthCard>
  );
}
