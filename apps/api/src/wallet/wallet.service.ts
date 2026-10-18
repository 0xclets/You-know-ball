import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}
  async summary(userId: string) {
    const accounts = await this.prisma.walletAccount.findMany({ where: { userId, currency: 'NGN' } });
    const bonus = accounts.find(a => a.kind === 'BONUS')?.balanceKobo ?? 0n;
    const cash = accounts.find(a => a.kind === 'CASH')?.balanceKobo ?? 0n;
    return { currency: 'NGN', bonusBalanceKobo: bonus.toString(), cashBalanceKobo: cash.toString(), bonusBalanceNaira: (Number(bonus) / 100).toFixed(2), cashBalanceNaira: (Number(cash) / 100).toFixed(2), realMoneyEnabled: false };
  }
}
