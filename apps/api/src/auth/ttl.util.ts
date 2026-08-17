const UNIT_MS: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };

/** Parses simple TTL strings like "15m" / "30d" (the same format jsonwebtoken's `expiresIn` accepts). */
export function ttlToMs(ttl: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(ttl.trim());
  if (!match) {
    throw new Error(`Invalid TTL format: "${ttl}". Expected e.g. "15m", "1h", "30d".`);
  }
  const [, value, unit] = match;
  return Number(value) * UNIT_MS[unit];
}

export function addTtl(base: Date, ttl: string): Date {
  return new Date(base.getTime() + ttlToMs(ttl));
}
