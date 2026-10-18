import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { LedgerAccountKind, LedgerTransactionType, MarketOutcome, MarketStatus, Prisma, TradeSide, WalletKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lmsrCostNaira, lmsrPrices } from './lmsr';

type TradeInput = { outcome: MarketOutcome; side: TradeSide; shares: string | number; idempotencyKey: string };
function koboCeil(naira: number): bigint { return BigInt(Math.max(1, Math.ceil(naira * 100 - 1e-9))); }
function koboFloor(naira: number): bigint { return BigInt(Math.max(1, Math.floor(naira * 100 + 1e-9))); }
function feeFor(grossKobo: bigint, bps: number): bigint { return (grossKobo * BigInt(bps) + 9999n) / 10000n; }
function serialMarket(m: { id: string; playerName: string; teamName: string; opponentName: string; competition: string; statKey: string; statLabel: string; lineValue: Prisma.Decimal; kickoffAt: Date; status: MarketStatus; liquidityNaira: Prisma.Decimal; feeBps: number; overShares: Prisma.Decimal; underShares: Prisma.Decimal; resolvedOutcome: MarketOutcome | null }) {
  const b = m.liquidityNaira.toNumber();
  const over = m.overShares.toNumber();
  const under = m.underShares.toNumber();
  const cost = lmsrCostNaira(over, under, b);
  const { overPrice, underPrice } = lmsrPrices(over, under, b);
  return { ...m, lineValue: m.lineValue.toString(), liquidityNaira: m.liquidityNaira.toString(), overShares: m.overShares.toString(), underShares: m.underShares.toString(), overPrice, underPrice, lmsrCostNaira: cost, feeBps: m.feeBps };
}

@Injectable()
export class MarketService {
  constructor(private readonly prisma: PrismaService) {}

  async listOpen() {
    const markets = await this.prisma.playerMarket.findMany({
      where: { status: MarketStatus.OPEN, kickoffAt: { gt: new Date() } },
      orderBy: { kickoffAt: 'asc' },
      take: 100,
    });
    return { markets: markets.map(serialMarket), realMoneyEnabled: false };
  }

  async getMarket(id: string) {
    const market = await this.prisma.playerMarket.findFirst({ where: { id, status: { not: MarketStatus.DRAFT } } });
    if (!market) throw new NotFoundException('Market not found.');
    return serialMarket(market);
  }

  async trade(userId: string, marketId: string, input: TradeInput) {
    if (!Object.values(MarketOutcome).includes(input.outcome)) throw new BadRequestException('Choose Over or Under.');
    if (!Object.values(TradeSide).includes(input.side)) throw new BadRequestException('Choose Buy or Sell.');
    const rawShares = String(input.shares ?? '');
    if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(rawShares)) {
      throw new BadRequestException('Shares must be positive and use at most two decimal places.');
    }
    const shares = Number(rawShares);
    if (!Number.isFinite(shares) || shares <= 0) throw new BadRequestException('Shares must be greater than zero.');
    const sharesText = shares.toFixed(2);
    if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 120) {
      throw new BadRequestException('Provide a unique request key between 8 and 120 characters.');
    }
    const idempotencyKey = createHash('sha256').update(userId + '|' + input.idempotencyKey).digest('hex');
    const existing = await this.prisma.marketTrade.findUnique({ where: { idempotencyKey } });
    if (existing) {
      if (existing.marketId !== marketId || existing.outcome !== input.outcome || existing.side !== input.side || existing.shares.toNumber() !== shares) {
        throw new BadRequestException('This request key was already used for a different trade.');
      }
      return { trade: { ...existing, shares: existing.shares.toString(), grossAmountKobo: existing.grossAmountKobo.toString(), feeKobo: existing.feeKobo.toString(), netAmountKobo: existing.netAmountKobo.toString() }, duplicate: true };
    }

    try {
      const trade = await this.prisma.$transaction(async tx => {
        // Lock the market row so LMSR prices and share quantities cannot race.
        await tx.$queryRawUnsafe('SELECT "id" FROM "player_markets" WHERE "id" = $1 FOR UPDATE', marketId);
        const duplicate = await tx.marketTrade.findUnique({ where: { idempotencyKey } });
        if (duplicate) {
          if (duplicate.marketId !== marketId || duplicate.outcome !== input.outcome || duplicate.side !== input.side || duplicate.shares.toNumber() !== shares) {
            throw new BadRequestException('This request key was already used for a different trade.');
          }
          return duplicate;
        }
        const market = await tx.playerMarket.findUnique({ where: { id: marketId } });
        if (!market) throw new NotFoundException('Market not found.');
        if (market.status !== MarketStatus.OPEN || market.kickoffAt <= new Date()) throw new BadRequestException('This market is not open for trading.');
        if (market.resolvedOutcome) throw new BadRequestException('This market has already been settled.');

        const qOver = market.overShares.toNumber();
        const qUnder = market.underShares.toNumber();
        const q = input.outcome === MarketOutcome.OVER ? qOver : qUnder;
        const b = market.liquidityNaira.toNumber();
        const currentCost = lmsrCostNaira(qOver, qUnder, b);
        const newQ = input.side === TradeSide.BUY ? q + shares : q - shares;
        if (input.side === TradeSide.SELL && newQ < -1e-9) throw new BadRequestException('You do not hold enough shares to sell.');
        const newOver = input.outcome === MarketOutcome.OVER ? newQ : qOver;
        const newUnder = input.outcome === MarketOutcome.UNDER ? newQ : qUnder;
        if (input.side === TradeSide.BUY) {
          const marketLiabilityLimit = Number(process.env.MAX_MARKET_LIABILITY_NAIRA ?? 50000000);
          if (!Number.isFinite(marketLiabilityLimit) || marketLiabilityLimit <= 0) throw new BadRequestException('Market liability safeguard is not configured.');
          if (Math.max(newOver, newUnder) > marketLiabilityLimit) throw new BadRequestException('This market has reached its aggregate liability safeguard. Selling existing shares remains available.');
        }
        const nextCost = lmsrCostNaira(newOver, newUnder, b);
        const grossKobo = input.side === TradeSide.BUY ? koboCeil(nextCost - currentCost) : koboFloor(currentCost - nextCost);
        const feeKobo = feeFor(grossKobo, market.feeBps);
        const netKobo = input.side === TradeSide.BUY ? grossKobo + feeKobo : grossKobo - feeKobo;
        if (netKobo <= 0n) throw new BadRequestException('Trade amount is too small after fees.');

        const wallet = await tx.walletAccount.findUnique({ where: { userId_kind_currency: { userId, kind: WalletKind.BONUS, currency: 'NGN' } } });
        if (!wallet) throw new UnauthorizedException('Virtual wallet not found. Sign in again.');
        if (input.side === TradeSide.BUY) {
          const debited = await tx.walletAccount.updateMany({ where: { id: wallet.id, balanceKobo: { gte: netKobo } }, data: { balanceKobo: { decrement: netKobo } } });
          if (debited.count !== 1) throw new BadRequestException('Insufficient virtual bonus balance.');
        } else {
          const position = await tx.marketPosition.findUnique({ where: { userId_marketId_outcome: { userId, marketId, outcome: input.outcome } } });
          if (!position || position.shares.toNumber() + 1e-9 < shares) throw new BadRequestException('You do not hold enough shares to sell.');
          await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceKobo: { increment: netKobo } } });
        }

        await tx.playerMarket.update({
          where: { id: marketId },
          data: input.outcome === MarketOutcome.OVER
            ? { overShares: new Prisma.Decimal(newOver.toFixed(2)) }
            : { underShares: new Prisma.Decimal(newUnder.toFixed(2)) },
        });
        const delta = new Prisma.Decimal(sharesText);
        await tx.marketPosition.upsert({
          where: { userId_marketId_outcome: { userId, marketId, outcome: input.outcome } },
          create: { userId, marketId, outcome: input.outcome, shares: new Prisma.Decimal((input.side === TradeSide.BUY ? shares : -shares).toFixed(2)) },
          update: { shares: input.side === TradeSide.BUY ? { increment: delta } : { decrement: delta } },
        });
        const clearing = await tx.ledgerAccount.create({ data: { kind: LedgerAccountKind.PLATFORM_BONUS_CLEARING } });
        const feeAccount = await tx.ledgerAccount.create({ data: { kind: LedgerAccountKind.PLATFORM_FEE_REVENUE } });
        const ledgerAmount = input.side === TradeSide.BUY ? -netKobo : netKobo;
        await tx.ledgerTransaction.create({
          data: {
            type: input.side === TradeSide.BUY ? LedgerTransactionType.BET_STAKE : LedgerTransactionType.BET_PAYOUT,
            idempotencyKey: 'market-trade-ledger:' + idempotencyKey,
            reference: marketId,
            metadata: { outcome: input.outcome, side: input.side, shares: sharesText },
            entries: { create: [
              { accountId: wallet.ledgerAccountId, amountKobo: ledgerAmount },
              { accountId: clearing.id, amountKobo: input.side === TradeSide.BUY ? grossKobo : -grossKobo },
              { accountId: feeAccount.id, amountKobo: feeKobo },
            ] },
          },
        });
        return tx.marketTrade.create({
          data: { userId, marketId, outcome: input.outcome, side: input.side, shares: new Prisma.Decimal(sharesText), grossAmountKobo: grossKobo, feeKobo, netAmountKobo: netKobo, idempotencyKey },
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { trade: { ...trade, shares: trade.shares.toString(), grossAmountKobo: trade.grossAmountKobo.toString(), feeKobo: trade.feeKobo.toString(), netAmountKobo: trade.netAmountKobo.toString() }, duplicate: false };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const duplicate = await this.prisma.marketTrade.findUnique({ where: { idempotencyKey } });
        if (duplicate && duplicate.marketId === marketId && duplicate.outcome === input.outcome && duplicate.side === input.side && duplicate.shares.toNumber() === shares) {
          return { trade: { ...duplicate, shares: duplicate.shares.toString(), grossAmountKobo: duplicate.grossAmountKobo.toString(), feeKobo: duplicate.feeKobo.toString(), netAmountKobo: duplicate.netAmountKobo.toString() }, duplicate: true };
        }
      }
      throw error;
    }
  }

  async myPositions(userId: string) {
    const positions = await this.prisma.marketPosition.findMany({
      where: { userId, shares: { gt: 0 }, market: { status: { not: MarketStatus.SETTLED } } },
      include: { market: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { positions: positions.map(p => ({ id: p.id, market: serialMarket(p.market), outcome: p.outcome, shares: p.shares.toString(), updatedAt: p.updatedAt })) };
  }

  async myTrades(userId: string) {
    const trades = await this.prisma.marketTrade.findMany({ where: { userId }, include: { market: true }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { trades: trades.map(t => ({ id: t.id, market: { id: t.market.id, playerName: t.market.playerName, statLabel: t.market.statLabel, lineValue: t.market.lineValue.toString() }, outcome: t.outcome, side: t.side, shares: t.shares.toString(), grossAmountKobo: t.grossAmountKobo.toString(), feeKobo: t.feeKobo.toString(), netAmountKobo: t.netAmountKobo.toString(), createdAt: t.createdAt })) };
  }
}
