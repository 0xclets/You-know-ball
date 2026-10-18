import { isOtpChallengeUsable, isRefreshReplay, isRefreshUsable } from './auth-policy';

describe('authentication policy helpers', () => {
  const now = new Date('2026-10-18T12:00:00Z');
  it('rejects expired, consumed, or exhausted OTP challenges', () => {
    expect(isOtpChallengeUsable({ expiresAt: new Date(now.getTime() + 1000), attempts: 0, maxAttempts: 5, consumedAt: null }, now)).toBe(true);
    expect(isOtpChallengeUsable({ expiresAt: now, attempts: 0, maxAttempts: 5, consumedAt: null }, now)).toBe(false);
    expect(isOtpChallengeUsable({ expiresAt: new Date(now.getTime() + 1000), attempts: 5, maxAttempts: 5, consumedAt: null }, now)).toBe(false);
    expect(isOtpChallengeUsable({ expiresAt: new Date(now.getTime() + 1000), attempts: 0, maxAttempts: 5, consumedAt: now }, now)).toBe(false);
  });
  it('distinguishes reusable, expired, and replayed refresh tokens', () => {
    expect(isRefreshUsable({ usedAt: null, revokedAt: null, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(true);
    expect(isRefreshUsable({ usedAt: now, revokedAt: null, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(false);
    expect(isRefreshReplay({ usedAt: now, revokedAt: null, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(true);
    expect(isRefreshReplay({ usedAt: now, revokedAt: now, expiresAt: new Date(now.getTime() + 1000) }, now)).toBe(false);
  });
});
