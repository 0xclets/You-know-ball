import { Controller, Get, Headers, Param, Query, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FootballProviderService } from './football-provider.service';

@Controller('admin/football')
export class FootballAdminController {
  constructor(private readonly football: FootballProviderService, private readonly jwt: JwtService) {}

  @Get('status')
  async status(@Headers('authorization') auth?: string) {
    await this.requireAdmin(auth);
    return this.football.status();
  }

  @Get('fixtures')
  async fixtures(@Headers('authorization') auth: string | undefined, @Query('date') date: string, @Query('league') league?: string, @Query('season') season?: string) {
    await this.requireAdmin(auth);
    return this.football.fixtures(date, league, season);
  }

  @Get('fixtures/:fixtureId/players')
  async players(@Headers('authorization') auth: string | undefined, @Param('fixtureId') fixtureId: string) {
    await this.requireAdmin(auth);
    return this.football.fixturePlayers(fixtureId);
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
