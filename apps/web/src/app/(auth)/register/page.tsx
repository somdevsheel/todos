import type { InvitationPreview } from "@arutech/shared-types";
import { ROLE_LABELS } from "@arutech/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api-client";
import { AuthCard } from "@/components/auth/AuthCard";
import { AcceptInvitationForm } from "@/components/auth/AcceptInvitationForm";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Invitation required">
        <p className="text-sm text-[var(--color-ink-muted)]">
          Arutech Workspace is invitation-only. Ask your admin to invite you, then open the link from your email.
        </p>
      </AuthCard>
    );
  }

  let preview: InvitationPreview | null = null;
  let errorMessage: string | null = null;
  try {
    preview = await apiFetch<InvitationPreview>(`/auth/invitations/${encodeURIComponent(token)}`);
  } catch (error) {
    errorMessage = error instanceof ApiClientError ? error.message : "This invitation link is invalid.";
  }

  if (!preview) {
    return (
      <AuthCard title="Invitation not valid">
        <p className="text-sm text-[var(--color-ink-muted)]">{errorMessage}</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set up your account" subtitle={`${preview.email} · ${ROLE_LABELS[preview.role]} at ${preview.organizationName}`}>
      <AcceptInvitationForm token={token} />
    </AuthCard>
  );
}
