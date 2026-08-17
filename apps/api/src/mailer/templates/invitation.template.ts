import { escapeHtml } from "./escape-html.util";

export interface InvitationEmailParams {
  recipientEmail: string;
  organizationName: string;
  invitedByName: string;
  acceptUrl: string;
  expiresAt: Date;
}

export function invitationEmail(params: InvitationEmailParams): { subject: string; html: string; text: string } {
  const expires = params.expiresAt.toDateString();
  // Plain-text body and the subject line are never HTML-rendered, so the
  // raw values are fine there — only the `html` string below needs escaping.
  const invitedByName = escapeHtml(params.invitedByName);
  const organizationName = escapeHtml(params.organizationName);
  return {
    subject: `You're invited to join ${params.organizationName} on Arutech Workspace`,
    text:
      `${params.invitedByName} invited you to join ${params.organizationName} on Arutech Workspace.\n\n` +
      `Accept your invitation: ${params.acceptUrl}\n\nThis link expires on ${expires}.`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h2 style="margin:0 0 16px">You're invited to Arutech Workspace</h2>
        <p style="margin:0 0 16px;line-height:1.5">
          <strong>${invitedByName}</strong> invited you to join
          <strong>${organizationName}</strong> on Arutech Workspace.
        </p>
        <a href="${params.acceptUrl}"
           style="display:inline-block;background:#111827;color:#fff;text-decoration:none;
                  padding:12px 20px;border-radius:8px;font-weight:600;margin:8px 0 16px">
          Accept invitation
        </a>
        <p style="margin:0;color:#666;font-size:13px">This link expires on ${expires}.</p>
      </div>
    `,
  };
}
