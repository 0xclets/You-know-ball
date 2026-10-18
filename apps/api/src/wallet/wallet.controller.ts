import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WalletService } from './wallet.service';
@Controller('wallet')
export class WalletController {
  constructor(private readonly wallet: WalletService, private readonly jwt: JwtService) {}
  @Get()
  async summary(@Headers('authorization') auth?: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!token || !secret) throw new UnauthorizedException();
    let claims: { sub?: string };
    try { claims = await this.jwt.verifyAsync(token, { secret }); } catch { throw new UnauthorizedException(); }
    if (!claims.sub) throw new UnauthorizedException();
    return this.wallet.summary(claims.sub);
  }
}
