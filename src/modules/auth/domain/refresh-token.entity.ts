export interface RefreshToken {
  id: string;
  userId: string;
  /** Shared by every token rotated from the same login. */
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
}

export type NewRefreshToken = Pick<
  RefreshToken,
  'id' | 'userId' | 'familyId' | 'tokenHash' | 'expiresAt'
>;

export function isExpired(
  token: RefreshToken,
  now: Date = new Date(),
): boolean {
  return token.expiresAt.getTime() <= now.getTime();
}
