'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '../../lib/api';

type Market = { id: string; playerName: string; teamName: string; opponentName: string; competition: string; statLabel: string; lineValue: string; kickoffAt: string; status: string; feeBps: number };
type Fixture = { fixture: { id: number; date: string; status: { short: string } }; league: { name: string }; teams: { home: { id: number; name: string }; away: { id: number; name: string } } };
type ProviderPlayer = { team: { id: number; name: string }; players: { player: { id: number; name: string }; statistics: Record<string, unknown>[] }[] };
const initial = { playerName: '', teamName: '', opponentName: '', competition: 'Premier League', statKey: 'shots_on_target', statLabel: 'Shots on target', lineValue: '1.5', kickoffAt: '', liquidityNaira: '50000', feeBps: '200' };
const today = new Date().toISOString().slice(0, 10);
export default function AdminPage() {
  const [form, setForm] = useState(initial);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [settlement, setSettlement] = useState<'OVER' | 'UNDER'>('OVER');
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [fixtureDate, setFixtureDate] = useState(today);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [players, setPlayers] = useState<ProviderPlayer[]>([]);
  const [providerBusy, setProviderBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await authenticatedFetch('/admin/markets');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Administrator access required.');
      setMarkets(data.markets ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load admin markets.'); }
  }
  async function loadProviderStatus() {
    try {
      const response = await authenticatedFetch('/admin/football/status');
      const data = await response.json();
      if (response.ok) setProviderConfigured(Boolean(data.configured));
      else setProviderConfigured(false);
    } catch { setProviderConfigured(false); }
  }
  useEffect(() => { load(); loadProviderStatus(); }, []);

  async function searchFixtures(event?: FormEvent) {
    event?.preventDefault(); setProviderBusy(true); setError(''); setMessage('');
    try {
      const response = await authenticatedFetch('/admin/football/fixtures?date=' + encodeURIComponent(fixtureDate));
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Could not retrieve fixtures.');
      setFixtures(data.data?.response ?? []);
      setSelectedFixture(null); setPlayers([]);
      if ((data.data?.response ?? []).length === 0) setMessage('The provider returned no fixtures for this date and your current subscription coverage.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not retrieve fixtures.'); }
    finally { setProviderBusy(false); }
  }
  async function loadPlayers(fixture: Fixture) {
    setSelectedFixture(fixture); setPlayers([]); setProviderBusy(true); setError(''); setMessage('');
    try {
      const response = await authenticatedFetch('/admin/football/fixtures/' + fixture.fixture.id + '/players');
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Could not retrieve player statistics.');
      setPlayers(data.data?.response ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not retrieve player statistics.'); }
    finally { setProviderBusy(false); }
  }
  function useFixture(fixture: Fixture) {
    const d = new Date(fixture.fixture.date);
    const localKickoff = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setForm(v => ({ ...v, teamName: fixture.teams.home.name, opponentName: fixture.teams.away.name, competition: fixture.league.name, kickoffAt: localKickoff }));
    setMessage('Fixture details copied into the draft form. Select a player below or type one manually, then review every field before publishing.');
  }
  function usePlayer(fixture: Fixture, team: { id: number; name: string }, player: { id: number; name: string }) {
    const opponent = team.id === fixture.teams.home.id ? fixture.teams.away.name : fixture.teams.home.name;
    setForm(v => ({ ...v, playerName: player.name, teamName: team.name, opponentName: opponent, competition: fixture.league.name }));
    setMessage('Player and fixture details copied into the draft form. Choose the stat and line carefully.');
  }
  async function create(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await authenticatedFetch('/admin/markets', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...form, kickoffAt: new Date(form.kickoffAt).toISOString(), liquidityNaira: Number(form.liquidityNaira), feeBps: Number(form.feeBps) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Could not create market.');
      setMessage('Draft market created. Review it, then open it when the details are correct.');
      setForm(initial); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not create market.'); }
    finally { setBusy(false); }
  }
  async function action(id: string, actionName: 'open' | 'close' | 'settle') {
    setError(''); setMessage('');
    try {
      const response = await authenticatedFetch('/admin/markets/' + id + '/' + actionName, {
        method: 'POST',
        ...(actionName === 'settle' ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome: settlement }) } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Action failed.');
      setMessage(actionName === 'settle' ? 'Market settled. Winning virtual positions were paid.' : 'Market ' + actionName + 'ed.');
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Admin action failed.'); }
  }
  function field(name: keyof typeof initial, label: string, type = 'text') {
    return <label key={name}>{label}<input type={type} value={form[name]} required onChange={e => setForm(v => ({ ...v, [name]: e.target.value }))} /></label>;
  }
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header>
    <section className="page-intro"><p className="eyebrow">OPERATIONS</p><h1>Market administration</h1><p className="muted">Restricted to the verified administrator phone configured on the API. Create draft lines, review them, publish, close, and settle with the verified result.</p></section>
    {error && <p role="alert" className="status-message">{error}</p>}{message && <p role="status" className="status-message">{message}</p>}
    <section className="panel provider-panel"><h2>Football data provider</h2>{providerConfigured === null ? <p className="muted">Checking provider configuration…</p> : providerConfigured ? <p className="muted">API-Football is configured on the server. Search fixtures and load available player match statistics below.</p> : <p className="muted">API-Football is not configured. Set FOOTBALL_API_KEY in the server environment to enable fixture and player-stat lookup. The key stays on the server and is never sent to the browser.</p>}
      <form className="fixture-search" onSubmit={searchFixtures}><label>Fixture date<input type="date" value={fixtureDate} onChange={e => setFixtureDate(e.target.value)} required /></label><button disabled={providerBusy || !providerConfigured}>{providerBusy ? 'Loading…' : 'Find fixtures'}</button></form>
      {fixtures.length > 0 && <div className="fixture-list">{fixtures.map(f => <article className="fixture-row" key={f.fixture.id}><div><strong>{f.teams.home.name} vs {f.teams.away.name}</strong><p className="muted">{f.league.name} · {new Date(f.fixture.date).toLocaleString()} · {f.fixture.status.short}</p></div><div className="admin-actions"><button type="button" className="secondary" onClick={() => useFixture(f)}>Use fixture</button><button type="button" onClick={() => loadPlayers(f)}>Load players</button></div></article>)}</div>}
      {selectedFixture && <div className="player-list"><h3>Players · {selectedFixture.teams.home.name} vs {selectedFixture.teams.away.name}</h3>{players.length === 0 ? <p className="muted">No player statistics returned yet. The provider may only publish player statistics after the match.</p> : players.map(team => <div key={team.team.id}><p className="club">{team.team.name}</p>{team.players.map(p => <button className="player-pick" type="button" key={p.player.id} onClick={() => usePlayer(selectedFixture, team.team, p.player)}>{p.player.name}</button>)}</div>)}</div>}
    </section>
    <section className="panel admin-form-panel"><h2>Create a player-stat market</h2><form className="auth-form admin-form" onSubmit={create}>{field('playerName','Player name')}{field('teamName','Player team')}{field('opponentName','Opponent')}{field('competition','Competition')}{field('statKey','Stat key')}{field('statLabel','Stat label')}{field('lineValue','Half-number line, e.g. 1.5','number')}{field('kickoffAt','Kickoff date and time','datetime-local')}{field('liquidityNaira','LMSR liquidity in NGN','number')}{field('feeBps','Trading fee in basis points','number')}<button disabled={busy}>{busy ? 'Saving…' : 'Create draft market'}</button></form></section>
    <section className="admin-market-list"><div className="section-head"><h2>Markets</h2><button className="secondary" onClick={load}>Refresh</button></div><label className="settlement-choice">Settlement outcome for action<select value={settlement} onChange={e => setSettlement(e.target.value as 'OVER' | 'UNDER')}><option value="OVER">Over wins</option><option value="UNDER">Under wins</option></select></label>{markets.length === 0 ? <p className="muted">No markets created yet.</p> : markets.map(m => <article className="admin-market-row" key={m.id}><div><strong>{m.playerName} · {m.statLabel} {m.lineValue}</strong><p className="muted">{m.competition} · {m.teamName} vs {m.opponentName}</p><span className="market-status">{m.status}</span></div><div className="admin-actions">{m.status === 'DRAFT' && <button onClick={() => action(m.id,'open')}>Open</button>}{m.status === 'OPEN' && <button className="secondary" onClick={() => action(m.id,'close')}>Close</button>}{(m.status === 'CLOSED' || (m.status === 'OPEN' && new Date(m.kickoffAt) < new Date())) && <button onClick={() => action(m.id,'settle')}>Settle {settlement}</button>}</div></article>)}</section>
    <p className="small-note">Only publish lines you have reviewed. Settlement is manual and must use a verified result. Real-money use is disabled.</p></main>;
}
