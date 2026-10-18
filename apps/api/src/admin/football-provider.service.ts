import { BadGatewayException, BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';

type ProviderPayload = { errors?: unknown; response?: unknown; results?: number; [key: string]: unknown };
@Injectable()
export class FootballProviderService {
  isConfigured() { return Boolean(process.env.FOOTBALL_API_KEY); }

  private async get(path: string, query: Record<string, string> = {}) {
    const key = process.env.FOOTBALL_API_KEY;
    if (!key) throw new ServiceUnavailableException('Football data provider is not configured. Add FOOTBALL_API_KEY to the server environment.');
    const base = (process.env.FOOTBALL_API_BASE_URL ?? 'https://v3.football.api-sports.io').replace(/\/+$/, '');
    const url = new URL(base + '/' + path.replace(/^\/+/, ''));
    for (const [name, value] of Object.entries(query)) if (value) url.searchParams.set(name, value);
    let response: Response;
    try {
      response = await fetch(url, { method: 'GET', headers: { 'x-apisports-key': key }, signal: AbortSignal.timeout(12000) });
    } catch {
      throw new ServiceUnavailableException('Could not reach the football data provider.');
    }
    let payload: ProviderPayload;
    try { payload = await response.json() as ProviderPayload; }
    catch { throw new BadGatewayException('Football data provider returned an invalid response.'); }
    const providerErrors = payload.errors;
    const hasErrors = Array.isArray(providerErrors) ? providerErrors.length > 0 : Boolean(providerErrors && typeof providerErrors === 'object' && Object.keys(providerErrors as Record<string, unknown>).length > 0);
    if (!response.ok || hasErrors) {
      throw new BadGatewayException({ message: 'Football data provider request failed.', providerStatus: response.status, errors: providerErrors ?? null });
    }
    return { provider: 'API-FOOTBALL', fetchedAt: new Date().toISOString(), data: payload };
  }

  async status() {
    if (!this.isConfigured()) return { configured: false, provider: 'API-FOOTBALL', message: 'Set FOOTBALL_API_KEY in the API environment.' };
    return { configured: true, ...(await this.get('status')) };
  }

  async fixtures(date: string, league?: string, season?: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(new Date(date + 'T00:00:00Z').getTime()) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date) {
      throw new BadRequestException('Date must be a valid calendar date using YYYY-MM-DD.');
    }
    if (league && !/^\d+$/.test(league)) throw new BadRequestException('League must be a numeric provider ID.');
    if (season && !/^\d{4}$/.test(season)) throw new BadRequestException('Season must be a four-digit year.');
    return this.get('fixtures', { date, timezone: 'Africa/Lagos', ...(league ? { league } : {}), ...(season ? { season } : {}) });
  }

  async fixturePlayers(fixtureId: string) {
    if (!/^\d+$/.test(fixtureId) || Number(fixtureId) <= 0) throw new BadRequestException('Fixture ID must be a positive provider ID.');
    return this.get('fixtures/players', { fixture: fixtureId });
  }
}
