import { Body, Controller, Get, Headers, HttpCode, Post, Res, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

type CookieResponse = {
  cookie(name: string, value: string, options: Record<string, unknown>): unknown;
  clearCookie(name: string, options?: Record<string, unknown>): unknown;
};
const COOKIE_NAME = 'ykb_refresh';
function cookieValue(header: string | undefined, name: string): string {
  const item = header?.split(';').map(part => part.trim()).find(part => part.startsWith(name + '='));
  if (!item) return '';
  try { return decodeURIComponent(item.slice(name.length + 1)); } catch { return ''; }
}
function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30) * 86400000,
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() body: { phone: string; purpose?: 'SIGN_IN' | 'SIGN_UP' }) {
    return this.auth.requestOtp(body.phone, body.purpose ?? 'SIGN_IN');
  }

  @Post('otp/verify')
  @HttpCode(200)
  async verifyOtp(
    @Body() body: { phone: string; purpose?: 'SIGN_IN' | 'SIGN_UP'; code: string },
    @Res({ passthrough: true }) response: CookieResponse,
  ) {
    const result = await this.auth.verifyOtp(body.phone, body.purpose ?? 'SIGN_IN', body.code);
    const { refreshToken, ...publicResult } = result;
    response.cookie(COOKIE_NAME, refreshToken, cookieOptions());
    return publicResult;
  }

  @Post('refresh')
  @HttpCode(200)
  async refresh(@Headers('cookie') cookieHeader: string | undefined, @Res({ passthrough: true }) response: CookieResponse) {
    const refreshToken = cookieValue(cookieHeader, COOKIE_NAME);
    if (!refreshToken) throw new UnauthorizedException('Session expired. Sign in again.');
    const result = await this.auth.rotateRefreshToken(refreshToken);
    const { refreshToken: nextRefreshToken, ...publicResult } = result;
    response.cookie(COOKIE_NAME, nextRefreshToken, cookieOptions());
    return publicResult;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Headers('cookie') cookieHeader: string | undefined, @Res({ passthrough: true }) response: CookieResponse) {
    const refreshToken = cookieValue(cookieHeader, COOKIE_NAME);
    await this.auth.logout(refreshToken);
    response.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
    return { success: true };
  }

  @Get('status')
  status() { return { configured: Boolean(process.env.OTP_HMAC_SECRET && process.env.ACCESS_TOKEN_SECRET), smsDelivery: Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_TOKEN) }; }
}
