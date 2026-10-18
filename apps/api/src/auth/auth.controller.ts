import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('otp/request')
  requestOtp(@Body() body: { phone: string; purpose?: 'SIGN_IN' | 'SIGN_UP' }) {
    return this.auth.requestOtp(body.phone, body.purpose ?? 'SIGN_IN');
  }

  @Post('otp/verify')
  @HttpCode(200)
  verifyOtp(@Body() body: { phone: string; purpose?: 'SIGN_IN' | 'SIGN_UP'; code: string }) {
    return this.auth.verifyOtp(body.phone, body.purpose ?? 'SIGN_IN', body.code);
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() body: { refreshToken: string }) { return this.auth.rotateRefreshToken(body.refreshToken); }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() body: { refreshToken: string }) { return this.auth.logout(body.refreshToken); }

  @Get('status')
  status() { return { configured: Boolean(process.env.OTP_HMAC_SECRET && process.env.ACCESS_TOKEN_SECRET), smsDelivery: Boolean(process.env.SMS_PROVIDER_URL && process.env.SMS_PROVIDER_TOKEN) }; }
}
