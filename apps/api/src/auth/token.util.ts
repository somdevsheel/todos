import { createHash, randomBytes } from "crypto";

/**
 * Opaque, high-entropy tokens used for invitations, password resets, and
 * refresh tokens. Only the SHA-256 hash is ever persisted — the raw value
 * exists solely in the outbound email / API response, exactly like a
 * password, so a database read alone can never be used to impersonate a
 * user or accept an invitation.
 */
export function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
