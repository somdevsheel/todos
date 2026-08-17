/**
 * Minimal client for MailHog's v2 API (see docker/docker-compose.dev.yml —
 * the dev stack's SMTP catcher). Used only by e2e tests so the invitation
 * flow can be verified genuinely end-to-end, including the outbound email,
 * without a real mail provider.
 */
const MAILHOG_API_URL = process.env.MAILHOG_API_URL ?? "http://localhost:8095";

interface MailHogMessage {
  Content: { Body: string };
  To: Array<{ Mailbox: string; Domain: string }>;
}

async function fetchMessages(): Promise<MailHogMessage[]> {
  const res = await fetch(`${MAILHOG_API_URL}/api/v2/messages?limit=50`);
  if (!res.ok) throw new Error(`MailHog API returned ${res.status}`);
  const body = (await res.json()) as { items: MailHogMessage[] };
  return body.items;
}

/** Polls MailHog for the most recent message sent to `email`, up to `timeoutMs`. */
export async function waitForMailTo(email: string, timeoutMs = 5000): Promise<MailHogMessage> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await fetchMessages();
    const match = messages.find((m) => m.To.some((to) => `${to.Mailbox}@${to.Domain}`.toLowerCase() === email.toLowerCase()));
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`No MailHog message arrived for ${email} within ${timeoutMs}ms`);
}

/** nodemailer sends both parts as quoted-printable — undo soft line breaks and =XX escapes before scanning for a link. */
function decodeQuotedPrintable(input: string): string {
  return input.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/g, (_match, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

/** Extracts the `token` query param from the first link in an email body. */
export function extractTokenFromEmail(message: MailHogMessage): string {
  const decoded = decodeQuotedPrintable(message.Content.Body);
  const match = /token=([^"&\s]+)/.exec(decoded);
  if (!match) throw new Error("Could not find a token link in the email body");
  return decodeURIComponent(match[1]);
}
