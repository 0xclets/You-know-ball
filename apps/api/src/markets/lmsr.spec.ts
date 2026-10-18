import { lmsrCostNaira, lmsrPrices } from './lmsr';

describe('LMSR pricing', () => {
  it('starts with symmetric 50/50 prices', () => {
    const prices = lmsrPrices(0, 0, 50000);
    expect(prices.overPrice).toBeCloseTo(0.5, 10);
    expect(prices.underPrice).toBeCloseTo(0.5, 10);
  });
  it('moves price toward the outcome with more shares', () => {
    expect(lmsrPrices(10000, 0, 50000).overPrice).toBeGreaterThan(0.5);
    expect(lmsrPrices(0, 10000, 50000).underPrice).toBeGreaterThan(0.5);
  });
  it('has a positive buy cost and remains numerically stable at large quantities', () => {
    const before = lmsrCostNaira(0, 0, 50000);
    const after = lmsrCostNaira(10, 0, 50000);
    expect(after).toBeGreaterThan(before);
    expect(Number.isFinite(lmsrPrices(1e9, 0, 50000).overPrice)).toBe(true);
  });
});
