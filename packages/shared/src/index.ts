/** Money is always represented in integer kobo to avoid floating-point errors. */
export const NGN_CURRENCY = 'NGN' as const;
export const SIGNUP_BONUS_KOBO = 100_000_000n;

export function nairaToKobo(naira: number): bigint {
  if (!Number.isFinite(naira) || naira < 0 || Math.round(naira * 100) !== naira * 100) {
    throw new Error('Amount must be a non-negative number with at most two decimal places');
  }
  return BigInt(Math.round(naira * 100));
}

export function formatNaira(kobo: bigint): string {
  const sign = kobo < 0n ? '-' : '';
  const absolute = kobo < 0n ? -kobo : kobo;
  return `${sign}₦${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}

/** Normalize Nigerian local mobile input to +234... (basic format normalization only). */
export function normalizeNgPhone(input: string): string {
  const digits = input.trim().replace(/[\s()-]/g, '');
  const normalized = digits.startsWith('+') ? digits : digits.startsWith('0') ? `+234${digits.slice(1)}` : digits.startsWith('234') ? `+${digits}` : '';
  if (!/^\+234[789][01]\d{8}$/.test(normalized)) throw new Error('Enter a valid Nigerian mobile number');
  return normalized;
}
