import { BadRequestException, Injectable, TooManyRequestsException, UnauthorizedException, ServiceUnavailableException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomBytes, randomInt } from 'node:crypto';
import { OtpPurpose, WalletKind, LedgerAccountKind, LedgerTransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function phoneNormalize(input: string): string {
  const digits = String(input ?? '').trim().replace(/[\\s()-]/g, '');
  const phone = digits.startsWith('+') ? digits : digits.startsWith('0') ? '+234' + digits.slice(1) : digits.startsWith('234') ? '+' + digits : '';
  if (!/^\\+234[789][01]\\d{8}$/.test(phone)) throw new BadRequestException('Enter a valid Nigerian mobile number.');
  return phone;
}
function otpDigest(phone: string, purpose: string, code: string): string {
  const secret = process.env.OTP_HMAC_SECRET;
  if (!secret || secret.length < 32) throw new ServiceUnavailableException('OTP service is not configured.');
  return createHmac('sha256', secret).update(phone + '|' + purpose + '|' + code).digest('hex');
}
function tokenHash(token: string): string {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new ServiceUnavailableException('Token service is not configured.');
  return createHmac('sha256', secret).update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async requestOtp(rawPhone: string, rawPurpose: 'SIGN_IN' | 'SIGN_UP') {
    const phone = phoneNormalize(rawPhone);
    const purpose = rawPurpose === 'SIGN_UP' ? OtpPurpose.SIGN_UP : OtpPurpose.SIGN_IN;
    const recent = await this.prisma.otpChallenge.count({ where: { phoneE164: phone, requestedAt: { gt: new Date(Date.now() - Number(process.env.OTP_RESEND_COOLDOWN_SECONDS ?? 60) * 1000) } } });
    if (recent > 0) throw new TooManyRequestsException('Please wait before requesting another code.');
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge = await this.prisma.otpChallenge.create({ data: {
      phoneE164: phone, purpose, codeDigest: otpDigest(phone, purpose, code),
      expiresAt: new Date(Date.now() + Number(process.env.OTP_TTL_SECONDS ?? 300) * 1000),
      maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    }});
    const smsUrl = process.env.SMS_PROVIDER_URL;
    const smsToken = process.env.SMS_PROVIDER_TOKEN;
    if (smsUrl && smsToken) {
      try {
        const response = await fetch(smsUrl, { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + smsToken }, body: JSON.stringify({ to: phone, message: 'Your YKB verification code is ' + code + '. It expires in 5 minutes.' }) });
        if (!response.ok) throw new Error('SMS provider rejected request');
      } catch {
        await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
        throw new ServiceUnavailableException('Could not deliver verification code. Try again later.');
      }
      return { accepted: true, expiresInSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300) };
    }
    if (process.env.NODE_ENV === 'production') {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw new ServiceUnavailableException('SMS delivery is not configured.');
    }
    // Only local development returns the OTP, never production.
    return { accepted: true, expiresInSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300), developmentCode: code };
  }

  async verifyOtp(rawPhone: string, rawPurpose: 'SIGN_IN' | 'SIGN_UP', code: string) {
    const phone = phoneNormalize(rawPhone);
    if (!/^\\d{6}$/.test(String(code))) throw new BadRequestException('Enter the six-digit code.');
    const purpose = rawPurpose === 'SIGN_UP' ? OtpPurpose.SIGN_UP : OtpPurpose.SIGN_IN;
    const now = new Date();
    const challenge = await this.prisma.otpChallenge.findFirst({ where: { phoneE164: phone, purpose, consumedAt: null }, orderBy: { requestedAt: 'desc' } });
    if (!challenge) throw new UnauthorizedException('Code is invalid or expired.');
    if (challenge.expiresAt <= now || challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { consumedAt: now } });
      throw new UnauthorizedException('Code is invalid or expired.');
    }
    const valid = otpDigest(phone, purpose, code) === challenge.codeDigest;
    if (!valid) {
      const attempts = challenge.attempts + 1;
      await this.prisma.otpChallenge.update({ where: { id: challenge.id }, data: { attempts, ...(attempts >= challenge.maxAttempts ? { consumedAt: now } : {}) } });
      throw new UnauthorizedException('Code is invalid or expired.');
    }

    const result = await this.prisma.$transaction(async tx => {
      const consumed = await tx.otpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null, attempts: { lt: challenge.maxAttempts }, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (consumed.count !== 1) throw new UnauthorizedException('Code is invalid or expired.');
      let user = await tx.user.findUnique({ where: { phoneE164: phone } });
      if (!user) {
        user = await tx.user.create({ data: { phoneE164: phone, phoneVerifiedAt: now } });
        const bonusAccount = await tx.ledgerAccount.create({ data: { kind: LedgerAccountKind.USER_BONUS, userId: user.id } });
        const clearingAccount = await tx.ledgerAccount.create({ data: { kind: LedgerAccountKind.PLATFORM_BONUS_CLEARING } });
        await tx.walletAccount.create({ data: { userId: user.id, kind: WalletKind.BONUS, balanceKobo: 100_000_000n, ledgerAccountId: bonusAccount.id } });
        await tx.bonusGrant.create({ data: { userId: user.id, amountKobo: 100_000_000n, idempotencyKey: 'signup-bonus:' + user.id } });
        await tx.ledgerTransaction.create({ data: { type: LedgerTransactionType.SIGNUP_BONUS, idempotencyKey: 'signup-bonus-ledger:' + user.id, entries: { create: [
          { accountId: bonusAccount.id, amountKobo: 100_000_000n },
          { accountId: clearingAccount.id, amountKobo: -100_000_000n },
        ] } } });
      } else {
        await tx.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: user.phoneVerifiedAt ?? now } });
      }
      if (user.status !== 'ACTIVE') throw new UnauthorizedException('This account is not active.');
      const rawRefresh = randomBytes(48).toString('base64url');
      const familyId = randomBytes(24).toString('hex');
      await tx.refreshToken.create({ data: { userId: user.id, tokenHash: tokenHash(rawRefresh), familyId, expiresAt: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86400000) } });
      return { user, rawRefresh };
    });
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Access token service is not configured.');
    const accessToken = await this.jwt.signAsync({ sub: result.user.id, phone: result.user.phoneE164 }, { secret, expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900) });
    return { user: { id: result.user.id, phone: result.user.phoneE164 }, accessToken, refreshToken: result.rawRefresh, tokenType: 'Bearer', expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900), signupBonusNaira: '1000000.00' };
  }

  async rotateRefreshToken(raw: string) {
    if (typeof raw !== 'string' || raw.length < 40) throw new UnauthorizedException('Refresh token is invalid.');
    const hash = tokenHash(raw);
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash: hash } });
    if (!token) throw new UnauthorizedException('Refresh token is invalid.');
    const now = new Date();
    if (token.usedAt && !token.revokedAt && token.expiresAt > now) {
      await this.prisma.refreshToken.updateMany({ where: { familyId: token.familyId, revokedAt: null }, data: { revokedAt: now } });
      throw new UnauthorizedException('Refresh token reuse detected. Please sign in again.');
    }
    if (token.revokedAt || token.usedAt || token.expiresAt <= now) throw new UnauthorizedException('Refresh token is invalid or expired.');
    const nextRaw = randomBytes(48).toString('base64url');
    const nextHash = tokenHash(nextRaw);
    const rotated = await this.prisma.$transaction(async tx => {
      const used = await tx.refreshToken.updateMany({ where: { id: token.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { usedAt: now, replacedById: 'pending' } });
      if (used.count !== 1) throw new UnauthorizedException('Refresh token already used.');
      const next = await tx.refreshToken.create({ data: { userId: token.userId, tokenHash: nextHash, familyId: token.familyId, parentTokenId: token.id, expiresAt: new Date(Date.now() + Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86400000) } });
      await tx.refreshToken.update({ where: { id: token.id }, data: { replacedById: next.id } });
      return next;
    });
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: token.userId } });
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!secret || secret.length < 32) throw new ServiceUnavailableException('Access token service is not configured.');
    const accessToken = await this.jwt.signAsync({ sub: user.id, phone: user.phoneE164 }, { secret, expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900) });
    return { accessToken, refreshToken: nextRaw, tokenType: 'Bearer', expiresIn: Number(process.env.ACCESS_TOKEN_TTL_SECONDS ?? 900) };
  }

  async logout(raw: string) {
    if (typeof raw !== 'string' || raw.length < 40) return { success: true };
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash: tokenHash(raw) } });
    if (token) await this.prisma.refreshToken.updateMany({ where: { familyId: token.familyId, revokedAt: null }, data: { revokedAt: new Date() } });
    return { success: true };
  }
}
