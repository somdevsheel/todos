export interface PasswordResetEmailParams {
  recipientName: string;
  resetUrl: string;
  expiresAt: Date;
}

export function passwordResetEmail(params: PasswordResetEmailParams): { subject: string; html: string; text: string } {
  const expires = params.expiresAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  return {
    subject: "Reset your Arutech Workspace password",
    text:
      `Hi ${params.recipientName},\n\nReset your password: ${params.resetUrl}\n\n` +
      `This link expires at ${expires} IST. If you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
        <h2 style="margin:0 0 16px">Reset your password</h2>
        <p style="margin:0 0 16px;line-height:1.5">Hi ${params.recipientName}, we received a request to reset your Arutech Workspace password.</p>
        <a href="${params.resetUrl}"
           style="display:inline-block;background:#111827;color:#fff;text-decoration:none;
                  padding:12px 20px;border-radius:8px;font-weight:600;margin:8px 0 16px">
          Reset password
        </a>
        <p style="margin:0;color:#666;font-size:13px">
          This link expires at ${expires} IST. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  };
}
