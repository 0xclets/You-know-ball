import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LedgerAccountKind, LedgerTransactionType, MarketOutcome, MarketStatus, Prisma, UserRole, WalletKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type CreateMarketInput = {
  playerName: string; teamName: string; opponentName: string; competition: string;
  statKey: string; statLabel: string; lineValue: string | number; kickoffAt: string;
  liquidityNaira?: string | number; feeBps?: number;
};
@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listMarkets() {
    const markets = await this.prisma.playerMarket.findMany({ orderBy: [{ kickoffAt: 'desc' }, { createdAt: 'desc' }], take: 250 });
    return { markets: markets.map(m => ({ ...m, lineValue: m.lineValue.toString(), liquidityNaira: m.liquidityNaira.toString(), overShares: m.overShares.toString(), underShares: m.underShares.toString() })) };
  }

  async createMarket(input: CreateMarketInput) {
    const fields = ['playerName', 'teamName', 'opponentName', 'competition', 'statKey', 'statLabel'] as const;
    for (const field of fields) {
      if (typeof input[field] !== 'string' || !input[field].trim() || input[field].trim().length > 120) {
        throw new BadRequestException(field + ' is required and must be at most 120 characters.');
      }
    }
    const line = Number(input.lineValue);
    if (!Number.isFinite(line) || line < 0.5 || Math.abs(line * 2 - Math.round(line * 2)) > 1e-8 || Math.abs(line - (Math.floor(line) + 0.5)) > 1e-8) {
      throw new BadRequestException('Player-stat lines must be half-number lines such as 0.5, 1.5, or 2.5.');
    }
    const kickoffAt = new Date(input.kickoffAt);
    if (!input.kickoffAt || !Number.isFinite(kickoffAt.getTime()) || kickoffAt <= new Date()) throw new BadRequestException('Kickoff must be a valid future date and time.');
    const liquidity = Number(input.liquidityNaira ?? 50000);
    if (!Number.isFinite(liquidity) || liquidity < 1000 || liquidity > 1000000000) throw new BadRequestException('Liquidity must be between ₦1,000 and ₦1,000,000,000.');
    const feeBps = Number(input.feeBps ?? 200);
    if (!Number.isInteger(feeBps) || feeBps < 0 || feeBps > 1000) throw new BadRequestException('Fee must be between 0% and 10%.');
    const market = await this.prisma.playerMarket.create({
      data: {
        playerName: input.playerName.trim(), teamName: input.teamName.trim(), opponentName: input.opponentName.trim(),
        competition: input.competition.trim(), statKey: input.statKey.trim(), statLabel: input.statLabel.trim(),
        lineValue: new Prisma.Decimal(line.toFixed(2)), kickoffAt, liquidityNaira: new Prisma.Decimal(liquidity.toFixed(2)), feeBps,
        status: MarketStatus.DRAFT,
      },
    });
    return { market: { ...market, lineValue: market.lineValue.toString(), liquidityNaira: market.liquidityNaira.toString() } };
  }

  async openMarket(id: string) {
    const market = await this.prisma.playerMarket.findUnique({ where: { id } });
    if (!market) throw new NotFoundException('Market not found.');
    if (market.status !== MarketStatus.DRAFT) throw new BadRequestException('Only draft markets can be opened.');
    if (market.kickoffAt <= new Date()) throw new BadRequestException('Cannot open a market after kickoff.');
    const updated = await this.prisma.playerMarket.updateMany({ where: { id, status: MarketStatus.DRAFT, kickoffAt: { gt: new Date() } }, data: { status: MarketStatus.OPEN } });
    if (updated.count !== 1) throw new BadRequestException('Market status changed; refresh and try again.');
    return { success: true, market: await this.prisma.playerMarket.findUnique({ where: { id } }) };
  }

  async closeMarket(id: string) {
    const updated = await this.prisma.playerMarket.updateMany({ where: { id, status: MarketStatus.OPEN }, data: { status: MarketStatus.CLOSED } });
    if (updated.count !== 1) throw new BadRequestException('Only open markets can be closed.');
    return { success: true };
  }

  async settleMarket(id: string, outcome: MarketOutcome) {
    if (!Object.values(MarketOutcome).includes(outcome)) throw new BadRequestException('Settlement outcome must be OVER or UNDER.');
    return this.prisma.$transaction(async tx => {
      await tx.$queryRawUnsafe('SELECT "id" FROM "player_markets" WHERE "id" = $1 FOR UPDATE', id);
      const market = await tx.playerMarket.findUnique({ where: { id } });
      if (!market) throw new NotFoundException('Market not found.');
      if (market.status === MarketStatus.SETTLED) throw new BadRequestException('Market is already settled.');
      if (market.status === MarketStatus.DRAFT) throw new BadRequestException('A draft market cannot be settled.');
      if (market.kickoffAt > new Date()) throw new BadRequestException('A market cannot be settled before kickoff.');
      const positions = await tx.marketPosition.findMany({ where: { marketId: id, outcome, shares: { gt: 0 } } });
      let winnersPaid = 0;
      let totalPaidKobo = 0n;
      for (const position of positions) {
        const payoutKobo = BigInt(Math.round(position.shares.toNumber() * 100));
        if (payoutKobo <= 0n) continue;
        const wallet = await tx.walletAccount.findUnique({ where: { userId_kind_currency: { userId: position.userId, kind: WalletKind.BONUS, currency: 'NGN' } } });
        if (!wallet) throw new BadRequestException('A winning user is missing a virtual wallet; settlement was cancelled.');
        await tx.walletAccount.update({ where: { id: wallet.id }, data: { balanceKobo: { increment: payoutKobo } } });
        const clearing = await tx.ledgerAccount.create({ data: { kind: LedgerAccountKind.PLATFORM_BONUS_CLEARING } });
        await tx.ledgerTransaction.create({
          data: {
            type: LedgerTransactionType.BET_PAYOUT,
            idempotencyKey: 'settlement:' + id + ':' + position.userId,
            reference: id,
            metadata: { outcome, shares: position.shares.toString() },
            entries: { create: [
              { accountId: wallet.ledgerAccountId, amountKobo: payoutKobo },
              { accountId: clearing.id, amountKobo: -payoutKobo },
            ] },
          },
        });
        winnersPaid += 1;
        totalPaidKobo += payoutKobo;
      }
      await tx.playerMarket.update({ where: { id }, data: { status: MarketStatus.SETTLED, resolvedOutcome: outcome, settledAt: new Date() } });
      return { success: true, marketId: id, outcome, winningPositionsPaid: winnersPaid, totalPayoutKobo: totalPaidKobo.toString(), currency: 'NGN' };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }
}
