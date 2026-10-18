import { UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes } from 'node:crypto';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService security controls', () => {
  const phone = '+2348012345678';
  const secret = 'unit-test-otp-secret-that-is-long-enough';
  let prisma: Record<string, unknown>;
  let jwt: { signAsync: jest.Mock };
  let service: AuthService;

  beforeEach(() => {
    process.env.OTP_HMAC_SECRET = secret;
    process.env.ACCESS_TOKEN_SECRET = 'unit-test-access-secret-that-is-long-enough';
    process.env.REFRESH_TOKEN_SECRET = 'unit-test-refresh-secret-that-is-long-enough';
    process.env.NODE_ENV = 'test';
    delete process.env.SMS_PROVIDER_URL;
    delete process.env.SMS_PROVIDER_TOKEN;
    jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
    prisma = {
      otpChallenge: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'challenge-1' }),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      refreshToken: { findUnique: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      $transaction: jest.fn(),
    };
    service = new AuthService(prisma as unknown as PrismaService, jwt as never);
  });

  it('returns a development OTP only outside production', async () => {
    const result = await service.requestOtp(phone, 'SIGN_UP');
    expect(result.accepted).toBe(true);
    expect(result.developmentCode).toMatch(/^\d{6}$/);
    expect(prisma.otpChallenge).toBeDefined();
  });

  it('increments failed OTP attempts and rejects the code', async () => {
    const digest = createHmac('sha256', secret).update(phone + '|SIGN_UP|123456').digest('hex');
    const challenges = prisma.otpChallenge as { findFirst: jest.Mock; updateMany: jest.Mock };
    challenges.findFirst.mockResolvedValue({
      id: 'challenge-1', phoneE164: phone, purpose: 'SIGN_UP', codeDigest: digest,
      expiresAt: new Date(Date.now() + 60_000), attempts: 0, maxAttempts: 5, consumedAt: null,
    });
    await expect(service.verifyOtp(phone, 'SIGN_UP', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(challenges.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'challenge-1' }),
      data: { attempts: { increment: 1 } },
    }));
  });

  it('revokes a refresh-token family when a used token is replayed', async () => {
    const raw = randomBytes(48).toString('base64url');
    const digest = createHmac('sha256', process.env.REFRESH_TOKEN_SECRET!).update(raw).digest('hex');
    const tokens = prisma.refreshToken as { findUnique: jest.Mock; updateMany: jest.Mock };
    tokens.findUnique.mockResolvedValue({
      id: 'old-token', userId: 'user-1', tokenHash: digest, familyId: 'family-1',
      usedAt: new Date(Date.now() - 1000), revokedAt: null, expiresAt: new Date(Date.now() + 60_000),
    });
    await expect(service.rotateRefreshToken(raw)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tokens.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { familyId: 'family-1', revokedAt: null },
    }));
  });
  it('grants the virtual signup bonus only when the phone account is first created', async () => {
    const digest = createHmac('sha256', secret).update(phone + '|SIGN_UP|123456').digest('hex');
    const existingUser = { id: 'user-1', phoneE164: phone, phoneVerifiedAt: new Date(), status: 'ACTIVE', role: 'USER' };
    const tx = {
      otpChallenge: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      user: {
        findUnique: jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(existingUser),
        create: jest.fn().mockResolvedValue(existingUser),
        update: jest.fn().mockResolvedValue(existingUser),
      },
      ledgerAccount: { create: jest.fn().mockResolvedValueOnce({ id: 'bonus-account' }).mockResolvedValueOnce({ id: 'clearing-account' }) },
      walletAccount: { create: jest.fn().mockResolvedValue({ id: 'wallet-1' }) },
      bonusGrant: { create: jest.fn().mockResolvedValue({ id: 'grant-1' }) },
      ledgerTransaction: { create: jest.fn().mockResolvedValue({ id: 'ledger-1' }) },
      refreshToken: { create: jest.fn().mockResolvedValue({ id: 'refresh-1' }) },
    };
    (prisma.otpChallenge as { findFirst: jest.Mock }).findFirst = jest.fn().mockResolvedValue({
      id: 'challenge-1', phoneE164: phone, purpose: 'SIGN_UP', codeDigest: digest,
      expiresAt: new Date(Date.now() + 60_000), attempts: 0, maxAttempts: 5, consumedAt: null,
    });
    (prisma.$transaction as jest.Mock).mockImplementation((callback: (value: never) => Promise<unknown>) => callback(tx as never));
    await service.verifyOtp(phone, 'SIGN_UP', '123456');
    await service.verifyOtp(phone, 'SIGN_UP', '123456');
    expect(tx.bonusGrant.create).toHaveBeenCalledTimes(1);
    expect(tx.walletAccount.create).toHaveBeenCalledTimes(1);
    expect(tx.walletAccount.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ balanceKobo: 100_000_000n }),
    }));
    const journal = (tx.ledgerTransaction.create as jest.Mock).mock.calls[0][0].data.entries.create;
    expect(journal.reduce((sum: bigint, entry: { amountKobo: bigint }) => sum + entry.amountKobo, 0n)).toBe(0n);
  });

});
