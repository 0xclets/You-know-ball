'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { authenticatedFetch } from '../../../lib/api';

type Market = { id: string; playerName: string; teamName: string; opponentName: string; competition: string; statLabel: string; lineValue: string; kickoffAt: string; status: string; liquidityNaira: string; feeBps: number; overShares: string; underShares: string; overPrice: number; underPrice: number };
type TradeResult = { trade: { side: string; outcome: string; shares: string; grossAmountKobo: string; feeKobo: string; netAmountKobo: string }; duplicate: boolean };
const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export default function MarketDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [market, setMarket] = useState<Market | null>(null);
  const [outcome, setOutcome] = useState<'OVER' | 'UNDER'>('OVER');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [shares, setShares] = useState('10.00');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<TradeResult | null>(null);
  useEffect(() => {
    fetch(API + '/markets/' + id).then(async r => { const d = await r.json(); if (!r.ok) throw new Error(d.message ?? 'Market unavailable.'); setMarket(d); }).catch(e => setError(e instanceof Error ? e.message : 'Could not load market.'));
  }, [id]);
  async function submitTrade(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try {
      const response = await authenticatedFetch('/markets/' + id + '/trades', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ outcome, side, shares, idempotencyKey: crypto.randomUUID() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? 'Trade failed.');
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : 'Trade failed.'); }
    finally { setBusy(false); }
  }
  return <main className="app-shell"><header className="app-topbar"><Link href="/" className="brand">YKB<span>.</span></Link><nav><Link href="/markets">Markets</Link><Link href="/portfolio">Portfolio</Link><Link href="/wallet">Wallet</Link><Link href="/account">Account</Link></nav></header>{market ? <><section className="page-intro"><p className="eyebrow">{market.competition} · {market.teamName} vs {market.opponentName}</p><h1>{market.playerName}</h1><p className="muted">{market.statLabel} · line {market.lineValue} · kickoff {new Date(market.kickoffAt).toLocaleString()}</p></section><div className="detail-grid"><section className="panel"><h2>Current market price</h2><div className="market-prices large"><span>Over {(market.overPrice * 100).toFixed(1)}%</span><span>Under {(market.underPrice * 100).toFixed(1)}%</span></div><p className="muted">Prices update as virtual shares are bought and sold. Trading fee: {(market.feeBps / 100).toFixed(2)}%.</p><p className="small-note">One share pays ₦1 if its outcome wins. Shares are virtual positions; no cash withdrawals are available.</p></section><section className="panel"><h2>Place a virtual trade</h2><form className="auth-form" onSubmit={submitTrade}><label>Action<select value={side} onChange={e => setSide(e.target.value as 'BUY' | 'SELL')}><option value="BUY">Buy shares</option><option value="SELL">Sell shares I own</option></select></label><label>Outcome<select value={outcome} onChange={e => setOutcome(e.target.value as 'OVER' | 'UNDER')}><option value="OVER">Over {market.lineValue}</option><option value="UNDER">Under {market.lineValue}</option></select></label><label>Shares<input value={shares} onChange={e => setShares(e.target.value)} inputMode="decimal" pattern="[0-9]+(\\.[0-9]{1,2})?" required /></label><button disabled={busy}>{busy ? 'Processing…' : side === 'BUY' ? 'Buy with virtual funds' : 'Sell virtual shares'}</button></form>{error && <p role="alert" className="status-message">{error}</p>}{result && <p role="status" className="status-message">Trade recorded. {result.trade.side} {result.trade.shares} {result.trade.outcome} shares · gross ₦{(Number(result.trade.grossAmountKobo) / 100).toFixed(2)} · fee ₦{(Number(result.trade.feeKobo) / 100).toFixed(2)}. {result.duplicate ? 'This was an already processed request.' : ''}</p>}</section></div></> : <p className="muted">{error || 'Loading market…'}</p>}<p className="small-note">This is a virtual-funds test environment. Real-money payments and trading are disabled.</p></main>;
}
