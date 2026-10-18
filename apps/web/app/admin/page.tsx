'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '../lib/api';

type Market = { id: string; playerName: string; teamName: string; opponentName: string; competition: string; statLabel: string; lineValue: string; kickoffAt: string; status: string; feeBps: number };
const initial = { playerName: '', teamName: '', opponentName: '', competition: 'Premier League', statKey: 'shots_on_target', statLabel: 'Shots on target', lineValue: '1.5', kickoffAt: '', liquidityNaira: '50000', feeBps: '200' };
export default function AdminPage() {
  const [form, setForm] = useState(initial);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [settlement, setSettlement] = useState<'OVER' | 'UNDER'>('OVER');
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
  useEffect(() => { load(); }, []);
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
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header><section className="page-intro"><p className="eyebrow">OPERATIONS</p><h1>Market administration</h1><p className="muted">Restricted to the verified administrator phone configured on the API. Create draft lines, review them, publish, close, and settle with the verified result.</p></section>{error && <p role="alert" className="status-message">{error}</p>}{message && <p role="status" className="status-message">{message}</p>}<section className="panel admin-form-panel"><h2>Create a player-stat market</h2><form className="auth-form admin-form" onSubmit={create}>{field('playerName','Player name')}{field('teamName','Player team')}{field('opponentName','Opponent')}{field('competition','Competition')}{field('statKey','Stat key')}{field('statLabel','Stat label')}{field('lineValue','Half-number line, e.g. 1.5','number')}{field('kickoffAt','Kickoff date and time','datetime-local')}{field('liquidityNaira','LMSR liquidity in NGN','number')}{field('feeBps','Trading fee in basis points','number')}<button disabled={busy}>{busy ? 'Saving…' : 'Create draft market'}</button></form></section><section className="admin-market-list"><div className="section-head"><h2>Markets</h2><button className="secondary" onClick={load}>Refresh</button></div><label className="settlement-choice">Settlement outcome for action<select value={settlement} onChange={e => setSettlement(e.target.value as 'OVER' | 'UNDER')}><option value="OVER">Over wins</option><option value="UNDER">Under wins</option></select></label>{markets.length === 0 ? <p className="muted">No markets created yet.</p> : markets.map(m => <article className="admin-market-row" key={m.id}><div><strong>{m.playerName} · {m.statLabel} {m.lineValue}</strong><p className="muted">{m.competition} · {m.teamName} vs {m.opponentName}</p><span className="market-status">{m.status}</span></div><div className="admin-actions">{m.status === 'DRAFT' && <button onClick={() => action(m.id,'open')}>Open</button>}{m.status === 'OPEN' && <button className="secondary" onClick={() => action(m.id,'close')}>Close</button>}{(m.status === 'CLOSED' || (m.status === 'OPEN' && new Date(m.kickoffAt) < new Date())) && <button onClick={() => action(m.id,'settle')}>Settle {settlement}</button>}</div></article>)}</section><p className="small-note">Only publish lines you have reviewed. Settlements credit winning virtual positions using the database ledger. External fixture/stat verification is not connected yet; real-money use is disabled.</p></main>;
}
