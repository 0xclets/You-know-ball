/** LMSR uses Naira-denominated payout shares and a liquidity parameter in Naira. */
export function lmsrCostNaira(overShares: number, underShares: number, liquidityNaira: number): number {
  if (!Number.isFinite(overShares) || !Number.isFinite(underShares) || overShares < 0 || underShares < 0) {
    throw new Error('Outstanding shares must be finite and non-negative.');
  }
  if (!Number.isFinite(liquidityNaira) || liquidityNaira <= 0) throw new Error('Liquidity must be positive.');
  const a = overShares / liquidityNaira;
  const b = underShares / liquidityNaira;
  const max = Math.max(a, b);
  return liquidityNaira * (max + Math.log(Math.exp(a - max) + Math.exp(b - max)));
}
export function lmsrPrices(overShares: number, underShares: number, liquidityNaira: number) {
  if (!Number.isFinite(liquidityNaira) || liquidityNaira <= 0) throw new Error('Liquidity must be positive.');
  const a = overShares / liquidityNaira;
  const b = underShares / liquidityNaira;
  const max = Math.max(a, b);
  const overWeight = Math.exp(a - max);
  const underWeight = Math.exp(b - max);
  const total = overWeight + underWeight;
  return { overPrice: overWeight / total, underPrice: underWeight / total };
}
