import { Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MarketOutcome, TradeSide } from '@prisma/client';
import { MarketService } from './market.service';

@Controller('markets')
export class MarketController {
  constructor(private readonly markets: MarketService, private readonly jwt: JwtService) {}

  @Get()
  list() { return this.markets.listOpen(); }

  @Get(':id')
  get(@Param('id') id: string) { return this.markets.getMarket(id); }

  @Post(':id/trades')
  async trade(@Param('id') id: string, @Headers('authorization') auth: string | undefined, @Body() body: { outcome: MarketOutcome; side: TradeSide; shares: string | number; idempotencyKey: string }) {
    const claims = await this.claims(auth);
    return this.markets.trade(claims.sub!, id, body);
  }

  @Get('me/positions')
  async positions(@Headers('authorization') auth: string | undefined) {
    const claims = await this.claims(auth);
    return this.markets.myPositions(claims.sub!);
  }

  @Get('me/trades')
  async trades(@Headers('authorization') auth: string | undefined) {
    const claims = await this.claims(auth);
    return this.markets.myTrades(claims.sub!);
  }

  private async claims(auth: string | undefined) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!token || !secret) throw new UnauthorizedException();
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: string }>(token, { secret });
      if (!claims.sub) throw new UnauthorizedException();
      return claims;
    } catch { throw new UnauthorizedException(); }
  }
}
