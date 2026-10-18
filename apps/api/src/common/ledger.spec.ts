import { assertBalancedLedger } from './ledger';

describe('assertBalancedLedger', () => {
  it('accepts balanced integer-kobo entries', () => {
    expect(() => assertBalancedLedger([{ accountId: 'a', amountKobo: 100n }, { accountId: 'b', amountKobo: -100n }])).not.toThrow();
  });
  it('rejects an unbalanced journal', () => {
    expect(() => assertBalancedLedger([{ accountId: 'a', amountKobo: 100n }, { accountId: 'b', amountKobo: -99n }])).toThrow(/Unbalanced/);
  });
  it('rejects fewer than two entries and zero amounts', () => {
    expect(() => assertBalancedLedger([{ accountId: 'a', amountKobo: 100n }])).toThrow();
    expect(() => assertBalancedLedger([{ accountId: 'a', amountKobo: 0n }, { accountId: 'b', amountKobo: 0n }])).toThrow();
  });
});
