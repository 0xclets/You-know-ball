import { Body, Controller, ForbiddenException, Get, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MarketOutcome } from '@prisma/client';
import { AdminService, CreateMarketInput } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService, private readonly jwt: JwtService) {}

  @Get('markets')
  async listMarkets(@Headers('authorization') auth?: string) {
    await this.requireAdmin(auth);
    return this.admin.listMarkets();
  }

  @Post('markets')
  async createMarket(@Headers('authorization') auth: string | undefined, @Body() body: CreateMarketInput) {
    await this.requireAdmin(auth);
    return this.admin.createMarket(body);
  }

  @Post('markets/:id/open')
  async openMarket(@Headers('authorization') auth: string | undefined, @Param('id') id: string) {
    await this.requireAdmin(auth);
    return this.admin.openMarket(id);
  }

  @Post('markets/:id/close')
  async closeMarket(@Headers('authorization') auth: string | undefined, @Param('id') id: string) {
    await this.requireAdmin(auth);
    return this.admin.closeMarket(id);
  }

  @Post('markets/:id/settle')
  async settleMarket(@Headers('authorization') auth: string | undefined, @Param('id') id: string, @Body() body: { outcome: MarketOutcome }) {
    await this.requireAdmin(auth);
    return this.admin.settleMarket(id, body.outcome);
  }

  private async requireAdmin(auth?: string) {
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : '';
    const secret = process.env.ACCESS_TOKEN_SECRET;
    if (!token || !secret) throw new UnauthorizedException();
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: string; role?: string }>(token, { secret });
      if (!claims.sub) throw new UnauthorizedException();
      if (claims.role !== 'ADMIN') throw new ForbiddenException('Administrator access required.');
    } catch (error) {
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException();
    }
  }
}
