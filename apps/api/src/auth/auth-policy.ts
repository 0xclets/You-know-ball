export function isOtpChallengeUsable(c: { expiresAt: Date; attempts: number; maxAttempts: number; consumedAt: Date | null }, now: Date): boolean {
  return !c.consumedAt && c.expiresAt.getTime() > now.getTime() && c.attempts < c.maxAttempts;
}
export function isRefreshReplay(t: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now = new Date()): boolean {
  return Boolean(t.usedAt) && !t.revokedAt && t.expiresAt.getTime() > now.getTime();
}
export function isRefreshUsable(t: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now: Date): boolean {
  return !t.usedAt && !t.revokedAt && t.expiresAt.getTime() > now.getTime();
}
