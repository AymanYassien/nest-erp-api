import { createHash, randomBytes } from 'node:crypto';

/**
 * Refresh tokens are opaque random strings, not JWTs: they are only ever
 * checked against the database, so they need no signature or payload.
 */
export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

/**
 * SHA-256 is enough here (unlike passwords) because the token has 384 bits of
 * entropy, and a deterministic hash lets us look tokens up by index.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
