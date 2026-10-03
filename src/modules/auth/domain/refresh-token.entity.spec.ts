import { isExpired, RefreshToken } from './refresh-token.entity';

describe('isExpired', () => {
  const token = (expiresAt: Date) => ({ expiresAt }) as RefreshToken;
  const now = new Date('2026-06-01T12:00:00Z');

  it('is false before the expiry time', () => {
    expect(isExpired(token(new Date('2026-06-01T12:00:01Z')), now)).toBe(false);
  });

  it('is true at and after the expiry time', () => {
    expect(isExpired(token(now), now)).toBe(true);
    expect(isExpired(token(new Date('2026-06-01T11:00:00Z')), now)).toBe(true);
  });
});
