/** Validates a double-entry journal in integer kobo before persistence. */
export type LedgerLine = { accountId: string; amountKobo: bigint };
export function assertBalancedLedger(lines: LedgerLine[]): void {
  if (lines.length < 2) throw new Error('A ledger transaction needs at least two entries');
  if (lines.some((line) => line.amountKobo === 0n)) throw new Error('Zero-value ledger entries are not allowed');
  const total = lines.reduce((sum, line) => sum + line.amountKobo, 0n);
  if (total !== 0n) throw new Error('Unbalanced ledger transaction: ' + total.toString() + ' kobo');
}
